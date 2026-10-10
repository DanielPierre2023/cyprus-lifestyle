// lib/journalism/pipeline.ts — the article desk as one testable function:
//   fact core → relevance gate → seven independent native editions → originality gate → editorial pass → short fields →
//   fact check → repair → the publish bar.
// Pure: every effect (the model call, the deterministic sanitiser, the assessor, the 5-gram overlap, the clock) is handed in, so the
// whole desk runs in a unit test with a scripted model, and the Supabase edge function runs the SAME code (generated copy).
//
// What the desk promises (and the tests check):
//   • all seven editions are written from ONE fact core, each independently, never translated from another edition;
//   • an edition that borrows too much wording from its source is rewritten, and refused if it still does;
//   • a finished edition is judged by the voice engine's scorer; findings go to a sub-editor with the measured values, and the
//     rewrite is accepted only if the score really improves and no figure or quotation changed;
//   • every edition is fact-checked against the core in its own language; what the check finds is repaired and checked again;
//   • an article is publishable only if ALL seven editions pass; otherwise it is kept as a draft with the reasons. Never published
//     unchecked, never padded to a word count, never filled with English where another language failed.
import { tokensForChars, type Complexity, type Task } from './models';
import { parseJsonLoose, ZERO_USAGE, type JsonSpec, type LlmResult } from './openai';
import { FACT_CORE_SCHEMA, factCoreSystem, factCoreUser, parseFactCore, renderFactCore, effectiveArticleType, coreComplexity, type FactCore } from './factCore';
import { writerSystem, writerUser, COMPOSE_SCHEMA, HOUSE_VOICE, stableHash, leadApproachesFor, pickLead, type ArticleType, type LeadApproach } from './prompts';
import { FACT_CHECK_SCHEMA, factCheckSystem, factCheckUser, parseFactCheck, checkOutcome, needsRepair, REPAIR_SCHEMA, repairSystem, repairUser, type FactCheck, type FactIssue } from './factCheck';
import { editorialFixes, editorialSystem, editorialUser, EDITORIAL_SCHEMA, deOverlapSystem, fieldsEditorSystem, FIELDS_SCHEMA, type Finding } from './editorial';
import { fieldTells, fieldScore } from './fields';
import { isImprovement } from './progress';
import { LANGS, TITLE_CRAFT, type Lang } from './languages';

export const ALL_LANGS: Lang[] = LANGS;

// ── what the pipeline needs from outside ──────────────────────────────────────
export interface CallSpec {
  fn: string; task: Task; complexity?: Complexity; attempt?: number;
  system: string; user: string; json?: JsonSpec; expectTokens?: number; cacheKey?: string; timeoutMs?: number;
  /** Absolute time (ms, the pipeline's clock) after which the call must not start or must lower its effort. */
  deadlineAt?: number;
}
export type LlmFn = (spec: CallSpec) => Promise<LlmResult>;

export interface Assessment {
  score: number; ok: boolean; high: number; words: number; tells: Finding[];
  /** Set (to the reason) when the style check could not run; the edition is then never published and the sub-editor has nothing to work from. */
  unavailable?: string;
}
export interface AssessCtx { title: string; category: string; articleType: ArticleType }

export interface PipelineDeps {
  llm: LlmFn;
  now: () => number;
  /** The style check. It may run on another machine (the edge function asks the website, see assessClient.ts), hence a promise is fine. */
  assess: (html: string, lang: Lang, ctx: AssessCtx) => Assessment | Promise<Assessment>;
  sanitize: {
    /** raw model HTML → clean article HTML (sanitised, paragraphs ensured). */
    html: (raw: string, lang: Lang) => string;
    title: (t: string, lang: Lang) => string;
    field: (t: string, lang: Lang) => string;
    tags: (v: unknown) => string[];
    words: (html: string) => number;
    text: (html: string) => string;
  };
  /** Share (0-1) of the output's 5-word runs that also occur in the source. */
  overlap: (outputHtml: string, source: string) => number;
  /** true when a rewrite kept every figure and quotation of the original (same language). */
  factsKept: (before: string, after: string, lang: Lang) => boolean;
  /** Figures in `text` that do not occur in `allowed`. */
  inventedFigures: (text: string, allowed: string) => string[];
  hasCyprusTerms: (s: string) => boolean;
  deskBrief: (category: string) => string;
  titleIsGeneric?: (t: string) => boolean;
  log?: (m: string) => void;
}

