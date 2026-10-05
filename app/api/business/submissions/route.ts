// POST /api/business/submissions — a signed-in business talks to the editorial desk about ITS OWN listing.
//   { action:'create',   listingSlug, kind:'description'|'photos'|'news', payload }
//   { action:'revise',   id, payload }     edit a proposal the desk sent back and resubmit it
//   { action:'withdraw', id }
// Nothing here changes a listing: proposals wait in the admin queue (Admin → Business Hub) until a person decides.
import { NextRequest, NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, brandedEmail } from '@/lib/email';
import { SESSION_COOKIE, resolveBusinessSession } from '@/lib/business/auth';
import { createSubmission, reviseSubmission, withdrawSubmission } from '@/lib/business/data';
import { sameOrigin } from '@/lib/member/session';

export const runtime = 'nodejs';
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const s = await resolveBusinessSession(sb, (await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false, error: 'signin' }, { status: 401 });
  if (!(await rateLimit(req, 'business-submissions', 20, 600))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = String(body.action || '');

  if (action === 'withdraw') {
    const ok = await withdrawSubmission(sb, s.account.id, body.id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  }
  const r = action === 'revise'
    ? await reviseSubmission(sb, s.account, body.id, body.payload)
    : action === 'create'
      ? await createSubmission(sb, s.account, { listingSlug: body.listingSlug, kind: body.kind, payload: body.payload })
      : null;
  if (!r) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error, detail: r.detail }, { status: r.error === 'forbidden' ? 403 : r.error === 'failed' ? 500 : 400 });

  // Tell the desk (English, best-effort).
  after(async () => {
    const to = process.env.DIRECTORY_INBOX || process.env.ADVERTISE_INBOX || process.env.EMAIL_FROM;
    if (!to) return;
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');
    const html = brandedEmail({
      locale: 'en', heading: action === 'revise' ? 'A business resubmitted a proposal' : 'A business sent a proposal',
      bodyHtml: `<p><strong>${esc(s.account.email)}</strong> sent a proposal for the desk to review.</p><p>Open Admin → Business Hub to decide.</p>`,
      ctaLabel: 'Open the queue', ctaUrl: `${base}/admin/business`, preheader: 'Business Hub proposal waiting',
    });
    await sendEmail({ to, subject: 'Business Hub — proposal waiting', html }).catch(() => {});
  });
  return NextResponse.json({ ok: true });
}
