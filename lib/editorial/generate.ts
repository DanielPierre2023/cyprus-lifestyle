// lib/editorial/generate.ts
// ============================================================================
// EDITORIAL PIPELINE — the server-only I/O layer.
// ----------------------------------------------------------------------------
// Wraps lib/ai around the PURE prompt builders in lib/editorial/pipeline.ts to do
// the three model-backed steps of the pipeline: research a dossier, draft the piece,
// and translate it into another edition. Grounding for the dossier comes from the
// subject listing (passed in) plus the knowledge base (lib/knowledge/qa.ts), so the
// briefing stays factual. Every function degrades gracefully — on any model or parse
// failure it returns an `error` string and empty content, never throwing — mirroring
// the concierge enrichment routes.
// ============================================================================
import 'server-only';
import { callClaude, CLAUDE_SONNET, CLAUDE_HAIKU, parseAiJson } from '@/lib/ai';
import { retrieveKnowledge, compactForConcierge } from '@/lib/knowledge/qa';
import {
  dossierPrompt, draftPrompt, translatePrompt,
  LOCALE_NAMES, isLocale,
  type PipelineSubject, type PieceKind,
} from '@/lib/editorial/pipeline';
import { craftBlock, antiAiRules, deAiScrub, lintAiTells, polishSystem, transcreateSystem, stripHtml } from '@/lib/editorial/craft';
import { humanizeText, humanizeHtml, scoreAiTells, type Lang } from '@/lib/antiAi';
import {
  packageSystem, packageUser, translatePackageSystem, translatePackageUser,
  coercePackage, fillPackage, clampText, SEO,
  type PackageFields,
} from '@/lib/editorial/seo';

// ── grounding ─────────────────────────────────────────────────────────────────
// A compact block of relevant knowledge-base intents, so the dossier is anchored in
// what Cyprus Lifestyle actually knows about the subject's world (its category,
// district and the practical questions readers ask around it).
function groundingFor(subject: PipelineSubject): string {
  const query = [subject.name, subject.category, subject.district, subject.summary]
    .filter(Boolean).join(' ');
  const hits = compactForConcierge(retrieveKnowledge(query, 5));
  if (!hits.length) return '';
  const lines = hits.map((h) => `• ${h.q}\n  ${h.a}`);
  return `GROUNDED KNOWLEDGE (from the Cyprus Lifestyle knowledge base — use for context, do not contradict):\n${lines.join('\n')}`;
}

// ── humanisation gate ───────────────────────────────────────────────────────────
// The deterministic anti-AI layer, applied to every generated/translated body and
// title in its own language. The antiAi humaniser (per-language dash stripping +
// AI-lexicon/filler scrubbing) is the PRIMARY layer; deAiScrub stays as a final
// mechanical safety net. Together they guarantee no edition ships with the obvious
// machine tells, even when the model slips.
const HUMANISER_LANGS: ReadonlySet<string> = new Set(['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru']);

// Narrow a locale code to the antiAi Lang. The seven editions map 1:1 to Lang;
// anything unexpected falls back to English so the humaniser never throws.
function toLang(locale?: string | null): Lang {
  const l = String(locale || '').toLowerCase();
  return (HUMANISER_LANGS.has(l) ? l : 'en') as Lang;
}

// Does a body carry HTML markup (vs markdown/plain)? Picks humanizeHtml vs humanizeText.
function isHtmlBody(s: string): boolean {
  return /<\/?(?:p|div|h[1-6]|ul|ol|li|a|strong|em|b|i|br|blockquote|figure|img|span|section|article)\b/i.test(String(s || ''));
}

// Humanise a body in the right mode (HTML-aware for HTML, text for markdown/plain),
// then run deAiScrub as the deterministic safety net.
function humaniseBody(body: string, lang: Lang): string {
  const s = String(body || '');
  if (!s.trim()) return '';
  const humanised = isHtmlBody(s) ? humanizeHtml(s, lang) : humanizeText(s, lang);
  return deAiScrub(humanised);
}

// Humanise a title (always plain text), then the deterministic safety net.
function humaniseTitle(title: string, lang: Lang): string {
  return deAiScrub(humanizeText(String(title || ''), lang));
}

// ── 1. dossier: briefing + tailored interview questions ─────────────────────────
export interface DossierResult {
  briefing: string;
  questions: string[];
  error?: string;
}

