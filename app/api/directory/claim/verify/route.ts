// /api/directory/claim/verify
//   GET  ?token=…          — the email-verification link. It is now PREFETCH-SAFE: it only
//                            PEEKS the token (read-only) and renders a branded CONFIRM page
//                            ("Confirm you own <business>") with a Confirm button. It does
//                            NOT consume the single-use token and does NOT flip ownership —
//                            so email security scanners / mailbox link prefetchers (which
//                            issue background GETs) can never auto-verify or burn the link.
//   POST (form: token)     — the deliberate Confirm click. THIS is the only place the
//                            single-use email token is consumed and the listing is flipped
//                            to owner-verified; on success it 303-redirects to the listing
//                            with ?claimed=1 (PRG), else a branded failure page.
//   POST (json: claimId,code) — the phone-OTP step (JSON in, JSON out) for the client widget.
//
// All state logic lives in lib/directory/claims.ts (service role). Tokens stay hashed,
// single-use and expiring; the confirm page carries the opaque token in the POST body only
// (never in a URL/log). Anti-enumeration is preserved: a bad/used/expired token renders the
// same generic "can't be used" page on both GET and the confirm POST. Never throws.
import { NextRequest, NextResponse } from 'next/server';
import { peekClaimToken, verifyClaimToken, verifyClaimOtp } from '@/lib/directory/claims';
import { pageCopy, withBiz, withBizText } from '@/lib/directory/ownerCopy';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { dir, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';

// ── on-brand page scaffolding (obsidian/gold/ivory) — no deps ─────────────────
const BRAND = { O: '#0B0E11', G: '#C9A24C', INK: '#16181C', IVORY: '#FBF8F1' };
const SERIF = "Georgia,'Times New Roman',serif";

const esc = (s: string): string =>
  String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
const escAttr = (s: string): string =>
  String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));

