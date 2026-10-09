// The first live gate runs paid for four replies that contained no text: the model spent the whole token budget on hidden
// reasoning. These tests pin the defences: leave headroom, stop after repeated model failures. (Reading a reply that has no text,
// and cutting it off at the token cap, is pinned in journalism-openai.test.ts.)
import { visibleTokensFor, trip, due, parseState, recordRun, BREAKER_N, BREAKER_PAUSE_MS, type Unit } from '@/lib/voice/work';
import { eq, ok, report } from './_harness';

// 1. the size of the text (the model client adds the reserve for the thinking on top of it)
const enBody = 'x'.repeat(3571), ruBody = 'x'.repeat(2579);
ok('the visible budget is sized to the text, not padded with thinking room', visibleTokensFor(enBody, 'en') < 2 * Math.ceil(enBody.length / 3.8) && visibleTokensFor(enBody, 'en') > Math.ceil(enBody.length / 3.8));
ok('Cyrillic costs more tokens per character than Latin', visibleTokensFor(ruBody, 'ru') > visibleTokensFor('x'.repeat(2579), 'en'));
ok('an empty body still gets a small budget', visibleTokensFor('', 'en') >= 300);
eq('a very long body is capped', visibleTokensFor('x'.repeat(200_000), 'ar'), 16_000);

// 2. circuit breaker
const now = new Date('2026-10-08T15:00:00Z');
const unit: Unit = { id: 'a', slug: 's', lang: 'en', isSource: true, score: 50, high: true, ok: false, desk: 'news', words: 300 };
let st = parseState({ enabled: true, dailyCap: 144 });
const fail = (s: typeof st, t: number) => recordRun(s, unit, { ok: false, before: 50, after: 50, changed: false, note: 'pass 1: model error empty reply (stop=max_tokens; blocks=[thinking])' }, new Date(now.getTime() + t * 60_000), true);
st = fail(st, 0); eq('one failure does not trip', trip(st, now).idleUntil, '');
st = fail(st, 10); eq('two failures do not trip', trip(st, now).idleUntil, '');
st = fail(st, 20);
const tripped = trip(st, new Date(now.getTime() + 20 * 60_000));
ok(`${BREAKER_N} model failures in a row pause the worker`, tripped.idleUntil !== '' && Date.parse(tripped.idleUntil) - (now.getTime() + 20 * 60_000) === BREAKER_PAUSE_MS);
ok('a paused worker is not due', !due(tripped, new Date(now.getTime() + 60 * 60_000)));
ok('it is due again after the pause', due({ ...tripped, lastRunAt: '' }, new Date(now.getTime() + 20 * 60_000 + BREAKER_PAUSE_MS + 1000)));
const withSuccess = recordRun(recordRun(fail(parseState({ enabled: true }), 0), unit, { ok: true, before: 50, after: 5, changed: true, note: 'pass 1: score 5' }, new Date(now.getTime() + 10 * 60_000), true), unit, { ok: false, before: 50, after: 50, changed: false, note: 'pass 1: model error empty reply' }, new Date(now.getTime() + 20 * 60_000), true);
eq('a repair in between resets the count', trip(withSuccess, now).idleUntil, '');
const scoreFail = recordRun(recordRun(recordRun(parseState({ enabled: true }), unit, { ok: false, before: 50, after: 40, changed: false, note: 'pass 1: no improvement (40 vs 40)' }, now, true), unit, { ok: false, before: 50, after: 40, changed: false, note: 'pass 1: rejected, length changed ×0.40' }, now, true), unit, { ok: false, before: 50, after: 40, changed: false, note: 'pass 1: no improvement' }, now, true);
eq('ordinary rejections (no improvement, guards) never trip the breaker', trip(scoreFail, now).idleUntil, '');
const failOpenAI = (note: string, t: number) => recordRun(parseState({ enabled: true }), unit, { ok: false, before: 50, after: 50, changed: false, note }, new Date(now.getTime() + t * 60_000), true);
ok('the new model client\'s failures count too', ['pass 1: model error incomplete: max_output_tokens (cap 9000, 8000 reasoning tokens)', 'pass 1: model error voice-revise: no answer after 45s', 'pass 1: model error refused: policy', 'pass 1: model error You exceeded your current quota'].every((n) => /model error|incomplete|no answer after|refused|quota/i.test(failOpenAI(n, 0).recent[0].note)));
const quota = (s0: ReturnType<typeof parseState>, t: number) => recordRun(s0, unit, { ok: false, before: 50, after: 50, changed: false, note: 'pass 1: model error You exceeded your current quota, please check your plan and billing details.' }, new Date(now.getTime() + t * 60_000), true);
ok('three refusals for lack of credit pause the worker', trip(quota(quota(quota(parseState({ enabled: true }), 0), 10), 20), now).idleUntil !== '');
report('voice.runner');
