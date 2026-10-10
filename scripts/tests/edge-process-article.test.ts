// The Supabase edge function end to end, from its source, with a scripted model and an in-memory database: no network, no key, no money.
// The deterministic parts are the real ones (clean-up, voice engine, originality gate, publish bar); only the model and the database are faked.
import { processOne, handle, budgetDeny, isSourceContentRealProse, isTitleGeneric, scrubModelNames, releaseStaleClaims, keepAlive, loadExemplars, loadRecentOpenings } from '../edge/process-scraped-article.src';
import { runAssess } from '@/lib/journalism/assessService';
import { FIXTURES } from './fixtures/antiAi-langs';
import { LANG_NAME, LANGS, type Lang } from '@/lib/journalism/languages';
import { eq, ok, report } from './_harness';
import { requestProblem, rejection, rulesViolations } from './_openaiRules';

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any;

// ── the environment ─────────────────────────────────────────────────────────────────────────────────────────────────────
let ENVV: Record<string, string> = {};
const resetEnv = (over: Record<string, string> = {}) => { ENVV = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service-key', OPENAI_API_KEY: 'sk-test-key-123456', UNSPLASH_ACCESS_KEY: 'u-key', SITE_URL: 'https://site.test', ENRICH_SECRET: 'enrich-secret', ...over }; };
g.Deno = { env: { get: (k: string) => ENVV[k] } };

// ── a fixture story: Latchi harbour (the "human" paragraph of each language, which the real voice engine passes) ──────────
const BODY: Record<Lang, string> = Object.fromEntries(LANGS.map((l) => [l, FIXTURES[l].human[0].split(/\n\s*\n/).map((p) => `<p>${p.trim()}</p>`).join('')])) as Record<Lang, string>;
const SOURCE = 'The fishing harbour at Latchi has a new café on the quay, and the old trawler owners are not pleased about it. '
  + 'Andreas Charalambous has fished from the harbour for decades and says the café charges nine euros for a frappe, which no fisherman will pay. '
  + 'The municipality approved the lease last spring after a long council debate, and the tenant plans to open an evening terrace in summer. '
  + 'Only three of the eleven trawlers that worked this stretch fifteen years ago are still afloat, and the remaining owners worry about mooring fees. '
  + 'A harbour committee will meet next month to decide whether the quay can host both the café tables and the nets that are mended there every morning.';
const CORE = {
  category: 'cyprus', subcategory: 'regional', district: 'paphos', source_lang: 'en', cyprus_angle: true, cyprus_basis: 'place', cyprus_evidence: 'The fishing harbour at Latchi has a new café on the quay', cyprus_hook: 'Latchi harbour', story_type: 'news', complexity: 'routine', flags: [],
  headline_fact: 'A new café on the Latchi quay divides the fishermen.',
  confirmed_facts: [
    { fact: 'A new café opened on the quay of Latchi harbour.', evidence: 'The fishing harbour at Latchi has a new café on the quay' },
    { fact: 'The municipality approved the lease last spring.', evidence: 'The municipality approved the lease last spring after a long council debate' },
    { fact: 'Only three of eleven trawlers are still afloat.', evidence: 'Only three of the eleven trawlers that worked this stretch fifteen years ago are still afloat' },
    { fact: 'The café charges nine euros for a frappe.', evidence: 'the café charges nine euros for a frappe' },
    { fact: 'A harbour committee meets next month.', evidence: 'A harbour committee will meet next month' },
  ],
  attributed_claims: [], allegations: [], unverified: [], direct_quotes: [], dates: [], numbers: [{ value: 'nine euros', what: 'price of a frappe' }, { value: 'three of eleven', what: 'trawlers still afloat' }],
  entities: [{ name: 'Andreas Charalambous', kind: 'person', role: 'fisherman' }, { name: 'Latchi', kind: 'place', role: 'harbour' }], open_questions: [], conflicts: [],
};
const NAME_TO_LANG: Record<string, Lang> = Object.fromEntries(LANGS.map((l) => [LANG_NAME[l].toUpperCase(), l]));
const TAGS: Record<Lang, string[]> = { en: ['latchi', 'harbour', 'fishing'], de: ['latchi', 'hafen', 'fischerei'], pl: ['latchi', 'port', 'rybołówstwo'], ro: ['latchi', 'port', 'pescuit'], ru: ['лачи', 'порт', 'рыбаки'], el: ['λάτσι', 'λιμάνι', 'αλιεία'], ar: ['لاتشي', 'ميناء', 'صيد']};

// ── the scripted model ───────────────────────────────────────────────────────────────────────────────────────────────────
interface Script {
  core?: () => unknown; compose?: (l: Lang, n: number) => Record<string, unknown> | { fail: number; body?: unknown };
  factcheck?: (l: Lang, n: number) => unknown; edit?: (l: Lang, n: number) => unknown; deoverlap?: (l: Lang, n: number) => unknown;
  repair?: (l: Lang, n: number) => unknown; fields?: (l: Lang, n: number) => unknown; evidence?: (n: number) => unknown; openaiStatus?: (kind: string) => { status: number; body: unknown } | null;
}
const composeFor = (l: Lang, over: Record<string, unknown> = {}) => ({ title: `${l}: fishermen and the new café on the quay`, excerpt: `${l}: the quay divides the harbour`, summary: `${l}: a café, the mooring fees and the committee`, content_html: BODY[l], tags: TAGS[l], seo_title: `${l}: Latchi harbour café`, seo_description: `${l}: how the new café divides the Latchi fishermen`, ...over });
const PASS = { verdict: 'pass', issues: [] };
const HIGH = { verdict: 'fix', issues: [{ severity: 'high', kind: 'invented_specific', excerpt: 'the mayor wept', problem: 'not in the core', core_ref: 'none', fix: 'delete', correction: '' }] };

let calls: Array<{ kind: string; lang?: Lang; body: any }> = [];
let counts: Record<string, number> = {};
let script: Script = {};
const responsesBody = (text: string) => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: 4000, output_tokens: 900, input_tokens_details: { cached_tokens: 1000 }, output_tokens_details: { reasoning_tokens: 300 } } });
function classify(body: any): { kind: string; lang?: Lang } {
  const sys = String(body.instructions || '');
  const m = /LANGUAGE NOTES: ([A-Z]+)/.exec(sys);
  if (/research editor of Cyprus Lifestyle/.test(sys)) return { kind: 'core' };
  if (/source checker of Cyprus Lifestyle/.test(sys)) return { kind: 'evidence' };
  if (m) return { kind: 'compose', lang: NAME_TO_LANG[m[1]] };
  const lang = (/\b(English|German|Polish|Romanian|Russian|Greek|Arabic)\b/.exec(sys) || [])[1];
  const L = lang ? NAME_TO_LANG[lang.toUpperCase()] : undefined;
  if (/fact-checking editor/.test(sys)) return { kind: 'factcheck', lang: L };
  if (/A fact check found problems/.test(sys)) return { kind: 'repair', lang: L };
  if (/headline and metadata editor/.test(sys)) return { kind: 'fields', lang: L };
  if (/still echoes wording/.test(sys)) return { kind: 'deoverlap', lang: L };
  if (/senior sub-editor at Cyprus Lifestyle editing/.test(sys)) return { kind: 'edit', lang: L };
  if (/stock-photo search query/.test(sys)) return { kind: 'visual' };
  if (/connectivity test/.test(sys)) return { kind: 'selftest' };
  if (/rejected as generic/.test(sys)) return { kind: 'title' };
  return { kind: 'unknown' };
}
function model(body: any): { status: number; body: unknown } {
  const c = classify(body);
  calls.push({ ...c, body });
  const key = `${c.kind}${c.lang ? '-' + c.lang : ''}`;
  counts[key] = (counts[key] || 0) + 1; if (key !== c.kind) counts[c.kind] = (counts[c.kind] || 0) + 1;
  const refused = script.openaiStatus?.(c.kind);
  if (refused) return refused;
  const n = counts[key];
  switch (c.kind) {
    case 'core': return { status: 200, body: responsesBody(JSON.stringify(script.core ? script.core() : CORE)) };
    case 'compose': {
      const r = script.compose ? script.compose(c.lang!, n) : composeFor(c.lang!);
      if ((r as any).fail) return { status: (r as any).fail, body: (r as any).body ?? { error: { message: 'overloaded' } } };
      return { status: 200, body: responsesBody(JSON.stringify(r)) };
    }
    case 'evidence': return { status: 200, body: responsesBody(JSON.stringify(script.evidence ? script.evidence(n) : { passages: [] })) };
    case 'factcheck': return { status: 200, body: responsesBody(JSON.stringify(script.factcheck ? script.factcheck(c.lang!, n) : PASS)) };
    case 'edit': return { status: 200, body: responsesBody(JSON.stringify(script.edit ? script.edit(c.lang!, n) : { content_html: '' })) };
    case 'deoverlap': return { status: 200, body: responsesBody(JSON.stringify(script.deoverlap ? script.deoverlap(c.lang!, n) : { content_html: '' })) };
    case 'repair': return { status: 200, body: responsesBody(JSON.stringify(script.repair ? script.repair(c.lang!, n) : { title: '', content_html: '' })) };
    case 'fields': return { status: 200, body: responsesBody(JSON.stringify(script.fields ? script.fields(c.lang!, n) : { title: '', excerpt: '', summary: '', seo_title: '', seo_description: '' })) };
    case 'visual': return { status: 200, body: responsesBody('latchi harbour fishing boats') };
    case 'selftest': return { status: 200, body: responsesBody('{"ok":true}') };
    case 'title': return { status: 200, body: responsesBody(JSON.stringify({ title: 'Latchi fishermen face a café on their quay' })) };
    default: return { status: 500, body: { error: { message: `unscripted call: ${String(body.instructions).slice(0, 60)}` } } };
  }
}
const ALL: Lang[] = [...LANGS];
let revalidated: any[] = [];
let unsplashQueries: string[] = [];
// The website's style check (app/api/desk/assess): the real judge, in process. `assessMode` lets a test take the website down or change the secret.
let assessCalls: Array<{ lang: string; key: string }> = [];
let assessMode: 'up' | 'down' | { downAfter: number } = 'up';
// The embeddings service: every text gets a direction of its own (no two sentences are close), unless a test says otherwise.
let embedCalls: number[] = [];
let embedMode: 'up' | 'down' = 'up';
let embedOf: (t: string) => number[] = (t) => { let h = 7; for (const c of t) h = (h * 131 + c.charCodeAt(0)) % 1_000_003; const k = h % 1024; return Array.from({ length: 1024 }, (_, i) => (i === k ? 1 : 0)); };
g.fetch = async (url: string, init?: any) => {
  const u = String(url);
  if (u === 'https://site.test/api/desk/assess') {
    const key = String(init?.headers?.['x-enrich-key'] ?? '');
    const body = JSON.parse(init.body);
    assessCalls.push({ lang: body.lang, key });
    if (assessMode === 'down' || (typeof assessMode === 'object' && assessCalls.length > assessMode.downAfter)) return new Response('unavailable', { status: 503 });
    if (key !== 'enrich-secret') return new Response('{"ok":false}', { status: 401 });
    const r = runAssess(body);
    return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json' } });
  }
  if (u.endsWith('/v1/embeddings')) {
    const b = JSON.parse(init.body); embedCalls.push(b.input.length);
    if (embedMode === 'down') return new Response('unavailable', { status: 503 });
    return new Response(JSON.stringify({ data: b.input.map((t: string, i: number) => ({ index: i, embedding: embedOf(t) })), usage: { prompt_tokens: b.input.length * 20, total_tokens: b.input.length * 20 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('api.openai.com')) { const b = JSON.parse(init.body); const problem = requestProblem(b); if (problem) { rulesViolations.push(`${b?.text?.format?.type ?? 'plain'} request: ${problem}`); return new Response(JSON.stringify(rejection(problem).body), { status: 400, headers: { 'content-type': 'application/json' } }); } const r = model(b); return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } }); }
  if (u.includes('api.unsplash.com')) { unsplashQueries.push(decodeURIComponent((u.split('query=')[1] || '').split('&')[0])); return new Response(JSON.stringify({ results: [{ urls: { regular: 'https://img.test/cover.jpg' } }] }), { status: 200 }); }
  if (u.includes('/api/revalidate')) { revalidated.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); }
  throw new Error(`unexpected fetch ${u}`);
};