export interface PipelineOptions {
  deadlineAt: number;
  overlapMax: number;
  relevanceGate: boolean;
  maxEditPasses: number;
  srcWords?: number;
  /** Milliseconds a step needs at least before it is worth starting. */
  minMs?: Partial<Record<'edit' | 'fields' | 'check' | 'repair' | 'deOverlap', number>>;
}

export interface FactCheckResult { ran: boolean; pass: boolean; high: number; medium: number; issues: FactIssue[]; repaired: boolean; error?: string }
export interface Edition {
  lang: Lang; ok: boolean; reason?: string;
  title: string; excerpt: string; summary: string; content: string; tags: string[]; seoTitle: string; seoDesc: string; wc: number;
  overlap: number;
  assessment?: Assessment;
  fieldFindings: Finding[];
  factCheck?: FactCheckResult;
  passes: { deOverlap: number; edit: number; fields: number; repair: number };
}
export interface PipelineResult {
  ok: boolean;
  stage?: string;
  error?: string;
  /** The model service refused for a reason no retry cures (no credit, bad key): the caller keeps the article queued and stops the batch. */
  fatal?: 'billing' | 'auth';
  skipped?: 'off_topic';
  core?: FactCore;
  articleType?: ArticleType;
  complexity?: Complexity;
  editions?: Record<Lang, Edition>;
  gate?: { publishable: boolean; reasons: string[]; warnings: string[] };
  ms?: Record<string, number>;
}

const DEFAULT_MIN = { edit: 25_000, fields: 15_000, check: 20_000, repair: 25_000, deOverlap: 30_000 };

/** About how many words the longest sensible edition of this type has; the visible-token budget of the call follows from it. */
const WORDS_BY_TYPE: Record<ArticleType, number> = { brief: 450, news: 900, reportage: 1_800, feature: 1_800, interview: 1_800, analysis: 1_500, commentary: 1_200, investigation: 2_200, listing: 500 };
const TOKENS_PER_WORD: Record<Lang, number> = { en: 1.4, de: 1.9, pl: 2.1, ro: 1.9, ru: 2.3, el: 2.4, ar: 2.4 };
export const composeTokens = (type: ArticleType, lang: Lang): number => Math.ceil(WORDS_BY_TYPE[type] * TOKENS_PER_WORD[lang]) + 450;   // + the short fields and the JSON frame

/** Cheap stable key so the seven calls that share one core share one prompt-cache prefix. */
export const hashKey = stableHash;

const emptyEdition = (lang: Lang, reason: string): Edition => ({
  lang, ok: false, reason, title: '', excerpt: '', summary: '', content: '', tags: [], seoTitle: '', seoDesc: '', wc: 0, overlap: 0,
  fieldFindings: [], passes: { deOverlap: 0, edit: 0, fields: 0, repair: 0 },
});

const asStr = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