export async function generateDossier(subject: PipelineSubject): Promise<DossierResult> {
  if (!subject || !subject.name) return { briefing: '', questions: [], error: 'A subject with a name is required.' };
  const grounding = groundingFor(subject);
  const userMessage = [
    grounding,
    grounding ? '' : null,
    `Prepare the interview dossier for "${subject.name}" now.`,
  ].filter((x) => x !== null).join('\n').trim();

  const r = await callClaude({
    systemInstruction: dossierPrompt(subject),
    userMessage,
    model: CLAUDE_SONNET,
    jsonMode: true,
    maxTokens: 2400,
    timeoutMs: 60_000,
    fn: 'editorial-dossier',
  });
  if (r.error || !r.text) return { briefing: '', questions: [], error: r.error || 'No response from the model.' };

  const j = parseAiJson<{ briefing?: string; questions?: unknown }>(r.text);
  const briefing = typeof j.briefing === 'string' ? j.briefing.trim() : '';
  const questions = Array.isArray(j.questions)
    ? j.questions.map((q) => String(q ?? '').trim()).filter(Boolean)
    : [];
  if (!briefing && !questions.length) return { briefing: '', questions: [], error: 'Could not parse a dossier from the model response.' };
  return { briefing, questions };
}

// ── 2. draft: house-voice article body (markdown) ───────────────────────────────
export interface DraftInput {
  kind: PieceKind;
  franchise: string;
  notes?: string;                 // dossier text, transcript and/or editor's notes
  subject: PipelineSubject;
}
export interface DraftResult {
  title: string;
  bodyMd: string;
  error?: string;
}

export async function draftPiece(input: DraftInput): Promise<DraftResult> {
  if (!input || !input.subject?.name) return { title: '', bodyMd: '', error: 'A subject with a name is required.' };
  const r = await callClaude({
    // The base commission prompt PLUS the House Book: this franchise's redactional
    // format, the craft standard, and the anti-AI-detection rules.
    systemInstruction: draftPrompt(input.kind, input.franchise, input.notes || '', input.subject)
      + '\n\n' + craftBlock(input.franchise, input.kind, 'English'),
    userMessage: `Write the ${input.kind} for "${input.subject.name}" now.`,
    model: CLAUDE_SONNET,
    jsonMode: true,
    maxTokens: 4096,
    timeoutMs: 90_000,
    fn: 'editorial-draft',
  });
  if (r.error || !r.text) return { title: '', bodyMd: '', error: r.error || 'No response from the model.' };

  const j = parseAiJson<{ title?: string; body_md?: string }>(r.text);
  // Source edition is English; humanise in English (markdown body → humanizeText).
  const title = humaniseTitle(typeof j.title === 'string' ? j.title.trim() : '', 'en');
  const bodyMd = humaniseBody(typeof j.body_md === 'string' ? j.body_md.trim() : '', 'en');
  if (!bodyMd) return { title, bodyMd: '', error: 'Could not parse a draft body from the model response.' };
  return { title, bodyMd };
}

// ── 3. translate: render an edition into a target locale ─────────────────────────
export interface TranslateResult {
  title: string;
  body: string;
  error?: string;
  // AI-tell score of the humanised output, in the target language (optional, additive):
  // score 0 (clean) … 100 (very AI), with the level band and the detected tells, so a
  // caller can gate/flag an edition that still reads machine-made.
  score?: number;
  level?: 'clean' | 'low' | 'medium' | 'high';
  tells?: ReturnType<typeof scoreAiTells>['tells'];
}

// bodyMd is the source body (markdown or HTML — the prompt preserves whatever format
// it receives). CLAUDE_HAIKU keeps the seven-edition loop fast and cheap.
export async function translatePiece(
  title: string,
  bodyMd: string,
  targetLocale: string,
): Promise<TranslateResult> {
  const body0 = String(bodyMd || '');
  if (!body0.trim()) return { title: '', body: '', error: 'Nothing to translate (empty body).' };
  const langName = isLocale(targetLocale) ? LOCALE_NAMES[targetLocale] : targetLocale;
  const r = await callClaude({
    // Translate faithfully, but render it as a native journalist would AND keep the
    // anti-AI rules in the target language (so no edition reads as machine-made).
    systemInstruction: translatePrompt(targetLocale) + '\n\n' + antiAiRules(langName),
    userMessage: `TITLE:\n${String(title || '').trim()}\n\nBODY:\n${body0}`,
    model: CLAUDE_HAIKU,
    jsonMode: true,
    maxTokens: 4096,
    timeoutMs: 90_000,
    fn: 'editorial-translate',
  });
  if (r.error || !r.text) return { title: '', body: '', error: r.error || 'No response from the model.' };

  const j = parseAiJson<{ title?: string; body?: string }>(r.text);
  // Humanise the output in the TARGET language (per-language lexicon + fillers), then
  // score what remains so callers can see how machine-made the edition still reads.
  const lang = toLang(targetLocale);
  const outTitle = humaniseTitle(typeof j.title === 'string' ? j.title.trim() : '', lang);
  const outBody = humaniseBody(typeof j.body === 'string' ? j.body.trim() : '', lang);
  if (!outBody) return { title: outTitle, body: '', error: 'Could not parse a translation from the model response.' };
  const sc = scoreAiTells({ title: outTitle, content: stripHtml(outBody), lang });
  return { title: outTitle, body: outBody, score: sc.score, level: sc.level, tells: sc.tells };
}

