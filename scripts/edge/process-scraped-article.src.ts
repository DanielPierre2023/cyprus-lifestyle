// scripts/edge/process-scraped-article.src.ts — the SOURCE of supabase/functions/process-scraped-article/index.ts.
//
// The edge function is one file that is pasted into the Supabase dashboard. It is GENERATED from this file and the shared modules in
// lib/journalism and lib/voice by `node scripts/build-edge-journalism.mjs`; never edit the generated file by hand (a test fails if it
// no longer matches this source). Everything that decides what an article says lives in lib/ and is unit-tested there; this file is
// the glue: the database, the queue, the cover picture, the spend log and the door.
//
// WHAT HAPPENS TO ONE SCRAPED ARTICLE
//   0  budget guard, source-quality gate, atomic claim (scraped → rewriting); a claim left behind by a stopped run is released first
//   1  fact core: the source sorted into confirmed facts, claims, allegations, quotations, numbers, dates (one model call)
//   2  relevance: the island must be in the story
//   3  SEVEN editions, each composed independently and natively from the SAME core (EN · EL · RO · AR · DE · PL · RU)
//   4  per edition: originality gate (5-word runs) → sub-editing driven by the voice engine's measured findings → short fields
//      (title, excerpt, summary, SEO) → fact check against the core, in the edition's own language → repair → check again
//   5  the publish bar: auto-publish only when ALL seven editions pass; otherwise the article is saved as a DRAFT with the reasons
//   6  cover picture, author, one atomic commit (commit_scraper_blog_post), telemetry
// Since October 2026 the steps above also do this (each part has a switch, see OPTIONAL SECRETS):
//   1  every fact of the core carries the passage of the source that states it; code checks the passage and drops what it cannot find
//      (EVIDENCE_MODE enforce|warn|off); a second ask goes out for the passages that were not found
//   1' a second account of the same event may be merged into the core (MERGE_SOURCES): found among the queued articles by meaning and
//      shared anchors, confirmed by the core ("same story"), marked as used when the article is committed
//   2  the Cyprus connection must come from the source (it names the island or a place of it, or the Cypriot outlet's passage shows it)
//   3  the writers get the model pieces the editor-in-chief approved for the desk (table style_exemplars) and the openings of our latest
//      pieces (function recent_article_openings) to avoid; each edition is compared with the source by meaning and order (SEMANTIC_CHECK)
//   4  an edition that the editing passes cannot save is written again from the core (ESCALATE)
//
// AUTH: admin-only, fails closed.   SECRETS: OPENAI_API_KEY · SITE_URL + ENRICH_SECRET (the style check runs on the website, see below) ·
//   UNSPLASH_ACCESS_KEY (cover; optional).
// THE STYLE CHECK runs on the website (app/api/desk/assess), not in this function: a Supabase edge function may use only two seconds of
//   computing per call, and the voice engine needs about 1.9 s for one article in seven languages. This function therefore carries no
//   engine (about 60 % smaller) and spends about a quarter of a second of computing per article. Before any model money is spent it asks
//   the website once; if that fails the article stays queued.
// CALLS: {source:'cron'} batch | {scraped_article_id:uuid} one now | {action:'selftest'} health check | {} batch
// OPTIONAL SECRETS: AI_DAILY_BUDGET_USD (6) · AI_MONTHLY_BUDGET_USD (60) · AI_KILL_SWITCH · AI_MAX_EFFORT (max) · AI_EFFORT_<TASK> ·
//   AI_SOL_ENABLED · OPENAI_MODEL_LUNA/SOL/ASTRA · EDGE_SOFT_LIMIT_MS (180000) · OVERLAP_MAX (0.12) · MAX_EDIT_PASSES (2) ·
//   RELEVANCE_GATE (on) · COST_MARKUP_PCT (25) · AI_FLEX_EDGE (off) · SITE_URL + REVALIDATE_SECRET (instant refresh after a publish) ·
//   EVIDENCE_MODE (enforce) · ESCALATE (on) · SEMANTIC_CHECK (on) · EXEMPLARS (on) · MERGE_SOURCES (on) · MERGE_MIN_SIM (0.82) ·
//   MERGE_WINDOW_HOURS (72) · CYPRUS_OUTLET_HOSTS (extra hosts that count as Cypriot outlets, comma separated)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runPipeline, ALL_LANGS, type CallSpec, type LlmFn, type PipelineDeps, type PipelineResult, type Edition } from '@/lib/journalism/pipeline';
import type { LlmResult } from '@/lib/journalism/openai';
import { remoteAssess, assessConfigError } from '@/lib/journalism/assessClient';
import { cleanHtml, cleanField, cleanTitle, normalizeTags, countWords, stripTags, generateSlug } from '@/lib/journalism/sanitize';
import { hasCyprusTerms } from '@/lib/journalism/relevance';
import { overlapRatio, factsKept, inventedFigures, sharedRuns } from '@/lib/journalism/checks';
import { embedTexts, EMBED_MODEL_DEFAULT } from '@/lib/journalism/embeddings';
import { evidenceModeFrom } from '@/lib/journalism/evidence';
import { isCyprusOutlet } from '@/lib/journalism/cyprusGround';
import { leadOf, pickPartner, type QueueItem } from '@/lib/journalism/merge';
import { semanticSummary } from '@/lib/journalism/semantic';
import type { Exemplar } from '@/lib/journalism/exemplars';
import { parseBudgets, windowStarts } from '@/lib/aiBudget';
import type { Lang } from '@/lib/journalism/languages';
import { ENV, numEnv, adminClient, createClient, scrubModelNames, newCost, budgetDeny, spendSince, makeAsk, logSpend, type Cost, type SupaClient } from './shared';

