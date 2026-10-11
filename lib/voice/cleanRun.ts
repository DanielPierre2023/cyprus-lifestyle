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
