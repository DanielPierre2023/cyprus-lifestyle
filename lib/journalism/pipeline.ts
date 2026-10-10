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
// Added in October 2026 (each can be switched off by an option, and each leaves its measurements in the result for the log):
//   • every fact of the core is tied to a passage of the source by code (evidence.ts); what has no passage never reaches a writer;
//   • the Cyprus connection must come from the source (cyprusGround.ts), and an edition may name no Cypriot place the material does not;
//   • model pieces approved by the editor-in-chief set the standard of a desk (exemplars.ts); the openings of the latest pieces are avoided;
//   • an edition is compared with its source by meaning and order (semantic.ts), in every language;
//   • an edition that the editing passes cannot save is written again from the core instead of being patched further;
//   • a second account of the same event may be merged into one core (labels A and B).
import { tokensForChars, type Complexity, type Task } from './models';
import { parseJsonLoose, ZERO_USAGE, type JsonSpec, type LlmResult } from './openai';
import { factCoreSchema, factCoreSystem, factCoreUser, parseFactCore, renderFactCore, effectiveArticleType, coreComplexity, type CyprusAnchor, type FactCore } from './factCore';
import { writerSystem, writerUser, COMPOSE_SCHEMA, HOUSE_VOICE, stableHash, leadApproachesFor, pickLead, type ArticleType, type LeadApproach, type RedoBrief } from './prompts';
import { FACT_CHECK_SCHEMA, factCheckSystem, factCheckUser, parseFactCheck, checkOutcome, needsRepair, REPAIR_SCHEMA, repairSystem, repairUser, type FactCheck, type FactIssue } from './factCheck';
import { verifyCore, evidenceRepairSystem, evidenceRepairUser, parseEvidenceRepair, withRepairedEvidence, EVIDENCE_REPAIR_SCHEMA, type EvidenceMode, type SourceText, type VerificationReport } from './evidence';
import { groundCyprus, inventedCyprusMentions } from './cyprusGround';
import { selectExemplars, type Exemplar } from './exemplars';
import { compareToSource, sentencesFor, semanticReasons, semanticSummary, SEMANTIC, type SemanticReport, type SentenceSet } from './semantic';
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
  /** One vector per text (any language), or null when the comparison by meaning is not available. Without it the desk skips that step. */
  embed?: (texts: string[]) => Promise<number[][] | null>;
  /** The runs of words (five or more) the output still shares with the source, longest first. Used to tell a rewriter what to change. */
  sharedRuns?: (outputHtml: string, source: string, max: number) => string[];
  /** The model pieces of one desk, loaded once the core has said which desk the story belongs to (used when the input carries none). */
  exemplars?: (desk: string) => Promise<readonly Exemplar[]>;
  log?: (m: string) => void;
}

export interface PipelineInput {
  title: string; text: string; hintCategory?: string;
  /** The story comes from a Cypriot outlet (see cyprusGround.isCyprusOutlet). */
  originCyprus?: boolean;
  /** A second account of the same event (label "B"); the core decides whether it really is the same story. */
  extra?: SourceText[];
  /** Model pieces the editor-in-chief approved (all desks and languages; the desk picks what fits). */
  exemplars?: readonly Exemplar[];
  /** How the latest pieces of each language began, so that the new ones begin differently. */
  recent?: Partial<Record<Lang, string[]>>;
}

export interface PipelineOptions {
  deadlineAt: number;
  overlapMax: number;
  relevanceGate: boolean;
  maxEditPasses: number;
  srcWords?: number;
  /** 'enforce': facts need a passage of the source, the Cyprus connection must come from the source (default 'off' for callers that predate it). */
  evidence?: EvidenceMode;
  /** Write an edition again from the core when the editing passes (or the originality gate, or the comparison by meaning) cannot save it. */
  escalate?: boolean;
  /** Milliseconds a step needs at least before it is worth starting. */
  minMs?: Partial<Record<'edit' | 'fields' | 'check' | 'repair' | 'deOverlap' | 'evidence' | 'escalate', number>>;
}

