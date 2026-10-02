// GET /api/directory/owner/verify?token=…
//   The emailed management-link endpoint. Verifies the single-use link token, mints a
//   short-lived editing SESSION, sets it as an httpOnly cookie, and redirects to the owner
//   manage page. On a bad/expired/used link it renders a branded result page (no redirect,
//   no session). The raw session token lives ONLY in the httpOnly cookie — never in the URL,
//   the page, or any log.
//
// Logic lives in lib/directory/owner.ts (service role). Never throws to the caller.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { validateOwnerToken, OWNER_COOKIE, OWNER_SESSION_MAX_AGE } from '@/lib/directory/owner';

export const runtime = 'nodejs';

// A minimal, self-contained, on-brand result page (obsidian/gold/ivory) — no deps.
// Mirrors app/api/directory/claim/verify/route.ts.
function resultPage(opts: { title: string; heading: string; body: string; ctaUrl?: string; ctaLabel?: string }): string {
  const O = '#0B0E11', G = '#C9A24C', INK = '#16181C', IVORY = '#FBF8F1';
  const serif = "Georgia,'Times New Roman',serif";
  const cta = opts.ctaUrl && opts.ctaLabel
    ? `<a href="${opts.ctaUrl}" style="display:inline-block;margin-top:22px;background:${G};color:${O};text-decoration:none;font-family:${serif};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:2px">${opts.ctaLabel}</a>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${opts.title}</title></head>
<body style="margin:0;padding:0;background:#F6F1E7;font-family:${serif};color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${IVORY};border:1px solid #e7ddc6;border-top:3px solid ${G}">
  <tr><td style="background:${O};padding:30px 32px;text-align:center">
    <div style="color:#E4D2AC;font-size:20px;letter-spacing:6px;text-transform:uppercase">Cyprus&nbsp;Lifestyle</div>
    <div style="color:${G};font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:10px">The Island, At Its Best</div>
  </td></tr>
  <tr><td style="padding:40px 40px 44px;text-align:center">
    <h1 style="margin:0 0 8px;font-weight:400;font-size:26px;color:${INK}">${opts.heading}</h1>
    <div style="width:54px;height:2px;background:${G};margin:16px auto"></div>
    <p style="font-size:17px;line-height:1.7;color:${INK};margin:0">${opts.body}</p>
    ${cta}
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function html(markup: string, status = 200): NextResponse {
  return new NextResponse(markup, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function GET(req: NextRequest) {
  // Cheap defence-in-depth against link brute force (the token itself is 256-bit).
  if (!(await rateLimit(req, 'owner-verify', 20, 60))) {
    return html(resultPage({
      title: 'Please wait', heading: 'Too many attempts',
      body: 'Please wait a moment and open your management link again.',
      ctaUrl: '/directory', ctaLabel: 'Browse the directory',
    }), 429);
  }

  const token = (new URL(req.url).searchParams.get('token') || '').trim();
  if (!token) {
    return html(resultPage({
      title: 'Management link invalid', heading: 'This link is not valid',
      body: 'The management link is missing its token. Please use the most recent link we emailed you.',
      ctaUrl: '/directory', ctaLabel: 'Browse the directory',
    }), 400);
  }

  const res = await validateOwnerToken(token);

  if (res.ok && res.slug && res.session) {
    // Hand the browser an httpOnly session cookie, then send them to the editor.
    const to = new URL('/directory/manage', new URL(req.url).origin);
    const redirect = NextResponse.redirect(to, 303);
    redirect.cookies.set(OWNER_COOKIE, res.session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: OWNER_SESSION_MAX_AGE,
    });
    return redirect;
  }

  const body = res.error === 'expired'
    ? 'This management link has expired. Links are valid for 60 minutes — please request a fresh one from your listing.'
    : 'This management link is no longer valid. It may have already been used, or it has been superseded by a newer link. Please request a fresh one from your listing.';
  return html(resultPage({
    title: 'Management link expired', heading: 'This link can’t be used',
    body, ctaUrl: '/directory', ctaLabel: 'Browse the directory',
  }), 410);
}
