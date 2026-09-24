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
import { craftBlock, antiAiRules, deAiScrub, lintAiTells, polishSystem } from '@/lib/editorial/craft';

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
  const title = deAiScrub(typeof j.title === 'string' ? j.title.trim() : '');
  const bodyMd = deAiScrub(typeof j.body_md === 'string' ? j.body_md.trim() : '');
  if (!bodyMd) return { title, bodyMd: '', error: 'Could not parse a draft body from the model response.' };
  return { title, bodyMd };
}

// ── 3. translate: render an edition into a target locale ─────────────────────────
export interface TranslateResult {
  title: string;
  body: string;
  error?: string;
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
  const outTitle = deAiScrub(typeof j.title === 'string' ? j.title.trim() : '');
  const outBody = deAiScrub(typeof j.body === 'string' ? j.body.trim() : '');
  if (!outBody) return { title: outTitle, body: '', error: 'Could not parse a translation from the model response.' };
  return { title: outTitle, body: outBody };
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
  const outTitle = deAiScrub(typeof j.title === 'string' && j.title.trim() ? j.title.trim() : title);
  const outBody = deAiScrub(typeof j.body_md === 'string' ? j.body_md.trim() : '');
  if (!outBody) return { title: outTitle, bodyMd: '', tellsBefore, tellsAfter: tellsBefore, error: 'Could not parse the polished body from the model response.' };
  return { title: outTitle, bodyMd: outBody, tellsBefore, tellsAfter: lintAiTells(`${outTitle}\n${outBody}`) };
}