// re-exported for the tests and for anyone reading the generated file
export { scrubModelNames, budgetDeny };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── settings (read when needed, so a changed secret takes effect without a redeploy of the code) ─────────────────────
const cfg = () => ({
  overlapMax: numEnv('OVERLAP_MAX', 0.12),
  maxEditPasses: Math.min(3, Math.max(0, Math.round(Number(Deno.env.get('MAX_EDIT_PASSES') ?? '2')))),
  softLimitMs: numEnv('EDGE_SOFT_LIMIT_MS', 180_000),
  minArticleMs: numEnv('EDGE_MIN_ARTICLE_MS', 120_000),
  relevanceGate: (Deno.env.get('RELEVANCE_GATE') || 'on').toLowerCase() !== 'off',
  // Flex (half price) is slower and may be refused; this function has a wall clock to keep, so it is off unless asked for.
  flex: (Deno.env.get('AI_FLEX_EDGE') || 'off').toLowerCase() === 'on',
  siteUrl: (Deno.env.get('SITE_URL') || '').replace(/\/+$/, ''),
  revalidateSecret: Deno.env.get('REVALIDATE_SECRET') || '',
  // The style check runs on the website (see lib/journalism/assessClient.ts): this function carries no voice engine, because an edge function
  // may use only two seconds of computing per call and the engine needs more for one article in seven languages.
  enrichSecret: Deno.env.get('ENRICH_SECRET') || '',
  // The October 2026 additions. Each can be switched off by a secret without a redeploy of the code.
  evidence: evidenceModeFrom(Deno.env.get('EVIDENCE_MODE')),
  escalate: (Deno.env.get('ESCALATE') || 'on').toLowerCase() !== 'off',
  semantic: (Deno.env.get('SEMANTIC_CHECK') || 'on').toLowerCase() !== 'off',
  exemplars: (Deno.env.get('EXEMPLARS') || 'on').toLowerCase() !== 'off',
  merge: (Deno.env.get('MERGE_SOURCES') || 'on').toLowerCase() !== 'off',
  mergeMinSim: numEnv('MERGE_MIN_SIM', 0.82),
  mergeWindowH: numEnv('MERGE_WINDOW_HOURS', 72),
  outletHosts: (Deno.env.get('CYPRUS_OUTLET_HOSTS') || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
});
const BATCH_MAX = 3;

// ── taxonomy, masthead, desk briefs ───────────────────────────────────────────────────────────────────────────────────
type EditorKey = 'cyprus' | 'business' | 'property' | 'relocation' | 'culture' | 'escapes' | 'table' | 'agenda' | 'people' | 'world';
const VALID_CATEGORIES: string[] = ['cyprus', 'business', 'property', 'relocation', 'culture', 'escapes', 'table', 'agenda', 'people', 'world'];
function editorForCategory(category?: string | null): EditorKey {
  const c = (category || '').toLowerCase();
  if (VALID_CATEGORIES.includes(c) && c !== 'world') return c as EditorKey;
  if (c.includes('residen') || c.includes('relocat') || c.includes('immigrat') || c.includes('visa') || c.includes('expat')) return 'relocation';
  if (c.includes('propert') || c.includes('real')) return 'property';
  if (c.includes('event') || c.includes('whats') || c.includes('agenda') || c.includes('festival') || c.includes('entertain')) return 'agenda';
  if (c.includes('interview') || c.includes('profile') || c.includes('people')) return 'people';
  if (c.includes('business') || c.includes('econom') || c.includes('financ') || c.includes('market')) return 'business';
  if (c.includes('cultur') || c.includes('art') || c.includes('herit') || c.includes('society')) return 'culture';
  if (c.includes('travel') || c.includes('escape') || c.includes('hotel') || c.includes('yacht')) return 'escapes';
  if (c.includes('food') || c.includes('table') || c.includes('wine') || c.includes('gastro') || c.includes('restaur')) return 'table';
  if (c.includes('world') || c.includes('gulf') || c.includes('greece') || c.includes('europe')) return 'world';
  return 'cyprus';
}
// Named masthead. The names/bios live in the authors table (seed 0015) and render on /author/<slug>; keep these two maps in step with it.
const AUTHOR_NAME: Record<EditorKey, string> = {
  cyprus: 'Elena Georgiou', world: 'Elena Georgiou', people: 'Elena Georgiou',
  business: 'Andreas Constantinou', property: 'Andreas Constantinou', relocation: 'Andreas Constantinou',
  culture: 'Christiana Pavlou', agenda: 'Christiana Pavlou', escapes: 'Maria Ioannou', table: 'Maria Ioannou',
};
const AUTHOR_SLUG: Record<EditorKey, string> = {
  cyprus: 'elena-georgiou', world: 'elena-georgiou', people: 'elena-georgiou',
  business: 'andreas-constantinou', property: 'andreas-constantinou', relocation: 'andreas-constantinou',
  culture: 'christiana-pavlou', agenda: 'christiana-pavlou', escapes: 'maria-ioannou', table: 'maria-ioannou',
};
const DESK_BRIEF: Record<EditorKey, string> = {
  cyprus: 'The Cyprus Desk: governance, the Republic, the economy of the island and the stories shaping daily life. Authoritative, current, fair.',
  business: 'The Business Desk: markets, funds, shipping, tech, tax residency and the money moving through Limassol and Nicosia. Numbers first; one figure that matters.',
  property: 'The Property Desk: villas, the marina, new coastal architecture, interiors, residency by investment. The island as an address; honest appraisal over sales copy.',
  relocation: 'The Relocation Desk: moving to Cyprus: residency and the investor route, tax and non-dom status, schools, healthcare, banking and the practicalities of the move. Practical, precise, current; explain the rule and what it means for the reader.',
  culture: 'The Culture Desk: antiquity and Byzantine gold, contemporary art, music, the Aphrodite myth, society and patronage. One artefact, one story.',
  escapes: 'The Escapes Desk: Akamas, Troodos, the coast, marina life, where to go and how to arrive. One place, done properly.',
  table: 'The Table: chefs, growers, the Cypriot kitchen and Commandaria, the oldest named wine. Where we are eating, and why.',
  agenda: "The Agenda: what's on across the island: festivals, exhibitions, concerts, openings and markets. The concrete details (what, where, when, how much) for a reader deciding where to go.",
  people: 'People: the Cypriots and residents shaping the island: chefs, founders, designers, winemakers, artists. Profiles and interviews that let a real person and their work come through.',
  world: 'The World Desk: the region read through a Cypriot lens: Greece, the Levant, the Gulf, Europe. Why it matters here.',
};
const deskBrief = (category: string): string => DESK_BRIEF[editorForCategory(category)] || DESK_BRIEF.cyprus;
const deskName = (e: string): string => AUTHOR_NAME[e as EditorKey] || 'The Cyprus Desk';

// ── source checks ─────────────────────────────────────────────────────────────────────────────────────────────────────
interface SourceCheck { ok: boolean; reason?: string }
export function isSourceContentRealProse(text: string): SourceCheck {
  if (!text || text.length < 200) return { ok: false, reason: `source too short (${text?.length ?? 0} chars)` };
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 80) return { ok: false, reason: `only ${words.length} words in source` };
  const css = [/\.tdi_\d+/g, /font-size:\s*\d+px/g, /background-color:\s*#[0-9a-f]/gi, /margin-bottom:\s*\d+px/g, /@media\s*\(/g, /webkit-transform/g, /\bdisplay:\s*(block|flex|inline|none)\b/g];
  let hits = 0;
  for (const p of css) hits += (text.match(p) || []).length;
  if (hits > Math.max(8, text.length / 200)) return { ok: false, reason: `${hits} CSS patterns, the source appears to be a CSS dump` };
  if (text.startsWith('{') && text.includes('"@context"')) return { ok: false, reason: 'source is JSON-LD, not article body' };
  // Letters of ANY script count (the older check knew only Latin, Romanian, Greek and Arabic and rejected every Russian source as "markup").
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (letters / text.length < 0.45) return { ok: false, reason: `letter density ${(letters / text.length).toFixed(2)} too low (markup suspected)` };
  return { ok: true };
}
/** A headline that says nothing ("Various challenges …", "About the …"). English only; the other editions are judged by the voice engine. */
export function isTitleGeneric(title: string): boolean {
  if (!title || title.length < 10 || title.length > 140) return true;
  const t = title.toLowerCase();
  for (const p of [/^(various|certain|several|some)\s+/i, /\b(in the current context|the landscape of|the challenges of)\b/i, /^(about|regarding|concerning)/i, /\b(continues to|faces|tackles)\s+(challenges|issues|developments)\b/i]) if (p.test(t)) return true;
  return title.split(/\s+/).length < 3;
}

// ── the model call for this function: the shared router, billed under this function's name ──────────────────────────────
const CALLER = 'process-scraped-article';
function makeLlm(supabase: SupaClient, deadlineAt: number, cost: Cost): LlmFn {
  const ask = makeAsk(supabase, CALLER, deadlineAt, cost, cfg().flex);
  return (spec: CallSpec): Promise<LlmResult> => ask(spec);
}

// ── embeddings, model pieces, recent openings, a second account ───────────────────────────────────────────────────────
/** The comparison by meaning and the search for a second account both need vectors; the spend is logged like every other call. */
function makeEmbed(supabase: SupaClient, cost: Cost): (texts: string[]) => Promise<number[][] | null> {
  return (texts) => embedTexts(texts, {
    apiKey: Deno.env.get('OPENAI_API_KEY') || '',
    onUsage: (e) => logSpend(supabase, CALLER, { fn: 'embed', model: EMBED_MODEL_DEFAULT, usage: { inputTokens: e.tokens, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0 }, usd: e.usd, ms: e.ms, status: 'completed' }, cost),
  });
}

/** The model pieces the editor-in-chief activated for a desk (table style_exemplars). A missing table or a failing read means: none. */
export async function loadExemplars(supabase: SupaClient, desk: string): Promise<Exemplar[]> {
  try {
    const { data, error } = await supabase.from('style_exemplars').select('id, desk, lang, title, body, article_type').eq('active', true).in('desk', [desk, '*']).limit(80);
    if (error) { console.warn(`[desk] model pieces not available: ${error.message}`); return []; }
    return ((data || []) as Array<{ id: string; desk: string; lang: string; title: string; body: string; article_type: string | null }>)
      .map((r) => ({ id: String(r.id), desk: r.desk, lang: r.lang, title: r.title, body: r.body, articleType: r.article_type }));
  } catch { return []; }
}

/** How our latest pieces began, per language (function recent_article_openings). A missing function means: nothing to avoid. */
export async function loadRecentOpenings(supabase: SupaClient): Promise<Partial<Record<Lang, string[]>>> {
  try {
    const { data, error } = await supabase.rpc('recent_article_openings', { p_limit: 14 });
    if (error || !data || typeof data !== 'object') return {};
    const out: Partial<Record<Lang, string[]>> = {};
    for (const l of ALL_LANGS) { const v = (data as Record<string, unknown>)[l]; if (Array.isArray(v)) out[l] = v.map(String).filter(Boolean).slice(0, 14); }
    return out;
  } catch { return {}; }
}

interface Partner { id: string; title: string; text: string; url: string; sim: number }
/**
 * A second account of the same event among the queued articles: another outlet, queued in the last days, close in meaning and sharing
 * concrete anchors. The partner is claimed (scraped → rewriting) so that no other run takes it; the caller releases or consumes it.
 */
export async function findPartner(supabase: SupaClient, row: ScrapedRow, text: string, embed: (t: string[]) => Promise<number[][] | null>, settings: ReturnType<typeof cfg>): Promise<Partner | null> {
  if (!settings.merge) return null;
  try {
    const since = new Date(Date.now() - settings.mergeWindowH * 3_600_000).toISOString();
    const { data } = await supabase.from('scraped_articles').select(ROW_COLUMNS).eq('status', 'scraped').eq('is_used', false).neq('id', row.id).gte('created_at', since).order('created_at', { ascending: false }).limit(60);
    const items: QueueItem[] = ((data || []) as ScrapedRow[])
      .map((r) => ({ id: r.id, title: r.original_title || '', text: r.original_content_full || r.original_content || '', url: r.original_url || '', sourceId: r.source_id ?? null }))
      .filter((r) => r.url && isSourceContentRealProse(r.text).ok);
    if (!items.length) return null;
    const title = row.original_title || '';
    const vecs = await embed([leadOf(title, text), ...items.map((i) => leadOf(i.title, i.text))]);
    if (!vecs || vecs.length !== items.length + 1) return null;
    const pick = pickPartner({ id: row.id, title, text, url: row.original_url || '', sourceId: row.source_id ?? null, vec: vecs[0] }, items, vecs.slice(1), { minSim: settings.mergeMinSim });
    if (!pick) return null;
    const { data: claimed } = await supabase.from('scraped_articles').update({ status: 'rewriting', rewrite_started_at: new Date().toISOString() }).eq('id', pick.item.id).eq('status', 'scraped').select('id').maybeSingle();
    if (!claimed) return null;
    console.log(`[desk] second account found: ${pick.item.url} (similarity ${pick.sim.toFixed(2)}; shared ${pick.shared.figures.slice(0, 3).join(', ') || '-'} / ${pick.shared.names.slice(0, 3).join(', ') || '-'})`);
    return { id: pick.item.id, title: pick.item.title, text: pick.item.text, url: pick.item.url, sim: pick.sim };
  } catch (e) { console.warn(`[desk] no second account: ${(e as Error).message}`); return null; }
}

// ── self-test ────────────────────────────────────────────────────────────────────────────────────────────────────────
// Admin-triggered diagnostic ({ action: "selftest" }): two tiny calls (structured output and plain JSON mode), the budget, the keys.
// No database writes except the two spend rows; costs a fraction of a cent. Names no model or vendor.
async function runSelfTest(): Promise<Record<string, unknown>> {
  const supabase = adminClient();
  const cost = newCost();
  const llm = makeLlm(supabase, Date.now() + 60_000, cost);
  const tiny = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false } as const;
  const sys = 'You are a connectivity test. Output only the requested JSON.';
  const usr = 'Return exactly {"ok":true} and nothing else.';
  const probe = async (json: CallSpec['json']) => {
    const t = Date.now();
    const r = await llm({ fn: 'selftest', task: 'selftest', system: sys, user: usr, json, expectTokens: 40 });
    const parsed = r.ok ? (() => { try { return JSON.parse(r.text); } catch { return null; } })() : null;
    const good = !!parsed && parsed.ok === true;
    return { usable: good, ms: Date.now() - t, detail: good ? `ok (${Date.now() - t}ms)` : `FAIL: ${scrubModelNames((r.error || 'unparseable reply').slice(0, 140))}` };
  };
  const [structured, plain] = await Promise.all([probe({ name: 'selftest', schema: tiny as unknown as Record<string, unknown> }), probe('object')]);
  // the style check on the website: configured, reachable, secret accepted, route deployed
  const conf = cfg();
  const missing = assessConfigError(conf.siteUrl, conf.enrichSecret);
  const style = await (async () => {
    if (missing) return { usable: false, detail: `not configured: ${missing}` };
    const t = Date.now();
    try {
      const a = await remoteAssess({ siteUrl: conf.siteUrl, secret: conf.enrichSecret, attempts: 1, timeoutMs: 15_000 })('<p>The fishing harbour at Latchi smells of diesel and grilled octopus by half past eleven.</p>', 'en', { title: 'Latchi harbour', category: 'cyprus', articleType: 'news' });
      return { usable: true, detail: `ok (${Date.now() - t}ms, score ${a.score})` };
    } catch (e) { return { usable: false, detail: `FAIL: ${scrubModelNames((e as Error).message.slice(0, 160))}` }; }
  })();
  // the October 2026 additions: embeddings (comparison with the source by meaning, second accounts), model pieces, recent openings
  const meaning = await (async () => {
    const t = Date.now();
    const v = await makeEmbed(supabase, cost)(['The fishing harbour at Latchi smells of diesel and grilled octopus by half past eleven.']);
    return v ? { usable: true, detail: `ok (${Date.now() - t}ms)` } : { usable: false, detail: 'not available: the comparison with the source by meaning and the search for a second account are skipped' };
  })();
  const pieces = await (async () => {
    try {
      const { data, error } = await supabase.from('style_exemplars').select('desk').eq('active', true).limit(500);
      if (error) return { usable: false, detail: `table not available (${scrubModelNames(error.message.slice(0, 80))}): run the migration 20261012090000` };
      const byDesk: Record<string, number> = {};
      for (const r of (data || []) as Array<{ desk: string }>) byDesk[r.desk] = (byDesk[r.desk] || 0) + 1;
      return { usable: true, detail: Object.keys(byDesk).length ? Object.entries(byDesk).map(([d, n]) => `${d}: ${n}`).join(' · ') : 'no piece is active yet (the writers work without model pieces)' };
    } catch { return { usable: false, detail: 'not readable' }; }
  })();
  const openings = Object.keys(await loadRecentOpenings(supabase)).length;
  const deny = await budgetDeny(supabase);
  let spent: { day: number; month: number } | null = null;
  try { const w = windowStarts(new Date()); spent = { day: +(await spendSince(supabase, w.dayIso)).toFixed(2), month: +(await spendSince(supabase, w.monthIso)).toFixed(2) }; } catch { /* meter unavailable */ }
  const b = parseBudgets(ENV);
  const reachable = structured.usable || plain.usable;
  return {
    ok: reachable && !deny && style.usable,
    verdict: !reachable ? 'The AI service is not reachable: articles cannot be composed right now.'
      : deny ? `The AI service works, but the desk is paused: ${deny}`
      : !style.usable ? `The AI service works, but the style check is not available (${style.detail}): articles stay in the queue.`
      : structured.usable && plain.usable ? 'AI service reachable: full quality.' : 'AI service reachable, one mode degraded: articles still compose.',
    style_check: style,
    meaning_check: meaning,
    model_pieces: pieces,
    recent_openings: openings ? `ok (${openings} languages)` : 'not available: run the migration 20261012090000 (the writers then get no list of openings to avoid)',
    settings: { evidence: conf.evidence, escalate: conf.escalate, semantic: conf.semantic, exemplars: conf.exemplars, merge: conf.merge },
    // The keys below keep the shape the admin page already reads.
    writer_primary: { structured_output: structured.detail, prefill: `plain ${plain.detail}`, usable: structured.usable },
    writer_fallback: { structured_output: structured.detail, prefill: plain.detail, usable: plain.usable },
    research: 'not needed (the fact core is read from the source itself)',
    budget: { paused: deny, spent_today_usd: spent?.day ?? null, spent_month_usd: spent?.month ?? null, daily_limit_usd: b.dailyUsd, monthly_limit_usd: b.monthlyUsd },
    keys_present: { writer_key: !!Deno.env.get('OPENAI_API_KEY'), images_key: !!Deno.env.get('UNSPLASH_ACCESS_KEY'), site_url: !!conf.siteUrl, style_check_secret: !!conf.enrichSecret },
  };
}

