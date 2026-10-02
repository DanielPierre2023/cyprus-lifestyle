// /api/directory/claim/verify
//   GET  ?token=…         — the email-verification link. Verifies the single-use token,
//                           flips the listing to owner-verified, and redirects to the
//                           listing with ?claimed=1 (or renders a branded success/failure
//                           page when the listing type is unknown or the token is bad).
//   POST { claimId, code } — the phone-OTP step (JSON in, JSON out) for the client widget.
//
// All logic lives in lib/directory/claims.ts (service role). Never throws to the caller.
import { NextRequest, NextResponse } from 'next/server';
import { verifyClaimToken, verifyClaimOtp } from '@/lib/directory/claims';

export const runtime = 'nodejs';

// A minimal, self-contained, on-brand result page (obsidian/gold/ivory) — no deps.
function resultPage(opts: { ok: boolean; title: string; heading: string; body: string; ctaUrl?: string; ctaLabel?: string }): string {
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
  const token = (new URL(req.url).searchParams.get('token') || '').trim();
  if (!token) {
    return html(resultPage({
      ok: false, title: 'Claim link invalid', heading: 'This link is not valid',
      body: 'The verification link is missing its token. Please use the most recent link we emailed you.',
      ctaUrl: '/directory', ctaLabel: 'Browse the directory',
    }), 400);
  }

  const res = await verifyClaimToken(token);

  if (res.ok && res.slug && res.type) {
    // Flip succeeded and we know where to send them — straight to the (now owned) listing.
    const to = new URL(`/directory/${res.type}/${res.slug}?claimed=1`, new URL(req.url).origin);
    return NextResponse.redirect(to, 303);
  }
  if (res.ok && res.slug) {
    // Verified, but type unknown — show a branded success page with a directory link.
    return html(resultPage({
      ok: true, title: 'Listing verified', heading: 'Your listing is verified',
      body: 'Thank you — ownership is confirmed and your listing is now a verified first-party profile. Our team will be in touch to help you complete it.',
      ctaUrl: '/directory', ctaLabel: 'Browse the directory',
    }));
  }

  const body = res.error === 'expired'
    ? 'This verification link has expired. Links are valid for 72 hours — please start the claim again to receive a fresh one.'
    : 'This verification link is no longer valid. It may have already been used, or it has been superseded by a newer link. Please start the claim again if you still need to verify.';
  return html(resultPage({
    ok: false, title: 'Claim link expired', heading: 'This link can’t be used',
    body, ctaUrl: '/directory', ctaLabel: 'Browse the directory',
  }), 410);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const claimId = String(body.claimId || '').trim();
  const code = String(body.code || '').trim();
  if (!claimId || !code) {
    return NextResponse.json({ ok: false, error: 'A claim id and code are required.' }, { status: 400 });
  }
  const res = await verifyClaimOtp({ claimId, code });
  if (res.ok) return NextResponse.json({ ok: true, slug: res.slug ?? null });

  const msg = res.error === 'expired' ? 'That code has expired. Please start the claim again.'
    : res.error === 'locked' ? 'Too many incorrect attempts — this claim is locked. Please start again.'
    : typeof res.remaining === 'number' ? `That code is not correct. ${res.remaining} attempt${res.remaining === 1 ? '' : 's'} left.`
    : 'That code is not correct.';
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}
