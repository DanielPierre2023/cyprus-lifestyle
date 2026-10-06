// lib/member/cardView.ts — assembles what /account shows for the member card (server only). Never throws: if anything is
// missing (migration not applied, no secret configured) the account page simply shows no card.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cardSecret, cardVerifyUrl, cleanCardName, memberSinceYear } from '@/lib/member/card';
import { ensureCard, liveOffers } from '@/lib/member/cardStore';
import { offerText } from '@/lib/member/offers';
import { cardCopy } from '@/lib/member/cardCopy';
import { entitled, type MemberLike } from '@/lib/member/entitlement';
import type { CardPanelProps } from '@/components/account/MemberCardPanel';

export async function cardView(
  sb: SupabaseClient, member: MemberLike & { id: string; created_at?: string | null }, locale: string,
  siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu', now: Date = new Date(),
): Promise<CardPanelProps | null> {
  try {
    if (!entitled(member, now)) return null;                      // an ended membership has no card
    const secret = cardSecret();
    if (!secret) return null;
    const card = await ensureCard(sb, member.id, secret);
    if (!card) return null;
    const offers = await liveOffers(sb, now);
    return {
      copy: cardCopy(locale),
      verifyUrl: cardVerifyUrl(siteUrl, locale, card.token),
      sinceYear: memberSinceYear(member.created_at),
      name: cleanCardName(card.displayName),
      offers: offers.map((o) => ({ id: o.id, partner: o.partner_name, text: offerText(o, locale) })),
    };
  } catch { return null; }
}

/** Remember the edition the member last used, so lifecycle e-mails come in their language. Best-effort. */
export async function rememberLocale(sb: SupabaseClient, memberId: string, stored: string | null | undefined, locale: string): Promise<void> {
  if (stored === locale) return;
  try { await sb.from('concierge_members').update({ locale }).eq('id', memberId); } catch { /* best effort */ }
}