// The shared branded shell. noindex so a confirm/result URL never lands in a search index.
function shell(locale: Locale, title: string, innerHtml: string): string {
  const { O, G, INK, IVORY } = BRAND;
  return `<!doctype html><html lang="${locale}" dir="${dir(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F6F1E7;font-family:${SERIF};color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${IVORY};border:1px solid #e7ddc6;border-top:3px solid ${G}">
  <tr><td style="background:${O};padding:30px 32px;text-align:center">
    <div style="color:#E4D2AC;font-size:20px;letter-spacing:6px;text-transform:uppercase">Cyprus&nbsp;Lifestyle</div>
    <div style="color:${G};font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:10px">The Island, At Its Best</div>
  </td></tr>
  <tr><td style="padding:40px 40px 44px;text-align:center">
    ${innerHtml}
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

// A minimal, self-contained result page (success / failure, with an optional link CTA).
function resultPage(locale: Locale, opts: { title: string; heading: string; body: string; ctaUrl?: string; ctaLabel?: string }): string {
  const { O, G, INK } = BRAND;
  const cta = opts.ctaUrl && opts.ctaLabel
    ? `<a href="${escAttr(opts.ctaUrl)}" style="display:inline-block;margin-top:22px;background:${G};color:${O};text-decoration:none;font-family:${SERIF};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:2px">${esc(opts.ctaLabel)}</a>`
    : '';
  return shell(locale, opts.title, `
    <h1 style="margin:0 0 8px;font-weight:400;font-size:26px;color:${INK}">${esc(opts.heading)}</h1>
    <div style="width:54px;height:2px;background:${G};margin:16px auto"></div>
    <p style="font-size:17px;line-height:1.7;color:${INK};margin:0">${opts.body}</p>
    ${cta}`);
}

// The CONFIRM page: a real form whose submit (POST) is the deliberate, prefetch-proof
// verification step. The opaque token rides in a hidden field (POST body), never the URL.
function confirmPage(locale: Locale, opts: { token: string; bizName: string; actionPath: string }): string {
  const { O, G, INK } = BRAND;
  const c = pageCopy(locale);
  return shell(locale, withBizText(c.confirmTitle, opts.bizName), `
    <h1 style="margin:0 0 8px;font-weight:400;font-size:26px;color:${INK}">${withBiz(c.confirmH, opts.bizName)}</h1>
    <div style="width:54px;height:2px;background:${G};margin:16px auto"></div>
    <p style="font-size:17px;line-height:1.7;color:${INK};margin:0 0 6px">${withBiz(c.confirmP1, opts.bizName)}</p>
    <p style="font-size:14px;line-height:1.6;color:#6b6350;margin:0">${esc(c.confirmP2)}</p>
    <form method="POST" action="${escAttr(opts.actionPath)}" style="margin:0">
      <input type="hidden" name="token" value="${escAttr(opts.token)}">
      <input type="hidden" name="lang" value="${locale}">
      <button type="submit" style="display:inline-block;margin-top:22px;background:${G};color:${O};border:0;cursor:pointer;font-family:${SERIF};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:2px">${esc(c.confirmBtn)}</button>
    </form>`);
}

function html(markup: string, status = 200): NextResponse {
  return new NextResponse(markup, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

function failurePage(locale: Locale, error: 'expired' | 'invalid' | 'not_found' | undefined): NextResponse {
  const c = pageCopy(locale);
  return html(resultPage(locale, {
    title: c.claimDeadTitle, heading: c.linkH,
    body: esc(error === 'expired' ? c.claimExpired : c.claimInvalid), ctaUrl: '/directory', ctaLabel: c.browse,
  }), 410);
}

function missingTokenPage(locale: Locale): NextResponse {
  const c = pageCopy(locale);
  return html(resultPage(locale, {
    title: c.claimMissingTitle, heading: c.missingH,
    body: esc(c.claimMissingBody), ctaUrl: '/directory', ctaLabel: c.browse,
  }), 400);
}

// Shared success rendering for a verified-but-type-unknown claim (can't deep-link the page).
function verifiedPage(locale: Locale): NextResponse {
  const c = pageCopy(locale);
  return html(resultPage(locale, {
    title: c.verifiedTitle, heading: c.verifiedH,
    body: esc(c.verifiedBody), ctaUrl: '/directory', ctaLabel: c.browse,
  }));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = (url.searchParams.get('token') || '').trim();
  // Edition: ?lang= (put on the e-mailed link), else Accept-Language, else English.
  const locale = localeOf(req, url.searchParams.get('lang'));
  if (!token) return missingTokenPage(locale);

  // READ-ONLY: never consumes the token, never flips the listing. A prefetch/scanner GET
  // reaches exactly this and nothing more.
  const peek = await peekClaimToken(token);
  if (peek.ok && peek.bizName) {
    return html(confirmPage(locale, { token, bizName: peek.bizName, actionPath: url.pathname }));
  }
  return failurePage(locale, peek.error);
}

export async function POST(req: NextRequest) {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  const isJson = ct.includes('application/json');

  let token = '', claimId = '', code = '', lang = '';
  if (isJson) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    token = String(body.token || '').trim();
    claimId = String(body.claimId || '').trim();
    code = String(body.code || '').trim();
    lang = String(body.lang || body.locale || '').trim();
  } else {
    const form = await req.formData().catch(() => null);
    if (form) {
      token = String(form.get('token') || '').trim();
      claimId = String(form.get('claimId') || '').trim();
      code = String(form.get('code') || '').trim();
      lang = String(form.get('lang') || '').trim();
    }
  }
  const locale = localeOf(req, lang);

  // ── token-confirm path: the deliberate click on the branded confirm page. This is the
  //    ONLY place the single-use email token is consumed and the listing is flipped. ──
  if (token) {
    const res = await verifyClaimToken(token);
    if (res.ok && res.slug && res.type) {
      // PRG: send the browser (GET) to the now-owned listing.
      const to = new URL(`${locale === 'en' ? '' : `/${locale}`}/directory/${res.type}/${res.slug}?claimed=1`, new URL(req.url).origin);
      return NextResponse.redirect(to, 303);
    }
    if (res.ok && res.slug) return verifiedPage(locale);
    return failurePage(locale, res.error === 'expired' ? 'expired' : 'invalid');
  }

  // A non-JSON (form) submit with no token is a malformed confirm.
  if (!isJson) return missingTokenPage(locale);

  // ── phone-OTP path — unchanged JSON contract for the on-page claim widget. ──
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
