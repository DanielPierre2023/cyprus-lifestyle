// Cyprus Lifestyle — email via Resend (port of TT's Resend + brandedEmail).
// Branded, inline-styled, RTL-aware for the Arabic edition.
import 'server-only';
import { dir, type Locale } from '@/lib/locales';

const BRAND = { obsidian: '#0B0E11', paper: '#F6F1E7', ink: '#16181C', gold: '#C9A24C', champagne: '#E4D2AC' };

// The house email template — one luxury lockup used by EVERY message the system
// sends, from every address (concierge acks, lead alerts, admin replies, the
// newsletter, fulfilment). Deliberately typographic: no remote logo image (email
// clients block those — that was the broken box in the header), so the masthead
// is a reliable serif wordmark with gold hairline rules that renders identically
// in Gmail, Apple Mail and Outlook, and mirrors the site's obsidian/gold/ivory.
// RTL-aware for the Arabic edition. `unsubscribe` is opt-in (a string href, or
// true to emit Resend's {{unsubscribe}} token) so 1:1 replies don't carry one.
export function brandedEmail(opts: {
  locale: Locale; heading: string; bodyHtml: string;
  ctaLabel?: string; ctaUrl?: string; preheader?: string; unsubscribe?: boolean | string;
  signature?: string;
}): string {
  const rtl = dir(opts.locale) === 'rtl';
  const align = rtl ? 'right' : 'left';
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu';
  const host = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const O = BRAND.obsidian, G = BRAND.gold, C = BRAND.champagne, INK = BRAND.ink, PAPER = BRAND.paper;
  const ivory = '#FBF8F1', serif = "Georgia,'Times New Roman',serif";

  // A centred gold hairline — the masthead ornament.
  const rule = (w: number) =>
    `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="width:${w}px;height:1px;background:${G};font-size:0;line-height:0">&nbsp;</td></tr></table>`;

  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<tr><td style="padding:8px 40px 40px;text-align:${align}">
        <a href="${opts.ctaUrl}" style="display:inline-block;background:${G};color:${O};text-decoration:none;font-family:${serif};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:2px">${opts.ctaLabel}</a>
      </td></tr>`
    : '';

  const unsub = opts.unsubscribe
    ? `&nbsp;·&nbsp;<a href="${opts.unsubscribe === true ? '{{unsubscribe}}' : opts.unsubscribe}" style="color:#9a927f;text-decoration:underline">Unsubscribe</a>`
    : '';

  return `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${opts.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${PAPER};font-family:${serif};color:${INK};-webkit-font-smoothing:antialiased">
<span style="display:none!important;opacity:0;color:transparent;visibility:hidden;height:0;width:0;overflow:hidden">${opts.preheader || opts.heading}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${ivory};border:1px solid #e7ddc6;border-top:3px solid ${G}">
  <tr><td style="background:${O};padding:34px 32px 30px;text-align:center">
    <img src="${site}/brand/monogram-email.png" alt="Cyprus Lifestyle" width="78" height="78" style="display:block;margin:0 auto 18px;border:0;width:78px;height:78px;max-width:78px" />
    ${rule(46)}
    <div style="font-family:${serif};color:${C};font-size:23px;letter-spacing:6px;text-transform:uppercase;margin:16px 0 14px">Cyprus&nbsp;Lifestyle</div>
    ${rule(46)}
    <div style="font-family:${serif};color:${G};font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:14px">The Island, At Its Best</div>
  </td></tr>
  <tr><td style="padding:40px 40px 0;text-align:${align}">
    <h1 style="margin:0;font-family:${serif};font-size:25px;line-height:1.3;color:${INK};font-weight:400">${opts.heading}</h1>
    <div style="margin:18px 0 0"><table role="presentation" cellpadding="0" cellspacing="0" style="${rtl ? 'margin:0 0 0 auto' : 'margin:0 auto 0 0'}"><tr><td style="width:54px;height:2px;background:${G};font-size:0;line-height:0">&nbsp;</td></tr></table></div>
  </td></tr>
  <tr><td style="padding:22px 40px 8px;text-align:${align};font-family:${serif};font-size:16px;line-height:1.75;color:${INK}">${opts.bodyHtml}</td></tr>
  ${opts.signature ? `<tr><td style="padding:2px 40px 10px;text-align:${align}">${opts.signature}</td></tr>` : ''}
  ${cta}
  <tr><td style="background:${O};padding:26px 32px;text-align:center;color:${C};font-family:${serif};font-size:12px;line-height:1.7">
    <div style="letter-spacing:3px;text-transform:uppercase;color:${C};font-size:11px">Cyprus Lifestyle</div>
    <div style="color:#9a927f;margin-top:6px">The media title of ADD Individual Solutions Ltd · Nicosia, Cyprus</div>
    <div style="margin-top:8px"><a href="${site}" style="color:${G};text-decoration:none">${host}</a>${unsub}</div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string; from?: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = opts.from || process.env.EMAIL_FROM || 'Cyprus Lifestyle <newsroom@cypruslifestyle.eu>';
  if (!key) return { ok: false, error: 'RESEND_API_KEY not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, ...(opts.replyTo ? { reply_to: opts.replyTo } : {}) }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message || 'Resend error' };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
