// Public contact form → Inbox (contact_messages). POST { name, email, subject, message }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { logInboundToAccount } from '@/lib/crm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true }); // silently drop bots
  if (!(await rateLimit(req, 'contact'))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }
  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const subject = String(body.subject || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 8000);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
    return NextResponse.json({ ok: false, error: 'name, a valid email and a message are required' }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { error } = await sb.from('contact_messages').insert({ name, email, subject, message, status: 'unread' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  // If it's from a business we already track, log it on that account's timeline.
  await logInboundToAccount(sb, { email, name, subject: `Contact form${subject ? ` — ${subject}` : ''}`, body: message });
  return NextResponse.json({ ok: true });
}
