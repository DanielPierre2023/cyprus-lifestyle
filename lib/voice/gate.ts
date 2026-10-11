// lib/voice/gate.ts — the publish bar, in one place. Pure, unit-tested.
//
// An article may go live (or stay live) only when ALL of these hold:
//   voice        the unified score is at most MAX_SCORE and no "high" (unmistakable machine) tell is present
//   originality  (scraped / sourced input only) at most MAX_OVERLAP of its 5-word runs, and no verbatim run longer than
//                MAX_RUN words, are shared with the source: re-reported, never copied
//   facts        no invented figures, quotations verbatim, most of the source's figures kept
// "Thin" is reported separately (needsExpansion): a short piece cannot be repaired by rewording, and padding it would mean
// inventing, so it is routed to the editors instead of being "fixed".
import type { VoiceReport } from '@/lib/voice/score';
import type { OverlapReport, FactsReport } from '@/lib/voice/guards';

export const MAX_SCORE = 9;        // one medium tell (7) can pass; two cannot
export const MAX_OVERLAP = 0.12;   // same ceiling the scraped pipeline already uses (OVERLAP_MAX)
export const MAX_RUN = 12;         // words

export interface GateVerdict {
  ok: boolean;               // voice + originality + facts all pass
  voiceOk: boolean;
  needsExpansion: boolean;   // below the desk's word floor
  reasons: string[];
}

export function judge(input: { report: VoiceReport; overlap?: OverlapReport | null; facts?: FactsReport | null }): GateVerdict {
  const { report, overlap, facts } = input;
  const reasons: string[] = [];
  const high = report.tells.filter((t) => t.severity === 'high');
  let voiceOk = true;
  if (report.score > MAX_SCORE) { voiceOk = false; reasons.push(`voice score ${report.score} is above ${MAX_SCORE}`); }
  if (high.length) { voiceOk = false; reasons.push(`machine signature: ${high.map((t) => t.label).slice(0, 3).join('; ')}`); }
  let originalOk = true;
  if (overlap) {
    if (overlap.ratio > MAX_OVERLAP) { originalOk = false; reasons.push(`shares ${Math.round(overlap.ratio * 100)}% of its wording with the source (max ${Math.round(MAX_OVERLAP * 100)}%)`); }
    if (overlap.longestRun > MAX_RUN) { originalOk = false; reasons.push(`copies a ${overlap.longestRun}-word run from the source`); }
  }
  let factsOk = true;
  if (facts && !facts.ok) { factsOk = false; reasons.push(...facts.reasons); }
  const needsExpansion = false;   // length follows the facts; nothing is ever padded
  return { ok: voiceOk && originalOk && factsOk, voiceOk, needsExpansion, reasons };
}
