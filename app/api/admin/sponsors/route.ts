// Admin: send a media-kit / rate card to a prospective advertiser and log it.
// Ported from TT send-banner-pricing. Body: { recipient_name, recipient_email, slots?, language? }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { brandedEmail, sendEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';

const eur = (n: number | null) => (n == null ? '—' : `€${Number(n).toLocaleString('en-IE')}`);
const HEAD: Record<Locale, string> = {
  en: 'Advertise with Cyprus Lifestyle', el: 'Διαφημιστείτε στο Cyprus Lifestyle',
  ro: 'Publicitate în Cyprus Lifestyle', ar: 'أعلن مع Cyprus Lifestyle',
};

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.recipient_name || '').trim();
  const email = String(body.recipient_email || '').trim().toLowerCase();
  const locale: Locale = isLocale(String(body.language)) ? body.language : 'en';
  const slots: string[] = Array.isArray(body.slots) ? body.slots.map(String) : [];
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'recipient_name and a valid recipient_email are required' }, { status: 400 });
  }
  const sb = supabaseAdmin();
  let q = sb.from('ad_pricing').select(`slot, format, weekly_eur, monthly_eur, yearly_eur, label_${locale}, label_en`);
  if (slots.length) q = q.in('slot', slots);
  const { data } = await q;
  const rows = (data || []) as Record<string, string | number | null>[];

  const table = `<table role="presentation" width="100%" cellpadding="8" style="border-collapse:collapse;font-size:14px">
    <tr style="background:#0B0E11;color:#C9A24C"><th align="left">Placement</th><th align="left">Format</th><th align="right">Weekly</th><th align="right">Monthly</th><th align="right">Yearly</th></tr>
    ${rows.map((r) => `<tr style="border-bottom:1px solid #e7e0d2"><td>${r[`label_${locale}`] || r.label_en}</td><td>${r.format || ''}</td><td align="right">${eur(r.weekly_eur as number)}</td><td align="right">${eur(r.monthly_eur as number)}</td><td align="right">${eur(r.yearly_eur as number)}</td></tr>`).join('')}
  </table>`;

  const html = brandedEmail({
    locale, heading: HEAD[locale],
    bodyHtml: `<p>Dear ${name},</p><p>Thank you for your interest in advertising with Cyprus Lifestyle. Our current rate card:</p>${table}<p>Reply to this email and our team will prepare a tailored proposal.</p>`,
    preheader: HEAD[locale],
  });
  const sent = await sendEmail({ to: email, subject: HEAD[locale], html });
  if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error }, { status: 502 });

  await sb.from('ad_inquiries').insert({ recipient_name: name, recipient_email: email, language: locale, slots_offered: slots.join(', ') || null });
  return NextResponse.json({ ok: true });
}
