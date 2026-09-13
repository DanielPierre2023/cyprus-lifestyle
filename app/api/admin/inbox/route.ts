// Admin: reply to an Inbox message. Body: { id, reply, language? }
// Ported from TT send-inbox-reply — fixed to be language-aware (TT was EN-only).
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { brandedEmail, sendEmail } from '@/lib/email';
import { isLocale } from '@/lib/locales';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  const reply = String(body.reply || '').trim();
  const locale = isLocale(String(body.language)) ? body.language : 'en';
  if (!id || !reply) return NextResponse.json({ ok: false, error: 'id and reply required' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: msg } = await sb.from('contact_messages').select('name, email, subject').eq('id', id).single();
  if (!msg) return NextResponse.json({ ok: false, error: 'message not found' }, { status: 404 });
  const m = msg as { name: string; email: string; subject: string | null };

  const subject = m.subject ? `Re: ${m.subject}` : 'Cyprus Lifestyle';
  const html = brandedEmail({
    locale,
    heading: subject,
    bodyHtml: `<p>${reply.replace(/\n/g, '<br>')}</p><p style="color:#6b665a">— Cyprus Lifestyle</p>`,
    preheader: subject,
  });
  const sent = await sendEmail({ to: m.email, subject, html });
  if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error }, { status: 502 });

  await sb.from('contact_messages').update({ status: 'replied', admin_reply: reply, replied_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}
