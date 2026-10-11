// Admin → Members.
//   GET                          list + statistics
//   POST { action:'grant',     email }   give a complimentary membership (the person restores it on a device with the
//                                        "Email me a link" box on /membership — same proof-of-mailbox flow as paid members)
//   POST { action:'revoke',    id }      end a COMPLIMENTARY membership (paid ones are cancelled in Stripe)
//   POST { action:'reinstate', id }      undo a revoke of a complimentary membership
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditLog } from '@/lib/audit';
import { vatConfigStatus } from '@/lib/vat/status';
import { checkGrant, isComp, memberStats, type MemberRow } from '@/lib/membersAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLS = 'id, email, tier, status, created_at, current_period_end, cancel_at_period_end, stripe_subscription_id, last_login_at, profile';
const forbidden = () => NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

export async function GET() {
  if (!(await isAdmin())) return forbidden();
  const { data, error } = await supabaseAdmin().from('concierge_members').select(COLS).order('created_at', { ascending: false }).limit(2000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const rows = ((data || []) as unknown as MemberRow[]).map((m) => ({ ...m, profile: m.profile?.comp ? { comp: m.profile.comp } : null })); // never ship the whole profile
  const cfg = vatConfigStatus();
  return NextResponse.json({ ok: true, rows, stats: memberStats(rows, cfg.membershipPriceEur, cfg.membershipInterval), price: cfg.membershipPriceEur, interval: cfg.membershipInterval });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  const sb = supabaseAdmin();
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const actor = { actor: user?.id ?? null, actorEmail: user?.email ?? null };

  if (action === 'grant') {
    const { data: existing } = await sb.from('concierge_members').select('email, status').ilike('email', String(body.email || '').trim().replace(/([\\%_])/g, '\\$1'));
    const chk = checkGrant(body.email, (existing || []) as MemberRow[]);
    if (!chk.ok) return NextResponse.json({ ok: false, error: chk.error }, { status: 400 });
    const note = String(body.note || '').trim().slice(0, 200);
    const { data, error } = await sb.from('concierge_members').insert({
      email: chk.email, tier: 'concierge', status: 'active',
      profile: { comp: { by: user?.email ?? null, note, at: new Date().toISOString() } },
    }).select('id').single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await auditLog(sb, { ...actor, action: 'member.grant', table: 'concierge_members', rowId: String(data.id), summary: `complimentary membership for ${chk.email}`, changes: { note } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'revoke' || action === 'reinstate') {
    const id = String(body.id || '');
    const { data: m } = await sb.from('concierge_members').select('id, email, status, stripe_subscription_id').eq('id', id).maybeSingle();
    if (!m) return NextResponse.json({ ok: false, error: 'Member not found.' }, { status: 404 });
    if (!isComp(m as MemberRow)) return NextResponse.json({ ok: false, error: 'This member pays through Stripe — cancel the subscription in Stripe (the webhook then updates this page).' }, { status: 409 });
    const status = action === 'revoke' ? 'canceled' : 'active';
    const { error } = await sb.from('concierge_members').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await auditLog(sb, { ...actor, action: `member.${action}`, table: 'concierge_members', rowId: id, summary: `${action} complimentary membership of ${m.email}` });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
}
