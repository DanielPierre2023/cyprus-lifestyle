// lib/member/cardStore.ts — database side of the member card, partner offers and redemptions (service role; RLS on, no policies).
// Every function takes the client as a parameter so it is unit-tested against an in-memory fake. Nothing here throws on a
// database failure that a visitor could trigger: lookups return null, writes return a result code.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hashRestoreToken, isPlausibleRestoreToken } from '@/lib/concierge/restoreToken';
import { deriveCardToken, cleanCardName, type CardMember } from '@/lib/member/card';
import { cyprusToday, offerIsLive, type OfferRow } from '@/lib/member/offers';

export const CARD_MEMBER_COLS = 'id, status, current_period_end, updated_at, stripe_subscription_id, created_at';
const OFFER_COLS = 'id, partner_name, offer_en, translations, valid_from, valid_to, active';

export interface CardInfo { token: string; version: number; displayName: string | null }

/** The member's card, registered in the database. Self-healing: a changed secret just re-registers the new hash. */
export async function ensureCard(sb: SupabaseClient, memberId: string, secret: string): Promise<CardInfo | null> {
  try {
    const read = () => sb.from('member_cards').select('member_id, token_hash, version, display_name').eq('member_id', memberId).maybeSingle();
    let { data: row } = await read();
    if (!row) {
      const hash = hashRestoreToken(deriveCardToken(secret, memberId, 1));
      const ins = await sb.from('member_cards').insert({ member_id: memberId, token_hash: hash, version: 1 });
      if (ins.error && (ins.error as { code?: string }).code !== '23505') return null;
      ({ data: row } = await read());
      if (!row) return null;
    }
    const version = Number(row.version) || 1;
    const token = deriveCardToken(secret, memberId, version);
    const hash = hashRestoreToken(token);
    if (row.token_hash !== hash) {
      const up = await sb.from('member_cards').update({ token_hash: hash }).eq('member_id', memberId);
      if (up.error) return null;
    }
    return { token, version, displayName: (row.display_name as string | null) ?? null };
  } catch { return null; }
}

/** Replace the card: the old token stops resolving at once. */
export async function rotateCard(sb: SupabaseClient, memberId: string, secret: string, now: Date = new Date()): Promise<CardInfo | null> {
  const cur = await ensureCard(sb, memberId, secret);
  if (!cur) return null;
  const version = cur.version + 1;
  const token = deriveCardToken(secret, memberId, version);
  try {
    const { data, error } = await sb.from('member_cards')
      .update({ version, token_hash: hashRestoreToken(token), rotated_at: now.toISOString() })
      .eq('member_id', memberId).eq('version', cur.version).select('member_id');
    if (error || !data || data.length === 0) return null;
    return { token, version, displayName: cur.displayName };
  } catch { return null; }
}

/** Set (or clear, with null / '') the name shown on the card. Returns false when the text is not an acceptable first name. */
export async function setCardName(sb: SupabaseClient, memberId: string, raw: unknown): Promise<boolean> {
  const empty = raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');
  const name = empty ? null : cleanCardName(raw);
  if (!empty && !name) return false;
  try {
    const { data, error } = await sb.from('member_cards').update({ display_name: name }).eq('member_id', memberId).select('member_id');
    return !error && !!data && data.length === 1;
  } catch { return false; }
}

/** Resolve a token from a scanned QR code. null = unknown / replaced token. */
export async function lookupCard(sb: SupabaseClient, token: unknown): Promise<{ member: CardMember; displayName: string | null } | null> {
  if (!isPlausibleRestoreToken(token)) return null;
  try {
    const { data: card } = await sb.from('member_cards').select('member_id, display_name').eq('token_hash', hashRestoreToken(token)).maybeSingle();
    if (!card) return null;
    const { data: m } = await sb.from('concierge_members').select(CARD_MEMBER_COLS).eq('id', card.member_id).maybeSingle();
    if (!m) return null;
    return { member: m as unknown as CardMember, displayName: (card.display_name as string | null) ?? null };
  } catch { return null; }
}

/** Offers currently shown on the card (active flag + validity window). Empty by default. */
export async function liveOffers(sb: SupabaseClient, now: Date = new Date()): Promise<OfferRow[]> {
  try {
    const { data } = await sb.from('member_offers').select(OFFER_COLS).eq('active', true).order('created_at', { ascending: true }).limit(50);
    return ((data as OfferRow[] | null) || []).filter((o) => offerIsLive(o, now));
  } catch { return []; }
}

/** Which of these offers has this member already redeemed today (Cyprus day)? */
export async function redeemedToday(sb: SupabaseClient, memberId: string, offerIds: string[], now: Date = new Date()): Promise<Set<string>> {
  if (offerIds.length === 0) return new Set();
  try {
    const { data } = await sb.from('member_redemptions').select('offer_id').eq('member_id', memberId).eq('redeemed_day', cyprusToday(now)).in('offer_id', offerIds);
    return new Set(((data as { offer_id: string }[] | null) || []).map((r) => String(r.offer_id)));
  } catch { return new Set(); }
}

export type RedeemOutcome = 'ok' | 'already' | 'unavailable' | 'error';

/** Log one redemption: offer + member id + time, nothing else. The unique index enforces one per member per offer per day. */
export async function redeemOffer(sb: SupabaseClient, memberId: string, offerId: string, now: Date = new Date()): Promise<RedeemOutcome> {
  if (!/^[0-9a-f-]{36}$/i.test(offerId)) return 'unavailable';
  try {
    const { data: offer } = await sb.from('member_offers').select(OFFER_COLS).eq('id', offerId).maybeSingle();
    if (!offer || !offerIsLive(offer as OfferRow, now)) return 'unavailable';
    const { error } = await sb.from('member_redemptions').insert({ offer_id: offerId, member_id: memberId, redeemed_at: now.toISOString(), redeemed_day: cyprusToday(now) });
    if (!error) return 'ok';
    return (error as { code?: string }).code === '23505' ? 'already' : 'error';
  } catch { return 'error'; }
}