// ── cover picture and author ─────────────────────────────────────────────────────────────────────────────────────────
async function buildVisualQuery(llm: LlmFn, titleEn: string, category: string, district: string | null, deadlineAt: number): Promise<string> {
  const place = district ? `${district} Cyprus` : 'Cyprus';
  try {
    const r = await llm({
      fn: 'visual-brief', task: 'short', system: 'Return ONLY a 3-6 word English stock-photo search query for a RELEVANT real photo for this Cyprus article. Include the place or landmark when the subject is a named place. Concrete photographable nouns, no punctuation.',
      user: `TITLE: ${titleEn}\nCATEGORY: ${category}\nPLACE: ${place}`, expectTokens: 40, deadlineAt,
    });
    const q = (r.ok ? r.text : '').replace(/["'\n]/g, ' ').replace(/\s+/g, ' ').trim();
    if (q && q.split(/\s+/).length <= 8) return q;
  } catch { /* fall through */ }
  const kw = (titleEn.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).filter((w) => !['with', 'from', 'that', 'this', 'over', 'after', 'into'].includes(w)).slice(0, 3).join(' ');
  return `${kw} ${place}`.trim();
}
async function getAuthorId(supabase: SupaClient, editor: EditorKey): Promise<string | null> {
  const { data } = await supabase.from('authors').select('id').eq('slug', AUTHOR_SLUG[editor] || 'elena-georgiou').maybeSingle();
  return (data?.id as string) || null;
}
async function fetchUnsplashImage(query: string, category: string, district: string | null): Promise<string | null> {
  const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!accessKey) return null;
  const grab = async (q: string): Promise<string | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=6&orientation=landscape&content_filter=high`, { headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' }, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      return (Array.isArray(data.results) && data.results[0]?.urls?.regular as string) || null;
    } catch { clearTimeout(timer); return null; }
  };
  for (const q of [query, `${category} ${district ? district + ' ' : ''}Cyprus`.trim(), `Cyprus ${category}`.trim()]) {
    const u = await grab(q);
    if (u) return u;
  }
  return null;
}

// ── telemetry: generation_logs ───────────────────────────────────────────────────────────────────────────────────────
// The table has per-language columns only for EN, EL, RO and AR; everything else of a run goes into `meta` (migration
// 20261010090000). Where that column does not exist yet the row is written without it, so a run is never lost to a schema gap.
const LOG_COLUMNS = new Set([
  'brief_excerpt', 'article_type', 'category', 'word_count_req', 'desk1_ok', 'desk1_ms', 'desk2b_en_ok', 'desk2b_el_ok', 'desk2b_ro_ok', 'desk2b_ar_ok', 'desk2b_ms',
  'title_regen_en', 'words_en', 'words_el', 'words_ro', 'words_ar', 'words_de', 'words_pl', 'words_ru', 'total_ms', 'est_cost_usd', 'status', 'error_msg', 'editor', 'error_stage',
  'en_humanness', 'el_humanness', 'ro_humanness', 'ar_humanness',
]);
async function writeLog(supabase: SupaClient, log: Record<string, unknown>): Promise<void> {
  try {
    const rich = await supabase.from('generation_logs').insert(log);
    if (!rich.error) return;
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(log)) if (LOG_COLUMNS.has(k)) safe[k] = v;
    await supabase.from('generation_logs').insert(safe);
  } catch { /* telemetry */ }
}
/** 0-100, higher is cleaner, from the voice engine's score (0 = clean). Kept in the legacy "humanness" columns so the admin table still shows a trend. */
const styleScore = (score: number): number => Math.max(0, Math.min(100, Math.round(100 - score * 4)));
/** The edition's style score, or null when the style check could not run (that is not a perfect score). */
const styleOf = (a?: { score: number; unavailable?: string }): number | null => (a && !a.unavailable ? a.score : null);
/** The comparison with the source by meaning, per language, as it goes into the log (the values to tune the thresholds from). */
const meaningMeta = (editions: Record<Lang, Edition>) => Object.fromEntries(ALL_LANGS.map((l) => {
  const m = editions[l].semantic;
  return [l, m ? { close: m.close, order: m.tau, lede: m.ledeSim, copy: m.copy || m.ledeCopy, summary: semanticSummary(m) } : null];
}));
/** What the evidence check and the Cyprus anchor found, as it goes into the log; also when the run stopped before an article existed. */
const evidenceMeta = (r: PipelineResult) => ({
  evidence: r.verification ? { mode: r.verification.mode, facts: `${r.verification.confirmed.kept}/${r.verification.confirmed.total}`, claims: `${r.verification.claims.kept}/${r.verification.claims.total}`, quotes: `${r.verification.quotes.kept}/${r.verification.quotes.total}`, figures: `${r.verification.numbers.kept}/${r.verification.numbers.total}`, repaired: r.verification.repaired, dropped: r.verification.dropped.slice(0, 8) } : null,
  cyprus: r.cyprus ? { grounded: r.cyprus.grounded, via: r.cyprus.via, kind: r.cyprus.kind } : null,
});

// ── processOne ───────────────────────────────────────────────────────────────────────────────────────────────────────
interface ScrapedRow {
  id: string; original_title: string | null; original_url: string | null; original_content: string | null; original_content_full: string | null;
  category?: string | null; scope?: string | null; source_word_count?: number | null; status?: string | null; source_id?: string | null;
}
export interface Outcome {
  ok: boolean; reason?: string; post_id?: string; status?: 'published' | 'draft' | 'skipped' | 'failed' | 'queued';
  quality_warning?: string; cost_usd?: number; ms?: Record<string, number>; stop?: boolean;
}

/**
 * An article is in "rewriting" only while a run holds it. When the platform stops a run before it could write anything (its wall-clock
 * limit), the row would stay there for ever: the stuck-job sweeper only looks at rewrite_jobs. A claim older than 20 minutes (a run lasts
 * three at most) is therefore released: back into the queue the first time, to "failed" the second time, so that a story which always
 * runs out of time does not spend money at every tick and waits for a human instead.
 */
const STALE_CLAIM_MS = 20 * 60_000;
export async function releaseStaleClaims(supabase: SupaClient): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
    const { data } = await supabase.from('scraped_articles').select('id, error_message').eq('status', 'rewriting').lt('rewrite_started_at', cutoff).limit(10);
    let released = 0;
    for (const r of (data || []) as Array<{ id: string; error_message: string | null }>) {
      const twice = /INTERRUPTED/.test(r.error_message || '');
      const patch = twice
        ? { status: 'failed', error_message: 'INTERRUPTED twice: both runs were stopped before they finished. Open the article and run it by hand.', rewrite_error: 'interrupted', rewrite_finished_at: new Date().toISOString() }
        : { status: 'scraped', error_message: 'INTERRUPTED: the previous run was stopped before it finished; the article is queued again.' };
      const { error } = await supabase.from('scraped_articles').update(patch).eq('id', r.id).eq('status', 'rewriting');
      if (!error) released++;
    }
    if (released) console.warn(`[desk] released ${released} stale claim(s)`);
    return released;
  } catch { return 0; }
}

const failRow = (supabase: SupaClient, id: string, msg: string, extra: Record<string, unknown> = {}) =>
  supabase.from('scraped_articles').update({ status: 'failed', error_message: msg.slice(0, 500), rewrite_error: msg.slice(0, 500), rewrite_finished_at: new Date().toISOString(), ...extra }).eq('id', id);

export async function processOne(supabase: SupaClient, row: ScrapedRow, autoPublish: boolean, batchDeadlineAt?: number): Promise<Outcome> {
  const t0 = Date.now();
  const settings = cfg();
  const deadlineAt = Math.min(batchDeadlineAt ?? Infinity, t0 + settings.softLimitMs);
  const title = row.original_title || '';
  const content = row.original_content_full || row.original_content || '';
  const sourceUrl = row.original_url || '';

  const deny = await budgetDeny(supabase);
  if (deny) return { ok: false, status: 'queued', reason: deny, stop: true };

  // The style check lives on the website. Before any model money is spent: is it configured and does it answer? If not, the article stays queued.
  const assess = remoteAssess({ siteUrl: settings.siteUrl, secret: settings.enrichSecret, deadlineAt });
  const notConfigured = assessConfigError(settings.siteUrl, settings.enrichSecret);
  if (notConfigured) return { ok: false, status: 'queued', reason: `Style check not configured: ${notConfigured}. Add it to the Supabase secrets.`, stop: true };
  try { await assess('<p>The fishing harbour at Latchi smells of diesel and grilled octopus by half past eleven.</p>', 'en', { title: 'Latchi harbour', category: 'cyprus', articleType: 'news' }); } catch (e) {
    return { ok: false, status: 'queued', reason: scrubModelNames((e as Error).message), stop: true };
  }

  const sc = isSourceContentRealProse(content);
  if (!sc.ok) {
    await supabase.from('scraped_articles').update({ status: 'failed', error_message: `SOURCE_INVALID: ${sc.reason}` }).eq('id', row.id);
    return { ok: false, status: 'failed', reason: `SOURCE_INVALID: ${sc.reason}` };
  }
  const { data: claimed, error: claimErr } = await supabase.from('scraped_articles').update({ status: 'rewriting', rewrite_started_at: new Date().toISOString() }).eq('id', row.id).eq('status', 'scraped').select().single();
  if (claimErr || !claimed) return { ok: false, status: 'queued', reason: 'CLAIM_REFUSED' };

  const log: Record<string, unknown> = { brief_excerpt: title.slice(0, 200), article_type: 'rewrite', category: row.category || null };
  const cost = newCost();
  let partner: Partner | null = null;       // a second account of the same event, claimed for this run
  let partnerSettled = false;               // true once it was consumed (merged into the article)
  try {
    const llm = makeLlm(supabase, deadlineAt, cost);
    const embed = settings.semantic || settings.merge ? makeEmbed(supabase, cost) : undefined;
    if (embed && settings.merge) partner = await findPartner(supabase, row, content, embed, settings);
    const recent = await loadRecentOpenings(supabase);
    const deps: PipelineDeps = {
      llm, now: Date.now, assess,
      sanitize: { html: (raw, lang) => cleanHtml(raw, lang), title: (t, lang) => cleanTitle(t, lang), field: (t, lang) => cleanField(t, lang), tags: normalizeTags, words: countWords, text: stripTags },
      overlap: overlapRatio, factsKept, inventedFigures, hasCyprusTerms, deskBrief, titleIsGeneric: isTitleGeneric, log: (m) => console.log(m),
      sharedRuns, embed: settings.semantic ? embed : undefined,
      exemplars: settings.exemplars ? (desk) => loadExemplars(supabase, desk) : undefined,
    };
    const result: PipelineResult = await runPipeline({
      title, text: content, hintCategory: row.category || undefined,
      originCyprus: isCyprusOutlet(sourceUrl, settings.outletHosts), recent,
      extra: partner ? [{ label: 'B', title: partner.title, text: partner.text, url: partner.url }] : undefined,
    }, deps, {
      deadlineAt, overlapMax: settings.overlapMax, relevanceGate: settings.relevanceGate, maxEditPasses: settings.maxEditPasses, srcWords: countWords(content),
      evidence: settings.evidence, escalate: settings.escalate,
    });
    const core = result.core;
    const category = core?.category || row.category || 'cyprus';
    const editor = editorForCategory(category);
    Object.assign(log, { category, editor, desk1_ok: !!core, desk1_ms: result.ms?.core ?? null, desk2b_ms: result.ms?.compose ?? null, est_cost_usd: +cost.usd.toFixed(4) });
    const fin = (extra: Record<string, unknown>) => ({ ...log, ...extra, total_ms: Date.now() - t0, est_cost_usd: +cost.usd.toFixed(4) });

    // — stopped before there was anything to publish —
    if (result.skipped === 'off_topic') {
      await writeLog(supabase, fin({ status: 'skipped', error_stage: 'relevance', error_msg: 'OFF_TOPIC: no Cyprus angle', meta: evidenceMeta(result) }));
      await supabase.from('scraped_articles').update({ status: 'skipped', is_used: true, error_message: 'OFF_TOPIC: no genuine Cyprus angle, skipped by the relevance gate', rewrite_finished_at: new Date().toISOString() }).eq('id', row.id);
      console.log(`[desk] SKIP ${row.id}: off-topic (${category})`);
      return { ok: false, status: 'skipped', reason: 'Off-topic for Cyprus Lifestyle: no genuine Cyprus angle, so it was not published.', cost_usd: +cost.usd.toFixed(4) };
    }
    if (!result.ok) {
      const why = scrubModelNames(result.error || 'unknown');
      if (result.fatal) {
        // No credit / key refused: nothing was written for this article. Put it back in the queue and let the batch stop.
        await supabase.from('scraped_articles').update({ status: 'scraped', error_message: `PAUSED: ${why}`.slice(0, 500) }).eq('id', row.id);
        await writeLog(supabase, fin({ status: 'error', error_stage: `fatal_${result.fatal}`, error_msg: why.slice(0, 500) }));
        console.warn(`[desk] PAUSE ${row.id}: ${why.slice(0, 200)}`);
        return { ok: false, status: 'queued', reason: why, stop: true, cost_usd: +cost.usd.toFixed(4) };
      }
      await writeLog(supabase, fin({ status: 'error', error_stage: result.stage || 'pipeline', error_msg: why.slice(0, 500), meta: evidenceMeta(result) }));
      await failRow(supabase, row.id, why);
      console.warn(`[desk] ABORT ${row.id}: ${why.slice(0, 200)}`);
      return { ok: false, status: 'failed', reason: why, cost_usd: +cost.usd.toFixed(4) };
    }

    const editions = result.editions as Record<Lang, Edition>;
    for (const l of ALL_LANGS) {
      log[`words_${l}`] = editions[l].wc;
      if (l === 'en' || l === 'el' || l === 'ro' || l === 'ar') { log[`desk2b_${l}_ok`] = editions[l].ok; log[`${l}_humanness`] = styleScore(styleOf(editions[l].assessment) ?? 100); }
    }
    // — an edition that borrows too much of its source is refused; nothing borrowed is ever committed —
    const refused = ALL_LANGS.filter((l) => !editions[l].ok);
    if (refused.length) {
      const detail = refused.map((l) => `${l.toUpperCase()}=${editions[l].reason || 'refused'}`).join('; ');
      await writeLog(supabase, fin({ status: 'error', error_stage: `plagiarism_${refused.join('+')}`, error_msg: detail.slice(0, 500), meta: { ...evidenceMeta(result), meaning: meaningMeta(editions), overlap: Object.fromEntries(ALL_LANGS.map((l) => [l, +editions[l].overlap.toFixed(3)])) } }));
      await failRow(supabase, row.id, `plagiarism gate: ${detail}`);
      console.error(`[desk] ABORT ${row.id}: plagiarism gate: ${detail}`);
      return { ok: false, status: 'failed', cost_usd: +cost.usd.toFixed(4), reason: `Plagiarism gate failed after rewrite (${detail}). The source is likely too thin to paraphrase safely: pick a richer source or edit by hand.` };
    }

    // — cover, author —
    const gate = result.gate!;
    const authorId = await getAuthorId(supabase, editor);
    let cover: string | null = null;
    if (deadlineAt - Date.now() > 8000) {
      const q = await buildVisualQuery(llm, editions.en.title, category, core?.district ?? null, deadlineAt);
      cover = await fetchUnsplashImage(q, category, core?.district ?? null);
    }

    // — commit: one atomic write of all seven editions; live only when the whole desk agrees —
    const publishNow = autoPublish === true && gate.publishable;
    const nowIso = new Date().toISOString();
    const slug = generateSlug(editions.en.title);
    const subcategory = core?.subcategory || 'regional';
    const blogPayload: Record<string, unknown> = {
      slug, category, subcategory, county: core?.district ?? null, cover_image: cover, source_url: sourceUrl, scraped_article_id: row.id,
      ai_editor: editor, author_name: deskName(editor), author_id: authorId, word_count: String(editions.en.wc),
      status: publishNow ? 'published' : 'draft', published_at: publishNow ? nowIso : '',
    };
    const writeback: Record<string, unknown> = {
      assigned_editor: editor, category, subcategory, cover_image: cover, output_word_count: String(editions.en.wc), rewrite_tags: editions.en.tags,
    };
    for (const l of ALL_LANGS) {
      const e = editions[l];
      Object.assign(blogPayload, { [`title_${l}`]: e.title, [`content_${l}`]: e.content, [`excerpt_${l}`]: e.excerpt, [`summary_${l}`]: e.summary, [`tags_${l}`]: e.tags, [`seo_title_${l}`]: e.seoTitle, [`seo_description_${l}`]: e.seoDesc });
      Object.assign(writeback, { [`rewritten_${l}`]: e.content, [`title_${l}`]: e.title, [`excerpt_${l}`]: e.excerpt, [`summary_${l}`]: e.summary, [`rewrite_tags_${l}`]: e.tags, [`seo_title_${l}`]: e.seoTitle, [`seo_description_${l}`]: e.seoDesc });
    }
    const { data: rpc, error: rpcErr } = await supabase.rpc('commit_scraper_blog_post', { p_blog_payload: blogPayload, p_scraped_id: row.id, p_writeback: writeback });
    if (rpcErr || !rpc) throw new Error(`commit_scraper_blog_post RPC failed: ${rpcErr?.message || 'no id'}`);
    const postId = rpc as string;
    if (partner && result.merged) {
      // two accounts, one article: the second is used up, and both are recorded as the article's sources (the article is committed; a failure here never undoes it)
      try {
        await supabase.from('scraped_articles').update({ status: 'processed', is_used: true, error_message: `MERGED into the article ${postId}`.slice(0, 500), rewrite_finished_at: new Date().toISOString() }).eq('id', partner.id);
        partnerSettled = true;
        await supabase.from('blog_posts').update({ sources: [sourceUrl, partner.url] }).eq('id', postId);
      } catch (e) { console.warn(`[desk] merged article ${postId}: could not record the second source: ${(e as Error).message}`); }
    }

    if (publishNow && settings.siteUrl && settings.revalidateSecret) {
      try {
        await fetch(`${settings.siteUrl}/api/revalidate`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-revalidate-secret': settings.revalidateSecret }, body: JSON.stringify({ slug, category }) });
      } catch (e) { console.warn(`[desk] revalidate ping failed: ${(e as Error).message}`); }
    }

    const held = autoPublish === true && !gate.publishable;
    const warns = [...(held ? [`Held back as a draft: ${gate.reasons.join('; ')}`] : gate.publishable ? [] : [`Not checked for publication: ${gate.reasons.join('; ')}`]), ...gate.warnings];
    const meta = {
      type: result.articleType, complexity: result.complexity, flags: core?.flags ?? [], district: core?.district ?? null, facts: core?.confirmed.length ?? 0,
      gate: { publishable: gate.publishable, held, reasons: gate.reasons, warnings: gate.warnings },
      style: Object.fromEntries(ALL_LANGS.map((l) => [l, styleOf(editions[l].assessment)])),
      overlap: Object.fromEntries(ALL_LANGS.map((l) => [l, +editions[l].overlap.toFixed(3)])),
      factcheck: Object.fromEntries(ALL_LANGS.map((l) => [l, editions[l].factCheck ? { ran: editions[l].factCheck!.ran, pass: editions[l].factCheck!.pass, high: editions[l].factCheck!.high, medium: editions[l].factCheck!.medium, repaired: editions[l].factCheck!.repaired } : null])),
      passes: Object.fromEntries(ALL_LANGS.map((l) => [l, editions[l].passes])),
      fields: Object.fromEntries(ALL_LANGS.map((l) => [l, editions[l].fieldFindings.length])),
      ...evidenceMeta(result),
      meaning: meaningMeta(editions),
      rewrites: Object.fromEntries(ALL_LANGS.map((l) => [l, editions[l].passes.rewrite])),
      merged: partner && result.merged ? { url: partner.url, similarity: +partner.sim.toFixed(3) } : null,
      ms: result.ms, calls: cost.calls, cost_usd: +cost.usd.toFixed(4), base_usd: +cost.baseUsd.toFixed(4),
    };
    await writeLog(supabase, fin({ status: 'ok', ...(warns.length ? { error_msg: `${held ? 'held' : 'note'}: ${warns.join(' · ')}`.slice(0, 500) } : {}), meta }));
    console.log(`[desk] DONE ${row.id} → ${postId} | ${publishNow ? 'published' : 'draft'} | EN ${editions.en.wc}w | style ${ALL_LANGS.map((l) => `${l}:${styleOf(editions[l].assessment) ?? '-'}`).join(' ')} | $${cost.usd.toFixed(3)} in ${cost.calls} calls | ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return { ok: true, post_id: postId, status: publishNow ? 'published' : 'draft', quality_warning: warns.length ? warns.join(' · ') : undefined, cost_usd: +cost.usd.toFixed(4), ms: result.ms };
  } catch (e) {
    const msg = scrubModelNames((e as Error).message);
    console.error(`[desk] EXCEPTION ${row.id}: ${(e as Error).message}`);
    await writeLog(supabase, { ...log, status: 'error', error_stage: 'processOne', error_msg: msg.slice(0, 500), total_ms: Date.now() - t0, est_cost_usd: +cost.usd.toFixed(4) });
    await failRow(supabase, row.id, msg);
    return { ok: false, status: 'failed', reason: msg, cost_usd: +cost.usd.toFixed(4) };
  } finally {
    // a second account that was claimed but not merged (another story, a stopped run, an article that failed) goes back into the queue
    if (partner && !partnerSettled) { try { await supabase.from('scraped_articles').update({ status: 'scraped', rewrite_started_at: null }).eq('id', partner.id).eq('status', 'rewriting'); } catch { /* the stale-claim sweeper releases it */ } }
  }
}

