// lib/editorial/planner.ts
// ============================================================================
// THE EDITORIAL PLANNER — pure logic (NO I/O), so it is unit-tested and shared by
// the server runner (lib/editorial/plan.ts). It knows the island's editorial
// calendar, builds the research + ideation prompts, and provides the cheap
// redundancy helpers. The server runner does the model calls, the web search, the
// embedding de-dup and the writes.
//
// The loop the runner implements, using this module:
//   SENSE  gaps (editorial_plan) + signals (season here, web + demand in the runner)
//   IDEATE candidate themes for an under-served subcategory (ideatePrompt)
//   DEDUP  normalise/hash titles (here) + semantic match (pgvector, in the runner)
//   PLAN   each survivor carries an accurate research brief (the model returns it)
// ============================================================================

import type { EditorialSection } from '@/lib/editorial/taxonomy';
import { FRANCHISE_KEYS } from '@/lib/editorial/pipeline';

// ── The Cyprus editorial calendar — what is genuinely "in" each month ──────────
// Short, factual seasonal notes (Republic of Cyprus). Grounds ideation so the
// planner leads with what the island is actually living through that month.
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const SEASONAL: Record<number, string> = {
  1:  'New year on the island: winter city breaks, indoor culture, the January table, and snow and skiing on Troodos.',
  2:  'Carnival season (Limassol Carnival), almond blossom, citrus at its peak, and romantic winter dining.',
  3:  'Green Monday and the start of Lent (nistisima cooking), spring wildflowers, and the first Akamas hikes.',
  4:  'Orthodox Easter and spring: flower festivals, lamb and flaounes, the sea beginning to warm.',
  5:  'Anthestiria flower festivals, the wine routes reopening, early-season beaches and the return of outdoor dining.',
  6:  'Summer opens: Kataklysmos (the Festival of the Flood) in Larnaca, beach clubs, and the festival calendar filling up.',
  7:  'High summer: festivals and nightlife, yachting and sea days, and cool escapes up to Troodos.',
  8:  'Peak season and the Assumption (Dekapentavgoustos, 15 Aug); the grape harvest begins in the wine villages.',
  9:  'Wine harvest and the Limassol Wine Festival; the shoulder season and the cultural year restarting.',
  10: 'Autumn: the olive harvest, wine and commandaria, quieter escapes and the best hiking weather.',
  11: 'Off-season depth: gastronomy, indoor culture, commandaria and the practical business of relocation.',
  12: 'The festive season: Christmas markets, the New Year table, year-in-review, and snow on Troodos.',
};

// monthIndex: 1–12. Returns the seasonal note (empty-safe).
export function seasonalNote(monthIndex: number): string {
  return SEASONAL[monthIndex] || '';
}
export function monthName(monthIndex: number): string {
  return MONTH_NAMES[(monthIndex - 1 + 12) % 12] || '';
}

