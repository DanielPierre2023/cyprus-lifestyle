// Public contact form → Inbox (contact_messages), routed by request class.
// POST { name, email, subject, message, requestClass, phone, district, locale }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { logInboundToAccount } from '@/lib/crm';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { errorBody, codedError } from '@/lib/i18n/apiErrors';

export const runtime = 'nodejs';

// Enquiry classes the form offers; anything else is treated as 'general'.
const CLASSES = ['concierge', 'feature', 'advertising', 'event', 'press'] as const;
type RequestClass = (typeof CLASSES)[number] | 'general';
const CLASS_LABEL: Record<RequestClass, string> = {
  concierge: 'Concierge', feature: 'Feature', advertising: 'Advertising',
  event: 'Event', press: 'Press', general: 'General',
};
// Advertising, feature and event enquiries are sales/editorial-relevant, so a matching
// business account gets a CRM timeline entry. Concierge/press/general don't spawn sales noise.
const CRM_CLASSES = new Set<RequestClass>(['advertising', 'feature', 'event']);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true }); // silently drop bots
  if (!(await rateLimit(req, 'contact'))) {
    return NextResponse.json(errorBody('rate_limited', localeOf(req, body.locale)), { status: 429 });
  }
  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const subjectRaw = String(body.subject || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 8000);
  const phone = String(body.phone || '').trim().slice(0, 60) || null;
  const district = String(body.district || '').trim().slice(0, 80) || null;
  const locale = String(body.locale || '').trim().slice(0, 8) || null;
  const rc = String(body.requestClass || '').trim().toLowerCase();
  const requestClass: RequestClass = (CLASSES as readonly string[]).includes(rc) ? (rc as RequestClass) : 'general';
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
    return NextResponse.json(errorBody('contact_fields_required', localeOf(req, body.locale)), { status: 400 });
  }
  // Prefix the subject with the class so the queue is visible in the existing inbox
  // even in an environment where the request_class column has not been added yet.
  const subject = `[${CLASS_LABEL[requestClass]}]${subjectRaw ? ` ${subjectRaw}` : ''}`;

  const sb = supabaseAdmin();
  const full = { name, email, subject, message, status: 'unread', request_class: requestClass, phone, district, locale };
  let { error } = await sb.from('contact_messages').insert(full);
  if (error) {
    // Migration 0121 not applied yet → retry with the base columns so the form never breaks.
    ({ error } = await sb.from('contact_messages').insert({ name, email, subject, message, status: 'unread' }));
  }
  if (error) return NextResponse.json(codedError('save_failed', error.message), { status: 400 });

  // Route to the CRM timeline for sales/editorial-relevant classes from a tracked
  // business (matched by email domain); best-effort, never blocks the reply.
  const crmSubject = CRM_CLASSES.has(requestClass)
    ? `Enquiry — ${CLASS_LABEL[requestClass]}${subjectRaw ? `: ${subjectRaw}` : ''}`
    : `Contact form${subjectRaw ? ` — ${subjectRaw}` : ''}`;
  await logInboundToAccount(sb, { email, name, subject: crmSubject, body: message });
  return NextResponse.json({ ok: true });
}
