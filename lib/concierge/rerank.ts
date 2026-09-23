// lib/concierge/rerank.ts
// ============================================================================
// RERANK + COMMERCIAL TIER (CI-7) — the precision + revenue layer.
// ----------------------------------------------------------------------------
// Retrieval gives us a good candidate SET (semantic + keyword). This decides the
// ORDER, which is where trust and money live:
//   • PRECISION — a cheap LLM scores how well each candidate actually matches the
//     request (0 = wrong category, 3 = exact). This removes the "taxi ranked first
//     for a locksmith query" failure: the taxi scores 0 and drops out.
//   • COMMERCE — among genuinely relevant results, paying subscribers lead, in the
//     order of the tier they bought (Partner/Featured > verified organic > basic).
// The fusion keeps it honest: RELEVANCE dominates (×10), tier is a booster (×2), so a
// paying partner can never outrank a clearly better-matched option — which is exactly
// what keeps the concierge trustworthy enough for a placement to be worth buying.
//
// Opt-in via CONCIERGE_RERANK=1 (one cheap Haiku call per turn); on error or when off,
// it returns the candidates unchanged, so the guest path always degrades cleanly.
// The pure scoring is unit-tested; only the model call is I/O.
// ============================================================================
import 'server-only';
import { callClaude, CLAUDE_HAIKU, parseAiJson } from '@/lib/ai';

// The shape the reranker needs — Pick satisfies it structurally, so brain.ts can pass
// its candidates straight through without any coupling to this module's types.
export interface Rankable {
  slug: string;
  name: string;
  type?: string;
  subtype?: string | null;
  district?: string | null;
  rating?: number | null;
  verified?: boolean;
  featured?: boolean;
}

// Commercial tier from the signals a listing already carries. `featured` is a paid
// placement (Featured/Partner); `verified` is an organic but confirmed listing; the
// rest are basic (imported). Kept as one function so the true CRM subscription tier can
// slot in here later (Phase 1) without touching the ranking maths.
export function commercialTier(p: { featured?: boolean; verified?: boolean }): number {
  if (p.featured) return 3;
  if (p.verified) return 1;
  return 0;
}

// Relevance dominates; tier is a booster; rating breaks ties. So the order is: best
// match first, and among comparable matches the higher-paying partner leads — never an
// irrelevant partner over a relevant non-partner.
export function fuseScore(relevance: number, tier: number, rating: number | null | undefined): number {
  const r = typeof rating === 'number' && isFinite(rating) ? rating : 0;
  return relevance * 10 + tier * 2 + r;
}

// Pure reorder given a relevance score per slug (0..3). Drops the clearly-irrelevant
// (relevance 0) when anything relevant remains, but never returns an empty list.
export function applyRerank<T extends Rankable>(cands: T[], relevanceBySlug: Record<string, number>): T[] {
  const scored = cands.map((c) => ({ c, r: clamp03(relevanceBySlug[c.slug]) }));
  const relevant = scored.filter((s) => s.r > 0);
  const pool = relevant.length > 0 ? relevant : scored;
  pool.sort((a, b) => fuseScore(b.r, commercialTier(b.c), b.c.rating) - fuseScore(a.r, commercialTier(a.c), a.c.rating));
  return pool.map((s) => s.c);
}

function clamp03(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1; // unknown → treat as weakly relevant, don't drop
  return Math.max(0, Math.min(3, v));
}

const SYSTEM =
  'You are ranking candidate businesses for a concierge in the Republic of Cyprus by how well each ' +
  'matches the guest request. For EACH candidate return a relevance integer 0-3: 3 = exactly the kind ' +
  'of business asked for; 2 = closely related; 1 = weakly related; 0 = wrong category / irrelevant. ' +
  'Judge the CATEGORY fit, not the location. Return ONLY JSON: {"scores":[{"slug":"<slug>","r":<0-3>}, ...]} covering every candidate.';

// Rerank the top candidates by true relevance, then commercial tier. Opt-in and
// time-boxed; returns the input unchanged on any miss so retrieval never regresses.
export async function rerankCandidates<T extends Rankable>(query: string, cands: T[], topK = 15): Promise<T[]> {
  if (process.env.CONCIERGE_RERANK !== '1') return cands;
  if (cands.length < 2 || !query.trim()) return cands;
  const head = cands.slice(0, topK);
  const tail = cands.slice(topK);
  const list = head.map((c) => `${c.slug} | ${c.name} | ${c.subtype || c.type || '?'} | ${c.district || '?'}`).join('\n');
  try {
    const r = await callClaude({
      systemInstruction: SYSTEM,
      userMessage: `GUEST REQUEST: ${query.slice(0, 400)}\n\nCANDIDATES (slug | name | category | district):\n${list}`,
      model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 700, timeoutMs: 4500, fn: 'concierge-rerank',
    });
    if (r.error || !r.text) return cands;
    const j = parseAiJson<{ scores?: { slug?: string; r?: number }[] }>(r.text);
    if (!Array.isArray(j.scores) || !j.scores.length) return cands;
    const map: Record<string, number> = {};
    for (const s of j.scores) if (s && s.slug) map[String(s.slug)] = clamp03(s.r);
    return [...applyRerank(head, map), ...tail];
  } catch {
    return cands;
  }
}
