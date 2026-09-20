// POST /api/concierge/request  { q, answer?, picks?, name?, email?, note?, locale? }
// Captures an "Ask the island" request so it LANDS somewhere real: recorded in
// concierge_requests and emailed to the desk. This is the first step of the
// connector — every request is now actionable, not a dead end. (Vendor matching
// + routing builds on this next.)
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
  if (!(await rateLimit(req, 'concierge-request'))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }

  const query = String(body.q || '').trim().slice(0, 500);
  if (query.length < 3) return NextResponse.json({ ok: false, error: 'Nothing to send yet.' }, { status: 400 });
  const answer = String(body.answer || '').trim().slice(0, 2000) || null;
  const name = String(body.name || '').trim().slice(0, 120) || null;
  const email = String(body.email || '').trim().toLowerCase() || null;
  const phone = String(body.phone || '').trim().slice(0, 40) || null;
  const note = String(body.note || '').trim().slice(0, 2000) || null;
  const locale: Locale = isLocale(String(body.locale)) ? (body.locale as Locale) : 'en';
  const rawPicks: Record<string, unknown>[] = Array.isArray(body.picks) ? (body.picks as Record<string, unknown>[]) : [];
  const picks = rawPicks.slice(0, 8)
    .map((p) => ({ slug: String(p.slug || ''), name: String(p.name || ''), why: String(p.why || '') }))
    .filter((p) => p.slug);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'That email doesn’t look right.' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from('concierge_requests').insert({ query, answer, picks: picks.length ? picks : null, name, email, phone, note, locale, status: 'new' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  // Notify the desk (best-effort — the request is safely recorded either way).
  const to = process.env.CONCIERGE_INBOX || process.env.DIRECTORY_INBOX || process.env.ADVERTISE_INBOX || process.env.EMAIL_FROM;
  if (to) {
    const picksHtml = picks && picks.length
      ? `<p><strong>Suggested:</strong> ${picks.map((p) => esc(p.name || p.slug)).join(', ')}</p>` : '';
    const html = brandedEmail({
      locale: 'en',
      heading: 'New concierge request',
      bodyHtml:
        `<p style="font-size:17px"><strong>${esc(query)}</strong></p>` +
        (name || email || phone
          ? `<p>${[name, email, phone].filter(Boolean).map((v) => esc(String(v))).join(' · ')}</p>`
          : '<p><em>No contact left — demand signal.</em></p>') +
        (note ? `<p>${esc(note)}</p>` : '') + picksHtml,
      preheader: `Concierge request: ${query.slice(0, 80)}`,
    });
    await sendEmail({ to, subject: `Concierge request — ${query.slice(0, 60)}`, html, replyTo: email || undefined }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
