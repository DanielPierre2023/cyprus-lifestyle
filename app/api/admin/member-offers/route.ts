// Admin → Member offers (English).
//   GET                                  every offer with its redemption counts (all time, last 30 days) and whether it is live now
//   POST { action:'save',   id?, partner_name, offer_en, translations?, valid_from?, valid_to?, active? }   create (no id) or edit
//   POST { action:'toggle', id, active }                                                                      switch an offer on / off
//   POST { action:'delete', id }                                                                              only while it has no redemptions
// Redemptions are read-only here: offer, count, time. They carry no personal data beyond a member id, which this page never shows.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditLog } from '@/lib/audit';
import { checkOfferInput, offerIsLive, type OfferRow } from '@/lib/member/offers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLS = 'id, partner_name, offer_en, translations, valid_from, valid_to, active, created_at, updated_at';
const forbidden = () => NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET() {
  if (!(await isAdmin())) return forbidden();
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('member_offers').select(COLS).order('created_at', { ascending: false }).limit(200);
  if (error) return bad(error.message, 500);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const rows = await Promise.all(((data || []) as (OfferRow & { created_at: string })[]).map(async (o) => {
    const [all, recent] = await Promise.all([
      sb.from('member_redemptions').select('id', { count: 'exact', head: true }).eq('offer_id', o.id),
      sb.from('member_redemptions').select('id', { count: 'exact', head: true }).eq('offer_id', o.id).gte('redeemed_at', since),
    ]);
    return { ...o, live: offerIsLive(o), redemptions: all.count ?? 0, redemptions30d: recent.count ?? 0 };
  }));
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  const sb = supabaseAdmin();
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const actor = { actor: user?.id ?? null, actorEmail: user?.email ?? null };
  const nowIso = new Date().toISOString();

  if (action === 'save') {
    const chk = checkOfferInput(body);
    if (!chk.ok) return bad(chk.error);
    const id = typeof body.id === 'string' && body.id ? body.id : '';
    if (id && !UUID.test(id)) return bad('Unknown offer.', 404);
    if (id) {
      const { data, error } = await sb.from('member_offers').update({ ...chk.value, updated_at: nowIso }).eq('id', id).select('id');
      if (error) return bad(error.message, 500);
      if (!data || data.length === 0) return bad('Offer not found.', 404);
      await auditLog(sb, { ...actor, action: 'member_offer.update', table: 'member_offers', rowId: id, summary: `${chk.value.partner_name}: ${chk.value.offer_en}`.slice(0, 200) });
      return NextResponse.json({ ok: true, id });
    }
    const { data, error } = await sb.from('member_offers').insert({ ...chk.value, created_by: user?.email ?? null }).select('id').single();
    if (error) return bad(error.message, 500);
    await auditLog(sb, { ...actor, action: 'member_offer.create', table: 'member_offers', rowId: String(data.id), summary: `${chk.value.partner_name}: ${chk.value.offer_en}`.slice(0, 200) });
    return NextResponse.json({ ok: true, id: data.id });
  }

  const id = String(body.id || '');
  if (!UUID.test(id)) return bad('Unknown offer.', 404);

  if (action === 'toggle') {
    const active = body.active === true;
    const { data, error } = await sb.from('member_offers').update({ active, updated_at: nowIso }).eq('id', id).select('id, partner_name');
    if (error) return bad(error.message, 500);
    if (!data || data.length === 0) return bad('Offer not found.', 404);
    await auditLog(sb, { ...actor, action: active ? 'member_offer.activate' : 'member_offer.deactivate', table: 'member_offers', rowId: id, summary: String(data[0].partner_name) });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const used = await sb.from('member_redemptions').select('id', { count: 'exact', head: true }).eq('offer_id', id);
    if ((used.count ?? 0) > 0) return bad('This offer has redemptions, so it cannot be deleted (that would erase the count). Switch it off instead.', 409);
    const { error } = await sb.from('member_offers').delete().eq('id', id);
    if (error) return bad(error.message, 500);
    await auditLog(sb, { ...actor, action: 'member_offer.delete', table: 'member_offers', rowId: id });
    return NextResponse.json({ ok: true });
  }

  return bad('unknown action');
}
