// lib/journalism/progress.ts — "is this version really better?" for a text that is judged by findings. Pure (no imports), so the edge
// function (generated copy), the pipeline, the voice worker and the admin repair route all ask the SAME question.
//
// Why it exists: the displayed score stops at 100. A text with eight serious findings and the same text with six of them show 100 both,
// so a rule "accept the rewrite only if its score is lower" throws the better version away. The first live run of the new desk (9 Oct
// 2026) ended with three editions at 100 although the sub-editor had already removed part of the findings; the old and the new text
// looked identical to the rule. The WEIGHT of the findings has neither ceiling nor cap on the count, so progress stays visible.
//
// The weight: severity (high 40, medium 7, low 3, the score's own weights) × (1 for the first occurrence + 0.7 for each further one).
// It is only ever compared with another weight of the same kind, never with the displayed score.

export interface Weighed { key?: string; severity?: string; count?: number }
export interface Judged { score: number; tells: ReadonlyArray<Weighed>; raw?: number }

const WEIGHT: Record<string, number> = { high: 40, medium: 7, low: 3 };
/** Findings whose `count` is the size of the text (paragraphs), not the number of times the fault occurs: they weigh once. */
const COUNTS_THE_TEXT = new Set(['uniform_paragraphs']);

/** Smallest weight difference (points) that counts as progress at the same displayed score: one "low" finding is 3, so any real fix passes. */
export const PROGRESS_MARGIN = 2;

/** The weight of a list of findings. */
export function findingsWeight(tells: ReadonlyArray<Weighed>): number {
  let sum = 0;
  for (const t of tells) {
    const w = WEIGHT[String(t.severity)] ?? 0;
    const n = COUNTS_THE_TEXT.has(String(t.key)) ? 1 : Math.max(1, Math.floor(Number(t.count) || 1));
    sum += w * (1 + 0.7 * (n - 1));
  }
  return sum;
}

/** The weight of a judged text: the judge's own `raw` when it sends one, else computed from its findings. */
export function rawOf(j: Judged): number {
  return typeof j.raw === 'number' && Number.isFinite(j.raw) ? j.raw : findingsWeight(j.tells);
}

/**
 * true when `after` is a real improvement on `before`: its score is never higher, and it is either lower or (at the same displayed
 * score, which at the ceiling hides everything) the weight of its findings is clearly lower. Equal is not better.
 */
export function isImprovement(before: Judged, after: Judged): boolean {
  if (after.score > before.score) return false;
  if (after.score < before.score) return true;
  return rawOf(after) < rawOf(before) - PROGRESS_MARGIN;
}
