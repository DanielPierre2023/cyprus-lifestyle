// Cyprus Lifestyle — email via Resend (port of TT's Resend + brandedEmail).
// Branded, inline-styled, RTL-aware for the Arabic edition.
import 'server-only';
import { dir, type Locale } from '@/lib/locales';

const BRAND = { obsidian: '#0B0E11', paper: '#F6F1E7', ink: '#16181C', gold: '#C9A24C', champagne: '#E4D2AC' };

export function brandedEmail(opts: { locale: Locale; heading: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string; preheader?: string }): string {
  const rtl = dir(opts.locale) === 'rtl';
  const align = rtl ? 'right' : 'left';
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu';
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<tr><td style="padding:8px 32px 32px;text-align:${align}"><a href="${opts.ctaUrl}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.obsidian};text-decoration:none;font-weight:700;padding:12px 22px;border-radius:2px;font-family:Georgia,serif">${opts.ctaLabel}</a></td></tr>`
    : '';
  return `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${opts.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:${BRAND.paper};font-family:Georgia,'Times New Roman',serif;color:${BRAND.ink}">
<span style="display:none;opacity:0;color:transparent">${opts.preheader || ''}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:24px 0">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e7e0d2">
<tr><td style="background:${BRAND.obsidian};padding:24px 32px;text-align:center">
<a href="${site}" style="text-decoration:none"><img src="${site}/brand/wordmark-email.png" alt="Cyprus Lifestyle" width="260" style="display:inline-block;border:0;width:260px;max-width:72%;height:auto" /></a>
</td></tr>
<tr><td style="padding:32px 32px 8px;text-align:${align}"><h1 style="margin:0;font-size:24px;color:${BRAND.ink};font-weight:700">${opts.heading}</h1></td></tr>
<tr><td style="padding:8px 32px 8px;text-align:${align};font-size:16px;line-height:1.6">${opts.bodyHtml}</td></tr>
${cta}
<tr><td style="background:${BRAND.obsidian};padding:18px 32px;text-align:center;color:${BRAND.champagne};font-size:12px">
Cyprus Lifestyle · ${site.replace(/^https?:\/\//, '')}<br>
<a href="{{unsubscribe}}" style="color:${BRAND.champagne}">Unsubscribe</a>
</td></tr>
</table></td></tr></table></body></html>`;
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
