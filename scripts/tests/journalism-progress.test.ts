// "Is this version really better?": the weight of the findings has no ceiling (the score stops at 100), equal is not better, and the
// same question is asked by the article desk's sub-editor, the voice engine's loop, the admin Rewrite and the Quality tab's Clean buttons.
// Background: the first live run of the new desk (9 Oct 2026) left three editions at 100 after the sub-editor had cut their findings.
import { findingsWeight, rawOf, isImprovement, PROGRESS_MARGIN } from '@/lib/journalism/progress';
import { judgeRewrite } from '@/lib/voice/accept';
import { wantsSecondPass, outcomeOf, tally, summaryLine } from '@/lib/voice/cleanRun';
import { reviseToStandard, type CallModel } from '@/lib/voice/revise';
import { eq, ok, report } from './_harness';

const hi = (n: number, key = 'source_attribution') => ({ key, severity: 'high', count: n });

// ── the weight ───────────────────────────────────────────────────────────────────────────────────────────────────
eq('one serious finding weighs 40', findingsWeight([hi(1)]), 40);
ok('every further occurrence weighs 0.7 of the first, with no cap at five', Math.abs(findingsWeight([hi(8)]) - 40 * (1 + 0.7 * 7)) < 1e-9 && findingsWeight([hi(8)]) > findingsWeight([hi(6)]));
eq('medium and low weigh 7 and 3', [findingsWeight([{ severity: 'medium', count: 1 }]), findingsWeight([{ severity: 'low', count: 1 }])], [7, 3]);
eq('equal paragraphs weigh once however many paragraphs there are (the count is the size of the text)', [findingsWeight([{ key: 'uniform_paragraphs', severity: 'low', count: 7 }]), findingsWeight([{ key: 'uniform_paragraphs', severity: 'low', count: 5 }])], [3, 3]);
eq('no findings, no weight; unknown severities do not weigh', [findingsWeight([]), findingsWeight([{ severity: 'info', count: 4 }])], [0, 0]);
ok('the judge\'s own raw weight wins when it sends one', rawOf({ score: 100, tells: [hi(1)], raw: 321 }) === 321 && rawOf({ score: 100, tells: [hi(1)] }) === 40);

// ── better or not ────────────────────────────────────────────────────────────────────────────────────────────────
const at = (score: number, ...tells: Array<{ key?: string; severity?: string; count?: number }>) => ({ score, tells });
ok('a lower score is better', isImprovement(at(40, hi(1)), at(20)));
ok('a higher score is never better', !isImprovement(at(20), at(40, hi(1))));
ok('the same score and the same findings is not better', !isImprovement(at(24, { severity: 'medium', count: 3 }), at(24, { severity: 'medium', count: 3 })));
ok('at the ceiling, eight serious findings cut to four is better', isImprovement(at(100, hi(8)), at(100, hi(4))));
ok('at the ceiling, eight cut to six is better too (the count is not capped at five)', isImprovement(at(100, hi(8)), at(100, hi(6))));
ok('at the ceiling, no change is not better', !isImprovement(at(100, hi(8)), at(100, hi(8))));
ok('at the ceiling, more findings is not better', !isImprovement(at(100, hi(4)), at(100, hi(8))));
ok('equal paragraphs merged from seven to five but still equal is not progress', !isImprovement(at(11, { key: 'uniform_paragraphs', severity: 'low', count: 7 }), at(11, { key: 'uniform_paragraphs', severity: 'low', count: 5 })));
ok('removing one small finding at the same displayed score is progress', isImprovement(at(30, { severity: 'medium', count: 2 }, { severity: 'low', count: 1 }), at(30, { severity: 'medium', count: 2 })));
ok(`a difference below ${PROGRESS_MARGIN} points is noise`, !isImprovement({ score: 30, tells: [], raw: 30 }, { score: 30, tells: [], raw: 29 }));

