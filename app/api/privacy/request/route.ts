// POST /api/privacy/request — a data-subject request (roadmap item 12).
// { kind, name, email, details, locale }. Stores a dsar_requests row (with the 1-month
// GDPR deadline), notifies the privacy desk and acknowledges to the requester (lib/privacy/ack.ts:
// at most once per address per 24 h, fixed localised text, only our own reference echoed).
// Rate-limited; notification and acknowledgement are best-effort. Errors: { ok:false, code, error, message }.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitKey } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { logServerError } from '@/lib/monitor.server';
import { escapeHtml } from '@/lib/util';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { dsarReceivedMessage } from '@/lib/i18n/notices';
import { keyedErrorBody } from '@/lib/i18n/apiErrors';
import { buildDsarAck, dsarAckSince, dsarReference, shouldSendDsarAck } from '@/lib/privacy/ack';

export const runtime = 'nodejs';

const KINDS = ['access', 'erasure', 'correction', 'objection', 'portability'];
const ourDomain = () => (process.env.EMAIL_FROM || '').split('@')[1]?.replace(/>$/, '') || 'cypruslifestyle.eu';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ackLocale = localeOf(req, body.locale);
  if (!(await rateLimit(req, 'privacy-request', 6, 60))) return NextResponse.json(keyedErrorBody('rate_limited', 'busy', ackLocale), { status: 429 });
  const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json(keyedErrorBody('invalid_email', 'invalid_email', ackLocale), { status: 400 });
  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : 'access';
  const name = body.name ? String(body.name).slice(0, 120) : null;
  const details = body.details ? String(body.details).slice(0, 4000) : null;
  const locale = String(body.locale || '').slice(0, 5) || null;

  const sb = supabaseAdmin();
  // Earlier request from this address inside the ack window? (null = lookup failed -> no ack, fail closed)
  let priorInWindow: number | null = null;
  try {
    const { count, error } = await sb.from('dsar_requests').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', dsarAckSince());
    priorInWindow = error ? null : (count ?? 0);
  } catch { priorInWindow = null; }
  // The insert result MUST be checked: a silent failure here would tell the data subject
  // "received" while nothing was stored (GDPR one-month deadline). On failure → 5xx + code.
  let requestId = '';
  try {
    const { data, error } = await sb.from('dsar_requests').insert({ kind, name, email, details, locale }).select('id').single();
    if (error) throw new Error(error.message);
    requestId = String((data as { id?: string } | null)?.id || '');
  } catch (e) {
    await logServerError('privacy-request', new Error(`DSAR not stored: ${(e as Error).message}`.slice(0, 300)), { kind });
    return NextResponse.json(keyedErrorBody('dsar_failed', 'dsar_failed', ackLocale), { status: 500 });
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

  // Acknowledge to the requester (best-effort, abuse-limited; see lib/privacy/ack.ts).
  try {
    const reference = dsarReference(requestId);
    if (shouldSendDsarAck({ priorInWindow, reference })
      && (await rateLimitKey(email, 'privacy-ack', 1, 24 * 60 * 60))
      && (await rateLimitKey('all', 'privacy-ack-global', 60, 60 * 60))) {
      const dom = ourDomain();
      const ack = buildDsarAck(ackLocale, reference);
      await sendEmail({ to: email, from: `Cyprus Lifestyle <privacy@${dom}>`, replyTo: `privacy@${dom}`, subject: ack.subject, html: ack.html });
    }
  } catch { /* the request is stored and the desk notified regardless */ }
  return NextResponse.json({ ok: true, message: dsarReceivedMessage(ackLocale) });
}