// ── Redundancy helpers (cheap, exact-ish) ──────────────────────────────────────
export function normalizeTitle(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’"“”]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|of|in|on|at|to|and|with|for|cyprus|cypriot)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
// Stable short hash (djb2) of the normalised title — an exact-duplicate guard.
export function dedupHash(s: string): string {
  const n = normalizeTitle(s);
  let h = 5381;
  for (let i = 0; i < n.length; i++) h = ((h << 5) + h + n.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
// Jaccard word overlap of two titles (0..1) — a cheap near-duplicate signal that
// works before embeddings are available.
export function titleSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeTitle(a).split(' ').filter(Boolean));
  const wb = new Set(normalizeTitle(b).split(' ').filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}
// Is a candidate title too close to something we already have?
export function isTitleRedundant(candidate: string, existing: string[], threshold = 0.6): boolean {
  const h = dedupHash(candidate);
  return existing.some((e) => dedupHash(e) === h || titleSimilarity(candidate, e) >= threshold);
}

// ── Web-research queries — "what's in and of interest" for this section, now ────
export function researchQueriesFor(section: EditorialSection, monthIndex: number): string[] {
  const m = monthName(monthIndex);
  const s = section.name;
  return [
    `${s} Cyprus ${m} ${new Date().getFullYear()} what's new openings events`,
    `Cyprus ${s.toLowerCase()} trends ${m} best new`,
  ];
}

// ── Prompt builders ─────────────────────────────────────────────────────────────
const PLANNER_VOICE =
  'You are the commissioning editor and trends researcher for Cyprus Lifestyle, a premium multilingual ' +
  'magazine for discerning residents of, and movers to, the Republic of Cyprus (the south only — never ' +
  'Northern Cyprus). You plan a high-quality editorial calendar: you know what is genuinely happening and ' +
  'of interest on the island right now, you never propose thin or clickbait pieces, and you never invent ' +
  'facts, events, awards or businesses. When you are unsure a thing is real, you frame it as something the ' +
  'journalist must verify rather than asserting it.';

export function plannerSystem(): string {
  return PLANNER_VOICE;
}

export interface PlannerSignals {
  seasonal: string;              // seasonalNote()
  web?: string;                  // digest of live web-search findings (may be empty)
  demand?: string[];             // reader-demand signals (concierge questions / searches) — may be empty
  candidates?: { name: string; slug?: string; district?: string | null }[]; // directory businesses to consider featuring
}

// Build the user message that asks for N grounded ideas for ONE subcategory.
export function ideatePrompt(params: {
  section: EditorialSection;
  departmentName: string;
  monthIndex: number;
  count: number;
  signals: PlannerSignals;
  existingTitles: string[];      // titles already published or queued — do NOT repeat these
}): string {
  const { section, departmentName, monthIndex, count, signals, existingTitles } = params;
  const lines: string[] = [];
  lines.push(`SECTION: ${departmentName} → ${section.name}`);
  lines.push(`REMIT: ${section.description}`);
  if (section.franchiseKey) lines.push(`DEFAULT FRANCHISE: ${section.franchiseKey}`);
  lines.push(`MONTH: ${monthName(monthIndex)}`);
  lines.push('');
  lines.push(`SEASONAL CONTEXT: ${signals.seasonal}`);
  if (signals.web && signals.web.trim()) lines.push(`\nLIVE RESEARCH (from the web — treat as leads to verify, not settled fact):\n${signals.web.trim()}`);
  if (signals.demand && signals.demand.length) lines.push(`\nREADER DEMAND (what our audience is actually asking about): ${signals.demand.join('; ')}`);
  if (signals.candidates && signals.candidates.length) {
    lines.push('\nCANDIDATE SUBJECTS from our directory (prefer featuring a real one where it fits):');
    for (const c of signals.candidates.slice(0, 12)) lines.push(`  - ${c.name}${c.district ? ` (${c.district})` : ''}${c.slug ? ` [slug:${c.slug}]` : ''}`);
  }
  if (existingTitles.length) {
    lines.push('\nALREADY PUBLISHED OR QUEUED — do NOT propose anything that duplicates or lightly rewords these:');
    for (const t of existingTitles.slice(0, 40)) lines.push(`  · ${t}`);
  }
  lines.push('');
  lines.push(
    `TASK: Propose ${count} DISTINCT, high-quality article ideas for this section for ${monthName(monthIndex)}, ` +
    'each genuinely of interest now and none redundant with the list above. For each idea give: a working ' +
    'title; the ONE angle; a short "why now" rationale; the subject (name the directory candidate by its ' +
    'slug when you use one, else describe what to find); the best franchise; whether it is desk-writable now ' +
    'or needs a VISIT or an INTERVIEW; a target word count; a 3–5 point outline; and 1–3 things the writer ' +
    'must verify. Ground everything; invent nothing.',
  );
  lines.push('');
  lines.push(
    'Return ONLY JSON: {"ideas":[{"workingTitle":"","angle":"","rationale":"","subjectSlug":"",' +
    '"subjectHint":"","franchise":"","needs":"desk|visit|interview","wordTarget":0,' +
    '"outline":["",""],"verify":["",""]}]}',
  );
  return lines.join('\n');
}

// ── Coerce + validate model output ──────────────────────────────────────────────
export interface IdeaCandidate {
  workingTitle: string;
  angle: string;
  rationale: string;
  subjectSlug: string | null;
  subjectHint: string | null;
  franchise: string | null;
  needs: 'desk' | 'visit' | 'interview';
  wordTarget: number | null;
  outline: string[];
  verify: string[];
}

function str(v: unknown): string { return typeof v === 'string' ? v.trim() : ''; }
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, 8) : [];
}

export function coerceIdeas(raw: unknown): IdeaCandidate[] {
  const arr = raw && typeof raw === 'object' && Array.isArray((raw as { ideas?: unknown[] }).ideas)
    ? (raw as { ideas: unknown[] }).ideas : [];
  const out: IdeaCandidate[] = [];
  for (const item of arr) {
    const o = (item && typeof item === 'object') ? item as Record<string, unknown> : {};
    const workingTitle = str(o.workingTitle);
    if (!workingTitle) continue;
    const needsRaw = str(o.needs).toLowerCase();
    const needs: IdeaCandidate['needs'] = needsRaw === 'visit' || needsRaw === 'interview' ? needsRaw : 'desk';
    const franchise = str(o.franchise);
    const wt = Number(o.wordTarget);
    out.push({
      workingTitle,
      angle: str(o.angle),
      rationale: str(o.rationale),
      subjectSlug: str(o.subjectSlug) || null,
      subjectHint: str(o.subjectHint) || null,
      franchise: franchise && FRANCHISE_KEYS.has(franchise) ? franchise : null,
      needs,
      wordTarget: Number.isFinite(wt) && wt > 0 ? Math.round(wt) : null,
      outline: strArr(o.outline),
      verify: strArr(o.verify),
    });
  }
  return out;
}

// De-duplicate a fresh candidate batch against existing titles AND within itself.
export function filterRedundant(candidates: IdeaCandidate[], existingTitles: string[], threshold = 0.6): IdeaCandidate[] {
  const kept: IdeaCandidate[] = [];
  const seen = [...existingTitles];
  for (const c of candidates) {
    if (isTitleRedundant(c.workingTitle, seen, threshold)) continue;
    kept.push(c);
    seen.push(c.workingTitle);
  }
  return kept;
}