export async function runPipeline(input: { title: string; text: string; hintCategory?: string }, deps: PipelineDeps, opts: PipelineOptions): Promise<PipelineResult> {
  const min = { ...DEFAULT_MIN, ...(opts.minMs || {}) };
  let fatal: 'billing' | 'auth' | undefined;
  // Once the service has refused for good (no credit, bad key) no further call is made: they would only fail again, and loudly.
  const llm: LlmFn = async (spec) => {
    if (fatal) return { ok: false, text: '', error: `stopped: the model service refused earlier (${fatal})`, kind: fatal, status: 'failed', usage: ZERO_USAGE, usd: 0, attempts: 0, ms: 0, model: '' };
    const r = await deps.llm(spec);
    if (!r.ok && (r.kind === 'billing' || r.kind === 'auth')) fatal = r.kind;
    return r;
  };
  const t0 = deps.now();
  const left = () => opts.deadlineAt - deps.now();
  const log = deps.log ?? (() => {});
  const ms: Record<string, number> = {};
  const lap = (k: string, from: number) => { ms[k] = deps.now() - from; };

  // ── 1. the fact core ────────────────────────────────────────────────────────
  let core: FactCore | null = null; let coreError = 'unknown';
  const tCore = deps.now();
  for (let attempt = 1; attempt <= 2 && !core; attempt++) {
    const r = await llm({ fn: 'core', task: 'core', attempt, system: factCoreSystem(), user: factCoreUser({ title: input.title, text: input.text }), json: { name: 'fact_core', schema: FACT_CORE_SCHEMA as unknown as Record<string, unknown> }, expectTokens: 3_500, deadlineAt: opts.deadlineAt });
    if (!r.ok) { coreError = `${r.kind || 'error'}: ${r.error || ''}`; if (r.kind === 'billing' || r.kind === 'auth' || r.kind === 'timeout') break; continue; }
    const p = parseFactCore(r.text);
    if (p.ok && p.core) core = p.core; else coreError = p.error || 'no usable core';
  }
  lap('core', tCore);
  if (!core) return { ok: false, stage: 'core', error: `fact core failed: ${coreError}`, fatal, ms };
  const rendered = renderFactCore(core);

  // ── 2. relevance: the island must be in the story ───────────────────────────
  // The model's own core must not be able to create relevance by itself (it may echo a hint): the flag it sets, a district it names, or
  // the island appearing in the SOURCE decide.
  const relevant = core.cyprusAngle || core.district !== null || deps.hasCyprusTerms(`${input.title}\n${input.text}`);
  if (opts.relevanceGate && !relevant) return { ok: false, skipped: 'off_topic', stage: 'relevance', error: 'OFF_TOPIC: no Cyprus angle', core, ms };

  const type = effectiveArticleType(core, opts.srcWords ?? 0);
  const complexity = coreComplexity(core, type);
  const coreKey = `core-${hashKey(rendered)}`;
  // each edition gets its own preferred way in, from what the core really offers (see prompts.ts)
  const leadOptions = leadApproachesFor(type, {
    hasQuote: core.quotes.length > 0, hasFigure: core.numbers.length > 0, hasDate: core.dates.length > 0,
    hasPerson: core.entities.some((e) => e.kind === 'person' || e.kind === 'organisation'), hasPlace: core.entities.some((e) => e.kind === 'place') || core.district !== null,
  });
  const leadFor = (lang: Lang): LeadApproach | null => pickLead(coreKey, lang, leadOptions);
  const floor = Math.min(120, Math.max(50, core.confirmed.length * 12));
  log(`[desk] core ok: ${core.category}/${core.district || 'national'} type=${type} complexity=${complexity} facts=${core.confirmed.length} flags=${core.flags.join(',') || '-'}`);

  // ── 3. seven independent native editions ────────────────────────────────────
  // The editions are written in the time that is left MINUS what sub-editing and the fact check need: a long think must never use up the
  // time of the checks (an unchecked article cannot be published). The reserve is capped at 30 % of what is left, for short windows.
  const composeDeadline = (): number => opts.deadlineAt - Math.min(min.edit + min.check, Math.floor(left() * 0.3));
  const compose = async (lang: Lang, attempt: number): Promise<Edition> => {
    const r = await llm({
      fn: `compose-${lang}`, task: 'write', complexity, attempt,
      system: writerSystem({ lang, deskBrief: deps.deskBrief(core!.category), articleType: type, category: core!.category }),
      user: writerUser({ lang, sourceTitle: input.title, factCore: rendered, lead: leadFor(lang) }),
      json: { name: 'article', schema: COMPOSE_SCHEMA as unknown as Record<string, unknown> },
      expectTokens: composeTokens(type, lang), cacheKey: coreKey, deadlineAt: composeDeadline(),
    });
    if (!r.ok) return emptyEdition(lang, `${r.kind || 'error'}: ${r.error || ''}`.slice(0, 300));
    const j = parseJsonLoose<Record<string, unknown>>(r.text);
    if (!j) return emptyEdition(lang, 'json_parse');
    const content = deps.sanitize.html(asStr(j.content_html) || asStr(j.content), lang);
    const wc = content ? deps.sanitize.words(content) : 0;
    if (!content || wc < floor) return emptyEdition(lang, `fragment_${wc}w`);
    return {
      lang, ok: true, content, wc,
      title: deps.sanitize.title(asStr(j.title) || input.title, lang),
      excerpt: deps.sanitize.field(asStr(j.excerpt), lang),
      summary: deps.sanitize.field(asStr(j.summary) || asStr(j.excerpt), lang),
      tags: deps.sanitize.tags(j.tags),
      seoTitle: deps.sanitize.title(asStr(j.seo_title) || asStr(j.title), lang),
      seoDesc: deps.sanitize.field(asStr(j.seo_description) || asStr(j.excerpt), lang),
      overlap: 0, fieldFindings: [], passes: { deOverlap: 0, edit: 0, fields: 0, repair: 0 },
    };
  };
  const tCompose = deps.now();
  const first = await Promise.all(ALL_LANGS.map((l) => compose(l, 1)));
  const editions = Object.fromEntries(ALL_LANGS.map((l, i) => [l, first[i]])) as Record<Lang, Edition>;
  const retry = ALL_LANGS.filter((l) => !editions[l].ok && left() > 45_000);
  if (retry.length) { const again = await Promise.all(retry.map((l) => compose(l, 2))); retry.forEach((l, i) => { if (again[i].ok) editions[l] = again[i]; }); }
  lap('compose', tCompose);
  if (!editions.en.ok) return { ok: false, stage: 'compose_en', error: `EN composition failed: ${editions.en.reason}`, fatal, core, articleType: type, complexity, editions, ms };
  const failed = ALL_LANGS.filter((l) => !editions[l].ok);
  if (failed.length) {
    return { ok: false, stage: `compose_${failed.join('+')}`, error: `Non-English editions failed: ${failed.map((l) => `${l.toUpperCase()}=${editions[l].reason}`).join(' · ')}`, fatal, core, articleType: type, complexity, editions, ms };
  }

  // ── 4. each edition: originality, sub-editing, short fields, fact check ─────
  const tFinish = deps.now();
  await Promise.all(ALL_LANGS.map((l) => finish(l)));
  lap('finish', tFinish);

  // The style check may run on another machine. When it cannot be reached the edition is not published (like a fact check that did not
  // run) and the sub-editor has no findings to work from.
  async function judge(html: string, lang: Lang, ctx: AssessCtx): Promise<Assessment> {
    try { return await deps.assess(html, lang, ctx); } catch (e) {
      const why = String((e as Error)?.message || e).replace(/\s+/g, ' ').slice(0, 200);
      log(`[desk] ${lang} style check could not run: ${why}`);
      return { score: 0, ok: false, high: 0, words: deps.sanitize.words(html), tells: [], unavailable: why };
    }
  }

  async function llmJson<T = Record<string, unknown>>(spec: CallSpec): Promise<T | null> {
    const r = await llm(spec);
    return r.ok ? parseJsonLoose<T>(r.text) : null;
  }

  async function finish(lang: Lang): Promise<void> {
    const ed = editions[lang];
    const ctx = (): AssessCtx => ({ title: ed.title, category: core!.category, articleType: type });
    const editTokens = () => Math.ceil(tokensForChars(ed.content.length, lang) * 1.15) + 300;

    // 4a. originality: the same 5-word-run test as before, with a rewrite before refusal
    ed.overlap = deps.overlap(ed.content, input.text);
    if (ed.overlap > opts.overlapMax && left() > min.deOverlap) {
      const j = await llmJson({ fn: `deoverlap-${lang}`, task: 'edit', complexity, system: deOverlapSystem(lang), user: `SOURCE (do NOT reuse its wording):\n${input.text.slice(0, 6_000)}\n\nARTICLE TO REWRITE (${lang}):\n${ed.content}\n\nRewritten (JSON):`, json: { name: 'edit', schema: EDITORIAL_SCHEMA as unknown as Record<string, unknown> }, expectTokens: editTokens(), deadlineAt: opts.deadlineAt });
      const html = j ? deps.sanitize.html(asStr(j.content_html), lang) : '';
      if (html && html.length > ed.content.length * 0.7 && html.length < ed.content.length * 1.4) {
        const o2 = deps.overlap(html, input.text);
        if (o2 < ed.overlap) { ed.content = html; ed.wc = deps.sanitize.words(html); ed.overlap = o2; ed.passes.deOverlap++; log(`[desk] ${lang} de-overlap -> ${(o2 * 100).toFixed(1)}%`); }
      }
    }
    if (ed.overlap > opts.overlapMax) { ed.ok = false; ed.reason = `plagiarism gate: ${(ed.overlap * 100).toFixed(1)}% source overlap`; return; }

    // 4b. a generic English headline is replaced
    const generic = deps.titleIsGeneric;
    if (lang === 'en' && generic && generic(ed.title) && left() > 20_000) {
      const j = await llmJson<{ title?: string }>({ fn: 'title-en', task: 'short', complexity, system: `${HOUSE_VOICE}\n\nThe headline "${ed.title}" was rejected as generic. Write ONE new English headline from the facts below.\n${TITLE_CRAFT.en}\nUnder 90 characters, sentence case. JSON: {"title":"..."}`, user: `FACTS:\n${rendered.slice(0, 1_800)}\n\nNew headline (JSON):`, json: { name: 'title', schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false } }, expectTokens: 200, deadlineAt: opts.deadlineAt });
      const t = j ? deps.sanitize.title(asStr(j.title), 'en') : '';
      if (t.length >= 8 && t.length <= 120 && !generic(t)) ed.title = t;
    }

    // 4c. the voice engine judges the body; the sub-editor works from the findings, never from a quota
    let a = await judge(ed.content, lang, ctx());
    for (let pass = 1; pass <= opts.maxEditPasses && !a.ok && !a.unavailable && left() > min.edit; pass++) {
      const j = await llmJson({ fn: `edit-${lang}`, task: 'edit', complexity, attempt: pass, system: editorialSystem(lang, editorialFixes(a.tells)), user: editorialUser(lang, ed.content), json: { name: 'edit', schema: EDITORIAL_SCHEMA as unknown as Record<string, unknown> }, expectTokens: editTokens(), deadlineAt: opts.deadlineAt });
      const cand = j ? deps.sanitize.html(asStr(j.content_html), lang) : '';
      if (!cand || cand.length < ed.content.length * 0.7 || cand.length > ed.content.length * 1.35) break;
      if (!deps.factsKept(ed.content, cand, lang)) { log(`[desk] ${lang} edit pass ${pass} dropped: a figure or quotation changed`); break; }
      const a2 = await judge(cand, lang, ctx());
      // "better" is judged by the weight of the findings, not only by the score: the score stops at 100, and an edition with eight serious
      // findings that the editor cut to four still shows 100 (see progress.ts). Progress is kept; equal or worse is dropped.
      if (a2.unavailable || !isImprovement(a, a2)) break;
      ed.content = cand; ed.wc = deps.sanitize.words(cand); a = a2; ed.passes.edit++;
    }
    ed.assessment = a;

    // 4d. the short fields (title, excerpt, summary, SEO), which nothing looked at before
    const fieldsOf = () => ({ title: ed.title, excerpt: ed.excerpt, summary: ed.summary, seoTitle: ed.seoTitle, seoDescription: ed.seoDesc });
    const known = `${deps.sanitize.text(ed.content)}\n${rendered}\n${input.title}`;
    const findFields = (): Finding[] => {
      const out: Finding[] = [...fieldTells(fieldsOf(), lang)];
      const invented = deps.inventedFigures(`${ed.title}\n${ed.excerpt}\n${ed.summary}\n${ed.seoTitle}\n${ed.seoDesc}`, known);
      if (invented.length) out.push({ key: 'f_invented_figure', label: `A short field states a figure that is not in the article or the core: ${invented.slice(0, 3).join(', ')}`, severity: 'high', sample: invented[0], count: invented.length });
      return out;
    };
    let ff = findFields();
    if (ff.length && left() > min.fields) {
      const j = await llmJson<Record<string, unknown>>({ fn: `fields-${lang}`, task: 'edit', complexity, system: fieldsEditorSystem(lang, editorialFixes(ff)), user: `ARTICLE (for the facts only):\n${deps.sanitize.text(ed.content).slice(0, 3_500)}\n\nCURRENT FIELDS (JSON):\n${JSON.stringify({ title: ed.title, excerpt: ed.excerpt, summary: ed.summary, seo_title: ed.seoTitle, seo_description: ed.seoDesc })}\n\nCorrected fields (JSON):`, json: { name: 'fields', schema: FIELDS_SCHEMA as unknown as Record<string, unknown> }, expectTokens: 700, deadlineAt: opts.deadlineAt });
      if (j) {
        const keep = { title: ed.title, excerpt: ed.excerpt, summary: ed.summary, seoTitle: ed.seoTitle, seoDesc: ed.seoDesc };
        ed.title = deps.sanitize.title(asStr(j.title) || ed.title, lang); ed.excerpt = deps.sanitize.field(asStr(j.excerpt) || ed.excerpt, lang); ed.summary = deps.sanitize.field(asStr(j.summary) || ed.summary, lang);
        ed.seoTitle = deps.sanitize.title(asStr(j.seo_title) || ed.seoTitle, lang); ed.seoDesc = deps.sanitize.field(asStr(j.seo_description) || ed.seoDesc, lang);
        const ff2 = findFields();
        if (fieldScore(ff2) < fieldScore(ff)) { ff = ff2; ed.passes.fields++; } else { ed.title = keep.title; ed.excerpt = keep.excerpt; ed.summary = keep.summary; ed.seoTitle = keep.seoTitle; ed.seoDesc = keep.seoDesc; }
      }
    }
    ed.fieldFindings = ff;

    // 4e. the fact check, in this edition's own language, against the core
    const runCheck = async (): Promise<FactCheck | null> => {
      const j = await llm({ fn: `factcheck-${lang}`, task: 'check', complexity, system: factCheckSystem(lang), user: factCheckUser({ factCore: rendered, sourceExcerpt: input.text, title: ed.title, bodyText: deps.sanitize.text(ed.content) }), json: { name: 'fact_check', schema: FACT_CHECK_SCHEMA as unknown as Record<string, unknown> }, expectTokens: 1_200, deadlineAt: opts.deadlineAt });
      if (!j.ok) return null;
      const p = parseFactCheck(j.text);
      return p.ok && p.check ? p.check : null;
    };
    const summarise = (c: FactCheck, repaired: boolean): FactCheckResult => { const o = checkOutcome(c); return { ran: true, pass: o.pass, high: o.high, medium: o.medium, issues: c.issues, repaired }; };
    if (left() > min.check) {
      let c = await runCheck();
      if (!c) { ed.factCheck = { ran: false, pass: false, high: 0, medium: 0, issues: [], repaired: false, error: 'the fact check did not return a result' }; return; }
      let repaired = false;
      if (needsRepair(c) && left() > min.repair) {
        const j = await llmJson<{ title?: string; content_html?: string }>({ fn: `repair-${lang}`, task: 'repair', complexity, system: repairSystem(lang), user: repairUser({ factCore: rendered, title: ed.title, html: ed.content, issues: c.issues }), json: { name: 'repair', schema: REPAIR_SCHEMA as unknown as Record<string, unknown> }, expectTokens: editTokens(), deadlineAt: opts.deadlineAt });
        const html = j ? deps.sanitize.html(asStr(j.content_html), lang) : '';
        if (html && html.length > ed.content.length * 0.5 && html.length < ed.content.length * 1.3) {
          ed.content = html; ed.wc = deps.sanitize.words(html);
          if (j && asStr(j.title)) ed.title = deps.sanitize.title(asStr(j.title), lang);
          ed.passes.repair++; repaired = true;
          ed.assessment = await judge(ed.content, lang, ctx());
          if (left() > min.check) { const c2 = await runCheck(); if (c2) c = c2; }
        }
      }
      ed.factCheck = summarise(c, repaired);
    } else {
      ed.factCheck = { ran: false, pass: false, high: 0, medium: 0, issues: [], repaired: false, error: 'no time left for the fact check' };
    }
  }

  // ── 5. the publish bar ──────────────────────────────────────────────────────
  const reasons: string[] = []; const warnings: string[] = [];
  for (const l of ALL_LANGS) {
    const ed = editions[l]; const tag = l.toUpperCase();
    if (!ed.ok) { reasons.push(`${tag}: ${ed.reason}`); continue; }
    const a = ed.assessment;
    if (a?.unavailable) reasons.push(`${tag}: style check not completed (${a.unavailable})`);
    else if (a && !a.ok) reasons.push(`${tag}: style score ${a.score}${a.high ? ` with a machine signature (${a.tells.filter((t) => t.severity === 'high').map((t) => t.label).slice(0, 2).join('; ')})` : ''}`);
    else if (a && a.score > 0) warnings.push(`${tag}: style score ${a.score} (within the limit)`);
    const fc = ed.factCheck;
    if (!fc || !fc.ran) reasons.push(`${tag}: fact check not completed${fc?.error ? ` (${fc.error})` : ''}`);
    else if (!fc.pass) reasons.push(`${tag}: fact check found ${fc.high} serious and ${fc.medium} minor problem(s): ${fc.issues.slice(0, 2).map((i) => `${i.kind} “${i.excerpt.slice(0, 50)}”`).join('; ')}`);
    else if (fc.issues.length) warnings.push(`${tag}: ${fc.issues.length} minor fact-check note(s)${fc.repaired ? ' (after repair)' : ''}`);
    const hi = ed.fieldFindings.filter((f) => f.severity === 'high');
    if (hi.length) reasons.push(`${tag}: short fields: ${hi.map((f) => f.label).slice(0, 2).join('; ')}`);
    else if (ed.fieldFindings.length) warnings.push(`${tag}: ${ed.fieldFindings.length} remark(s) on the short fields`);
  }
  ms.total = deps.now() - t0;
  return { ok: true, fatal, core, articleType: type, complexity, editions, gate: { publishable: reasons.length === 0, reasons, warnings }, ms };
}
