import { scoreVoice } from '@/lib/voice/score';
const gesy = `<p>Cyprus runs a national health system, GESY (the General Healthcare System, also written GHS), alongside a large private sector. Between them, residents get broad, affordable cover and — for those who want it — fast private access. Here is how it works in 2026, in the Republic of Cyprus.</p>
<h2>Who can join, and how</h2>
<p>Every Cyprus tax resident can register with GESY, including EU citizens here under the 60-day rule and third-country nationals with a valid permit; your dependents are covered at no extra cost. You register online at gesy.org.cy with your tax identification number and proof of residency — it takes about fifteen minutes — and then choose a personal doctor (GP), who is your first point of contact and your referral to specialists.</p>
<h2>What it costs</h2>
<p>GESY is funded by income-based contributions rather than a flat premium: employees pay 2.65% of gross salary (employers add 2.90%), the self-employed 4.70%, and pensioners and passive income 2.65%, with the health contribution capped at €180,000 of income a year.</p>
<h2>What it covers</h2>
<p>Cover is comprehensive: your personal doctor, specialist consultations on referral, hospital and emergency treatment, maternity, mental health, laboratory tests and subsidised medicines. It is a genuine, EU-standard system that residents use every day.</p>
<h2>Do you still need private insurance?</h2>
<p>Many residents keep a private policy alongside GESY — typically €1,500–4,000 a year — for faster elective procedures. It complements rather than replaces the public system; which mix suits you depends on your age, health and budget.</p>
<h2>How Cyprus Lifestyle can help</h2>
<p>Our concierge can point you to English-speaking doctors and reputable clinics, explain how to register.</p>`;
const hannah = `<p>On 18 September the Edit Gallery in Limassol opens a solo exhibition of ceramic sculpture by Hannah Rowan. It runs through 17 October. The show is titled "Carriers," and it hands the city's audience a month-long window onto a body of work that was made, in large part, on their own doorstep.</p><p>Opening night runs from 6:30pm to 9:30pm. One extended evening, then the gallery drops back to its usual rhythm.</p><p>What separates "Carriers" from a touring show slotted into a gallery calendar is where it came from. Rowan made the pieces on display during a period of research and production based in Limassol itself. The city is in the clay, then, not simply the backdrop to it but part of the material process that produced these forms, and that distinction changes how the work should be read. Not an import. Something grown out of the place that now hosts it.</p><p>The sculptures take the shape of torsos, though not straightforwardly human ones. Some read as protective shells. Others resemble breastplates, or vessels built to hold something precious and fragile at once. Defence and containment, armour and cradle: the double register runs through the whole body of work and gives it its title.</p><p>Timing, local production, the recurring vocabulary of shells and vessels: the exhibition reads as one sustained inquiry rather than a loose grouping of objects. Slow looking across repeat visits will reward a visitor far more than a single pass through on opening night.</p>`;
const human = `<p>The bakery on Ledra Street opens at five. By seven the queue reaches the pharmacy next door, and Maria Charalambous has already sold out of the sesame loaves she bakes for the taxi drivers.</p><p>She took the shop over from her uncle in 2019, when flour cost half what it does now. "I did not raise the price of bread for three years," she says. That ended in March.</p><p>Her ovens are older than she is. One of them sulks in winter, so she lights it an hour early and talks to it.</p>`;
import { eq, ok, report } from './_harness';
import { MAX_SCORE } from '@/lib/voice/gate';

const sc = (n: string, t: string, d: string) => scoreVoice({ title: n, body: t, lang: 'en', desk: d as never });
const g = sc('gesy', gesy, 'relocation_guide'), h = sc('hannah', hannah, 'culture'), m = sc('human', human, 'food');
ok('real guide with dashes, question headings and a promo block fails the gate', g.score > MAX_SCORE && g.tells.some((t) => t.key === 'em_dash'));
ok('real article with contrast frames and staged rhythm fails the gate', h.score > MAX_SCORE && h.tells.some((t) => t.key === 'contrast_frame'));
ok('plain human reporting passes (no false positive)', m.score <= MAX_SCORE && m.level === 'clean');
ok('a thin piece is an issue, not an AI tell', m.issues.some((i) => i.key === 'thin') && !m.tells.some((t) => t.key === 'thin'));
ok('a legitimate "rather than a flat premium" is not flagged', !g.tells.some((t) => t.key === 'contrast_frame'));
import { tellCompileErrors, compiledTells } from '@/lib/voice/tells';
import { VOICE_DATA } from '@/lib/voice/data';
import { CONCIERGE_MANNER } from '@/lib/voice/concierge';
import { conciergeSystem } from '@/lib/concierge/brain';
for (const l of ['en', 'de', 'el', 'pl', 'ro', 'ru', 'ar'] as const) {
  ok(`${l}: every tell compiles`, tellCompileErrors(l).length === 0);
  ok(`${l}: has tells, closers, openers`, compiledTells(l).length >= 40 && VOICE_DATA[l].closers.length > 3 && VOICE_DATA[l].openers.length > 3);
  const quiet = scoreVoice({ title: '', body: '<p>Maria opened at five.</p><p>The queue reached the pharmacy.</p><p>She sold out by eight.</p>', lang: l, desk: 'food' });
  ok(`${l}: neutral text scores zero`, quiet.score === 0);
}
ok('concierge persona carries the manner block, grounding intact', conciergeSystem('en').includes(CONCIERGE_MANNER) && conciergeSystem('en').includes('GROUNDING'));
import { parseState, due, DEFAULT_DAILY_CAP } from '@/lib/voice/work';
const t0 = new Date('2026-10-07T10:00:00Z');
ok('the background worker is off until switched on (it spends API money)', parseState(undefined).enabled === false && parseState({}).dailyCap === DEFAULT_DAILY_CAP);
ok('it can be switched on', parseState({ enabled: true }).enabled === true);
ok('due when fresh and on', due(parseState({ enabled: true }), t0));
ok('not due again within 9 minutes of a run', !due(parseState({ enabled: true, lastRunAt: new Date(t0.getTime() - 5 * 60_000).toISOString() }), t0));
ok('due after the gap', due(parseState({ enabled: true, lastRunAt: new Date(t0.getTime() - 10 * 60_000).toISOString() }), t0));
ok('idle (all clean) waits', !due(parseState({ enabled: true, idleUntil: new Date(t0.getTime() + 60_000).toISOString() }), t0));
ok('daily cap stops it', !due(parseState({ enabled: true, day: '2026-10-07', usedToday: 120 }), t0));
import { humanizeHtml } from '@/lib/antiAi';
const prose = '<p>Cyprus runs GESY (also written GHS). Choose a personal doctor (GP). The appeal is speed: faster procedures. VAT and the EU apply.</p>';
ok('regression: acronyms and the word after a colon are left alone in body text', humanizeHtml(prose, 'en') === prose);
ok('a really shouted segment is still calmed', !humanizeHtml('<p>MINISTER ANNOUNCES NEW TAX PLAN FOR ISLAND</p>', 'en').includes('MINISTER'));
report('voice.calibration');