export interface FactCheckResult { ran: boolean; pass: boolean; high: number; medium: number; issues: FactIssue[]; repaired: boolean; error?: string }
export interface Edition {
  lang: Lang; ok: boolean; reason?: string;
  title: string; excerpt: string; summary: string; content: string; tags: string[]; seoTitle: string; seoDesc: string; wc: number;
  overlap: number;
  assessment?: Assessment;
  fieldFindings: Finding[];
  factCheck?: FactCheckResult;
  /** The comparison with the source by meaning and order (null: not measured). */
  semantic?: SemanticReport;
  passes: { deOverlap: number; edit: number; fields: number; repair: number; rewrite: number };
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
  /** What the evidence check kept and dropped (null: switched off). */
  verification?: VerificationReport;
  cyprus?: CyprusAnchor;
  /** A second source was merged into the core. */
  merged?: boolean;
  ms?: Record<string, number>;
}

const DEFAULT_MIN = { edit: 25_000, fields: 15_000, check: 20_000, repair: 25_000, deOverlap: 30_000, evidence: 20_000, escalate: 60_000 };

/** About how many words the longest sensible edition of this type has; the visible-token budget of the call follows from it. */
const WORDS_BY_TYPE: Record<ArticleType, number> = { brief: 450, news: 900, reportage: 1_800, feature: 1_800, interview: 1_800, analysis: 1_500, commentary: 1_200, investigation: 2_200, listing: 500 };
const TOKENS_PER_WORD: Record<Lang, number> = { en: 1.4, de: 1.9, pl: 2.1, ro: 1.9, ru: 2.3, el: 2.4, ar: 2.4 };
export const composeTokens = (type: ArticleType, lang: Lang): number => Math.ceil(WORDS_BY_TYPE[type] * TOKENS_PER_WORD[lang]) + 450;   // + the short fields and the JSON frame

/** Cheap stable key so the seven calls that share one core share one prompt-cache prefix. */
export const hashKey = stableHash;

const emptyEdition = (lang: Lang, reason: string): Edition => ({
  lang, ok: false, reason, title: '', excerpt: '', summary: '', content: '', tags: [], seoTitle: '', seoDesc: '', wc: 0, overlap: 0,
  fieldFindings: [], passes: { deOverlap: 0, edit: 0, fields: 0, repair: 0, rewrite: 0 },
});

/** One level up in effort for the second try: routine → complex → demanding → investigative. */
const bump = (c: Complexity): Complexity => (c === 'routine' ? 'complex' : c === 'complex' ? 'demanding' : 'investigative');

const asStr = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

