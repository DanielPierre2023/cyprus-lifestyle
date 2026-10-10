// The article desk with the October 2026 additions, end to end with a scripted model: facts tied to the source by code, the Cyprus connection
// from the source, model pieces, the comparison with the source by meaning, a rewrite from the core where patching fails, and two accounts of
// one event. No network, no key, no money.
import { runPipeline, ALL_LANGS, type CallSpec, type PipelineDeps, type PipelineInput, type PipelineOptions, type Assessment } from '@/lib/journalism/pipeline';
import { type Lang } from '@/lib/journalism/languages';
import { ZERO_USAGE, type LlmResult } from '@/lib/journalism/openai';
import type { Exemplar } from '@/lib/journalism/exemplars';
import { eq, ok, report } from './_harness';

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────────────────────
const FACTS_TEXT = 'The Limassol marina will raise its monthly berth fee from €70 to €90 on 1 March 2027, the harbour authority said. About 400 berth holders are affected. The council voted 31 to 18 in favour. The works cost €4.2 million.';
const TOPICS = Array.from({ length: 8 }, (_, i) => `Topic${i} sentence of the source says something specific here.`).join(' ');
const SRC_TEXT = `${FACTS_TEXT} ${TOPICS}`;
const SRC: PipelineInput = { title: 'Marina fees rise', text: SRC_TEXT };
const evidencedFacts = [
  { fact: 'The Limassol marina raises its monthly berth fee from 70 to 90 euros on 1 March 2027.', evidence: 'will raise its monthly berth fee from €70 to €90 on 1 March 2027' },
  { fact: 'About 400 berth holders are affected.', evidence: 'About 400 berth holders are affected.' },
  { fact: 'The council voted 31 to 18 in favour.', evidence: 'The council voted 31 to 18 in favour.' },
  { fact: 'The works cost 4.2 million euros.', evidence: 'The works cost €4.2 million.' },
];
const CORE = {
  category: 'cyprus', subcategory: 'regional', district: 'limassol', source_lang: 'en', cyprus_angle: true, cyprus_basis: 'named', cyprus_evidence: 'The Limassol marina will raise its monthly berth fee', cyprus_hook: 'Limassol marina fees',
  story_type: 'news', complexity: 'routine', flags: [], headline_fact: 'The Limassol marina raises its berth fee to 90 euros.',
  confirmed_facts: evidencedFacts, attributed_claims: [], allegations: [], unverified: [], direct_quotes: [], dates: [{ when: '1 March 2027', what: 'new fee applies' }], numbers: [{ value: '€90', what: 'new monthly fee' }],
  entities: [{ name: 'Limassol marina', kind: 'organisation', role: 'operator' }], open_questions: [], conflicts: [],
};
const coreWith = (over: Record<string, unknown>) => JSON.stringify({ ...CORE, ...over });

const sent = (t: number, lang: string, tweak = '') => `Topic${t} sentence of the ${lang} edition says something specific here${tweak ? ` ${tweak}` : ''}.`;
const SHUFFLED = [5, 2, 7, 0, 3, 6, 1, 4];
const IN_ORDER = [0, 1, 2, 3, 4, 5, 6, 7];
const body = (order: number[], lang: string, tweak = '') => `<p>${order.slice(0, 4).map((t) => sent(t, lang, tweak)).join(' ')} The fee is 90 euros from 1 March.</p><p>${order.slice(4).map((t) => sent(t, lang, tweak)).join(' ')} About 400 berth holders pay it.</p>`;
const compose = (lang: string, over: Record<string, unknown> = {}, order = SHUFFLED, tweak = '') => JSON.stringify({ title: `${lang} marina fees rise to 90 euros`, excerpt: `${lang} fees rise on 1 March`, summary: `${lang} summary of the rise to 90 euros`, content_html: body(order, lang, tweak), tags: ['marina', 'fees', 'limassol'], seo_title: `${lang} marina fees`, seo_description: `${lang} fees rise to 90 euros on 1 March`, ...over });
const PASS_CHECK = JSON.stringify({ verdict: 'pass', issues: [] });

