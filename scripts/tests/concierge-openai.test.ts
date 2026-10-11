// The concierge family on OpenAI, end to end with a scripted network: the answer in one piece (WhatsApp, Telegram, Ask box), the streamed
// answer (web chat), the helpers (understanding, rerank, memory, evaluation judge) and the mail assistant. The real brain, lib/ai.ts and the
// OpenAI client run unchanged; the database is the no-op test client, so retrieval finds nothing and the model works from the prompt alone.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { runConcierge, streamConcierge, conciergeSystem, CONCIERGE_MODEL, type StreamEvent } from '@/lib/concierge/brain';
import { understandQuery } from '@/lib/concierge/understand';
import { rerankCandidates } from '@/lib/concierge/rerank';
import { updateMemory } from '@/lib/concierge/memory';
import { judgeAnswer } from '@/lib/concierge/eval';
import { composeReply } from '@/lib/mail/assist';
import { installFakeOpenAI, streamEvents, type FakeReply } from './_fakeOpenAI';
import { eq, ok, report } from './_harness';

const failure = (status: number, message: string, extra: Record<string, unknown> = {}): FakeReply => ({ status, body: { error: { message, ...extra } } });
const Q = 'Where can I have dinner by the harbour in Paphos tonight?';
const ROW = { id: 'm1', from_email: 'guest@example.com', from_name: 'Anna', to_email: 'hello@cypruslifestyle.eu', subject: 'Villa for May', text_body: 'We would like a villa near Paphos for two weeks in May. Any ideas?', in_reply_to: null };

async function events(gen: AsyncGenerator<StreamEvent>) { const out: StreamEvent[] = []; for await (const e of gen) out.push(e); return out; }
const deltas = (ev: StreamEvent[]) => ev.filter((e): e is Extract<StreamEvent, { type: 'delta' }> => e.type === 'delta').map((e) => e.text).join('');

