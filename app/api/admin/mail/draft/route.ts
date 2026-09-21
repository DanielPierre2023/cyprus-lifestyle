// POST /api/admin/mail/draft — AI-draft (or polish) a reply to an inbound email.
// The SAME concierge brain that powers the chat writes the correspondence: it
// detects the guest's language, grounds on the real directory + knowledge base
// (so prices, places and facts are true, never invented), speaks in the Cyprus
// Lifestyle voice, and writes as the desk the mail was addressed to. It returns
// plain text for the admin to review and edit; sending stays a deliberate click
// via /api/admin/mail/reply (which formats + signs it). Admin only.
//
// The drafting itself lives in lib/mail/assist.ts (composeReply), shared verbatim
// with draft-on-arrival — so the reply waiting in the inbox and the one this button
// produces are written by exactly the same grounded logic.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { composeReply } from '@/lib/mail/assist';
import { isLocale } from '@/lib/locales';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  const mode = body.mode === 'polish' ? 'polish' : 'compose';
  const instruction = String(body.instruction || '').trim().slice(0, 4000);
  const localeHint = isLocale(String(body.locale)) ? String(body.locale) : undefined;
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  if (mode === 'polish' && instruction.length < 1) {
    return NextResponse.json({ ok: false, error: 'Nothing to polish — write a draft first.' }, { status: 400 });
  }

  const { data: row } = await supabaseAdmin().from('inbound_emails')
    .select('id, from_email, from_name, to_email, subject, text_body, html_body, in_reply_to, message_id').eq('id', id).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, error: 'message not found' }, { status: 404 });

  const drafted = await composeReply(row, { mode, instruction, locale: localeHint });
  if (!drafted.body) return NextResponse.json({ ok: false, error: drafted.error || 'no draft produced' }, { status: 502 });

  const subject = String(row.subject || '');
  return NextResponse.json({
    ok: true,
    body: drafted.body,
    subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
    locale: drafted.locale,
    desk: drafted.desk,
    grounded: drafted.grounded,
  });
}