// ── the in-memory database ──────────────────────────────────────────────────────────────────────────────────────────────
interface Q { table: string; op: 'select' | 'insert' | 'update' | 'rpc'; payload?: any; filters: Array<[string, unknown]>; returning?: boolean; rpc?: string; args?: any }
let currentHandler: (q: Q) => { data?: any; error?: any } = () => ({});
// ONE client object for the whole file: the function caches its database client, so each test world swaps the handler behind it.
const builder = (table: string) => {
  const q: Q = { table, op: 'select', filters: [] };
  const run = () => Promise.resolve(currentHandler(q)).then((r) => ({ data: r.data ?? null, error: r.error ?? null }));
  const b: any = {
    select: () => { if (q.op !== 'select') q.returning = true; return b; },
    insert: (p: any) => { q.op = 'insert'; q.payload = p; return b; },
    update: (p: any) => { q.op = 'update'; q.payload = p; return b; },
    eq: (c: string, v: unknown) => { q.filters.push([c, v]); return b; }, gte: (c: string, v: unknown) => { q.filters.push([c, v]); return b; },
    lt: (c: string, v: unknown) => { q.filters.push([`lt:${c}`, v]); return b; }, neq: (c: string, v: unknown) => { q.filters.push([`neq:${c}`, v]); return b; }, in: (c: string, v: unknown) => { q.filters.push([`in:${c}`, v]); return b; },
    order: () => b, limit: () => b, single: () => run().then((r) => { const d = Array.isArray(r.data) ? r.data[0] : r.data; return { data: d ?? null, error: d ? r.error : (r.error ?? { message: 'no rows' }) }; }),
    maybeSingle: () => run().then((r) => ({ data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error })),
    then: (res: any, rej: any) => run().then(res, rej),
  };
  return b;
};
const CLIENT = {
  from: builder,
  rpc: (name: string, args: any) => { const q: Q = { table: '', op: 'rpc', rpc: name, args, filters: [] }; return Promise.resolve(currentHandler(q)).then((r) => ({ data: r.data ?? null, error: r.error ?? null })); },
  auth: { admin: { listUsers: async () => ({ error: { message: 'not service role' } }) }, getUser: async () => ({ data: { user: null }, error: { message: 'bad token' } }) },
};
g.__fakeSupabase = () => CLIENT;
function makeWorld(over: { status?: string; content?: string; logsHaveMeta?: boolean; daySpend?: number; monthSpend?: number; settings?: any; queue?: any[]; exemplars?: any[]; openings?: any; url?: string } = {}) {
  const w = {
    row: { id: 'row-1', original_title: 'Latchi quay café splits fishermen', original_url: over.url ?? 'https://src.test/a', source_id: 'src-1', original_content: over.content ?? SOURCE, original_content_full: over.content ?? SOURCE, category: 'cyprus', status: over.status ?? 'scraped' } as any,
    settings: over.settings ?? { processor_enabled: true, auto_publish: true },
    spendRows: [] as any[], logs: [] as any[], rejectedLogs: 0, commits: [] as any[], rowUpdates: [] as any[], ops: [] as Q[],
    queue: (over.queue ?? []) as any[], postUpdates: [] as any[], partnerUpdates: undefined as any[] | undefined,
  };
  const handler = (q: Q): { data?: any; error?: any } => {
    w.ops.push(q);
    if (q.op === 'rpc') {
      if (q.rpc === 'commit_scraper_blog_post') { w.commits.push(q.args); return { data: 'post-1' }; }
      if (q.rpc === 'recent_article_openings') return { data: over.openings ?? null };
      if (q.rpc === 'ai_spend_since') { const iso = String(q.args.p_since); return { data: iso.endsWith('-01T00:00:00.000Z') ? (over.monthSpend ?? 0) : (over.daySpend ?? 0) }; }
      return { data: null };
    }
    switch (q.table) {
      case 'style_exemplars': return { data: over.exemplars ?? [] };
      case 'blog_posts': { if (q.op === 'update') w.postUpdates.push({ payload: q.payload, filters: q.filters }); return {}; }
      case 'scraped_articles': {
        const idFilter = q.filters.find((f) => f[0] === 'id')?.[1];
        if (q.op === 'update' && idFilter && idFilter !== w.row.id) {
          // a second account from the queue
          const t = w.queue.find((x) => x.id === idFilter); if (!t) return { data: null };
          const needStatus = q.filters.find((f) => f[0] === 'status')?.[1];
          w.partnerUpdates = [...(w.partnerUpdates || []), { id: idFilter, payload: q.payload }];
          if (needStatus !== undefined && t.status !== needStatus) return { data: null };
          Object.assign(t, q.payload); return { data: q.returning ? { id: t.id } : null };
        }
        if (q.op === 'select' && q.filters.some((f) => f[0] === 'neq:id')) return { data: w.queue.filter((x) => x.status === 'scraped') };
        if (q.op === 'update') {
          w.rowUpdates.push(q.payload);
          const needStatus = q.filters.find((f) => f[0] === 'status')?.[1];
          if (q.returning) { if (needStatus !== undefined && w.row.status !== needStatus) return { error: { message: 'no rows' } }; Object.assign(w.row, q.payload); return { data: { ...w.row } }; }
          Object.assign(w.row, q.payload); return {};
        }
        if (q.filters.some((f) => f[0] === 'status' && f[1] === 'rewriting')) {
          const lt = q.filters.find((f) => f[0] === 'lt:rewrite_started_at')?.[1];
          const started = (w.row as any).rewrite_started_at;
          return { data: w.row.status === 'rewriting' && started && (!lt || String(started) < String(lt)) ? [w.row] : [] };
        }
        return { data: w.row.status === 'scraped' ? [w.row] : [] };
      }
      case 'generation_logs': {
        if (q.op === 'insert') { if (over.logsHaveMeta === false && 'meta' in q.payload) { w.rejectedLogs++; return { error: { message: "Could not find the 'meta' column of 'generation_logs'" } }; } w.logs.push(q.payload); return {}; }
        return {};
      }
      case 'ai_spend_log': { if (q.op === 'insert') { w.spendRows.push(q.payload); return {}; } return { data: [] }; }
      case 'authors': return { data: { id: 'author-1' } };
      case 'automation_settings': return { data: w.settings };
      default: return {};
    }
  };
  currentHandler = handler;
  return { w, client: CLIENT };
}
const reset = (s: Script = {}, envOver: Record<string, string> = {}) => { calls = []; counts = {}; script = s; revalidated = []; unsplashQueries = []; assessCalls = []; assessMode = 'up'; embedCalls = []; embedMode = 'up'; resetEnv(envOver); };