// ── 3b. transcreate: re-report an edition natively (kills translationese) ─────────
// An additive, higher-quality alternative to a straight translation for the six
// non-English editions. Instead of translating, it re-reports the piece AS A NATIVE
// writer of the target language: every fact and the section structure are kept, but
// the prose is rebuilt in that language's own rhythm, so no edition reads as an
// English calque. CLAUDE_SONNET (not Haiku) because this is a craft pass, not a
// mechanical render. Additive by design — the translate route can adopt it in place
// of, or after, translatePiece without any other change.
export interface TranscreateResult {
  title: string;
  body: string;
  error?: string;
  score?: number;
  level?: 'clean' | 'low' | 'medium' | 'high';
}

export async function transcreatePiece(
  title: string,
  bodyMd: string,
  targetLocale: string,
): Promise<TranscreateResult> {
  const body0 = String(bodyMd || '');
  if (!body0.trim()) return { title: '', body: '', error: 'Nothing to transcreate (empty body).' };
  const langName = isLocale(targetLocale) ? LOCALE_NAMES[targetLocale] : targetLocale;
  const lang = toLang(targetLocale);
  const r = await callClaude({
    // Re-report natively; transcreateSystem embeds antiAiRules (+ the burstiness block).
    systemInstruction: transcreateSystem(langName),
    userMessage: `TITLE:\n${String(title || '').trim()}\n\nBODY:\n${body0}`,
    model: CLAUDE_SONNET,
    jsonMode: true,
    maxTokens: 4096,
    timeoutMs: 90_000,
    fn: 'editorial-transcreate',
  });
  if (r.error || !r.text) return { title: '', body: '', error: r.error || 'No response from the model.' };

  const j = parseAiJson<{ title?: string; body?: string }>(r.text);
  const outTitle = humaniseTitle(typeof j.title === 'string' ? j.title.trim() : '', lang);
  const outBody = humaniseBody(typeof j.body === 'string' ? j.body.trim() : '', lang);
  if (!outBody) return { title: outTitle, body: '', error: 'Could not parse a transcreation from the model response.' };
  const sc = scoreAiTells({ title: outTitle, content: stripHtml(outBody), lang });
  return { title: outTitle, body: outBody, score: sc.score, level: sc.level };
}

// ── 4. polish: elevate an existing draft to the standard + strip every AI tell ───
// A dedicated editing pass (the pipeline's 'editing' stage). It scores the draft for
// AI tells, tells the model exactly what to remove, rewrites to the franchise format
// and craft standard, then applies the deterministic scrub as a final guarantee.
export interface PolishResult {
  title: string;
  bodyMd: string;
  tellsBefore: string[];
  tellsAfter: string[];
  error?: string;
  // AI-tell score of the humanised, polished output (optional, additive).
  score?: number;
  level?: 'clean' | 'low' | 'medium' | 'high';
}

export async function polishPiece(
  title: string,
  bodyMd: string,
  franchise: string | null,
  kind: PieceKind,
  locale = 'en',
): Promise<PolishResult> {
  const body0 = String(bodyMd || '');
  if (!body0.trim()) return { title: '', bodyMd: '', tellsBefore: [], tellsAfter: [], error: 'Nothing to polish (empty body).' };
  const langName = isLocale(locale) ? LOCALE_NAMES[locale] : 'English';
  const tellsBefore = lintAiTells(`${title}\n${body0}`);

  const r = await callClaude({
    systemInstruction: polishSystem(franchise, kind, tellsBefore, langName),
    userMessage: `TITLE:\n${String(title || '').trim()}\n\nBODY:\n${body0}`,
    model: CLAUDE_SONNET,
    jsonMode: true,
    maxTokens: 4096,
    timeoutMs: 90_000,
    fn: 'editorial-polish',
  });
  if (r.error || !r.text) return { title: '', bodyMd: '', tellsBefore, tellsAfter: tellsBefore, error: r.error || 'No response from the model.' };

  const j = parseAiJson<{ title?: string; body_md?: string }>(r.text);
  // Humanise the rewrite for the given locale, then recompute the tells and the score.
  const lang = toLang(locale);
  const outTitle = humaniseTitle(typeof j.title === 'string' && j.title.trim() ? j.title.trim() : title, lang);
  const outBody = humaniseBody(typeof j.body_md === 'string' ? j.body_md.trim() : '', lang);
  if (!outBody) return { title: outTitle, bodyMd: '', tellsBefore, tellsAfter: tellsBefore, error: 'Could not parse the polished body from the model response.' };
  const tellsAfter = lintAiTells(`${outTitle}\n${outBody}`);
  const sc = scoreAiTells({ title: outTitle, content: stripHtml(outBody), lang });
  return { title: outTitle, bodyMd: outBody, tellsBefore, tellsAfter, score: sc.score, level: sc.level };
}

