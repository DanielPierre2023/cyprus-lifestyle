// POST /api/admin/mail/reply — reply to an inbound email from the admin panel.
// Sends via Resend from our own address (the address the message was originally
// sent to, e.g. hello@ or privacy@), then marks the thread replied. Admin only.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, brandedEmail } from '@/lib/email';
import { signatureFor } from '@/lib/signatures';

export const runtime = 'nodejs';

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  const to = String(body.to || '').trim().toLowerCase();
  const subject = String(body.subject || '').trim().slice(0, 200) || 'Re: your message';
  const message = String(body.message || '').trim();
  if (!id || !isEmail(to) || message.length < 1) {
    return NextResponse.json({ ok: false, error: 'id, a valid recipient and a message are required' }, { status: 400 });
  }

  // Send from the address the guest originally wrote to, when it is one of ours;
  // otherwise fall back to the configured sender. Resend can send as any address
  // on the verified domain.
  const original = body.from_address ? String(body.from_address).trim().toLowerCase() : '';
  const domain = (process.env.EMAIL_FROM || '').split('@')[1]?.replace(/>$/, '') || 'cypruslifestyle.eu';
  const fromAddr = original && original.endsWith(`@${domain}`) ? original : undefined;
  const from = fromAddr ? `Cyprus Lifestyle <${fromAddr}>` : undefined;
  // Sign as the desk the reply is sent FROM: privacy@ signs as Data Protection,
  // advertise@/sales@ as Partnerships, hello@ as the reader desk, and so on.
  const signAddr = fromAddr || `hello@${domain}`;

  const html = brandedEmail({
    locale: 'en',
    heading: subject.replace(/^re:\s*/i, '') || 'Cyprus Lifestyle',
    bodyHtml: message.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))}</p>`).join(''),
    signature: signatureFor(signAddr),
    preheader: subject,
  });

  const res = await sendEmail({ to, subject, html, from });
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error || 'send failed' }, { status: 502 });

  await supabaseAdmin().from('inbound_emails')
    .update({ status: 'replied', handled_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true, id: res.id });
}
