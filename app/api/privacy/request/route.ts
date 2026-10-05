// POST /api/privacy/request — a data-subject request (roadmap item 12).
// { kind, name, email, details, locale }. Stores a dsar_requests row (with the 1-month
// GDPR deadline) and notifies the privacy desk. Rate-limited; best-effort notification.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { logServerError } from '@/lib/monitor.server';
import { escapeHtml } from '@/lib/util';

export const runtime = 'nodejs';

const KINDS = ['access', 'erasure', 'correction', 'objection', 'portability'];
const ourDomain = () => (process.env.EMAIL_FROM || '').split('@')[1]?.replace(/>$/, '') || 'cypruslifestyle.eu';

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'privacy-request', 6, 60))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, error: 'invalid_email', message: 'A valid email is required.' }, { status: 400 });
  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : 'access';
  const name = body.name ? String(body.name).slice(0, 120) : null;
  const details = body.details ? String(body.details).slice(0, 4000) : null;
  const locale = String(body.locale || '').slice(0, 5) || null;

  const sb = supabaseAdmin();
  // The insert result MUST be checked: a silent failure here would tell the data subject
  // "received" while nothing was stored (GDPR one-month deadline). On failure → 5xx + code.
  try {
    const { error } = await sb.from('dsar_requests').insert({ kind, name, email, details, locale });
    if (error) throw new Error(error.message);
  } catch (e) {
    await logServerError('privacy-request', new Error(`DSAR not stored: ${(e as Error).message}`.slice(0, 300)), { kind });
    return NextResponse.json({ ok: false, error: 'dsar_failed', message: 'Could not submit — please email us directly.' }, { status: 500 });
  }

  // Notify the privacy desk (best-effort).
  try {
    const dom = ourDomain();
    await sendEmail({
      to: `privacy@${dom}`,
      from: `Cyprus Lifestyle <privacy@${dom}>`,
      subject: `Data request (${kind}) from ${email}`,
      html: `<p>A new data-subject request was submitted.</p><p><strong>Type:</strong> ${escapeHtml(kind)}<br><strong>Name:</strong> ${escapeHtml(name || '—')}<br><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Details:</strong><br>${escapeHtml(details || '—').replace(/\n/g, '<br>')}</p><p>Respond within one month (GDPR). Tracked in Admin → Privacy.</p>`,
    });
  } catch { /* stored regardless */ }
  return NextResponse.json({ ok: true, message: 'Your request has been received. We will respond within one month, as required by law.' });
}
