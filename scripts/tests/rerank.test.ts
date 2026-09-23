// Rerank + commercial tier (CI-7) — the pure ordering maths. This decides trust AND
// revenue, so the invariants must hold exactly: relevance dominates (an irrelevant paying
// partner never wins), tier boosts within a relevance band, and we never drop everything.
import { commercialTier, fuseScore, applyRerank, type Rankable } from '@/lib/concierge/rerank';
import { eq, ok, report } from './_harness';

const mk = (slug: string, o: Partial<Rankable> = {}): Rankable => ({ slug, name: slug, featured: false, verified: false, rating: null, ...o });

// ── commercialTier — the real CRM tier (commercialRank) is authoritative; booleans fall back
eq('partner rank 3 → 3', commercialTier({ commercialRank: 3 }), 3);
eq('featured rank 2 → 2', commercialTier({ commercialRank: 2 }), 2);
eq('listed rank 1 → 1', commercialTier({ commercialRank: 1 }), 1);
eq('legacy featured boolean → 2', commercialTier({ featured: true }), 2);
eq('verified (unpaid) → 1', commercialTier({ verified: true }), 1);
eq('neither → 0', commercialTier({}), 0);
eq('CRM rank overrides booleans', commercialTier({ commercialRank: 3, featured: true, verified: true }), 3);

// ── fuseScore: relevance dominates, tier boosts, rating breaks ties ────────────────
eq('score = relevance*10 + tier*2 + rating', fuseScore(3, 3, 4.5), 40.5);
ok('a relevant non-partner beats an irrelevant partner', fuseScore(3, 0, 0) > fuseScore(0, 3, 5));
ok('within the same relevance, the partner leads', fuseScore(3, 3, 0) > fuseScore(3, 0, 0));
ok('within the same relevance & tier, higher rating leads', fuseScore(2, 1, 4.8) > fuseScore(2, 1, 3.1));

// ── applyRerank: the guest-visible ordering ────────────────────────────────────────
// 1. Relevance gate — the wrong-category candidate (a taxi for a locksmith query) drops.
{
  const out = applyRerank([mk('locksmith'), mk('taxi')], { locksmith: 3, taxi: 0 });
  eq('irrelevant dropped', out.length, 1);
  eq('the locksmith remains', out[0].slug, 'locksmith');
}
// 2. Tier boost within the same relevance band — the paying partner leads.
{
  const out = applyRerank([mk('g2'), mk('g1', { featured: true })], { g1: 3, g2: 3 });
  eq('featured partner leads among equal matches', out[0].slug, 'g1');
}
// 3. Relevance dominates tier — a strong non-partner beats a weak paying partner.
{
  const out = applyRerank([mk('partner', { featured: true }), mk('strong')], { strong: 3, partner: 1 });
  eq('best match leads even over a partner', out[0].slug, 'strong');
}
// 4. Never drop everything — if nothing is relevant, keep them all (ranked).
{
  const out = applyRerank([mk('a'), mk('b')], { a: 0, b: 0 });
  eq('nothing relevant → keep all', out.length, 2);
}
// 5. Unknown score → treated as weakly relevant (kept, not dropped).
{
  const out = applyRerank([mk('z')], {});
  eq('unscored candidate is kept', out.length, 1);
}
// 6. Rating tie-break within equal relevance & tier.
{
  const out = applyRerank([mk('low', { rating: 3.0 }), mk('high', { rating: 4.9 })], { low: 2, high: 2 });
  eq('higher rating leads on a tie', out[0].slug, 'high');
}
// 7. CRM tier ladder — a Partner (rank 3) leads a Featured (rank 2) at equal relevance.
{
  const out = applyRerank([mk('feat', { commercialRank: 2 }), mk('partner', { commercialRank: 3 })], { feat: 3, partner: 3 });
  eq('partner leads featured at equal relevance', out[0].slug, 'partner');
}
// 8. Relevance still gates the CRM tier — an exact non-partner beats a weakly-relevant partner.
{
  const out = applyRerank([mk('partner', { commercialRank: 3 }), mk('exact')], { exact: 3, partner: 1 });
  eq('exact match beats a weakly-relevant partner', out[0].slug, 'exact');
}

report('rerank.pure');