const must = (calls: CallSpec[], fn: string): CallSpec => { const c = calls.find((x) => x.fn === fn); if (!c) throw new Error(`no call ${fn}; calls: ${[...new Set(calls.map((x) => x.fn))].join(',')}`); return c; };
const okRes = (text: string): LlmResult => ({ ok: true, text, status: 'completed', usage: ZERO_USAGE, usd: 0.001, attempts: 1, ms: 10, model: 'gpt-6-luna' });
type Handler = (spec: CallSpec, n: number) => LlmResult | string;
function scripted(h: Record<string, Handler>, clock = { t: 1_000_000 }, stepMs = 1_000) {
  const calls: CallSpec[] = []; const counts: Record<string, number> = {};
  const llm = async (spec: CallSpec): Promise<LlmResult> => {
    calls.push(spec); clock.t += stepMs;
    const key = Object.keys(h).find((k) => spec.fn === k || spec.fn.startsWith(k + '-'));
    counts[spec.fn] = (counts[spec.fn] || 0) + 1;
    if (!key) throw new Error(`unscripted call ${spec.fn}`);
    const r = h[key](spec, counts[spec.fn]);
    return typeof r === 'string' ? okRes(r) : r;
  };
  return { llm, calls, counts, clock };
}
const defaults = (over: Record<string, Handler> = {}): Record<string, Handler> => ({
  core: () => JSON.stringify(CORE),
  compose: (s) => compose(s.fn.slice(-2)),
  rewrite: (s) => compose(s.fn.slice(-2), {}, SHUFFLED, 'rewritten'),
  evidence: () => JSON.stringify({ passages: [] }),
  factcheck: () => PASS_CHECK,
  edit: () => JSON.stringify({ content_html: '' }), deoverlap: () => JSON.stringify({ content_html: '' }), fields: () => JSON.stringify({ title: '', excerpt: '', summary: '', seo_title: '', seo_description: '' }),
  repair: () => JSON.stringify({ title: '', content_html: '' }), title: () => JSON.stringify({ title: '' }),
  ...over,
});
const goodAssess = (_h: string, _l: Lang): Assessment => ({ score: 0, ok: true, high: 0, words: 120, tells: [] });
const DIM = 16;
const unit = (k: number): number[] => Array.from({ length: DIM }, (_, i) => (i === k ? 1 : 0));
/** Vectors by topic: "TopicN" is direction N; anything else gets a direction of its own among the last four. */
const vecOf = (t: string): number[] => {
  const m = /Topic(\d+)/.exec(t); if (m) return unit(Number(m[1]));
  if (/The fee is 90 euros|berth holders pay it/.test(t)) return unit(15);          // the editions' own sentences: nothing like them in the source
  let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) % 3; return unit(12 + h);
};
const embedFn = async (texts: string[]) => texts.map(vecOf);
const deps = (llm: PipelineDeps['llm'], clock: { t: number }, over: Partial<PipelineDeps> = {}): PipelineDeps => ({
  llm, now: () => clock.t, assess: goodAssess,
  sanitize: { html: (r) => r.trim(), title: (t) => t.trim(), field: (t) => t.trim(), tags: (v) => (Array.isArray(v) ? v.map(String) : []), words: (h) => h.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length, text: (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() },
  overlap: (out) => (/COPIED/.test(out) ? 0.5 : 0.02),
  factsKept: (_b, a) => !/CHANGEDFIGURE/.test(a),
  inventedFigures: (text, allowed) => (text.match(/\b\d{3,}\b|\b\d+[.,]\d+\b/g) || []).filter((n) => !allowed.includes(n)),
  hasCyprusTerms: (s) => /cyprus|limassol|nicosia/i.test(s),
  sharedRuns: () => ['the marina will raise its monthly'],
  deskBrief: () => 'The Cyprus Desk.', ...over,
});
const opts = (clock: { t: number }, over: Partial<PipelineOptions> = {}): PipelineOptions => ({ deadlineAt: clock.t + 900_000, overlapMax: 0.12, relevanceGate: true, maxEditPasses: 2, srcWords: 500, evidence: 'enforce', escalate: true, ...over });

async function main() {
  // ── the happy path with the new checks on ───────────────────────────────────────────────────────────────────────
  {
    const s = scripted(defaults());
    const r = await runPipeline(SRC, deps(s.llm, s.clock, { embed: embedFn }), opts(s.clock));
    ok('happy path: ok and publishable', r.ok && r.gate?.publishable === true);
    eq('nothing needed a second ask: one core, seven editions, seven checks', [s.counts.core, ALL_LANGS.filter((l) => s.counts[`compose-${l}`] === 1).length, ALL_LANGS.filter((l) => s.counts[`factcheck-${l}`] === 1).length, s.counts.evidence ?? 0, s.calls.filter((c) => c.fn.startsWith('rewrite')).length], [1, 7, 7, 0, 0]);
    eq('the evidence check kept every fact', [r.verification?.confirmed.kept, r.verification?.dropped.length, r.verification?.mode], [4, 0, 'enforce']);
    ok('the core call asks for a passage with every fact', ((j) => !!j && 'evidence' in (j.schema as { properties: { confirmed_facts: { items: { properties: object } } } }).properties.confirmed_facts.items.properties)(s.calls[0].json as { schema: unknown }));
    ok('the Cyprus connection comes from the source (one mention, backed by the editor\'s passage) and is passed to every writer as the only one', r.cyprus?.grounded === true && r.cyprus.via === 'evidenced' && s.calls.filter((c) => c.fn.startsWith('compose-')).every((c) => /CYPRUS CONNECTION \(the only link/.test(c.user) && /CYPRUS \(house rule\)/.test(c.system)));
    ok('the writers see the facts, not the passages of the source', s.calls.filter((c) => c.fn.startsWith('compose-')).every((c) => !c.user.includes('from €70 to €90 on 1 March 2027, the harbour') && c.user.includes('CONFIRMED FACTS')));
    ok('the order of the original is passed on as the order NOT to follow', s.calls.filter((c) => c.fn.startsWith('compose-')).every((c) => /THE ORDER OF THE ORIGINAL/.test(c.user)));
    ok('every edition was compared with its source by meaning, and none is a copy', ALL_LANGS.every((l) => !!r.editions![l].semantic && r.editions![l].semantic!.copy === false) && typeof r.ms?.semantic === 'number');
  }

  // ── the evidence check ───────────────────────────────────────────────────────────────────────────────────────────
  {
    const withInvention = coreWith({ confirmed_facts: [...evidencedFacts, { fact: 'The mayor said the rise was unavoidable.', evidence: 'The mayor said the rise was unavoidable' }, { fact: 'Dredging has not been done since 2019.', evidence: 'dredging did not happen since nineteen nineteen' }, { fact: 'The harbour is the busiest on the island.', evidence: 'the busiest harbour on the island' }] });
    const s = scripted(defaults({
      core: () => withInvention,
      evidence: () => JSON.stringify({ passages: [{ n: 1, evidence: 'none' }, { n: 2, evidence: 'none' }] }),
    }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock), opts(s.clock));
    eq('the editor is asked once more for the three items without a passage, and answers "none"', [s.counts.evidence, r.verification?.confirmed.kept, r.verification?.confirmed.total], [1, 4, 7]);
    ok('the second ask lists the statements and carries the source', ((c) => c.user.includes('1. The mayor said the rise was unavoidable.') && c.user.includes('2. Dredging has not been done since 2019.') && c.user.includes('3. The harbour is the busiest on the island.') && c.user.includes('Limassol marina will raise'))(must(s.calls, 'evidence')));
    ok('the invention never reaches a writer', s.calls.filter((c) => c.fn.startsWith('compose-')).every((c) => !c.user.includes('mayor')));
    ok('the article still goes through, with a note about the three items left out', r.gate?.publishable === true && r.gate.warnings.some((w) => /evidence: 3 item\(s\)/.test(w)));
  }
  {
    // a passage supplied on the second ask rescues a true fact
    const first = coreWith({ confirmed_facts: [...evidencedFacts, { fact: 'The council voted in favour after a long debate.', evidence: 'The council voted after a lengthy debate' }] });
    const s = scripted(defaults({ core: () => first, evidence: () => JSON.stringify({ passages: [{ n: 1, evidence: 'The council voted 31 to 18 in favour.' }] }) }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock), opts(s.clock));
    eq('the passage is found on the second ask and the fact is kept', [r.verification?.confirmed.kept, r.verification?.repaired, r.verification?.dropped.length], [5, 1, 0]);
  }
  {
    const nothing = coreWith({ confirmed_facts: [{ fact: 'The mayor resigned.', evidence: 'The mayor resigned' }, { fact: 'The sea was calm.', evidence: 'The sea was calm' }] });
    const s = scripted(defaults({ core: () => nothing }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock), opts(s.clock));
    eq('no fact can be tied to the source: the desk stops before any edition is paid for', [r.ok, r.stage, s.calls.some((c) => c.fn.startsWith('compose'))], [false, 'evidence', false]);
    ok('...and says why', /no fact could be tied to a passage of the source/.test(r.error || ''));
  }
  {
    const s = scripted(defaults({ core: () => JSON.stringify({ ...CORE, confirmed_facts: evidencedFacts.map((f) => f.fact) }) }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock), opts(s.clock, { evidence: 'off' }));
    eq('switched off: a core in the older shape (no passages) works as before and nothing is asked twice', [r.ok, r.verification, s.counts.evidence ?? 0], [true, undefined, 0]);
    const s2 = scripted(defaults({ core: () => coreWith({ confirmed_facts: [...evidencedFacts, { fact: 'The mayor resigned.', evidence: 'The mayor resigned' }] }) }));
    const r2 = await runPipeline(SRC, deps(s2.llm, s2.clock), opts(s2.clock, { evidence: 'warn' }));
    ok('warn: the report says what would be dropped, the core is unchanged, nobody is asked again', r2.ok && r2.verification?.dropped.length === 1 && r2.core!.confirmed.length === 5 && (s2.counts.evidence ?? 0) === 0 && !r2.core!.cyprus);
  }

  // ── the Cyprus connection ───────────────────────────────────────────────────────────────────────────────────────
  {
    const panama = { ...CORE, district: 'national', cyprus_angle: true, cyprus_basis: 'none', cyprus_evidence: 'none', cyprus_hook: 'Cyprus is a shipping hub, so this matters here',
      confirmed_facts: [{ fact: 'The canal authority plans a third cut in daily crossings.', evidence: 'The canal authority is preparing a third reduction in daily crossings' }, { fact: 'Drought has lowered the lake.', evidence: 'drought has lowered the lake' }, { fact: 'Shipping lines are rerouting.', evidence: 'Shipping lines are rerouting' }, { fact: 'The canal carries about 5 percent of world trade.', evidence: 'carries about 5 percent of world trade' }],
      dates: [], numbers: [], entities: [] };
    const text = 'Panama\'s canal authority is preparing a third reduction in daily crossings this year as drought has lowered the lake. Shipping lines are rerouting vessels around the Cape. The canal carries about 5 percent of world trade, and ' + 'the authority has not set a date for the next cut. '.repeat(6);
    const s = scripted(defaults({ core: () => JSON.stringify(panama) }));
    const r = await runPipeline({ title: 'Panama Canal cuts crossings', text }, deps(s.llm, s.clock), opts(s.clock));
    eq('a world story with an angle from general knowledge (nothing in the source) is skipped', [r.ok, r.skipped, s.calls.some((c) => c.fn.startsWith('compose'))], [false, 'off_topic', false]);
    const s2 = scripted(defaults({ core: () => JSON.stringify(panama) }));
    const r2 = await runPipeline({ title: 'Panama Canal cuts crossings', text }, deps(s2.llm, s2.clock), opts(s2.clock, { evidence: 'off' }));
    eq('...which the older gate let through because the model said so', r2.ok, true);
  }
  {
    const greek = { ...CORE, source_lang: 'el', cyprus_basis: 'institution', cyprus_evidence: 'Το υπουργικό συμβούλιο ενέκρινε μέτρα 70 εκατ. ευρώ', cyprus_hook: 'The Cypriot cabinet approved a package',
      confirmed_facts: [{ fact: 'The cabinet approved measures worth 70 million euros.', evidence: 'Το υπουργικό συμβούλιο ενέκρινε μέτρα 70 εκατ. ευρώ για ψωμί και γάλα' }, { fact: 'The measures cover bread and milk.', evidence: 'για ψωμί και γάλα' }, { fact: 'The package starts on 12 October.', evidence: 'από τις 12 Οκτωβρίου' }, { fact: 'Heating oil tax falls from 1 November.', evidence: 'από την 1η Νοεμβρίου ο φόρος στο πετρέλαιο θέρμανσης μειώνεται' }], dates: [], numbers: [], entities: [] };
    const text = 'Το υπουργικό συμβούλιο ενέκρινε μέτρα 70 εκατ. ευρώ για ψωμί και γάλα, από τις 12 Οκτωβρίου, ενώ από την 1η Νοεμβρίου ο φόρος στο πετρέλαιο θέρμανσης μειώνεται. ' + 'Ο υπουργός δήλωσε ότι τα μέτρα θα εξεταστούν ξανά σε τρεις μήνες. '.repeat(6);
    const s = scripted(defaults({ core: () => JSON.stringify(greek) }));
    const r = await runPipeline({ title: 'Μέτρα κατά της ακρίβειας', text, originCyprus: true }, deps(s.llm, s.clock), opts(s.clock));
    eq('a Greek story from a Cypriot outlet with a real passage and no Cypriot word in it: relevant, by evidence', [r.ok, r.cyprus?.grounded, r.cyprus?.via], [true, true, 'evidenced']);
    const s2 = scripted(defaults({ core: () => JSON.stringify(greek) }));
    const r2 = await runPipeline({ title: 'Μέτρα κατά της ακρίβειας', text, originCyprus: false }, deps(s2.llm, s2.clock), opts(s2.clock));
    eq('the same story from a foreign outlet is not', [r2.ok, r2.skipped], [false, 'off_topic']);
  }
  {
    // an edition names a town the material never names: the guard turns it into a fact-check problem, which is repaired
    const s = scripted(defaults({
      compose: (sp) => compose(sp.fn.slice(-2), sp.fn === 'compose-de' ? { content_html: body(SHUFFLED, 'de').replace('The fee is 90 euros', 'In Paphos the fee is 90 euros') } : {}),
      repair: (sp) => JSON.stringify({ title: '', content_html: body(SHUFFLED, sp.fn.slice(-2), 'repaired') }),
    }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock), opts(s.clock));
    const de = r.editions!.de;
    eq('a town the material does not name is found without a model, repaired, and the article goes on', [de.passes.repair, de.factCheck?.pass, r.gate?.publishable], [1, true, true]);
    ok('the repair is told which sentence and why', ((c) => /invented_cyprus_link/.test(c.user) && /Paphos/.test(c.user) && /neither the source nor the fact core does/.test(c.user))(must(s.calls, 'repair-de')));
    const s2 = scripted(defaults({ compose: (sp) => compose(sp.fn.slice(-2), sp.fn === 'compose-de' ? { content_html: body(SHUFFLED, 'de').replace('The fee is 90 euros', 'In Paphos the fee is 90 euros') } : {}), repair: (sp) => JSON.stringify({ title: '', content_html: body(SHUFFLED, sp.fn.slice(-2)).replace('The fee is 90 euros', 'In Paphos the fee is 90 euros') }) }));
    const r2 = await runPipeline(SRC, deps(s2.llm, s2.clock), opts(s2.clock));
    ok('if the repair keeps the invented town, the article is held back and the reason names the kind', r2.gate?.publishable === false && /DE: fact check found 1 serious/.test(r2.gate!.reasons.join('|')) && /invented_cyprus_link/.test(r2.gate!.reasons.join('|')));
  }

  // ── model pieces and the latest openings ─────────────────────────────────────────────────────────────────────────
  {
    const pieces: Exemplar[] = [{ id: 'p1', desk: 'cyprus', lang: 'de', title: 'Ein Muster', body: Array.from({ length: 4 }, (_, i) => `Absatz ${i}: Die Behörde entschied am Montag über die Gebühr und nannte zum ersten Mal eine Zahl für den Hafen.`).join('\n\n') }, { id: 'p2', desk: 'business', lang: 'en', title: 'Wrong desk', body: 'x'.repeat(400) }];
    const s = scripted(defaults());
    await runPipeline({ ...SRC, exemplars: pieces, recent: { de: ['Die Hafenbehörde hat am Montag mitgeteilt, dass die Gebühr steigt.'] } }, deps(s.llm, s.clock), opts(s.clock));
    const de = must(s.calls, 'compose-de'); const en = must(s.calls, 'compose-en');
    ok('the German writer gets the German piece of its desk, after its language notes', de.system.includes('MODEL PIECE 1') && de.system.includes('Ein Muster') && de.system.indexOf('MODEL PIECES') > de.system.indexOf('LANGUAGE NOTES: GERMAN'));
    ok('a piece of another desk is not used, and a language without a piece gets none', !de.system.includes('Wrong desk') && !en.system.includes('MODEL PIECES'));
    ok('the latest German openings are listed for the German writer only', de.user.includes('HOW OUR LATEST GERMAN PIECES BEGAN') && de.user.includes('Die Hafenbehörde hat am Montag') && !en.user.includes('LATEST'));
  }

  // ── the comparison with the source ───────────────────────────────────────────────────────────────────────────────
  {
    // German walks through the source sentence by sentence, in the source's order
    const copyDe = (sp: CallSpec) => compose(sp.fn.slice(-2), {}, sp.fn === 'compose-de' ? IN_ORDER : SHUFFLED);
    const s = scripted(defaults({ compose: copyDe, rewrite: (sp) => compose(sp.fn.slice(-2), {}, SHUFFLED, 'rewritten') }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock, { embed: embedFn }), opts(s.clock));
    const de = r.editions!.de;
    ok('the copy is detected before the editors touch it', s.calls.some((c) => c.fn === 'rewrite-de'));
    eq('it is written again from the core, with the reason, and the new text is judged on its own', [de.passes.rewrite, de.semantic?.copy, r.gate?.publishable], [1, false, true]);
    ok('the rewrite is told it followed the original, to reuse no sentence, and works at a higher level', ((c) => /REJECTED/.test(c.user) && /followed the original too closely/.test(c.user) && /follows the original/.test(c.user) && c.complexity === 'complex')(must(s.calls, 'rewrite-de')));
    ok('only the edition that needed it was rewritten', ALL_LANGS.filter((l) => l !== 'de').every((l) => !s.calls.some((c) => c.fn === `rewrite-${l}`)));
    ok('and the warning says so', r.gate!.warnings.some((w) => /DE: written again from the fact core/.test(w)));
  }
  {
    // the second try is just as close: the first stays, and the article is held back with the reason
    const s = scripted(defaults({ compose: (sp) => compose(sp.fn.slice(-2), {}, sp.fn === 'compose-de' ? IN_ORDER : SHUFFLED), rewrite: (sp) => compose(sp.fn.slice(-2), {}, IN_ORDER, 'again') }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock, { embed: embedFn }), opts(s.clock));
    eq('a second try that is no better is thrown away; the article is not published', [r.editions!.de.passes.rewrite, r.editions!.de.content.includes('again'), r.gate?.publishable], [0, false, false]);
    ok('...and the reason is in the gate, with the measures', /DE: too close to the original in meaning and order \(close \d+%/.test(r.gate!.reasons.join('|')));
    const s2 = scripted(defaults({ compose: (sp) => compose(sp.fn.slice(-2), {}, sp.fn === 'compose-de' ? IN_ORDER : SHUFFLED) }));
    const r2 = await runPipeline(SRC, deps(s2.llm, s2.clock, { embed: embedFn }), opts(s2.clock, { escalate: false }));
    eq('without the second try the same measurement still holds the article back', [s2.calls.some((c) => c.fn.startsWith('rewrite')), r2.gate?.publishable], [false, false]);
    const s3 = scripted(defaults({ compose: (sp) => compose(sp.fn.slice(-2), {}, sp.fn === 'compose-de' ? IN_ORDER : SHUFFLED) }));
    const r3 = await runPipeline(SRC, deps(s3.llm, s3.clock, { embed: async () => null }), opts(s3.clock));
    eq('no embedding service: no comparison, nothing else changes', [r3.editions!.de.semantic, r3.gate?.publishable], [undefined, true]);
    const s4 = scripted(defaults());
    const r4 = await runPipeline(SRC, deps(s4.llm, s4.clock), opts(s4.clock));
    eq('no embed dependency at all: the same', [r4.editions!.en.semantic, r4.gate?.publishable], [undefined, true]);
  }

  // ── a rewrite from the core where patching fails ─────────────────────────────────────────────────────────────────
  {
    const bad = (n: number): Assessment => ({ score: 100, ok: false, high: 1, words: 120, tells: [{ key: 'source_attribution', label: 'Cites its source ("according to…")', severity: 'high', count: n, sample: 'Σύμφωνα με στοιχεία' }] });
    const assess = (h: string, l: Lang): Assessment => (l !== 'el' ? goodAssess(h, l) : /rewritten/.test(h) ? goodAssess(h, l) : bad(8));
    const s = scripted(defaults({ edit: () => JSON.stringify({ content_html: body(SHUFFLED, 'el', 'edited') }) }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock, { assess }), opts(s.clock));
    const el = r.editions!.el;
    eq('two editing passes change nothing; the edition is written again from the core and now passes', [s.counts['edit-el'], el.passes.edit, el.passes.rewrite, el.assessment?.ok, r.gate?.publishable], [1, 0, 1, true, true]);
    ok('the rewrite is told what the style check found, with the sample, and has no sentence of the failed text', ((c) => /Cites its source/.test(c.user) && /Σύμφωνα με στοιχεία/.test(c.user) && !c.user.includes('edited'))(must(s.calls, 'rewrite-el')));
    const s2 = scripted(defaults({ edit: () => JSON.stringify({ content_html: body(SHUFFLED, 'el', 'edited') }), rewrite: (sp) => compose(sp.fn.slice(-2), {}, SHUFFLED, 'other') }));
    const r2 = await runPipeline(SRC, deps(s2.llm, s2.clock, { assess: (h, l) => (l === 'el' ? bad(8) : goodAssess(h, l)) }), opts(s2.clock));
    eq('a rewrite that is no better is dropped and the article is held back for style', [r2.editions!.el.passes.rewrite, r2.gate?.publishable, /EL: style score 100/.test(r2.gate!.reasons.join('|'))], [0, false, true]);
    const s3 = scripted(defaults());
    const r3 = await runPipeline(SRC, deps(s3.llm, s3.clock, { assess: (h, l) => (l === 'el' ? bad(8) : goodAssess(h, l)) }), opts(s3.clock, { escalate: false }));
    eq('switched off: no rewrite is bought', [s3.calls.some((c) => c.fn.startsWith('rewrite')), r3.gate?.publishable], [false, false]);
    const s4 = scripted(defaults({ rewrite: (sp) => compose(sp.fn.slice(-2), { content_html: body(SHUFFLED, 'el', 'rewritten').replace('90 euros', '9000 euros') }) }));
    const r4 = await runPipeline(SRC, deps(s4.llm, s4.clock, { assess: (h, l) => (l === 'el' && !/rewritten/.test(h) ? bad(8) : goodAssess(h, l)) }), opts(s4.clock));
    eq('a rewrite that states a figure the material does not have is refused', [r4.editions!.el.passes.rewrite, r4.gate?.publishable], [0, false]);
    // not enough time: no rewrite
    const clock = { t: 1_000_000 };
    const s5 = scripted(defaults(), clock, 100);
    await runPipeline(SRC, deps(s5.llm, clock, { assess: (h, l) => (l === 'el' ? bad(8) : goodAssess(h, l)) }), { ...opts(clock), deadlineAt: clock.t + 50_000 });
    eq('with little time left nothing is rewritten', s5.calls.some((c) => c.fn.startsWith('rewrite')), false);
  }
  {
    // the originality gate: patching the words does not help, the core is written again
    const s = scripted(defaults({
      compose: (sp) => compose(sp.fn.slice(-2), sp.fn === 'compose-ro' ? { content_html: body(SHUFFLED, 'ro', 'COPIED') } : {}),
      deoverlap: () => JSON.stringify({ content_html: body(SHUFFLED, 'ro', 'COPIED again') }),
      rewrite: (sp) => compose(sp.fn.slice(-2), {}, SHUFFLED, 'fresh'),
    }));
    const r = await runPipeline(SRC, deps(s.llm, s.clock), opts(s.clock));
    eq('still borrowed after the word-level rewrite: the edition is written again and passes the gate', [r.editions!.ro.ok, r.editions!.ro.passes.rewrite, r.editions!.ro.overlap, r.gate?.publishable], [true, 1, 0.02, true]);
    ok('the rewrite and the first rewriter are told which runs of words are shared', /the marina will raise its monthly/.test(must(s.calls, 'deoverlap-ro').user) && /the marina will raise its monthly/.test(must(s.calls, 'rewrite-ro').user));
    const s2 = scripted(defaults({ compose: (sp) => compose(sp.fn.slice(-2), sp.fn === 'compose-ro' ? { content_html: body(SHUFFLED, 'ro', 'COPIED') } : {}), deoverlap: () => JSON.stringify({ content_html: body(SHUFFLED, 'ro', 'COPIED again') }), rewrite: (sp) => compose(sp.fn.slice(-2), {}, SHUFFLED, 'COPIED still') }));
    const r2 = await runPipeline(SRC, deps(s2.llm, s2.clock), opts(s2.clock));
    eq('and when the second try is borrowed too, the gate refuses, as before', [r2.editions!.ro.ok, /plagiarism gate/.test(r2.editions!.ro.reason || '')], [false, true]);
  }

  // ── two accounts of one event ────────────────────────────────────────────────────────────────────────────────────
  {
    const B_TEXT = 'Berth fees at the Limassol marina go up to €90 from 1 March 2027, a second report says. The marina chairman, Nicos Pavlou, called the rise overdue. ' + TOPICS.replace(/Topic/g, 'Report');
    const two = (same: boolean) => JSON.stringify({
      ...CORE, same_story: same,
      confirmed_facts: [
        ...evidencedFacts.map((f) => ({ ...f, source: 'A' })),
        { fact: 'The marina chairman Nicos Pavlou called the rise overdue.', evidence: 'The marina chairman, Nicos Pavlou, called the rise overdue.', source: 'B' },
      ],
    });
    const s = scripted(defaults({ core: () => two(true) }));
    const r = await runPipeline({ ...SRC, extra: [{ label: 'B', title: 'Berth fees go up', text: B_TEXT }] }, deps(s.llm, s.clock), opts(s.clock));
    ok('both sources go to the core, which is asked for one core and a verdict', ((c) => /SOURCE A TITLE/.test(c.user) && /SOURCE B TITLE/.test(c.user) && /same_story/.test(c.system) && /TWO SOURCES/.test(c.system))(s.calls[0]));
    eq('a fact that only the second source states is checked against the second source and kept', [r.merged, r.core!.confirmed.length, r.core!.confirmed.some((f) => f.includes('Nicos Pavlou'))], [true, 5, true]);
    const s2 = scripted(defaults({ core: () => two(false) }));
    const r2 = await runPipeline({ ...SRC, extra: [{ label: 'B', title: 'A different story', text: B_TEXT }] }, deps(s2.llm, s2.clock), opts(s2.clock));
    eq('if the core says it is not the same story, the second source is ignored and its facts are dropped', [r2.merged, r2.core!.confirmed.length, r2.core!.confirmed.some((f) => f.includes('Nicos Pavlou'))], [false, 4, false]);
    const s3 = scripted(defaults());
    const r3 = await runPipeline(SRC, deps(s3.llm, s3.clock), opts(s3.clock));
    ok('one source: no second-source talk in the prompt', r3.merged === false && !/TWO SOURCES/.test(s3.calls[0].system) && !('same_story' in ((s3.calls[0].json as unknown as { schema: { properties: object } }).schema.properties)));
  }

  report('journalism-pipeline-desk');
}
main().catch((e) => { console.error(e); process.exit(1); });
