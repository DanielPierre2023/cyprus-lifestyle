// POST /api/advertise/lead  { name, email, company?, slot?, label?, message?, locale? }
// Records an inbound advertising enquiry (ad_leads) and notifies the desk by email
// (best-effort). Used by the "request a quote" path and by every placement when
// online checkout is not configured.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { sendEmail, brandedEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true });
  if (!(await rateLimit(req, 'advertise-lead'))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const company = String(body.company || '').trim().slice(0, 160) || null;
  const slot = String(body.slot || '').trim().slice(0, 60) || null;
  const label = String(body.label || '').trim().slice(0, 160) || null;
  const message = String(body.message || '').trim().slice(0, 6000) || null;
  const locale: Locale = isLocale(String(body.locale)) ? (body.locale as Locale) : 'en';
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'A name and a valid email are required.' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Attach the enquiry to a CRM account (match by email domain / name, else create).
  // Best-effort — if the CRM link fails, the lead is still recorded.
  let orgId: string | null = null;
  try {
    const { data } = await sb.rpc('crm_upsert_account', {
      p_name: company || name, p_email: email, p_website: null, p_category: null, p_district: null,
    });
    orgId = (data as string) || null;
  } catch { /* ignore — lead still records below */ }

  const { error } = await sb.from('ad_leads').insert({ name, email, company, slot, label, message, locale, status: 'new', org_id: orgId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  if (orgId) {
    await sb.from('crm_activities').insert({
      org_id: orgId, type: 'note',
      subject: `Advertising enquiry — ${label || slot || 'general'}`,
      body: [company ? `Company: ${company}` : '', `From: ${name} <${email}>`, message || ''].filter(Boolean).join('\n'),
    }).then(() => {}, () => {});
  }

  // Notify the desk. Best-effort: a missing inbox or email failure never fails the
  // submission — the lead is safely recorded in ad_leads either way.
  const to = process.env.ADVERTISE_INBOX || process.env.EMAIL_FROM;
  if (to) {
    const interest = label || slot || 'General enquiry';
    const html = brandedEmail({
      locale: 'en',
      heading: 'New advertising enquiry',
      bodyHtml:
        `<p><strong>${esc(name)}</strong>${company ? ` · ${esc(company)}` : ''}<br>${esc(email)}</p>` +
        `<p><strong>Interest:</strong> ${esc(interest)}</p>` +
        (message ? `<p>${esc(message)}</p>` : ''),
      preheader: `New advertising enquiry from ${name}`,
    });
    await sendEmail({ to, subject: `Advertising enquiry — ${interest}`, html, replyTo: email }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
