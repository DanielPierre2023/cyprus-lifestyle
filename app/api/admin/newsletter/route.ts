// Admin: the Friday newsletter workflow.  POST { action, id?, locale? }
//   prepare     create this week's drafts (all editions, or one with `locale`). Idempotent. Sends nothing.
//   regenerate  rebuild this week's drafts from the latest articles (drafts only; `locale` optional)
//   test        mail the draft `id` to the signed-in administrator only
//   approve     approve draft `id` and start sending it right away (the 3-minute sender finishes large lists)
//   cancel      discard draft/approved campaign `id`
// There is deliberately no "send immediately without approval" action.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { approveCampaign, cancelCampaign, prepareDigest, sendApproved, sendTest } from '@/lib/newsletterDigest';
import { auditLog } from '@/lib/audit';
import { isLocale } from '@/lib/locales';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  const id = String(body.id || '');
  const only = isLocale(String(body.locale)) ? body.locale : undefined;

  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const actor = { actor: user?.id ?? null, actorEmail: user?.email ?? null };
  const sb = supabaseAdmin();

  if (action === 'prepare' || action === 'regenerate') {
    const r = await prepareDigest(sb, { only, regenerate: action === 'regenerate', force: body.force === true });
    await auditLog(sb, { ...actor, action: `newsletter.${action}`, table: 'newsletter_campaigns', summary: `${r.week}: created ${r.created.join(',') || '-'}, refreshed ${r.refreshed.join(',') || '-'}` });
    return NextResponse.json({ ok: true, ...r });
  }

  if (!id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });

  if (action === 'test') {
    if (!user?.email) return NextResponse.json({ ok: false, error: 'Your account has no e-mail address.' }, { status: 400 });
    const r = await sendTest(sb, id, user.email);
    return NextResponse.json({ ok: r.ok, error: r.error, to: user.email });
  }

  if (action === 'approve') {
    const a = await approveCampaign(sb, id, user?.id ?? null);
    if (!a.ok) return NextResponse.json({ ok: false, error: a.error }, { status: 409 });
    await auditLog(sb, { ...actor, action: 'newsletter.approve', table: 'newsletter_campaigns', rowId: id, summary: 'approved for sending' });
    const sent = await sendApproved(sb, { deadlineMs: 45_000 });
    return NextResponse.json({ ok: true, ...sent });
  }

  if (action === 'cancel') {
    const done = await cancelCampaign(sb, id);
    if (done) await auditLog(sb, { ...actor, action: 'newsletter.cancel', table: 'newsletter_campaigns', rowId: id });
    return NextResponse.json({ ok: done, error: done ? undefined : 'Only a draft or an approved campaign can be cancelled.' });
  }

  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
}