(async () => {
  for (const k of ['AI_EFFORT_CHAT', 'AI_EFFORT_HELPER', 'AI_EFFORT_MAIL', 'AI_FORCE_TIER', 'AI_SOL_ENABLED', 'AI_MAX_EFFORT', 'AI_KILL_SWITCH', 'CONCIERGE_LLM_UNDERSTAND', 'CONCIERGE_RERANK']) delete process.env[k];
  const realError = console.error; console.error = () => {};

  eq('the concierge model is gpt-6-luna', CONCIERGE_MODEL, 'gpt-6-luna');

  // ── the answer in one piece (WhatsApp, Telegram, the Ask box) ──────────────────────────────────────────────────────────
  {
    const fx = installFakeOpenAI(() => 'The harbour at Latchi is a short drive from Paphos, and the fish is good.');
    const r = await runConcierge([{ role: 'user', content: Q }], 'en');
    eq('the model\'s words come back', r.text, 'The harbour at Latchi is a short drive from Paphos, and the fish is good.');
    const c = fx.calls[0];
    eq('one plain call, gpt-6-luna at "low"', [fx.calls.length, c.stream, c.model, c.effort], [1, false, 'gpt-6-luna', 'low']);
    ok('the system prompt is the concierge persona plus the grounding for this turn', c.system.startsWith(conciergeSystem('en')) && c.system.length > conciergeSystem('en').length);
    eq('the question is the input', c.input, Q);
    eq('the language-bound cache key', c.cacheKey, 'concierge-en');
    ok('nothing about a vendor or a key in what the model is told', !/anthropic|claude|sk-/i.test(c.system));
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => 'Ja, gerne.');
    const convo = [{ role: 'user' as const, content: 'Hallo' }, { role: 'assistant' as const, content: 'Guten Tag, wie kann ich helfen?' }, { role: 'user' as const, content: 'Ein Tisch am Hafen bitte' }];
    await runConcierge(convo, 'de', { matchLanguage: true });
    const c = fx.calls[0];
    eq('WhatsApp: the earlier turns go in as real messages', c.input, [{ role: 'user', content: 'Hallo' }, { role: 'assistant', content: 'Guten Tag, wie kann ich helfen?' }, { role: 'user', content: 'Ein Tisch am Hafen bitte' }]);
    ok('and the model is told to answer in the language the guest writes in', /SAME language the guest writes in/.test(c.system));
    eq('German guests share the German cache', c.cacheKey, 'concierge-de');
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => failure(401, 'Incorrect API key provided: sk-test.'));
    const r = await runConcierge([{ role: 'user', content: Q }], 'en');
    eq('a refused key: empty text (the channel then says "one moment"), retrieval still delivered', [r.text, Array.isArray(r.ctx.picks)], ['', true]);
    fx.restore();
  }
  {
    delete process.env.OPENAI_API_KEY;
    const fx = installFakeOpenAI(() => 'x'); delete process.env.OPENAI_API_KEY;
    const r = await runConcierge([{ role: 'user', content: Q }], 'en');
    eq('no key at all: empty text and no call', [r.text, fx.calls.length], ['', 0]);
    fx.restore();
  }

  // ── the streamed answer (web chat) ─────────────────────────────────────────────────────────────────────────────────────
  {
    const fx = installFakeOpenAI(() => ({ stream: streamEvents(['The harbour at Latchi ', 'is lovely at sunset.']) }));
    const ev = await events(streamConcierge([{ role: 'user', content: Q }], 'en', '\n\nGUEST MEMORY — name: Anna.', ''));
    eq('the events: searching, composing, words, meta, done', [ev[0], ev[1], ev[ev.length - 2].type, ev[ev.length - 1].type], [{ type: 'status', label: 'searching' }, { type: 'status', label: 'composing' }, 'meta', 'done']);
    eq('the words', deltas(ev), 'The harbour at Latchi is lovely at sunset.');
    ok('the guest\'s memory is part of the prompt', /GUEST MEMORY — name: Anna/.test(fx.calls[0].system));
    eq('one streamed call', [fx.calls.length, fx.calls[0].stream], [1, true]);
    fx.restore();
  }
  {
    const fx = installFakeOpenAI((c) => (c.stream ? { stream: streamEvents([]) } : 'Second chance answer.'));
    const ev = await events(streamConcierge([{ role: 'user', content: Q }], 'en'));
    eq('a stream that finishes without a word falls back to one answer in one piece', [deltas(ev), fx.calls.map((c) => c.stream)], ['Second chance answer.', [true, false]]);
    ok('and no error reaches the guest', !ev.some((e) => e.type === 'error'));
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => failure(401, 'Incorrect API key provided: sk-live-SECRET-1234.'));
    const ev = await events(streamConcierge([{ role: 'user', content: Q }], 'en'));
    const err = ev.find((e) => e.type === 'error') as any;
    eq('a refused key: no second try (it would fail the same way), the guest gets one generic error', [fx.calls.length, err?.error], [1, 'unavailable']);
    ok('nothing of the provider\'s message or the key leaves the server', !/sk-|Incorrect|API key/i.test(JSON.stringify(ev)));
    ok('the retrieval result is still delivered after the error, and the stream ends cleanly', ev[ev.length - 2].type === 'meta' && ev[ev.length - 1].type === 'done');
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => ({ stream: streamEvents(['no']) }));
    process.env.AI_KILL_SWITCH = '1';
    const ev = await events(streamConcierge([{ role: 'user', content: Q }], 'en'));
    eq('the kill switch: no call, one generic error, no second try', [fx.calls.length, (ev.find((e) => e.type === 'error') as any)?.error], [0, 'unavailable']);
    delete process.env.AI_KILL_SWITCH;
    fx.restore();
  }

  // ── the helpers: gpt-6-luna at "low", JSON mode, time-boxed; every miss degrades to the plain path ─────────────────────
  {
    const fx = installFakeOpenAI(() => '{"district":"limassol","subtype":null,"keywords":["air conditioning repair"],"luxury":false}');
    eq('understanding is opt-in: off, no call', [await understandQuery('mi si-a stricat aerul condiționat în Limassol'), fx.calls.length], [null, 0]);
    process.env.CONCIERGE_LLM_UNDERSTAND = '1';
    const u = await understandQuery('mi si-a stricat aerul condiționat în Limassol');
    eq('on: the model\'s reading is returned', u, { district: 'limassol', subtype: null, keywords: ['air conditioning repair'], luxury: false });
    eq('a helper call: gpt-6-luna, "low", JSON mode', [fx.calls[0].model, fx.calls[0].effort, fx.calls[0].format], ['gpt-6-luna', 'low', { type: 'json_object' }]);
    fx.restore();
    const bad = installFakeOpenAI(() => 'I am sorry, I cannot do that.');
    eq('an unreadable reply is no understanding', await understandQuery('aer condiționat'), null);
    bad.restore();
    const down = installFakeOpenAI(() => failure(401, 'bad key'));
    eq('a refused key is no understanding either', await understandQuery('aer condiționat'), null);
    down.restore();
    delete process.env.CONCIERGE_LLM_UNDERSTAND;
  }
  {
    const cands = [{ slug: 'taxi', name: 'City Taxi', type: 'service', rating: 4.9 }, { slug: 'lock', name: 'Locksmith 24', type: 'service', rating: 4.2 }, { slug: 'cafe', name: 'Café Lara', type: 'restaurant', rating: 4.5 }];
    const fx = installFakeOpenAI(() => '{"scores":[{"slug":"taxi","r":0},{"slug":"lock","r":3},{"slug":"cafe","r":1}]}');
    eq('rerank is opt-in: off, same order, no call', [(await rerankCandidates('locksmith', cands)).map((c) => c.slug), fx.calls.length], [['taxi', 'lock', 'cafe'], 0]);
    process.env.CONCIERGE_RERANK = '1';
    eq('on: the locksmith leads and the taxi (wrong category) drops out', (await rerankCandidates('I am locked out, I need a locksmith', cands)).map((c) => c.slug), ['lock', 'cafe']);
    eq('a helper call: gpt-6-luna, "low", JSON mode', [fx.calls[0].model, fx.calls[0].effort, fx.calls[0].format], ['gpt-6-luna', 'low', { type: 'json_object' }]);
    fx.restore();
    const down = installFakeOpenAI(() => failure(401, 'bad key'));
    eq('a miss leaves the order untouched', (await rerankCandidates('locksmith', cands)).map((c) => c.slug), ['taxi', 'lock', 'cafe']);
    down.restore();
    delete process.env.CONCIERGE_RERANK;
  }
  {
    const saved: any[] = [];
    (globalThis as any).__testSupabase = () => ({ from: (t: string) => ({ upsert: async (row: any) => { saved.push([t, row]); return { data: null, error: null }; } }) });
    const cid = 'c0ffee00-1111-4222-8333-444455556666';
    const fx = installFakeOpenAI(() => '{"name":"Anna","base":"Paphos","interests":["sailing"],"secret":"x","dates":"12-16 May"}');
    await updateMemory(cid, 'I am Anna, staying in Paphos 12-16 May, we love sailing', 'Lovely.', { dietary: 'vegetarian' });
    eq('the memory is saved: the guest\'s old facts kept, the new ones merged, unknown keys dropped', [saved.length, saved[0][0], saved[0][1].cid, saved[0][1].profile], [1, 'concierge_memory', cid, { name: 'Anna', base: 'Paphos', dates: '12-16 May', dietary: 'vegetarian', interests: ['sailing'] }]);
    eq('a helper call: gpt-6-luna, "low", JSON mode', [fx.calls[0].model, fx.calls[0].effort, fx.calls[0].format], ['gpt-6-luna', 'low', { type: 'json_object' }]);
    fx.restore();
    const junk = installFakeOpenAI(() => 'sorry, no');
    await updateMemory(cid, 'hello there', 'Hi.', {});
    eq('an unreadable reply saves nothing', saved.length, 1);
    junk.restore();
    const down = installFakeOpenAI(() => failure(401, 'bad key'));
    await updateMemory(cid, 'hello there', 'Hi.', {});
    eq('a refused key saves nothing and breaks nothing', saved.length, 1);
    down.restore();
    delete (globalThis as any).__testSupabase;
  }
  {
    const item = { id: 'en-restaurant', locale: 'en', intent: 'restaurant', question: 'Can you recommend a seafood restaurant in Limassol?' };
    const fx = installFakeOpenAI(() => '{"grounded":5,"language":4,"helpful":4,"notes":"Stays within the context."}');
    const j = await judgeAnswer(item, 'Try Ocean Basket in Limassol.', 'CONTEXT: Ocean Basket, Limassol');
    eq('the judge\'s scores are read', [j.grounded, j.language, j.helpful, j.notes], [5, 4, 4, 'Stays within the context.']);
    eq('the judge is a check job: gpt-6-luna, "medium", JSON mode', [fx.calls[0].model, fx.calls[0].effort, fx.calls[0].format], ['gpt-6-luna', 'medium', { type: 'json_object' }]);
    ok('it sees the question, the language, the context and the answer', /Can you recommend/.test(fx.calls[0].user) && /REQUIRED LANGUAGE: English/.test(fx.calls[0].user) && /Ocean Basket, Limassol/.test(fx.calls[0].user) && /Try Ocean Basket/.test(fx.calls[0].user));
    fx.restore();
    const down = installFakeOpenAI(() => failure(401, 'bad key'));
    const e = await judgeAnswer(item, 'x', 'y');
    eq('a judge that cannot answer reports an error, never a score', [e.grounded, typeof e.error], [0, 'string']);
    down.restore();
  }

  // ── the mail assistant ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const fx = installFakeOpenAI(() => 'Dear Anna,\n\nFor two weeks in May near Paphos we would look at Latchi. More: https://www.visitcyprus.com/latchi\n\nWith best wishes');
    const r = await composeReply(ROW, { mode: 'compose' });
    ok('a draft comes back', !!r.body && r.body.startsWith('Dear Anna') && r.error === undefined);
    ok('another site is not linked in the draft (house rule)', !/visitcyprus/i.test(r.body || ''));
    const c = fx.calls[0];
    eq('one call: gpt-6-luna at "medium" (a person reads and sends this), not streamed', [fx.calls.length, c.model, c.effort, c.stream], [1, 'gpt-6-luna', 'medium', false]);
    ok('the prompt carries the persona, the desk and the guest\'s mail', c.system.startsWith(conciergeSystem('en')) && /EMAIL REPLY on behalf of/.test(c.system) && /villa near Paphos/.test(c.user));
    eq('the language is the guest\'s', r.locale, 'en');
    fx.restore();
  }
  {
    const fx = installFakeOpenAI((c, n) => (n === 1 ? '' : 'Dear Anna, second try works.'));
    const r = await composeReply(ROW, { mode: 'compose' });
    eq('an empty first draft: a second try, thinking less to fit the time', [r.body, fx.calls.map((c) => c.effort)], ['Dear Anna, second try works.', ['medium', 'low']]);
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => failure(401, 'Incorrect API key provided: sk-test.'));
    const r = await composeReply(ROW, { mode: 'compose' });
    eq('a refused key: one call only (a second would fail the same way), the real reason is returned', [fx.calls.length, r.body, /Incorrect API key/.test(r.error || '')], [1, undefined, true]);
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => 'Dear Anna, quick draft.');
    await composeReply(ROW, { mode: 'compose', budgetMs: 22_000 });
    eq('a caller with less time (the draft that runs when mail arrives) makes the model think less, not fail', fx.calls[0].effort, 'low');
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => 'Dear Anna, polished.');
    const r = await composeReply(ROW, { mode: 'polish', instruction: 'dear anna we have a villa maybe' });
    ok('polish works the same way', r.body === 'Dear Anna, polished.' && /rough draft/.test(fx.calls[0].user) && /dear anna we have a villa maybe/.test(fx.calls[0].user));
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => 'Liebe Anna, gern.');
    const r = await composeReply({ ...ROW, subject: 'Villa im Mai', text_body: 'Wir suchen eine Villa.' }, { mode: 'compose', locale: 'de' });
    eq('an explicit language is honoured and named in the prompt', [r.locale, /German/.test(fx.calls[0].system)], ['de', true]);
    fx.restore();
  }

  console.error = realError;
  report('concierge-openai');
})().catch((e) => { process.stderr.write(`${(e as Error)?.stack || e}\n`); process.exit(1); });
