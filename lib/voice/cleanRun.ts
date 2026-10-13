// lib/voice/cleanRun.ts — what the Clean buttons of /admin/quality do with the route's answers. Pure, unit-tested.
//
// One call of /api/admin/editorial/repair is one bounded model pass (a route has 60 seconds). A text that is still below the bar after
// the first pass, but moved, gets ONE more call: the second pass starts from the improved text and changes only what is left. A call
// that changed nothing is never repeated (the same input would give the same answer), so the cost of a hopeless edition is capped.

export interface RepairReply {
  ok?: boolean; error?: string;
  changed?: boolean;
  /** true when the edition now passes the publish bar. */
  ok_standard?: boolean;
  before?: number; after?: number;
  note?: string;
}

/** Whether to call again after this reply: it worked, it changed the text, and the text still fails the bar. */
export const wantsSecondPass = (r: RepairReply | null | undefined): boolean => !!r && r.ok === true && r.changed === true && r.ok_standard === false;

export interface CleanTally { total: number; improved: number; passed: number; unchanged: number; failed: number }

/** One edition's outcome from all of its calls (first call first). */
export function outcomeOf(replies: Array<RepairReply | null>): 'passed' | 'improved' | 'unchanged' | 'failed' {
  const worked = replies.filter((r): r is RepairReply => !!r && r.ok === true);
  if (!worked.length) return 'failed';
  const last = worked[worked.length - 1];
  if (last.ok_standard === true && worked.some((r) => r.changed)) return 'passed';
  return worked.some((r) => r.changed) ? 'improved' : 'unchanged';
}

export function tally(outcomes: Array<ReturnType<typeof outcomeOf>>): CleanTally {
  const t: CleanTally = { total: outcomes.length, improved: 0, passed: 0, unchanged: 0, failed: 0 };
  for (const o of outcomes) { if (o === 'passed') { t.passed++; t.improved++; } else if (o === 'improved') t.improved++; else if (o === 'unchanged') t.unchanged++; else t.failed++; }
  return t;
}

/** The line shown after a bulk run: improved of total (how many of those now pass), and what did not move. */
export function summaryLine(t: CleanTally): string {
  const parts = [`Improved ${t.improved} of ${t.total}`];
  if (t.improved) parts[0] += ` (${t.passed} now pass the bar)`;
  if (t.unchanged) parts.push(`${t.unchanged} unchanged: no safe improvement found`);
  if (t.failed) parts.push(`${t.failed} failed`);
  return `${parts.join(' · ')}.`;
}

// ── what the admin reads when nothing was saved ─────────────────────────────────────────────────────────────────────────────────────
// The revise loop leaves terse log lines ("pass 1: rejected, new figures not in the source: 15, 18.30"). The admin who pressed Clean should
// read a sentence that says what happened and what it means, not a log line: "I don't see any changes" is the worst answer to a click.
const reasonText = (r: string): string => {
  let m: RegExpExecArray | null;
  if ((m = /^new figures not in the source: (.+)$/.exec(r))) return `the new version added figures that are not in the text (${m[1]})`;
  if ((m = /^drops (\d+)% of the source's figures$/.exec(r))) return `it left out ${m[1]}% of the figures`;
  if ((m = /^(\d+) quotation\(s\) not verbatim from the source$/.exec(r))) return `it changed ${m[1]} quotation(s)`;
  if ((m = /^new proper names not in the source: (.+)$/.exec(r))) return `it introduced names that are not in the text (${m[1]})`;
  if ((m = /^length changed ×([\d.]+)$/.exec(r))) return `it changed the length too much (×${m[1]})`;
  if (/^HTML structure lost$/.test(r)) return 'it lost the page formatting';
  if (/^no closer to original/.test(r)) return 'it stayed too close to the source wording';
  return r;
};

/** One plain sentence for the last line the revise loop logged (or the route's own message). */
export function explainNote(note: string | undefined | null): string {
  const n = String(note || '').trim();
  if (!n) return 'No safe improvement found; the text was left as it was.';
  let m: RegExpExecArray | null;
  if ((m = /^start: score (\d+)$/.exec(n))) return `Nothing to change: the text already passes the bar (score ${m[1]}).`;
  if ((m = /no improvement \((\d+) vs (\d+)\)/.exec(n))) return `The new version was not better (it scored ${m[1]}, the live text ${m[2]}), so nothing was changed.`;
  if ((m = /rejected, (.+)$/.exec(n))) return `Not saved: ${m[1].split('; ').map(reasonText).join(' and ')}.`;
  if (/model error|empty reply/.test(n)) return `The AI model did not answer (${n.replace(/^pass \d+: model error\s*/, '') || 'empty reply'}); try again in a minute.`;
  if (/unparseable/.test(n)) return "The model's answer could not be read; try again in a minute.";
  return n;
}