// ── auth and the door ────────────────────────────────────────────────────────────────────────────────────────────────
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey && token === serviceKey) return null;
  try {
    const probe = createClient(Deno.env.get('SUPABASE_URL')!, token, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (!error) return null;
  } catch { /* not service-role */ }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY') ?? serviceKey!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return json({ error: 'Forbidden' }, 403);
    return null;
  } catch (e) {
    console.error('[requireAdmin] deny:', (e as Error).message);
    return json({ error: 'Unauthorized' }, 401);
  }
}

// Supabase's runtime exposes EdgeRuntime.waitUntil for work that outlives the HTTP response: the cron caller (60 s) gets an immediate
// ACK while the batch runs to completion here. Typed loosely so the code also runs where it is absent.
const EDGE_BG = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
async function dispatchOrRun(wantBackground: boolean, label: string, worker: () => Promise<Record<string, unknown>>): Promise<Response> {
  if (wantBackground && EDGE_BG?.waitUntil) {
    EDGE_BG.waitUntil(worker().then((r) => console.log(`[bg:${label}] done ${JSON.stringify(r).slice(0, 160)}`), (e) => console.error(`[bg:${label}] failed: ${(e as Error).message}`)));
    return json({ ok: true, dispatched: true });
  }
  return keepAlive(worker);
}