// ── may a rewrite replace the live text ──────────────────────────────────────────────────────────────────────────
const live = at(100, hi(8));
eq('an empty edition takes anything usable', judgeRewrite({ hadNothing: true, factsOk: false, before: live, after: at(100, hi(8)) }).save, true);
{
  const v = judgeRewrite({ hadNothing: false, factsOk: false, factReasons: ['figures missing: 90'], before: live, after: at(0) });
  ok('a rewrite that changes the facts is never saved, with the reason', !v.save && /figures missing: 90/.test(v.note));
}
eq('a real improvement is saved', judgeRewrite({ hadNothing: false, factsOk: true, before: at(40, hi(1)), after: at(9) }).save, true);
eq('progress at the ceiling is saved', judgeRewrite({ hadNothing: false, factsOk: true, before: live, after: at(100, hi(4)) }).save, true);
{
  const v = judgeRewrite({ hadNothing: false, factsOk: true, before: live, after: at(100, hi(8)) });
  ok('a text that already shows 100 is NOT replaced by an equally bad rewrite (it used to be)', !v.save && /no better/.test(v.note));
}
{
  const v = judgeRewrite({ hadNothing: false, factsOk: true, before: at(24, { severity: 'medium', count: 3 }), after: at(31, { severity: 'medium', count: 4 }) });
  ok('a worse rewrite is refused and says so', !v.save && /scored worse \(31, the text now live: 24\)/.test(v.note));
}
eq('an edition far too short that the rewrite puts back in line is saved at an equal score', judgeRewrite({ hadNothing: false, factsOk: true, before: at(24, { severity: 'medium', count: 3 }), after: at(24, { severity: 'medium', count: 3 }), parityFixed: true }).save, true);
eq('...but not when the score is worse', judgeRewrite({ hadNothing: false, factsOk: true, before: at(24, { severity: 'medium', count: 3 }), after: at(40, hi(1)), parityFixed: true }).save, false);

// ── the Clean buttons ────────────────────────────────────────────────────────────────────────────────────────────
ok('a second pass only when the first worked, changed the text and the text still fails', wantsSecondPass({ ok: true, changed: true, ok_standard: false }));
ok('no second pass when the text passes now', !wantsSecondPass({ ok: true, changed: true, ok_standard: true }));
ok('no second pass when nothing changed (the same input would give the same answer)', !wantsSecondPass({ ok: true, changed: false, ok_standard: false }));
ok('no second pass after an error or no answer', !wantsSecondPass({ ok: false, error: 'x' }) && !wantsSecondPass(null) && !wantsSecondPass(undefined));
eq('outcomes of one edition', [
  outcomeOf([]),
  outcomeOf([null]),
  outcomeOf([{ ok: true, changed: false, ok_standard: false }]),
  outcomeOf([{ ok: true, changed: true, ok_standard: false }]),
  outcomeOf([{ ok: true, changed: true, ok_standard: false }, { ok: true, changed: false, ok_standard: false }]),
  outcomeOf([{ ok: true, changed: true, ok_standard: false }, { ok: true, changed: true, ok_standard: true }]),
  outcomeOf([{ ok: true, changed: true, ok_standard: false }, { ok: false, error: 'timeout' }]),
], ['failed', 'failed', 'unchanged', 'improved', 'improved', 'passed', 'improved']);
{
  const t = tally(['passed', 'improved', 'improved', 'unchanged', 'failed']);
  eq('the tally counts what really got better', t, { total: 5, improved: 3, passed: 1, unchanged: 1, failed: 1 });
  eq('the summary line says it plainly', summaryLine(t), 'Improved 3 of 5 (1 now pass the bar) · 1 unchanged: no safe improvement found · 1 failed.');
  eq('nothing improved, nothing claimed', summaryLine(tally(['unchanged', 'unchanged'])), 'Improved 0 of 2 · 2 unchanged: no safe improvement found.');
}

// ── the voice engine's loop at the ceiling ───────────────────────────────────────────────────────────────────────
const sources = '<p>The harbour opened in 2014, according to the operator. The fee is €90, according to the council. The works start in June, according to the ministry. The budget is €4.2 million, according to Cyprus Mail. The marina has 612 berths, as reported by Reuters.</p>'
  + '<p>Berth holders pay monthly in advance, and the harbour authority bills them on the first of the month, according to the tariff.</p>';
const half = '<p>The harbour opened in 2014, according to the operator. The fee is €90, according to the council. The works start in June, according to the ministry. The budget is €4.2 million, per Cyprus Mail. The marina has 612 berths.</p>'
  + '<p>Berth holders pay monthly in advance, and the harbour authority bills them on the first of the month.</p>';
const model = (text: string): CallModel => async () => ({ text: JSON.stringify({ title: 'Marina fees', body: text }) });
{
  const r = await reviseToStandard({ title: 'Marina fees', body: sources, lang: 'en', desk: 'news', maxPasses: 1, callModel: model(half) });
  ok('the scenario sits at the ceiling before and after', r.before.score === 100 && r.after.score === 100);
  ok('a pass that cuts the findings but cannot leave the ceiling is kept (it used to be thrown away)', r.changed && r.body.includes('per Cyprus Mail') && r.log.some((l) => /pass 1: score 100/.test(l)));
}
{
  const r = await reviseToStandard({ title: 'Marina fees', body: sources, lang: 'en', desk: 'news', maxPasses: 1, callModel: model(sources) });
  ok('a pass that changes nothing is still dropped', r.log.some((l) => /no improvement/.test(l)));
}

report('journalism.progress');
