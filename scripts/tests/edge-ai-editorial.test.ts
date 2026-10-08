// The Editorial Studio edge function end to end, from its source, with a scripted model and an in-memory database: no network, no key,
// no money. The deterministic parts are the real ones (clean-up, quotation check, figure check, voice engine); only the model and the
// database are faked.
import { handle, budgetDeny, scrubModelNames } from '../edge/ai-editorial.src';
import { responsesBody } from './_fakeOpenAI';
import { eq, ok, report } from './_harness';

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any;

let ENVV: Record<string, string> = {};
const resetEnv = (over: Record<string, string> = {}) => { ENVV = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service-key', OPENAI_API_KEY: 'sk-test-key-123456', ...over }; };
g.Deno = { env: { get: (k: string) => ENVV[k] } };

// ── the material ────────────────────────────────────────────────────────────────────────────────────────────────────────
const TRANSCRIPT = [
  'Q: How long have you fished from Latchi?',
  'A: Since 1987. My father had the boat before me.',
  'Q: What do you make of the new café?',
  'A: They charge €9 for a frappé. They came for the sunsets, and left the boats.',
  'Q: How many trawlers are left?',
  'A: In 2010 there were eleven working this stretch. Three are still afloat. The rest were sold or cut up for scrap.',
  'Q: What does a morning look like?',
  "A: I mend the net with a wooden needle that was my father's. It takes me two hours. The mackerel will be gone by October anyway.",
].join('\n');
const BIZ = { name: 'Latchi Harbour Fishermen', category: 'Fishing', district: 'Paphos', website: 'https://latchi.test', notes: '' };

// A finished article that stays inside the transcript (the voice engine passes this paragraph pair).
const GOOD_BODY = '<p>The harbour at Latchi smells of diesel and grilled octopus by half past eleven. Andreas Charalambous has been fishing here since 1987, and he is not impressed by the new café on the quay, which charges €9 for a frappé. "They came for the sunsets," he says, "and left the boats."</p>'
  + '<p>Three of the eleven trawlers that worked this stretch in 2010 are still afloat. The rest were sold or cut up for scrap. He mends a net with a wooden needle that was his father\'s. It takes him two hours. The mackerel will be gone by October anyway.</p>';
const GOOD_PULL = 'They came for the sunsets, and left the boats.';
const goodPiece = (over: Record<string, unknown> = {}) => ({ title: 'Andreas Charalambous on the café that came for the sunsets', standfirst: 'Three of eleven trawlers are still afloat at Latchi, and the man who mends nets there has views on frappé prices.', body_html: GOOD_BODY, pull_quote: GOOD_PULL, ...over });
const BAD_QUOTE = '"We never wanted that café on our quay at all, not for any money," he says.';
const badBody = GOOD_BODY.replace('<p>Three of', `<p>${BAD_QUOTE} Three of`);

// ── the scripted model ──────────────────────────────────────────────────────────────────────────────────────────────────
type Reply = unknown | { status: number; body: unknown };
interface Script { brief?: (n: number) => Reply; interview?: (n: number) => Reply; review?: (n: number) => Reply; fix?: (n: number) => Reply; site?: () => { status: number; body: string } | 'throw' }
let script: Script = {};
let calls: Array<{ kind: string; body: any }> = [];
let counts: Record<string, number> = {};
let siteFetches: string[] = [];
function classify(sys: string): string {
  if (/managing editor of Cyprus Lifestyle's Editorial Studio/.test(sys)) return 'fix';
  if (/interviews editor/.test(sys)) return 'brief';
  if (/senior features writer/.test(sys)) return 'interview';
  if (/critic for this category/.test(sys)) return 'review';
  return 'unknown';
}
g.fetch = async (url: string, init?: any) => {
  const u = String(url);
  if (u.includes('api.openai.com')) {
    const body = JSON.parse(init.body);
    const kind = classify(String(body.instructions || ''));
    calls.push({ kind, body });
    counts[kind] = (counts[kind] || 0) + 1;
    const r = (script as any)[kind]?.(counts[kind]) as Reply;
    if (r === undefined) return new Response(JSON.stringify({ error: { message: `unscripted ${kind}` } }), { status: 500 });
    if (r && typeof r === 'object' && 'status' in (r as any) && 'body' in (r as any)) return new Response(JSON.stringify((r as any).body), { status: (r as any).status, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify(responsesBody(JSON.stringify(r))), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  siteFetches.push(u);
  const s = script.site?.() ?? { status: 200, body: '<html><body><h1>Latchi Harbour</h1><p>Family fishermen since 1960. Fresh catch daily.</p><script>alert(1)</script></body></html>' };
  if (s === 'throw') throw new Error('network down');
  return new Response(s.body, { status: s.status });
};

// ── the in-memory database ──────────────────────────────────────────────────────────────────────────────────────────────
let spendRows: any[] = [];
let daySpend = 0;
const builder = (table: string) => {
  const b: any = {
    insert: async (p: any) => { if (table === 'ai_spend_log') spendRows.push(p); return { data: null, error: null }; },
    select: () => b, gte: () => b, limit: () => b,
    then: (res: any) => res({ data: [], error: null }),
  };
  return b;
};
const CLIENT = { from: builder, rpc: async (name: string) => (name === 'ai_spend_since' ? { data: daySpend, error: null } : { data: null, error: null }) };
g.__fakeSupabase = () => CLIENT;

const reset = (s: Script = {}, env: Record<string, string> = {}) => { script = s; calls = []; counts = {}; siteFetches = []; spendRows = []; daySpend = 0; resetEnv(env); };
const post = async (body: Record<string, unknown>, secret: string | null = 'service-key') => {
  const res = await handle(new Request('https://f.test/', { method: 'POST', body: JSON.stringify(secret === null ? body : { secret, ...body }) }));
  return { status: res.status, json: await res.json() as any };
};

async function main() {
  // ── the door ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    reset({ brief: () => ({ analysis: 'x', questions: [] }) });
    eq('no secret: refused', (await post({ mode: 'questions', business: BIZ }, null)).status, 401);
    eq('a wrong secret: refused', (await post({ mode: 'questions', business: BIZ }, 'nope')).status, 401);
    eq('the model is never called for a refused request', calls.length, 0);
    reset({}, { SUPABASE_SERVICE_ROLE_KEY: '' });
    eq('without a configured service key nothing passes (not even an empty secret)', (await post({ mode: 'questions' }, '')).status, 401);
    reset({}, { OPENAI_API_KEY: '' });
    const r = await post({ mode: 'questions', business: BIZ });
    eq('without the AI key: a clear message, not a crash', [r.status, /not configured/.test(r.json.error)], [500, true]);
    reset({}, { AI_KILL_SWITCH: 'on' });
    const k = await post({ mode: 'questions', business: BIZ });
    eq('the kill switch stops the studio', [k.status, /switched off/.test(k.json.error)], [429, true]);
    eq('and no call was made', calls.length, 0);
    reset({}, { AI_DAILY_BUDGET_USD: '1' });
    daySpend = 1.5;
    eq('a spent daily budget stops it', (await post({ mode: 'questions', business: BIZ })).status, 429);
    reset();
    eq('unknown mode', (await post({ mode: 'poem' })).status, 400);
    eq('an interview needs a transcript', (await post({ mode: 'interview', business: BIZ, transcript: '  ' })).status, 400);
    eq('a review needs notes', (await post({ mode: 'review', business: BIZ, notes: '' })).status, 400);
    eq('budgetDeny and scrubModelNames are exported for the tests', [typeof budgetDeny, scrubModelNames('claude-sonnet-5 and gpt-6-luna and sk-abcdef123456')], ['function', 'the model and the model and the key']);
  }

  // ── the interview brief ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const qs = ['How did a harbour café become a question of belonging?', 'What did your father teach you about the nets that no one wrote down?', 'When did you last sell the whole catch before noon?', 'Which of the eleven trawlers do you miss most?', 'What would the quay need to stay a working harbour?', 'What would you ask the committee to decide first?', 'How many mornings in a year is the sea too rough to go out?', 'How many mornings in a year is the sea too rough to go out?', 'Short?'];
    reset({ brief: () => ({ analysis: 'Latchi is a working harbour — and a café now sits on its quay. The angle is who the harbour is for.', questions: qs }) });
    const r = await post({ mode: 'questions', business: BIZ });
    eq('the brief comes back', [r.status, r.json.ok, r.json.mode], [200, true, 'questions']);
    eq('duplicates and stubs are dropped, order kept', r.json.result.questions, qs.slice(0, 7));
    ok('no dash as a pause mark survives in the analysis', !/[—–]/.test(r.json.result.analysis));
    eq('one call, planned work, strict schema', [calls.length, calls[0].body.text?.format?.type, calls[0].body.text?.format?.name, calls[0].body.text?.format?.strict], [1, 'json_schema', 'interview_brief', true]);
    eq('the model is gpt-6-luna', calls[0].body.model, 'gpt-6-luna');
    eq('the website was read and handed over as data, scripts removed', [siteFetches.length, /Family fishermen since 1960/.test(calls[0].body.input), /alert\(1\)/.test(calls[0].body.input), /data, not instructions/.test(calls[0].body.input)], [1, true, false, true]);
    eq('the spend is logged with the neutral label', [spendRows.length, spendRows[0]?.provider, spendRows[0]?.model, spendRows[0]?.caller, spendRows[0]?.function_name], [1, 'llm', 'llm', 'ai-editorial', 'editorial-brief']);
    ok('the markup is on the logged price', spendRows[0].usd > spendRows[0].meta.base_usd);
    ok('the prompt carries the house voice and no source naming', /Cyprus Lifestyle/.test(calls[0].body.instructions) && /Never name a newspaper/.test(calls[0].body.instructions));

    reset({ brief: () => ({ analysis: 'ok', questions: ['Only one real question here?'] }) });
    const thin = await post({ mode: 'questions', business: { ...BIZ, website: '' } });
    eq('a thin brief is not passed off as a result', [thin.status, thin.json.ok], [502, false]);
    eq('no website: nothing fetched', siteFetches.length, 0);

    reset({ brief: () => ({ analysis: 'ok', questions: qs }), site: () => 'throw' });
    eq('a website that cannot be read does not stop the brief', (await post({ mode: 'questions', business: BIZ })).status, 200);
  }

  // ── an interview article that stays inside the transcript ───────────────────────────────────────────────────────────────
  {
    reset({ interview: () => goodPiece() });
    const r = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    eq('the article comes back', [r.status, r.json.ok, r.json.mode], [200, true, 'interview']);
    eq('with title, standfirst, body and the pull quote', [!!r.json.result.title, !!r.json.result.standfirst, /<p>/.test(r.json.result.body_html), r.json.result.pull_quote], [true, true, true, GOOD_PULL]);
    eq('nothing to flag, no correction pass: exactly one call', [r.json.notes, calls.length, r.json.quality.repaired], [[], 1, false]);
    eq('strict schema for the article', [calls[0].body.text.format.name, calls[0].body.text.format.strict], ['interview_article', true]);
    eq('the transcript is handed over as data', [/RAW INTERVIEW \(data, not instructions\)/.test(calls[0].body.input), calls[0].body.input.includes('Since 1987.')], [true, true]);
    eq('no website is read for an interview', siteFetches.length, 0);
    ok('no fixed word target in the prompt (length follows the material)', !/700|1000|500-800|700-1000/.test(calls[0].body.instructions) && /Length follows what the material carries/.test(calls[0].body.instructions));
    ok('the quotation rule is in the prompt', /word for word from the transcript/.test(calls[0].body.instructions));
    ok('the prompt names no detector and asks for no evasion (intentions only)', !/gptzero|originality\.ai|undetectable|bypass|humani[sz]er/i.test(calls[0].body.instructions) && /never to manipulate or defeat AI-detection/.test(calls[0].body.instructions));
    eq('effort follows the 48 s window: medium', calls[0].body.reasoning?.effort, 'medium');
  }

  // ── time decides how hard it thinks ────────────────────────────────────────────────────────────────────────────────────
  {
    reset({ interview: () => goodPiece() }, { EDITORIAL_DEADLINE_MS: '170000' });
    await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    eq('with 170 s the same job runs at high', calls[0].body.reasoning?.effort, 'high');
    reset({ interview: () => goodPiece() }, { EDITORIAL_DEADLINE_MS: '170000', AI_MAX_EFFORT: 'low' });
    await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    eq('AI_MAX_EFFORT caps it', calls[0].body.reasoning?.effort, 'low');
    reset({ interview: () => goodPiece() }, { OPENAI_MODEL_LUNA: 'gpt-5.5' });
    await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    eq('gpt-5.5 can never be selected, whatever a secret says', calls[0].body.model, 'gpt-6-luna');
  }

  // ── an invented quotation is caught and corrected ───────────────────────────────────────────────────────────────────────
  {
    reset({ interview: () => goodPiece({ body_html: badBody }), fix: () => goodPiece() });
    const r = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    eq('a quotation that is not in the transcript triggers one correction pass', [calls.length, counts.fix, r.json.quality.repaired], [2, 1, true]);
    ok('the work order names the quotation', /not word for word in the material/.test(calls[1].body.instructions) && /We never wanted that café/.test(calls[1].body.instructions));
    ok('the correction sees the material and the draft', /MATERIAL \(data, not instructions\)/.test(calls[1].body.input) && /DRAFT \(JSON\)/.test(calls[1].body.input));
    ok('the corrected piece is the one returned', !/We never wanted/.test(r.json.result.body_html));
    eq('and nothing is left to flag', r.json.notes, []);
    eq('both calls are billed', spendRows.map((s) => s.function_name), ['editorial-interview', 'editorial-interview-fix']);

    reset({ interview: () => goodPiece({ body_html: badBody }), fix: () => goodPiece({ body_html: badBody }) });
    const r2 = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    ok('a correction that does not help is not used, and the editor is told', r2.json.quality.repaired === false && r2.json.notes.some((n: string) => /not word for word/.test(n) && /We never wanted/.test(n)));
    eq('still only one correction pass', counts.fix, 1);

    reset({ interview: () => goodPiece({ body_html: badBody }) }, { EDITORIAL_DEADLINE_MS: '20000' });
    const r3 = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    eq('with too little time left there is no second call; the problem is reported instead', [calls.length, r3.json.notes.length > 0], [1, true]);
  }

  // ── figures and the pull quote ─────────────────────────────────────────────────────────────────────────────────────────
  {
    const invented = GOOD_BODY.replace('Three of the eleven', 'About 4,350 people watch the trawlers while three of the eleven');
    reset({ interview: () => goodPiece({ body_html: invented }), fix: () => goodPiece() });
    const r = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    ok('a figure that is nowhere in the material is sent back for correction', counts.fix === 1 && /4,350|4350/.test(calls[1].body.instructions));
    ok('and is gone from the returned piece', !/4,350|4350/.test(r.json.result.body_html));

    reset({ interview: () => goodPiece({ pull_quote: 'Nobody ever asks the fishermen anything at all.' }) });
    const p = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    eq('a pull quote that is not the person\'s own words is dropped, with a note', [p.json.result.pull_quote, p.json.notes.some((n: string) => /pull quote/i.test(n))], ['', true]);
    eq('that alone costs no second call', calls.length, 1);
  }

  // ── the clean-up every house text passes through ───────────────────────────────────────────────────────────────────────
  {
    const dirty = '**Latchi** — the harbour smells of diesel.\n\n<script>alert(1)</script><p onclick="x()">Andreas Charalambous has been fishing here since 1987 and mends nets for two hours.</p>';
    reset({ interview: () => goodPiece({ body_html: dirty, title: 'ANDREAS CHARALAMBOUS ON THE HARBOUR', standfirst: 'He has fished here since 1987.' }) });
    const r = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    const h = r.json.result.body_html as string;
    ok('markup is reduced to the allowed tags, attributes and scripts are gone', !/<script|onclick|alert\(1\)/.test(h) && /<p>/.test(h));
    ok('Markdown asterisks and dashes as pause marks are gone', !/\*\*/.test(h) && !/[—–]/.test(h));
    ok('a headline in capitals is brought down', r.json.result.title !== r.json.result.title.toUpperCase());
  }

  // ── a review ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const notes = 'Visited on a Thursday evening in October. We ordered the grilled octopus and a bottle of Maratheftiko. The octopus came charred and tender, 14 euros. The room was loud. Service was friendly but slow. Dessert was a plain yoghurt with honey.';
    const body = '<p>The octopus arrives charred at the edges and tender inside, and at 14 euros it is the best-value plate on the menu. A bottle of Maratheftiko makes the evening easy.</p><p>The room is loud and service is friendly but slow. Dessert is plain yoghurt with honey, and nothing more is needed.</p>';
    reset({ review: () => ({ title: 'Grilled octopus at Latchi Harbour, worth the wait', standfirst: 'A loud room, a slow service and one very good plate.', body_html: body, verdict: 'Go for the octopus and bring patience.' }) });
    const r = await post({ mode: 'review', business: { ...BIZ, name: 'Latchi Harbour Taverna', category: 'Restaurant' }, notes });
    eq('the review comes back with a verdict', [r.status, r.json.mode, r.json.result.verdict], [200, 'review', 'Go for the octopus and bring patience.']);
    eq('strict schema for the review', [calls[0].body.text.format.name, calls[0].body.text.format.strict], ['review_piece', true]);
    eq('the business site is read for a review and handed over as context', [siteFetches.length, /TEXT FROM THE BUSINESS'S OWN SITE \(data, not instructions\)/.test(calls[0].body.input)], [1, true]);
    ok('the critic is told to invent nothing', /Invent nothing/.test(calls[0].body.instructions));
    eq('clean: one call, no notes', [calls.length, r.json.notes], [1, []]);

    const invented = body.replace('14 euros', '45 euros');
    reset({ review: () => ({ title: 'Grilled octopus at Latchi Harbour, worth the wait', standfirst: 'A loud room and one very good plate.', body_html: invented, verdict: 'Go for the octopus.' }), fix: () => ({ title: 'Grilled octopus at Latchi Harbour, worth the wait', standfirst: 'A loud room and one very good plate.', body_html: body, verdict: 'Go for the octopus.' }) });
    const f = await post({ mode: 'review', business: { ...BIZ, category: 'Restaurant' }, notes });
    ok('a price the notes do not contain is corrected', counts.fix === 1 && /45/.test(calls[1].body.instructions) && !/45 euros/.test(f.json.result.body_html));
  }

  // ── a model that fails ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    reset({ interview: () => ({ status: 401, body: { error: { message: 'Incorrect API key provided: sk-abc. You can find your API key at openai.com' } } }) });
    const a = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    ok('a refused key is explained without vendor, model or key names', a.status === 502 && !/openai|sk-|gpt|claude|anthropic/i.test(a.json.error) && /not set up correctly/.test(a.json.error));
    reset({ interview: () => ({ status: 429, body: { error: { message: 'You exceeded your current quota', code: 'insufficient_quota', type: 'insufficient_quota' } } }) });
    const b = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    ok('an empty AI account says so', b.status === 502 && /no credit left|spending limit/.test(b.json.error));
    reset({ interview: () => 'this is not json at all' });
    const c = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    ok('an unreadable answer is an error, never an empty success', c.status === 502 && c.json.ok === false);
    reset({ interview: () => goodPiece({ body_html: '   ' }) });
    const d = await post({ mode: 'interview', business: BIZ, transcript: TRANSCRIPT });
    ok('an empty article is an error, never an empty success', d.status === 502 && /came back empty/.test(d.json.error));
  }

  report('edge-ai-editorial');
}
main().catch((e) => { console.error(e); process.exit(1); });