/**
 * The answer of a run that takes minutes (the admin's "Generate" button waits for it). The gateway cuts a request that has received no
 * byte for 150 seconds with a 504, even though the work goes on and finishes: the browser then shows a failure for a run that succeeded.
 * So the response starts at once (status 200, the reason of a failure is in the body, as before) and a space is sent every 15 seconds;
 * JSON allows leading white space, so the client reads it exactly as before.
 */
export function keepAlive(work: () => Promise<Record<string, unknown>>, everyMs = 15_000): Response {
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      timer = setInterval(() => { try { controller.enqueue(enc.encode(' ')); } catch { /* the client has gone */ } }, everyMs);
      work().catch((e) => ({ ok: false, error: scrubModelNames((e as Error).message) } as Record<string, unknown>)).then((out) => {
        clearInterval(timer);
        try { controller.enqueue(enc.encode(JSON.stringify(out))); controller.close(); } catch { /* the client has gone */ }
      });
    },
    cancel() { if (timer) clearInterval(timer); },
  });
  return new Response(stream, { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const ROW_COLUMNS = 'id, original_title, original_url, original_content, original_content_full, category, scope, source_word_count, status, source_id';

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({})) as { scraped_article_id?: string; source?: string; auto_publish?: boolean; action?: string; selftest?: boolean; background?: boolean };
    const wantBackground = body.background === true;

    if (body.action === 'selftest' || body.selftest === true) return json(await runSelfTest());

    const supabase = adminClient();
    const fromCron = body.source === 'cron';
    try { await supabase.rpc('sweep_stuck_rewrite_jobs'); } catch { /* optional */ }
    await releaseStaleClaims(supabase);
    const { data: settingsRow } = await supabase.from('automation_settings').select('processor_enabled, auto_publish').eq('id', 1).maybeSingle();
    const s = settingsRow as { processor_enabled: boolean; auto_publish: boolean } | null;

    if (body.scraped_article_id) {
      const { data, error } = await supabase.from('scraped_articles').select(ROW_COLUMNS).eq('id', body.scraped_article_id).single();
      if (error || !data) return json({ ok: false, error: 'scraped article not found' }, 404);
      // Always 200 so the reason reaches the browser (supabase.functions.invoke hides the body on a non-2xx status).
      return await dispatchOrRun(wantBackground, `one:${body.scraped_article_id}`, async () => ({ ...(await processOne(supabase, data as ScrapedRow, body.auto_publish === true)) }));
    }
    if (fromCron && !s?.processor_enabled) return json({ ok: true, skipped: 'processor_disabled' });

    const autoPublish = (s?.auto_publish === true) && (fromCron || body.auto_publish === true);
    const runBatch = async (): Promise<Record<string, unknown>> => {
      const { data: rows } = await supabase.from('scraped_articles').select(ROW_COLUMNS).eq('status', 'scraped').eq('is_used', false).order('created_at', { ascending: true }).limit(BATCH_MAX);
      const list = (rows || []) as ScrapedRow[];
      const results: Array<Outcome & { id: string }> = [];
      const start = Date.now();
      const { softLimitMs, minArticleMs } = cfg();
      const deadlineAt = start + softLimitMs;
      for (const r of list) {
        // An article needs room to finish: one that cannot be completed before the platform's wall clock stays in the queue for the next run.
        if (deadlineAt - Date.now() < minArticleMs) break;
        const out = await processOne(supabase, r, autoPublish, deadlineAt);
        results.push({ id: r.id, ...out });
        if (out.stop) break;
      }
      return {
        ok: true, processed: results.length,
        published: results.filter((r) => r.status === 'published').length, drafted: results.filter((r) => r.status === 'draft').length,
        failed: results.filter((r) => r.status === 'failed').length, results,
      };
    };
    return await dispatchOrRun(wantBackground, 'batch', runBatch);
  } catch (e) {
    return json({ ok: false, error: scrubModelNames((e as Error).message) }, 500);
  }
}

serve(handle);