// ── 5. package: the SEO + editorial package for one edition ───────────────────────
// From a finished title + body, produce the standfirst (excerpt), the card/search
// summary, the SEO title + meta description, tags, and FAQ — in the source language.
// Haiku keeps it cheap; every text field is de-AI-scrubbed and length-clamped, and a
// deterministic fallback guarantees no field is ever left empty.
export interface PackageInput {
  title: string;
  body: string;                 // markdown or HTML
  locale?: string;              // source locale (for language + anti-AI rules)
  category?: string | null;
  place?: string | null;        // district, e.g. 'Limassol'
  franchise?: string | null;
  kind?: string | null;
}
export interface PackageResult extends PackageFields { error?: string }

function scrubClampPackage(p: PackageFields): PackageFields {
  return {
    seoTitle: clampText(deAiScrub(p.seoTitle), SEO.titleMax),
    seoDescription: clampText(deAiScrub(p.seoDescription), SEO.descMax),
    excerpt: clampText(deAiScrub(p.excerpt), SEO.excerptMax),
    summary: clampText(deAiScrub(p.summary), SEO.summaryMax),
    tags: p.tags,
    faq: p.faq.map((f) => ({ q: deAiScrub(f.q), a: clampText(deAiScrub(f.a), 320) })),
  };
}

export async function packagePiece(input: PackageInput): Promise<PackageResult> {
  const title = String(input.title || '').trim();
  const body = String(input.body || '');
  if (!title && !body.trim()) {
    return { seoTitle: '', seoDescription: '', excerpt: '', summary: '', tags: [], faq: [], error: 'Nothing to package (no title or body).' };
  }
  const locale = input.locale && isLocale(input.locale) ? input.locale : 'en';
  const langName = isLocale(locale) ? LOCALE_NAMES[locale] : 'English';

  const r = await callClaude({
    systemInstruction: packageSystem({
      langName, category: input.category ?? null, place: input.place ?? null,
      franchise: input.franchise ?? null, kind: input.kind ?? null,
    }) + '\n\n' + antiAiRules(langName),
    userMessage: packageUser(title, body),
    model: CLAUDE_HAIKU,
    jsonMode: true,
    maxTokens: 1200,
    timeoutMs: 45_000,
    fn: 'editorial-package',
  });
  if (r.error || !r.text) {
    // Degrade to the deterministic package rather than leaving fields empty.
    return { ...fillPackage({}, title, body), error: r.error || 'No response from the model.' };
  }
  const parsed = scrubClampPackage(coercePackage(parseAiJson(r.text)));
  return fillPackage(parsed, title, body);
}

// ── 6. translate the package into a target edition ───────────────────────────────
// Translates/localises an existing package (from the source language) into a target
// locale, enforcing the SEO length budgets in that language. Any field the model
// leaves empty falls back to the source value (better than blank).
export async function translatePackage(pkg: PackageFields, targetLocale: string): Promise<PackageResult> {
  const langName = isLocale(targetLocale) ? LOCALE_NAMES[targetLocale] : targetLocale;
  const r = await callClaude({
    systemInstruction: translatePackageSystem(langName) + '\n\n' + antiAiRules(langName),
    userMessage: translatePackageUser(pkg),
    model: CLAUDE_HAIKU,
    jsonMode: true,
    maxTokens: 1200,
    timeoutMs: 45_000,
    fn: 'editorial-translate-package',
  });
  if (r.error || !r.text) return { ...pkg, error: r.error || 'No response from the model.' };
  const t = scrubClampPackage(coercePackage(parseAiJson(r.text)));
  // Per-field fallback to the source package so a partial translation is never blank.
  return {
    seoTitle: t.seoTitle || pkg.seoTitle,
    seoDescription: t.seoDescription || pkg.seoDescription,
    excerpt: t.excerpt || pkg.excerpt,
    summary: t.summary || pkg.summary,
    tags: t.tags.length ? t.tags : pkg.tags,
    faq: t.faq.length ? t.faq : pkg.faq,
  };
}
