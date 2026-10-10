// lib/voice/accept.ts — may a rewrite replace the text that is live? Pure, unit-tested; the admin "Rewrite" route asks it.
//
// The rules, in order, and why:
//  • an empty edition takes anything usable (nothing is lost);
//  • figures, quotations and the like must still match the source (a rewrite that changes a fact is never saved);
//  • otherwise it is saved only when it is a REAL improvement: a lower score, or at the score ceiling of 100 a clearly lower weight of
//    findings (lib/journalism/progress.ts). "Equal" is not better: before this rule a text that already showed 100 was replaced by
//    any rewrite, however bad, because "100 or less" is always true;
//  • one exception: a rewrite that brings an edition back in line with its siblings (it was far too short or too long, or lacked
//    figures the others carry) is saved when its score is not worse, even if the score does not move.
import { isImprovement, type Judged } from '@/lib/journalism/progress';

export interface RewriteInput {
  hadNothing: boolean;
  factsOk: boolean;
  factReasons?: string[];
  before: Judged;
  after: Judged;
  /** The edition was out of line with the other editions and the rewrite puts it back in line (lib/voice/parity.ts). */
  parityFixed?: boolean;
}
export interface RewriteVerdict { save: boolean; note: string }

export function judgeRewrite(i: RewriteInput): RewriteVerdict {
  if (i.hadNothing) return { save: true, note: '' };
  if (!i.factsOk) return { save: false, note: `Rewrite not saved: ${(i.factReasons || []).join('; ') || 'facts differ from the source'}.` };
  if (isImprovement(i.before, i.after)) return { save: true, note: '' };
  if (i.parityFixed && i.after.score <= i.before.score) return { save: true, note: '' };
  if (i.after.score > i.before.score) return { save: false, note: `Rewrite scored worse (${i.after.score}, the text now live: ${i.before.score}), so nothing was saved.` };
  return { save: false, note: `Rewrite was no better than the text now live (score ${i.after.score}, the same findings), so nothing was saved.` };
}
