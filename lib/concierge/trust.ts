// lib/concierge/trust.ts — how much we stand behind a business, and who goes first. Pure (no I/O), unit-tested.
//
// Three trust levels (plan item S5), stated to the concierge on every business it may name:
//   partner    — pays for a placement. We act as its sales agent: it is offered FIRST among comparable businesses in its category,
//                always labelled as a partner (paid placements are never passed off as editorial).
//   verified   — our editorial team has reviewed it (directory_listings.verified). We stand behind it and recommend it.
//   unverified — a real listing from public directory data that nobody on the desk has reviewed yet. Offered all the same, with an
//                honest note that the details are general.
// A partner that is also verified is described as both. Nothing here changes who is RETRIEVED, only how it is ordered and described.

export type Trust = 'partner' | 'verified' | 'unverified';

export interface TrustFields {
  commercialTier?: string | null; // 'partner' | 'featured' | 'listed' | null — the tier actually bought (mirrored from the CRM)
  commercialRank?: number | null; // 3 / 2 / 1 / 0
  featured?: boolean;             // our own client / paid placement
  verified?: boolean;             // reviewed by our editorial team
  provenance?: string | null;     // 'owner-verified' = the owner confirmed the details through the claim flow
}

/** 3 Partner · 2 Featured · 1 Listed · 0 none. `featured` without a CRM tier counts as Featured (editorial/legacy flag). */
export function tierRank(p: TrustFields): number {
  if (typeof p.commercialRank === 'number' && p.commercialRank > 0) return Math.min(3, Math.round(p.commercialRank));
  if (p.commercialTier === 'partner') return 3;
  if (p.commercialTier === 'featured') return 2;
  if (p.commercialTier === 'listed') return 1;
  return p.featured ? 2 : 0;
}

export const isPaying = (p: TrustFields): boolean => tierRank(p) > 0;

export function trustOf(p: TrustFields): Trust {
  if (isPaying(p)) return 'partner';
  return p.verified === true ? 'verified' : 'unverified';
}

/** The tag printed next to a business in the concierge's context. English: the concierge re-expresses it in the guest's language. */
export function trustTag(p: TrustFields): string {
  const t = trustOf(p);
  const owner = p.provenance === 'owner-verified' ? ' · details confirmed by the owner' : '';
  if (t === 'partner') {
    const tier = tierRank(p) === 3 ? 'partner' : tierRank(p) === 2 ? 'featured partner' : 'listed partner';
    return `OUR ${tier.toUpperCase()} (paid placement)${p.verified === true ? ' · VERIFIED by our editorial team' : ''}${owner}`;
  }
  if (t === 'verified') return `VERIFIED by our editorial team — we stand behind it${owner}`;
  return `NOT YET REVIEWED by our editorial team — general listing information only${owner}`;
}

export interface Promotable extends TrustFields {
  slug: string;
  canonicalCategory?: string | null;
  subtype?: string | null;
}

const catOf = (p: Promotable): string | null => p.canonicalCategory || p.subtype || null;

/**
 * Sales-agent rule: among the businesses that fit the guest's category, those with a paid tier go first (Partner > Featured > Listed),
 * right after any business the guest NAMED. Guarantees:
 *   • nothing moves when no candidate pays (today: all of them) — the input comes back unchanged;
 *   • a paying business OUTSIDE the category is never pulled forward;
 *   • businesses the guest named by name stay where they are (at the front);
 *   • every other business keeps its relative order.
 * `categories` is the set of categories the request maps to; when empty, the categories of the first `lead` unnamed candidates are used.
 */
export function promotePaying<T extends Promotable>(
  cands: T[], named: ReadonlySet<string> = new Set(), categories: readonly (string | null | undefined)[] = [], lead = 3,
): T[] {
  if (!cands.some(isPaying)) return cands;
  const target = new Set<string>(categories.filter((c): c is string => !!c));
  if (!target.size) {
    for (const c of cands.filter((x) => !named.has(x.slug)).slice(0, lead)) { const k = catOf(c); if (k) target.add(k); }
  }
  if (!target.size) return cands;
  const front = cands.filter((c) => named.has(c.slug));
  const rest = cands.filter((c) => !named.has(c.slug));
  const paying = rest.filter((c) => isPaying(c) && target.has(catOf(c) as string));
  if (!paying.length) return cands;
  const payingSet = new Set(paying.map((c) => c.slug));
  paying.sort((a, b) => tierRank(b) - tierRank(a)); // stable: equal tiers keep their retrieved order
  return [...front, ...paying, ...rest.filter((c) => !payingSet.has(c.slug))];
}
