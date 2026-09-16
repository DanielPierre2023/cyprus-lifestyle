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
  let q = sb.from('ad_pricing').select(`slot, format, unit, price_from, price_to, kind, label_${locale}, label_en`).order('sort');
  if (slots.length) q = q.in('slot', slots);
  const { data } = await q;
  const rows = (data || []) as Record<string, any>[];

  const label = (r: Record<string, any>) => r[`label_${locale}`] || r.label_en || '';
  const priceText = (r: Record<string, any>) => {
    const from = r.price_from != null ? eur(r.price_from as number) : '';
    const to = r.price_to != null ? `–${eur(r.price_to as number)}` : '';
    return from ? `${r.slot === 'tier-partner' ? 'from ' : ''}${from}${to}` : '—';
  };
  const tiers = rows.filter((r) => r.kind === 'package');
  const items = rows.filter((r) => r.kind !== 'package');
  const tiersHtml = tiers.length
    ? `<p style="margin:16px 0 6px;font-weight:700">Packages</p>${tiers.map((r) => `<p style="margin:2px 0"><strong>${label(r)}</strong> — ${priceText(r)} ${r.unit || ''}</p>`).join('')}`
    : '';
  const table = `${tiersHtml}<p style="margin:16px 0 6px;font-weight:700">À la carte</p><table role="presentation" width="100%" cellpadding="8" style="border-collapse:collapse;font-size:14px">
    <tr style="background:#0B0E11;color:#C9A24C"><th align="left">Placement</th><th align="left">Format</th><th align="right">Price</th><th align="left">Basis</th></tr>
    ${items.map((r) => `<tr style="border-bottom:1px solid #e7e0d2"><td>${label(r)}</td><td>${r.format || ''}</td><td align="right">${priceText(r)}</td><td>${r.unit || ''}</td></tr>`).join('')}
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