export async function runPipeline(input: PipelineInput, deps: PipelineDeps, opts: PipelineOptions): Promise<PipelineResult> {
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

  const mode: EvidenceMode = opts.evidence ?? 'off';
  const escalate = opts.escalate === true;

  // ── 1. the fact core ────────────────────────────────────────────────────────
  // One source, or two accounts of the same event (labels A and B; the core says whether B really is the same story).
  const wanted: SourceText[] = [{ label: 'A', title: input.title, text: input.text }, ...(input.extra || []).slice(0, 1).map((x) => ({ ...x, label: 'B' }))];
  const multi = wanted.length > 1;
  let core: FactCore | null = null; let coreError = 'unknown';
  const tCore = deps.now();
  for (let attempt = 1; attempt <= 2 && !core; attempt++) {
    const r = await llm({ fn: 'core', task: 'core', attempt, system: factCoreSystem({ multi }), user: factCoreUser({ title: input.title, text: input.text, extra: multi ? [wanted[1]] : undefined }), json: { name: 'fact_core', schema: factCoreSchema({ labels: wanted.map((w) => w.label) }) as unknown as Record<string, unknown> }, expectTokens: 6_000, deadlineAt: opts.deadlineAt });
    if (!r.ok) { coreError = `${r.kind || 'error'}: ${r.error || ''}`; if (r.kind === 'billing' || r.kind === 'auth' || r.kind === 'timeout') break; continue; }
    const p = parseFactCore(r.text);
    if (p.ok && p.core) core = p.core; else coreError = p.error || 'no usable core';
  }
  lap('core', tCore);
  if (!core) return { ok: false, stage: 'core', error: `fact core failed: ${coreError}`, fatal, ms };

  // The second account counts only if the research editor says it tells the same story.
  const sources: SourceText[] = multi && core.sameStory !== false ? wanted : [wanted[0]];
  const merged = sources.length > 1;
  if (multi) log(`[desk] second source ${merged ? 'merged' : 'dropped: not the same story'}`);

  // ── 2. relevance: the island must be in the story ───────────────────────────
  // The model's own core must not be able to create relevance by itself (it may echo a hint). With the evidence check on, the connection
  // has to come from the SOURCE: it names the island or a place of it, or it points at a passage that does and the outlet is Cypriot.
  let anchor: CyprusAnchor | undefined;
  let relevant: boolean;
  if (mode === 'enforce') {
    anchor = groundCyprus({ core, sources, originCyprus: input.originCyprus === true });
    relevant = anchor.grounded;
    log(`[desk] cyprus connection: ${anchor.grounded ? `${anchor.via} (${anchor.kind})` : 'none'}`);
  } else {
    relevant = core.cyprusAngle || core.district !== null || deps.hasCyprusTerms(`${input.title}\n${input.text}`);
  }
  if (opts.relevanceGate && !relevant) return { ok: false, skipped: 'off_topic', stage: 'relevance', error: 'OFF_TOPIC: no Cyprus angle', core, cyprus: anchor, ms };

  // ── 1b. every fact needs a passage of the source (checked by code) ──────────
  let verification: VerificationReport | undefined;
  if (mode !== 'off') {
    const tEv = deps.now();
    let v = verifyCore(core, sources, { mode });
    if (mode === 'enforce' && v.failed.length && left() > min.evidence) {
      // Once more, and only for what was not found: the editor is asked for the passage or for "none".
      const list = v.failed.slice(0, 40);
      const r = await llm({ fn: 'evidence', task: 'check', complexity: 'routine', system: evidenceRepairSystem(), user: evidenceRepairUser(sources, list), json: { name: 'passages', schema: EVIDENCE_REPAIR_SCHEMA as unknown as Record<string, unknown> }, expectTokens: 2_500, deadlineAt: opts.deadlineAt });
      if (r.ok) {
        const w = withRepairedEvidence(core, list, parseEvidenceRepair(r.text, parseJsonLoose));
        if (w.applied) v = verifyCore(w.core, sources, { mode, repaired: w.applied });
      }
    }
    core = anchor ? { ...v.core, cyprus: anchor } : v.core; verification = v.report;
    lap('evidence', tEv);
    log(`[desk] evidence (${mode}): facts ${v.report.confirmed.kept}/${v.report.confirmed.total} · claims ${v.report.claims.kept}/${v.report.claims.total} · quotes ${v.report.quotes.kept}/${v.report.quotes.total} · figures ${v.report.numbers.kept}/${v.report.numbers.total}${v.report.repaired ? ` · ${v.report.repaired} passage(s) supplied on the second ask` : ''}${v.report.dropped.length ? ` · dropped: ${v.report.dropped.slice(0, 3).map((d) => `${d.kind} “${d.text.slice(0, 50)}” (${d.reason})`).join('; ')}` : ''}`);
    if (mode === 'enforce' && !core.confirmed.length && !core.claims.length) {
      return { ok: false, stage: 'evidence', error: `evidence: no fact could be tied to a passage of the source (${v.report.dropped.slice(0, 2).map((d) => d.reason).join('; ') || 'nothing verifiable'})`, fatal, core, verification, ms };
    }
  }


  const type = effectiveArticleType(core, opts.srcWords ?? 0);
  const complexity = coreComplexity(core, type);
  const rendered = renderFactCore(core);
  const coreKey = `core-${hashKey(rendered)}`;
  // each edition gets its own preferred way in, from what the core really offers (see prompts.ts)
  const leadOptions = leadApproachesFor(type, {
    hasQuote: core.quotes.length > 0, hasFigure: core.numbers.length > 0, hasDate: core.dates.length > 0,
    hasPerson: core.entities.some((e) => e.kind === 'person' || e.kind === 'organisation'), hasPlace: core.entities.some((e) => e.kind === 'place') || core.district !== null,
  });
  const leadFor = (lang: Lang): LeadApproach | null => pickLead(coreKey, lang, leadOptions);
  const floor = Math.min(120, Math.max(50, core.confirmed.length * 12));
  log(`[desk] core ok: ${core.category}/${core.district || 'national'} type=${type} complexity=${complexity} facts=${core.confirmed.length} flags=${core.flags.join(',') || '-'}${merged ? ' sources=2' : ''}`);
  const all = sources.map((x) => `${x.title}\n${x.text}`).join('\n\n');
  // What the material itself names: the places an edition may name without it being an invention.
  const knownPlaces = `${all}\n${core.district || ''}`;

  // ── 3. seven independent native editions ────────────────────────────────────
  // The editions are written in the time that is left MINUS what sub-editing and the fact check need: a long think must never use up the
  // time of the checks (an unchecked article cannot be published). The reserve is capped at 30 % of what is left, for short windows.
  const composeDeadline = (): number => opts.deadlineAt - Math.min(min.edit + min.check, Math.floor(left() * 0.3));
  let pieces: readonly Exemplar[] = input.exemplars || [];
  if (!input.exemplars && deps.exemplars) { try { pieces = await deps.exemplars(core.category); } catch { pieces = []; } }
  const exemplarsFor = (lang: Lang): Exemplar[] => selectExemplars(pieces, { desk: core!.category, lang, articleType: type, seed: coreKey });
  const compose = async (lang: Lang, attempt: number, redo?: RedoBrief): Promise<Edition> => {
    const r = await llm({
      fn: `${redo ? 'rewrite' : 'compose'}-${lang}`, task: 'write', complexity: redo ? bump(complexity) : complexity, attempt,
      system: writerSystem({ lang, deskBrief: deps.deskBrief(core!.category), articleType: type, category: core!.category, exemplars: exemplarsFor(lang) }),
      user: writerUser({ lang, sourceTitle: input.title, factCore: rendered, lead: leadFor(lang), recent: input.recent?.[lang], redo }),
      json: { name: 'article', schema: COMPOSE_SCHEMA as unknown as Record<string, unknown> },
      expectTokens: composeTokens(type, lang), cacheKey: coreKey, deadlineAt: redo ? opts.deadlineAt : composeDeadline(),
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
      overlap: 0, fieldFindings: [], passes: { deOverlap: 0, edit: 0, fields: 0, repair: 0, rewrite: 0 },
    };
  };
  const tCompose = deps.now();
  const first = await Promise.all(ALL_LANGS.map((l) => compose(l, 1)));
  const editions = Object.fromEntries(ALL_LANGS.map((l, i) => [l, first[i]])) as Record<Lang, Edition>;
  const retry = ALL_LANGS.filter((l) => !editions[l].ok && left() > 45_000);
  if (retry.length) { const again = await Promise.all(retry.map((l) => compose(l, 2))); retry.forEach((l, i) => { if (again[i].ok) editions[l] = again[i]; }); }
  lap('compose', tCompose);
  if (!editions.en.ok) return { ok: false, stage: 'compose_en', error: `EN composition failed: ${editions.en.reason}`, fatal, core, articleType: type, complexity, editions, verification, cyprus: anchor, ms };
  const failed = ALL_LANGS.filter((l) => !editions[l].ok);
  if (failed.length) {
    return { ok: false, stage: `compose_${failed.join('+')}`, error: `Non-English editions failed: ${failed.map((l) => `${l.toUpperCase()}=${editions[l].reason}`).join(' · ')}`, fatal, core, articleType: type, complexity, editions, verification, cyprus: anchor, ms };
  }

  // ── 3b. how close is each edition to its source, in meaning and in order? ───
  // One request for the source and all seven editions. Without an embedding service the step is simply skipped.
  let srcSet: SentenceSet | null = null; let titleVec: number[] | null = null;
  const sameLang = (lang: Lang): boolean => lang === core!.sourceLang;
  const measure = async (langs: Lang[]): Promise<void> => {
    if (!deps.embed || left() < 15_000) return;
    const t = deps.now();
    const srcSents = srcSet ? [] : sources.flatMap((x) => sentencesFor(x.text, merged ? 40 : SEMANTIC.maxSourceSentences));
    const sets = langs.map((l) => sentencesFor(deps.sanitize.text(editions[l].content), SEMANTIC.maxEditionSentences));
    const texts = [...(srcSet ? [] : [input.title]), ...srcSents, ...sets.flat()];
    if (!texts.length) return;
    let vecs: number[][] | null = null;
    try { vecs = await deps.embed(texts); } catch { vecs = null; }
    if (!vecs || vecs.length !== texts.length) { log('[desk] meaning comparison not available'); return; }
    let at = 0;
    if (!srcSet) { titleVec = vecs[at++]; srcSet = { sents: srcSents, vecs: vecs.slice(at, at + srcSents.length) }; at += srcSents.length; }
    langs.forEach((l, i) => {
      const set: SentenceSet = { sents: sets[i], vecs: vecs!.slice(at, at + sets[i].length) }; at += sets[i].length;
      editions[l].semantic = compareToSource(srcSet!, set, { sameLang: sameLang(l), titleVec });
    });
    ms.semantic = (ms.semantic || 0) + (deps.now() - t);
  };
  await measure([...ALL_LANGS]);
  for (const l of ALL_LANGS) { const r = editions[l].semantic; if (r) log(`[desk] ${l} vs source: ${semanticSummary(r)}${r.copy || r.ledeCopy ? ' → TOO CLOSE' : ''}`); }

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
    /** A second try is only worth it when the figures are the core's own (nothing invented) and the new text is better by the test it was ordered for. */
    const cleanFigures = (cand: Edition): boolean => deps.inventedFigures(`${cand.title}\n${deps.sanitize.text(cand.content)}`, `${rendered}\n${all}`).length === 0;
    const take = (cand: Edition) => {
      ed.content = cand.content; ed.wc = cand.wc; ed.title = cand.title; ed.excerpt = cand.excerpt; ed.summary = cand.summary; ed.tags = cand.tags; ed.seoTitle = cand.seoTitle; ed.seoDesc = cand.seoDesc;
      ed.passes.rewrite++;
    };

    // 4a. originality: the same 5-word-run test as before, with a rewrite before refusal
    ed.overlap = deps.overlap(ed.content, input.text);
    if (ed.overlap > opts.overlapMax && left() > min.deOverlap) {
      const runs = deps.sharedRuns ? deps.sharedRuns(ed.content, input.text, 8) : [];
      const j = await llmJson({ fn: `deoverlap-${lang}`, task: 'edit', complexity, system: deOverlapSystem(lang), user: `SOURCE (do NOT reuse its wording):\n${input.text.slice(0, 6_000)}\n\n${runs.length ? `RUNS OF WORDS STILL SHARED WITH THE SOURCE (every one must be gone; say the same thing in other words and another order):\n${runs.map((x) => `- ${x}`).join('\n')}\n\n` : ''}ARTICLE TO REWRITE (${lang}):\n${ed.content}\n\nRewritten (JSON):`, json: { name: 'edit', schema: EDITORIAL_SCHEMA as unknown as Record<string, unknown> }, expectTokens: editTokens(), deadlineAt: opts.deadlineAt });
      const html = j ? deps.sanitize.html(asStr(j.content_html), lang) : '';
      if (html && html.length > ed.content.length * 0.7 && html.length < ed.content.length * 1.4) {
        const o2 = deps.overlap(html, input.text);
        if (o2 < ed.overlap) { ed.content = html; ed.wc = deps.sanitize.words(html); ed.overlap = o2; ed.passes.deOverlap++; log(`[desk] ${lang} de-overlap -> ${(o2 * 100).toFixed(1)}%`); await measure([lang]); }
      }
    }
    if (ed.overlap > opts.overlapMax && escalate && left() > min.escalate) {
      // Patching words did not help: the core's phrasing leaked. Write the edition again from the facts.
      const runs = deps.sharedRuns ? deps.sharedRuns(ed.content, input.text, 6) : [];
      const cand = await compose(lang, 2, { reasons: [`it still shares ${(ed.overlap * 100).toFixed(1)}% of its word runs with the original${runs.length ? `, for example: “${runs.slice(0, 4).join('”, “')}”` : ''}; use none of the original's phrasing`] });
      if (cand.ok) {
        const o2 = deps.overlap(cand.content, input.text);
        if (o2 < ed.overlap && cleanFigures(cand)) { take(cand); ed.overlap = o2; log(`[desk] ${lang} rewritten from the core after the originality gate -> ${(o2 * 100).toFixed(1)}%`); await measure([lang]); }
      }
    }
    if (ed.overlap > opts.overlapMax) { ed.ok = false; ed.reason = `plagiarism gate: ${(ed.overlap * 100).toFixed(1)}% source overlap`; return; }

    // 4a'. the same sentences in the same order as the original? Then it is a paraphrase of the original, not a report from the facts.
    {
      const r = ed.semantic;
      if (r && (r.copy || r.ledeCopy) && escalate && left() > min.escalate) {
        const cand = await compose(lang, 2, { reasons: semanticReasons(r), structure: true });
        if (cand.ok && cleanFigures(cand)) {
          const keep = ed.semantic;
          const saved = { content: ed.content, wc: ed.wc, title: ed.title, excerpt: ed.excerpt, summary: ed.summary, tags: ed.tags, seoTitle: ed.seoTitle, seoDesc: ed.seoDesc };
          take(cand); ed.overlap = deps.overlap(ed.content, input.text);
          await measure([lang]);
          const r2 = ed.semantic;
          const better = !!r2 && !(r2.copy || r2.ledeCopy) || (!!r2 && !!keep && r2.close < keep.close - 0.1);
          if (better && ed.overlap <= opts.overlapMax) log(`[desk] ${lang} rewritten from the core after the comparison with the source: ${r2 ? semanticSummary(r2) : ''}`);
          else { Object.assign(ed, saved); ed.semantic = keep; ed.passes.rewrite--; ed.overlap = deps.overlap(ed.content, input.text); log(`[desk] ${lang} second try was not better; kept the first`); }
        }
      }
    }

    // 4b. a generic English headline is replaced
    const generic = deps.titleIsGeneric;
    if (lang === 'en' && generic && generic(ed.title) && left() > 20_000) {
      const j = await llmJson<{ title?: string }>({ fn: 'title-en', task: 'short', complexity, system: `${HOUSE_VOICE}\n\nThe headline "${ed.title}" was rejected as generic. Write ONE new English headline from the facts below.\n${TITLE_CRAFT.en}\nUnder 90 characters, sentence case. JSON: {"title":"..."}`, user: `FACTS:\n${rendered.slice(0, 1_800)}\n\nNew headline (JSON):`, json: { name: 'title', schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false } }, expectTokens: 200, deadlineAt: opts.deadlineAt });
      const t = j ? deps.sanitize.title(asStr(j.title), 'en') : '';
      if (t.length >= 8 && t.length <= 120 && !generic(t)) ed.title = t;
    }

    // 4c. the voice engine judges the body; the sub-editor works from the findings, never from a quota
    let a = await judge(ed.content, lang, ctx());
    const editLoop = async (passes: number): Promise<void> => {
      for (let pass = 1; pass <= passes && !a.ok && !a.unavailable && left() > min.edit; pass++) {
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
    };
    await editLoop(opts.maxEditPasses);

    // 4c'. still failing after the editing passes: write it again from the core, with what failed as the list of things not to do
    if (escalate && !a.ok && !a.unavailable && ed.passes.rewrite === 0 && left() > min.escalate) {
      const reasons = a.tells.slice(0, 8).map((t) => `${t.label || t.key}${t.count && t.count > 1 ? ` ×${t.count}` : ''}${t.sample ? ` (“${String(t.sample).replace(/\s+/g, ' ').slice(0, 90)}”)` : ''}`);
      const cand = await compose(lang, 2, { reasons: reasons.length ? reasons : [`the style check scored it ${a.score}`] });
      if (cand.ok && cleanFigures(cand)) {
        const o2 = deps.overlap(cand.content, input.text);
        const a2 = await judge(cand.content, lang, { title: cand.title, category: core!.category, articleType: type });
        if (!a2.unavailable && o2 <= opts.overlapMax && (a2.ok || isImprovement(a, a2))) {
          take(cand); ed.overlap = o2; a = a2;
          log(`[desk] ${lang} rewritten from the core after the editing passes: style ${a2.score}`);
          await measure([lang]);
          await editLoop(1);
        } else log(`[desk] ${lang} second try was not better (${a2.unavailable ? 'unavailable' : a2.score} vs ${a.score}); kept the first`);
      }
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
    const guardIssues = (): FactIssue[] => {
      if (mode !== 'enforce' || !anchor) return [];
      return inventedCyprusMentions(`${ed.title}. ${deps.sanitize.text(ed.content)}`, knownPlaces, anchor.grounded).map((m) => ({
        severity: 'high' as const, kind: 'invented_cyprus_link' as const, excerpt: m.sentence.slice(0, 140),
        problem: `The edition names ${m.label}, which neither the source nor the fact core does.`, coreRef: 'none', fix: 'delete' as const, correction: '',
      }));
    };
    const runCheck = async (): Promise<FactCheck | null> => {
      const j = await llm({ fn: `factcheck-${lang}`, task: 'check', complexity, system: factCheckSystem(lang), user: factCheckUser({ factCore: rendered, sourceExcerpt: input.text, title: ed.title, bodyText: deps.sanitize.text(ed.content) }), json: { name: 'fact_check', schema: FACT_CHECK_SCHEMA as unknown as Record<string, unknown> }, expectTokens: 1_200, deadlineAt: opts.deadlineAt });
      if (!j.ok) return null;
      const p = parseFactCheck(j.text);
      if (!(p.ok && p.check)) return null;
      const extra = guardIssues();
      return extra.length ? { verdict: 'fix', issues: [...p.check.issues, ...extra].slice(0, 30) } : p.check;
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
    const sm = ed.semantic;
    if (sm && (sm.copy || sm.ledeCopy)) reasons.push(`${tag}: too close to the original in meaning and order (${semanticSummary(sm)})`);
    if (ed.passes.rewrite) warnings.push(`${tag}: written again from the fact core`);
  }
  if (verification && verification.dropped.length >= 3) warnings.push(`evidence: ${verification.dropped.length} item(s) of the core had no passage in the source and were left out`);
  ms.total = deps.now() - t0;
  return { ok: true, fatal, core, articleType: type, complexity, editions, gate: { publishable: reasons.length === 0, reasons, warnings }, verification, cyprus: anchor, merged, ms };
}