async function main() {
  // ── the happy path: seven editions, all checks pass, auto-publish ─────────────────────────────────────────────────────
  {
    reset({}, { SITE_URL: 'https://site.test', REVALIDATE_SECRET: 'rev-secret' });
    const { w, client } = makeWorld();
    const out = await processOne(client as any, w.row, true);
    ok('an article passes and is published', out.ok && out.status === 'published' && out.post_id === 'post-1');
    eq('the call plan: one core, seven editions, seven fact checks, one cover brief, nothing else', [counts.core, counts.compose, counts.factcheck, counts.visual, calls.length], [1, 7, 7, 1, 16]);
    const p = w.commits[0].p_blog_payload; const wb = w.commits[0].p_writeback;
    eq('the commit carries all seven editions in every column family', LANGS.every((l) => p[`title_${l}`] && p[`content_${l}`] && p[`excerpt_${l}`] && p[`summary_${l}`] && p[`seo_title_${l}`] && p[`seo_description_${l}`] && wb[`rewritten_${l}`] && wb[`rewrite_tags_${l}`].length === 3), true);
    ok('every edition is its own text (nothing is the English one in disguise)', LANGS.filter((l) => l !== 'en').every((l) => p[`content_${l}`] !== p.content_en));
    eq('Russian tags survive (they were lost before)', p.tags_ru, ['лачи', 'порт', 'рыбаки']);
    eq('status, county, cover, author, editor', [p.status, p.county, p.cover_image, p.author_id, p.ai_editor, p.author_name], ['published', 'paphos', 'https://img.test/cover.jpg', 'author-1', 'cyprus', 'Elena Georgiou']);
    ok('published_at is set when published', /^\d{4}-/.test(p.published_at));
    eq('the instant-refresh ping is sent for a published article', revalidated, [{ slug: p.slug, category: 'cyprus' }]);
    eq('the cover search used the model\'s brief', unsplashQueries[0], 'latchi harbour fishing boats');
    const modelRows = w.spendRows.filter((r) => r.function_name !== 'embed');
    eq('one spend row per billed call, priced with the markup, with no model name', [modelRows.length, modelRows.every((r) => r.provider === 'llm' && r.model === 'llm' && r.usd > 0 && r.meta.base_usd > 0 && r.meta.markup_pct === 25 && r.meta.reasoning === 300)], [16, true]);
    ok('the markup is 25 percent of the raw cost', modelRows.every((r) => Math.abs(r.usd / r.meta.base_usd - 1.25) < 0.01));
    eq('the comparison with the source is billed too: one row for the embeddings, priced from the tokens, no model name', w.spendRows.filter((r) => r.function_name === 'embed').map((r) => [r.provider, r.model, r.unit_kind, r.usd > 0, r.meta.markup_pct]), [['llm', 'llm', 'tokens', true, 25]]);
    const lg = w.logs.find((x) => x.status === 'ok');
    ok('the run is logged with words, cost and the structured meta', !!lg && lg.words_en > 0 && lg.words_ru > 0 && lg.est_cost_usd > 0 && lg.meta.gate.publishable === true && Object.keys(lg.meta.style).length === 7 && lg.en_humanness === 100);
    eq('scraped_articles is left claimed for the commit RPC (status rewriting during the run)', w.row.status, 'rewriting');
    ok('the compose calls share one prompt-cache key', new Set(calls.filter((c) => c.kind === 'compose').map((c) => c.body.prompt_cache_key)).size === 1);
    ok('every call asks for a reasoning effort and is not stored', calls.every((c) => typeof c.body.reasoning?.effort === 'string' && c.body.store === false));
    ok('the routine story is written at medium effort', calls.filter((c) => c.kind === 'compose').every((c) => c.body.reasoning.effort === 'medium'));
    ok('only the allowed model is ever called (never gpt-5.5)', calls.every((c) => c.body.model === 'gpt-6-luna'));
  }

  // ── auto-publish off: a draft; the answer says so ───────────────────────────────────────────────────────────────────────
  {
    reset(); const { w, client } = makeWorld();
    const out = await processOne(client as any, w.row, false);
    eq('without auto-publish the article is a draft', [out.ok, out.status, w.commits[0].p_blog_payload.status, w.commits[0].p_blog_payload.published_at], [true, 'draft', 'draft', '']);
    eq('and no refresh ping is sent', revalidated, []);
  }

  // ── a fact the check cannot clear: held as a draft although auto-publish is on ─────────────────────────────────────────
  {
    reset({ factcheck: (l) => (l === 'de' ? HIGH : PASS), repair: (l) => ({ title: '', content_html: BODY[l] }) });
    const { w, client } = makeWorld();
    const out = await processOne(client as any, w.row, true);
    ok('a failed fact check holds the whole article back as a draft', out.ok && out.status === 'draft' && w.commits[0].p_blog_payload.status === 'draft');
    ok('the reason names the language and the problem', /Held back as a draft: DE: fact check found 1 serious/.test(out.quality_warning || ''));
    eq('the repair was tried once and the edition checked again', [counts['repair-de'], counts['factcheck-de']], [1, 2]);
    ok('the log marks it as held', /held/.test(String(w.logs[0].error_msg)) && w.logs[0].meta.gate.held === true);
  }

  // ── a style problem is sent to the sub-editor with its measured findings ───────────────────────────────────────────────
  {
    const figs = (BODY.en.match(/\d[\d.,]*/g) || []).join(' and ');
    const stilted = `<p>The harbour at Latchi has a new café. The café is on the quay. The owners are not happy. The price is ${figs}. The fishermen are angry. Andreas Charalambous says "They came for the sunsets," and then "and left the boats." The council voted on it. The lease was approved. The trawlers are few. The committee meets soon.</p><p>The quay is busy. The nets are mended there. The mornings are early. The mackerel will be gone by October. The terrace is planned. The debate goes on.</p>`;
    reset({ compose: (l) => composeFor(l, l === 'en' ? { content_html: stilted } : {}), edit: (l) => ({ content_html: BODY[l] }) });
    const { w, client } = makeWorld();
    const out = await processOne(client as any, w.row, true);
    const editCall = calls.find((c) => c.kind === 'edit' && c.lang === 'en');
    ok('the English edition went to the sub-editor, with the measured rhythm in the work order', !!editCall && /standard deviation|sentence/i.test(String(editCall.body.instructions)));
    ok('the better text replaced the stilted one and the article went live', out.status === 'published' && w.commits[0].p_blog_payload.content_en === BODY.en);
    ok('the work order carries no quota and no talk of detectors', !!editCall && !/under 8|over 25|verbless|pass (?:the )?(?:ai )?detectors/i.test(String(editCall.body.instructions)));
  }

  // ── a copied edition is rewritten; a still-copied one fails the article ─────────────────────────────────────────────────
  {
    const copied = `<p>${SOURCE.slice(0, 290)}</p><p>${SOURCE.slice(290, 580)}</p>`;
    reset({ compose: (l) => composeFor(l, l === 'pl' ? { content_html: copied } : {}), deoverlap: (l) => ({ content_html: BODY[l] }) });
    const a = makeWorld();
    const out = await processOne(a.client as any, a.w.row, true);
    ok('a borrowed edition is rewritten and the article goes on', out.ok && counts['deoverlap-pl'] === 1 && out.status === 'published');
    reset({ compose: (l) => composeFor(l, l === 'pl' ? { content_html: copied } : {}), deoverlap: () => ({ content_html: copied }) });
    const b = makeWorld();
    const out2 = await processOne(b.client as any, b.w.row, true);
    ok('a still-borrowed edition fails the article, loudly, and nothing is committed', !out2.ok && out2.status === 'failed' && b.w.commits.length === 0 && /PL=plagiarism gate/.test(String(b.w.row.error_message)) && b.w.row.status === 'failed');
    ok('...and the failure is logged', b.w.logs.some((x) => x.status === 'error' && /plagiarism_pl/.test(x.error_stage)));
  }

  // ── relevance ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    reset({ core: () => ({ ...CORE, cyprus_angle: false, district: 'national', cyprus_hook: 'none', headline_fact: 'Chile exports more wine.', confirmed_facts: ['Chile exported more wine.', 'Buyers are in Asia.', 'The harvest was large.', 'Prices rose.', 'Vineyards grew.'], entities: [] }) });
    const { w, client } = makeWorld({ content: SOURCE.replace(/Latchi/g, 'Valparaiso').replace(/Cyprus/g, 'Chile') });
    w.row.original_title = 'Valparaiso quay café splits fishermen';
    const out = await processOne(client as any, w.row, true);
    ok('a story without the island is skipped, before any edition is paid for', !out.ok && out.status === 'skipped' && counts.compose === undefined && w.row.status === 'skipped' && w.row.is_used === true);
  }

  // ── the model service refuses (no credit): the article stays queued, the batch stops ───────────────────────────────────
  {
    reset({ openaiStatus: () => ({ status: 429, body: { error: { message: 'You exceeded your current quota, please check your plan and billing details.', code: 'insufficient_quota' } } }) });
    const { w, client } = makeWorld();
    const out = await processOne(client as any, w.row, true);
    ok('no credit: queued again, stop signalled, nothing committed', !out.ok && out.status === 'queued' && out.stop === true && w.row.status === 'scraped' && w.commits.length === 0);
    ok('the reason does not name a vendor or a model', !/openai|gpt|luna/i.test(out.reason || ''));
    eq('only one call was made (a refusal for good is not retried)', calls.length, 1);
    reset({ openaiStatus: () => ({ status: 401, body: { error: { message: 'Incorrect API key provided: sk-test-key-123456.', code: 'invalid_api_key' } } }) });
    const b = makeWorld();
    const out2 = await processOne(b.client as any, b.w.row, true);
    ok('a refused key is scrubbed from the message', out2.status === 'queued' && !/sk-test/.test(out2.reason || ''));
  }

  // ── the budget guard ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    reset({}, { AI_DAILY_BUDGET_USD: '5' });
    const a = makeWorld({ daySpend: 5.2 });
    const out = await processOne(a.client as any, a.w.row, true);
    ok('over the daily budget: nothing is claimed or called, the article stays in the queue', !out.ok && out.status === 'queued' && out.stop === true && /Daily AI budget reached/.test(out.reason || '') && calls.length === 0 && a.w.row.status === 'scraped');
    reset({}, { AI_KILL_SWITCH: '1' });
    const b = makeWorld();
    eq('the kill switch stops everything', [await budgetDeny(b.client as any), (await processOne(b.client as any, b.w.row, true)).status, calls.length], ['AI is switched off (AI_KILL_SWITCH).', 'queued', 0]);
    reset({}, { AI_MONTHLY_BUDGET_USD: '60' });
    const c = makeWorld({ monthSpend: 61 });
    ok('over the monthly budget', /Monthly AI budget reached/.test(String(await budgetDeny(c.client as any))));
    reset();
    const d = makeWorld({ daySpend: 1, monthSpend: 10 });
    eq('within the limits', await budgetDeny(d.client as any), null);
  }

  // ── source checks ───────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    reset(); const a = makeWorld({ content: 'font-size: 12px; '.repeat(40) });
    const out = await processOne(a.client as any, a.w.row, true);
    ok('a CSS dump is rejected before anything is claimed or paid', !out.ok && /SOURCE_INVALID/.test(out.reason || '') && calls.length === 0);
    const ru = 'Портовое управление Лимассола сообщило, что новый сбор за место вырастет с первого марта. '.repeat(14);
    eq('a Russian source is real prose (the older letter count rejected it)', isSourceContentRealProse(ru).ok, true);
    eq('short and JSON-LD sources are not', [isSourceContentRealProse('too short').ok, isSourceContentRealProse('{"@context":"x"} ' + 'word '.repeat(100)).ok], [false, false]);
    eq('a headline that says nothing is generic; "New …" is not', [isTitleGeneric('Various challenges for the sector'), isTitleGeneric('About the new fees'), isTitleGeneric('New berth fees take effect in March'), isTitleGeneric('Fees')], [true, true, false, true]);
    eq('vendor, model and key names never reach an admin', scrubModelNames('gpt-6-luna failed for org-abc123def: Incorrect API key sk-proj-AbC123xyz'), 'the model failed for the organisation: Incorrect API key the key');
  }

  // ── telemetry survives a table without the meta column ──────────────────────────────────────────────────────────────────
  {
    reset(); const { w, client } = makeWorld({ logsHaveMeta: false });
    await processOne(client as any, w.row, true);
    ok('the log row is written without meta when the column does not exist yet', w.rejectedLogs === 1 && w.logs.length === 1 && !('meta' in w.logs[0]) && w.logs[0].words_en > 0 && w.logs[0].status === 'ok');
  }

  // ── the door: auth, self-test, batch ────────────────────────────────────────────────────────────────────────────────────
  {
    reset(); const { w } = makeWorld();
    const call = (body: unknown, token = 'service-key') => handle(new Request('https://f.test/', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
    eq('no token: 401', (await handle(new Request('https://f.test/', { method: 'POST', body: '{}' }))).status, 401);
    eq('a wrong token: 401', (await call({}, 'nope')).status, 401);
    eq('the preflight is answered', (await handle(new Request('https://f.test/', { method: 'OPTIONS' }))).status, 200);
    const st = await (await call({ action: 'selftest' })).json();
    ok('the self-test reports health in the shape the admin page reads', st.ok === true && st.writer_primary.usable === true && st.writer_fallback.usable === true && st.keys_present.writer_key === true && st.budget.daily_limit_usd === 6 && st.budget.monthly_limit_usd === 60);
    ok('...and names no model or vendor', !/gpt|openai|luna|sol\b|astra|claude|gemini/i.test(JSON.stringify(st)));
    reset({ openaiStatus: () => ({ status: 401, body: { error: { message: 'Incorrect API key provided: sk-test-key-123456.' } } }) }); makeWorld();
    const bad = await (await call({ action: 'selftest' })).json();
    ok('a refused key shows as not reachable, without the key', bad.ok === false && !/sk-test/.test(JSON.stringify(bad)));
    reset(); makeWorld();
    const st2 = await (await call({ action: 'selftest' })).json();
    ok('the self-test also checks the style check on the website (configured, reachable, secret accepted)', st2.ok === true && st2.style_check.usable === true && /ok \(/.test(st2.style_check.detail) && st2.keys_present.site_url === true && st2.keys_present.style_check_secret === true);
    reset(); assessMode = 'down'; makeWorld();
    const st3 = await (await call({ action: 'selftest' })).json();
    ok('website down: the self-test is red and its verdict names the style check', st3.ok === false && st3.style_check.usable === false && /style check/.test(st3.verdict) && /HTTP 503/.test(st3.style_check.detail));
    reset({}, { ENRICH_SECRET: '' }); makeWorld();
    const st4 = await (await call({ action: 'selftest' })).json();
    ok('secret missing: red, and it says which secret', st4.ok === false && /ENRICH_SECRET/.test(st4.style_check.detail) && st4.keys_present.style_check_secret === false);
    ok('the self-test never shows the secret or the site address', !/enrich-secret|site\.test/.test(JSON.stringify(st2) + JSON.stringify(st3)));

    reset(); const b = makeWorld();
    const one = await (await call({ scraped_article_id: 'row-1', auto_publish: true })).json();
    ok('one article by id: the outcome reaches the browser with a 200', one.ok === true && one.status === 'published' && b.w.commits.length === 1);
    const missing = await call({ scraped_article_id: 'nope' });
    ok('...', missing.status === 200 || missing.status === 404);

    reset(); const c = makeWorld({ settings: { processor_enabled: false, auto_publish: true } });
    eq('the cron batch is skipped when the processor is off', await (await call({ source: 'cron' })).json(), { ok: true, skipped: 'processor_disabled' });
    reset(); const d = makeWorld();
    const batch = await (await call({ source: 'cron' })).json();
    ok('the cron batch processes the queue and reports published and drafted', batch.ok === true && batch.processed === 1 && batch.published === 1 && batch.drafted === 0 && d.w.commits.length === 1);
    reset({}, { EDGE_MIN_ARTICLE_MS: '999999999' }); const e = makeWorld();
    const none = await (await call({ source: 'cron' })).json();
    ok('with less time left than one article needs, the batch leaves the queue alone', none.processed === 0 && e.w.row.status === 'scraped' && calls.length === 0);
    void w; void c;
  }

  // ── the style check runs on the website: the edge function carries no voice engine (Supabase allows 2 s of computing per call) ─────────
  {
    reset(); const { w, client } = makeWorld();
    const c0 = process.cpuUsage();
    const out = await processOne(client as any, w.row, true);
    const cpuMs = (() => { const d = process.cpuUsage(c0); return (d.user + d.system) / 1000; })();
    ok('the article is composed and judged', out.ok && assessCalls.length >= 8);
    ok('every edition went to the website for its style check, in its own language, with the shared secret', ALL.every((l) => assessCalls.some((c) => c.lang === l)) && assessCalls.every((c) => c.key === 'enrich-secret'));
    // The judge itself ran in this same process (the fake website), so its time is taken out of the measurement.
    ok(`the edge function's own computing is far below the platform's 2 s (measured with the judge included: ${cpuMs.toFixed(0)} ms)`, cpuMs < 4_500);

    reset({}, { ENRICH_SECRET: '' }); let x = makeWorld();
    const unconf = await processOne(x.client as any, x.w.row, true);
    ok('without ENRICH_SECRET nothing is started: queued, the batch stops, no model call, the article is not claimed', !unconf.ok && unconf.status === 'queued' && unconf.stop === true && /ENRICH_SECRET/.test(String(unconf.reason)) && calls.length === 0 && x.w.row.status === 'scraped');
    reset({}, { SITE_URL: '' }); x = makeWorld();
    const nourl = await processOne(x.client as any, x.w.row, true);
    ok('without SITE_URL the same', !nourl.ok && nourl.stop === true && /SITE_URL/.test(String(nourl.reason)) && calls.length === 0);

    reset({}, { ENRICH_SECRET: 'another-secret' }); x = makeWorld();
    const wrong = await processOne(x.client as any, x.w.row, true);
    ok('a secret that the website does not accept: refused before any model money is spent, with the way to fix it', !wrong.ok && wrong.stop === true && /differs between Supabase and the website/.test(String(wrong.reason)) && calls.length === 0 && assessCalls.length === 1 && x.w.row.status === 'scraped');

    reset(); assessMode = 'down'; x = makeWorld();
    const t0 = Date.now();
    const down = await processOne(x.client as any, x.w.row, true);
    ok('the website is down: the article stays queued, no model call, a clear reason', !down.ok && down.status === 'queued' && down.stop === true && /style check unavailable/.test(String(down.reason)) && calls.length === 0 && x.w.row.status === 'scraped');
    ok('(it tried three times with short pauses, not for minutes)', assessCalls.length === 3 && Date.now() - t0 < 6_000);

    // the website answers at first and then goes away: the editions that cannot be judged are never published
    reset(); assessMode = { downAfter: 1 }; x = makeWorld();
    const mid = await processOne(x.client as any, x.w.row, true);
    ok('the website goes away during the run: the article is saved as a draft, not published, with the reason', mid.ok && mid.status === 'draft' && x.w.commits.length === 1 && x.w.commits[0].p_blog_payload.status === 'draft' && /style check not completed/.test(String(mid.quality_warning)));
    ok('an edition that could not be judged is logged as unscored (null) and as the worst humanness, never as a perfect one', x.w.logs[0].en_humanness === 0 && x.w.logs[0].meta.style.en === null);
  }

  // ── the long answer stays alive (the gateway cuts a silent request after 150 s) ─────────────────────────────────────────────
  {
    const res = keepAlive(async () => { await new Promise((r) => setTimeout(r, 90)); return { ok: true, status: 'published' }; }, 20);
    const raw = await res.text();
    ok('spaces first, then the JSON: nothing but white space precedes it', /^ +\{/.test(raw) && raw.trim() === '{"ok":true,"status":"published"}');
    eq('status 200 and a JSON content type', [res.status, res.headers.get('content-type')], [200, 'application/json']);
    eq('a client that reads JSON gets the object, as before', JSON.parse(raw), { ok: true, status: 'published' });
    const bad = await keepAlive(async () => { throw new Error('claude-sonnet-5 failed with sk-abcdef123456'); }, 20).json();
    ok('a failure inside the run is an ordinary JSON failure, without vendor or key names', bad.ok === false && !/claude|sonnet|sk-/.test(bad.error));
    reset(); const y = makeWorld();
    const r = await handle(new Request('https://f.test/', { method: 'POST', headers: { authorization: 'Bearer service-key', 'content-type': 'application/json' }, body: JSON.stringify({ scraped_article_id: 'row-1', auto_publish: true }) }));
    const j = await r.json();
    ok('"Generate" in the admin gets its answer through the same stream', r.status === 200 && j.ok === true && j.status === 'published' && y.w.commits.length === 1);
  }

  // ── a run that the platform stopped does not leave its article stuck ───────────────────────────────────────────────────
  {
    const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
    const call = (body: unknown) => handle(new Request('https://f.test/', { method: 'POST', headers: { authorization: 'Bearer service-key', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
    reset(); let x = makeWorld({ status: 'rewriting', settings: { processor_enabled: false, auto_publish: true } });
    (x.w.row as any).rewrite_started_at = minutesAgo(30);
    await call({ source: 'cron' });
    ok('a claim older than 20 minutes goes back into the queue, with a note', x.w.row.status === 'scraped' && /^INTERRUPTED/.test(String((x.w.row as any).error_message)));
    reset(); x = makeWorld({ status: 'rewriting', settings: { processor_enabled: false, auto_publish: true } });
    (x.w.row as any).rewrite_started_at = minutesAgo(30); (x.w.row as any).error_message = 'INTERRUPTED: the previous run was stopped before it finished; the article is queued again.';
    await call({ source: 'cron' });
    ok('the second time it is marked failed, for a human, instead of burning money at every tick', x.w.row.status === 'failed' && /INTERRUPTED twice/.test(String((x.w.row as any).error_message)));
    reset(); x = makeWorld({ status: 'rewriting', settings: { processor_enabled: false, auto_publish: true } });
    (x.w.row as any).rewrite_started_at = minutesAgo(3);
    await call({ source: 'cron' });
    eq('a run that is still going (3 minutes) is left alone', x.w.row.status, 'rewriting');
    reset(); x = makeWorld({ status: 'scraped' });
    eq('nothing stale: nothing released', await releaseStaleClaims(x.client as any), 0);
  }


  // ── the October 2026 additions, end to end ────────────────────────────────────────────────────────────────────────────────
  {
    // facts without a passage in the source never reach a writer, and the log says what was dropped
    reset({ core: () => ({ ...CORE, confirmed_facts: [...CORE.confirmed_facts, { fact: 'The mayor of Polis opened the café himself.', evidence: 'The mayor of Polis opened the café himself' }] }) });
    const { w, client } = makeWorld();
    const out = await processOne(client as any, w.row, true);
    const writer = calls.filter((c) => c.kind === 'compose').map((c) => String(c.body.input));
    ok('the invented fact is asked for once more, found nowhere, and dropped before any writer sees it', out.ok && (counts.unknown ?? 0) === 0 && writer.length === 7 && writer.every((t) => !t.includes('mayor of Polis')) && writer.every((t) => t.includes('A new café opened on the quay')));
    const meta = w.logs.find((x) => x.status === 'ok')?.meta;
    eq('the log carries the evidence check: mode, facts kept, what was dropped and why', [meta?.evidence?.mode, meta?.evidence?.facts, meta?.evidence?.dropped?.[0]?.reason], ['enforce', '5/6', 'the passage is not in the source']);
    ok('...the Cyprus connection and the comparison with the source', meta?.cyprus?.grounded === true && ALL.every((l) => meta?.meaning?.[l]?.summary) && ALL.every((l) => meta?.rewrites?.[l] === 0));
    ok('...and the embeddings were asked for once for the source and the seven editions', embedCalls.length === 1 && embedCalls[0] > 30);
    eq('EVIDENCE_MODE=off works like before (no second ask even for an invented fact)', await (async () => { reset({ core: () => ({ ...CORE, confirmed_facts: [...CORE.confirmed_facts, { fact: 'An invented fact.', evidence: 'nothing like it' }] }) }, { EVIDENCE_MODE: 'off' }); const x = makeWorld(); const o = await processOne(x.client as any, x.w.row, true); return [o.ok, counts.evidence ?? 0, x.w.logs.find((l) => l.status === 'ok')?.meta?.evidence]; })(), [true, 0, null]);
  }
  {
    // nothing in the core can be tied to the source: no edition is paid for, the source is marked failed, and the log says what was looked at
    reset({ core: () => ({ ...CORE, confirmed_facts: [{ fact: 'An invented fact.', evidence: 'nothing like it' }, { fact: 'Another invented fact.', evidence: 'neither is this' }], attributed_claims: [], allegations: [] }) });
    const { w, client } = makeWorld();
    const out = await processOne(client as any, w.row, true);
    ok('no fact has a passage: the run stops before any writer is paid for', !out.ok && out.status === 'failed' && /evidence/.test(String(out.reason)) && counts.compose === undefined);
    const lg = w.logs.find((l) => l.status === 'error');
    ok('...the log names the stage and carries what was dropped', lg?.error_stage === 'evidence' && lg?.meta?.evidence?.facts === '0/2' && lg?.meta?.evidence?.dropped?.length === 2 && w.row.status !== 'processed');
  }
  {
    // the Cyprus connection must come from the source: a Cypriot outlet's passage counts, a foreign outlet's does not
    const greekCore = { ...CORE, source_lang: 'el', cyprus_basis: 'institution', cyprus_evidence: 'Το υπουργικό συμβούλιο ενέκρινε μέτρα', cyprus_hook: 'The cabinet approved a package', district: 'national',
      confirmed_facts: [{ fact: 'The cabinet approved measures.', evidence: 'Το υπουργικό συμβούλιο ενέκρινε μέτρα' }, { fact: 'The measures cover bread and milk.', evidence: 'για ψωμί και γάλα' }, { fact: 'The package starts next month.', evidence: 'ξεκινούν τον επόμενο μήνα' }, { fact: 'The finance minister announced it.', evidence: 'ανακοίνωσε ο υπουργός Οικονομικών' }],
      entities: [], numbers: [], dates: [] };
    const gr = 'Το υπουργικό συμβούλιο ενέκρινε μέτρα για ψωμί και γάλα, ξεκινούν τον επόμενο μήνα, ανακοίνωσε ο υπουργός Οικονομικών. ' + 'Ο υπουργός δήλωσε ότι τα μέτρα θα εξεταστούν ξανά σε τρεις μήνες και ότι η κυβέρνηση παρακολουθεί τις τιμές κάθε εβδομάδα. '.repeat(5);
    reset({ core: () => greekCore });
    const a = makeWorld({ content: gr, url: 'https://www.philenews.com/oikonomia/kypros/article/1/metra' });
    a.w.row.original_title = 'Μέτρα κατά της ακρίβειας';
    const o1 = await processOne(a.client as any, a.w.row, true);
    ok('a Greek story from a Cypriot outlet, with a passage that is really in the source, is relevant', o1.ok && a.w.logs.some((l) => l.status === 'ok' && l.meta?.cyprus?.via === 'evidenced'));
    reset({ core: () => greekCore });
    const b = makeWorld({ content: gr, url: 'https://www.example-foreign.com/news/1' });
    b.w.row.original_title = 'Μέτρα κατά της ακρίβειας';
    const o2 = await processOne(b.client as any, b.w.row, true);
    ok('the same story from a foreign outlet is not a Cyprus story: skipped before any edition is paid for', !o2.ok && o2.status === 'skipped' && counts.compose === undefined);
    ok('...and its log says why: no Cyprus connection could be tied to the source', b.w.logs.some((l) => l.status === 'skipped' && l.error_stage === 'relevance' && l.meta?.cyprus?.grounded === false));
    reset({ core: () => greekCore }, { CYPRUS_OUTLET_HOSTS: 'example-foreign.com' });
    const c = makeWorld({ content: gr, url: 'https://www.example-foreign.com/news/1' });
    c.w.row.original_title = 'Μέτρα κατά της ακρίβειας';
    const o3 = await processOne(c.client as any, c.w.row, true);
    ok('...unless the host is added to the list of Cypriot outlets', o3.ok);
  }
  {
    // model pieces and the latest openings reach the writers
    const piece = { id: 'p1', desk: 'cyprus', lang: 'en', title: 'A model piece', body: Array.from({ length: 4 }, (_, i) => `Paragraph ${i} of the model piece: the authority decided on Monday and named a figure for the first time in years.`).join('\n\n'), article_type: null };
    reset({});
    const { w, client } = makeWorld({ exemplars: [piece], openings: { en: ['The Limassol marina announced on Tuesday that fees rise.'], de: ['Die Hafenbehörde hat am Montag mitgeteilt, dass die Gebühr steigt.'] } });
    const out = await processOne(client as any, w.row, true);
    const en = calls.find((c) => c.kind === 'compose' && c.lang === 'en')!; const de = calls.find((c) => c.kind === 'compose' && c.lang === 'de')!;
    ok('the English writer gets the active model piece of the desk, the German one the English piece as a fallback', out.ok && String(en.body.instructions).includes('A model piece') && String(de.body.instructions).includes('take its quality, not its language'));
    ok('the writers are told how the latest pieces of their language began', String(en.body.input).includes('The Limassol marina announced on Tuesday') && String(de.body.input).includes('Die Hafenbehörde hat am Montag') && !String(calls.find((c) => c.kind === 'compose' && c.lang === 'pl')!.body.input).includes('LATEST'));
    reset({}, { EXEMPLARS: 'off' });
    const x = makeWorld({ exemplars: [piece] });
    await processOne(x.client as any, x.w.row, true);
    ok('EXEMPLARS=off: no model piece is used', calls.filter((c) => c.kind === 'compose').every((c) => !String(c.body.instructions).includes('MODEL PIECES')));
    const loaded = await loadExemplars(makeWorld({ exemplars: [piece] }).client as any, 'cyprus');
    eq('the model pieces are read from the table (active ones of the desk)', loaded.map((e) => [e.id, e.desk, e.lang, e.title]), [['p1', 'cyprus', 'en', 'A model piece']]);
    eq('a missing function or table means: none', [await loadExemplars({ from: () => { throw new Error('no table'); } } as any, 'cyprus'), await loadRecentOpenings({ rpc: async () => ({ data: null, error: { message: 'function does not exist' } }) } as any)], [[], {}]);
  }
  {
    // two accounts of one event become one article
    const partnerText = 'Fishermen at Latchi harbour object to the new café that opened on the quay, says Andreas Charalambous, who has fished there for decades. The municipality approved the lease last spring. Only three of the eleven trawlers are still afloat, the owners say, and a harbour committee will meet next month to decide how the quay is shared between the tables and the nets. ' + 'The tenant intends to open an evening terrace in summer, which the fishermen fear will make mooring more expensive for everyone who still works from the harbour every day. '.repeat(2);
    const partner = () => ({ id: 'row-2', original_title: 'Fishermen object to café on Latchi quay', original_url: 'https://www.politis.com.cy/b', source_id: 'src-2', original_content: partnerText, original_content_full: partnerText, status: 'scraped', is_used: false, created_at: new Date().toISOString() });
    embedOf = (t: string) => { if (t.startsWith('Latchi quay café splits fishermen.') || t.startsWith('Fishermen object to café on Latchi quay.')) return Array.from({ length: 1024 }, (_, i) => (i === 7 ? 1 : 0)); let h = 7; for (const c of t) h = (h * 131 + c.charCodeAt(0)) % 1_000_003; return Array.from({ length: 1024 }, (_, i) => (i === 100 + (h % 900) ? 1 : 0)); };
    const merged = { ...CORE, same_story: true, confirmed_facts: [...CORE.confirmed_facts.map((f) => ({ ...f, source: 'A' })), { fact: 'The tenant plans an evening terrace in summer.', evidence: 'The tenant intends to open an evening terrace in summer', source: 'B' }] };
    reset({ core: () => merged }, { SITE_URL: 'https://site.test' });
    const { w, client } = makeWorld({ url: 'https://cyprus-mail.com/2026/10/10/latchi', queue: [partner()] });
    const out = await processOne(client as any, w.row, true);
    const coreCall = calls.find((c) => c.kind === 'core')!;
    ok('the other outlet\'s account is found by meaning and shared anchors, and goes to the core next to the first', out.ok && String(coreCall.body.input).includes('SOURCE B TITLE: Fishermen object to café on Latchi quay') && /TWO SOURCES/.test(String(coreCall.body.instructions)));
    ok('the fact only the second account states is in the article', calls.filter((c) => c.kind === 'compose').every((c) => String(c.body.input).includes('evening terrace')));
    ok('the second account is used up, with a note, and both sources are recorded on the article', w.queue[0].status === 'processed' && w.queue[0].is_used === true && /MERGED into the article post-1/.test(w.queue[0].error_message) && w.postUpdates.some((u) => JSON.stringify(u.payload.sources) === JSON.stringify(['https://cyprus-mail.com/2026/10/10/latchi', 'https://www.politis.com.cy/b'])));
    ok('the log says what was merged', w.logs.some((l) => l.status === 'ok' && l.meta?.merged?.url === 'https://www.politis.com.cy/b'));
    // the core says it is not the same story: the second account goes back into the queue
    reset({ core: () => ({ ...merged, same_story: false }) });
    const b = makeWorld({ url: 'https://cyprus-mail.com/2026/10/10/latchi', queue: [partner()] });
    const o2 = await processOne(b.client as any, b.w.row, true);
    ok('"not the same story": the article is written from the first source alone and the second account is released', o2.ok && b.w.queue[0].status === 'scraped' && b.w.queue[0].is_used === false && !b.w.postUpdates.length && b.w.logs.some((l) => l.status === 'ok' && l.meta?.merged === null));
    // an article that ends in a skip releases the account it claimed
    reset({ core: () => ({ ...merged, cyprus_angle: false, cyprus_evidence: '', district: 'national' }) });
    const c = makeWorld({ content: SOURCE.replace(/Latchi/g, 'Valparaiso'), queue: [{ ...partner(), original_title: 'Fishermen object to café on Valparaiso quay', original_content: partnerText.replace(/Latchi/g, 'Valparaiso'), original_content_full: partnerText.replace(/Latchi/g, 'Valparaiso') }] });
    c.w.row.original_title = 'Valparaiso quay café splits fishermen';
    embedOf = (t: string) => { if (/^(Valparaiso quay café splits fishermen|Fishermen object to café on Valparaiso quay)\./.test(t)) return Array.from({ length: 1024 }, (_, i) => (i === 7 ? 1 : 0)); return Array.from({ length: 1024 }, (_, i) => (i === 200 ? 1 : 0)); };
    const o3 = await processOne(c.client as any, c.w.row, true);
    ok('a skipped article gives the second account back', o3.status === 'skipped' && c.w.queue[0].status === 'scraped');
    // the switches
    reset({ core: () => merged }, { MERGE_SOURCES: 'off' });
    const d = makeWorld({ queue: [partner()] });
    await processOne(d.client as any, d.w.row, true);
    ok('MERGE_SOURCES=off: the queue is not searched and the core is asked about one source', !d.w.ops.some((q) => q.filters.some((f) => f[0] === 'neq:id')) && !/SOURCE B/.test(String(calls.find((c) => c.kind === 'core')!.body.input)));
    reset({}, { SEMANTIC_CHECK: 'off', MERGE_SOURCES: 'off' });
    const e = makeWorld();
    const o5 = await processOne(e.client as any, e.w.row, true);
    ok('SEMANTIC_CHECK=off: no embeddings are requested and the article is made all the same', o5.ok && embedCalls.length === 0);
    reset({});
    embedMode = 'down';
    const f = makeWorld();
    const o6 = await processOne(f.client as any, f.w.row, true);
    ok('the embeddings service down: no comparison, no merge, the article goes through', o6.ok && f.w.logs.some((l) => l.status === 'ok' && Object.values(l.meta.meaning).every((m) => m === null)));
  }

  // ── time: a tight deadline lowers the effort rather than failing ───────────────────────────────────────────────────────
  {
    reset({}, { EDGE_SOFT_LIMIT_MS: '30000' }); const { w, client } = makeWorld();
    const out = await processOne(client as any, w.row, true);
    ok('with 30 seconds the desk still delivers, thinking less (nothing above medium)', out.ok && calls.length > 10 && calls.every((c) => ['low', 'medium'].includes(c.body.reasoning.effort)));
    reset({}, { AI_MAX_EFFORT: 'low' }); const b = makeWorld();
    await processOne(b.client as any, b.w.row, true);
    ok('AI_MAX_EFFORT caps every call', calls.every((c) => c.body.reasoning.effort === 'low'));
  }
  eq('the live OpenAI API would have accepted every request this suite sent (JSON word in the input, strict schemas)', rulesViolations, []);
  report('edge-process-article');
}
main().catch((e) => { console.error(e); process.exit(1); });
