// POST /api/directory/lead  { name, email, message?, listingSlug, listingType?, listingName?, locale? }
// Records an enquiry made on a directory listing (directory_leads) and notifies
// the desk by email (best-effort). This is the directory's lead-gen layer: a
// verified/featured business receives real enquiries from the site.
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
  if (!(await rateLimit(req, 'directory-lead'))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const message = String(body.message || '').trim().slice(0, 4000) || null;
  const listingSlug = String(body.listingSlug || '').trim().slice(0, 200);
  const listingType = String(body.listingType || '').trim().slice(0, 40) || null;
  const listingName = String(body.listingName || '').trim().slice(0, 200) || null;
  const locale: Locale = isLocale(String(body.locale)) ? (body.locale as Locale) : 'en';

  if (!listingSlug) return NextResponse.json({ ok: false, error: 'Missing listing.' }, { status: 400 });
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'A name and a valid email are required.' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Best-effort CRM link to the business (match/create by name).
  let orgId: string | null = null;
  try {
    const { data } = await sb.rpc('crm_upsert_account', {
      p_name: listingName || listingSlug, p_email: null, p_website: null, p_category: listingType, p_district: null,
    });
    orgId = (data as string) || null;
  } catch { /* ignore — lead still records */ }

  const { error } = await sb.from('directory_leads').insert({
    listing_slug: listingSlug, listing_type: listingType, listing_name: listingName,
    name, email, message, locale, status: 'new', org_id: orgId,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  if (orgId) {
    await sb.from('crm_activities').insert({
      org_id: orgId, type: 'note',
      subject: `Directory enquiry — ${listingName || listingSlug}`,
      body: [`From: ${name} <${email}>`, message || ''].filter(Boolean).join('\n'),
    }).then(() => {}, () => {});
  }

  // Notify the desk (best-effort; a failure never fails the submission).
  const to = process.env.DIRECTORY_INBOX || process.env.ADVERTISE_INBOX || process.env.EMAIL_FROM;
  if (to) {
    const html = brandedEmail({
      locale: 'en',
      heading: 'New directory enquiry',
      bodyHtml:
        `<p><strong>${esc(listingName || listingSlug)}</strong>${listingType ? ` · ${esc(listingType)}` : ''}</p>` +
        `<p><strong>${esc(name)}</strong><br>${esc(email)}</p>` +
        (message ? `<p>${esc(message)}</p>` : ''),
      preheader: `Enquiry for ${listingName || listingSlug}`,
    });
    await sendEmail({ to, subject: `Directory enquiry — ${listingName || listingSlug}`, html, replyTo: email }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
