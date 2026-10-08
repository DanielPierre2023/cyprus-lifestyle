// lib/voice/revise.ts — the loop: judge, rewrite what fails, judge again, keep the best honest version.
// Pure apart from the injected model call (so it is unit-tested with a fake model; the runner passes callAI).
//
// Design decisions and their consequences:
//  • Mechanical clean first (dashes, known phrases): free, deterministic, and often enough for the surface tells, so the
//    paid model call is skipped whenever the text already passes. Consequence: a piece that is already good costs nothing.
//  • A candidate is accepted only if (a) the facts guard passes (no invented figure, quotations verbatim, figures kept),
//    (b) for sourced input the originality guard passes, (c) the format survived, (d) it scores better than what we hold.
//    Consequence: the loop can never make an article worse or less true; at worst it returns the input unchanged.
//  • The best candidate is carried to the next pass (progressive repair), and the loop stops at the first pass that clears the
//    gate, at maxPasses, or when the time budget is spent (Vercel allows 60 s per request).
//  • It never lengthens a text: length follows the facts, and added words would mean invented content (a rewrite more than 30% longer is rejected).
import { humanizeHtml, humanizeText, type Lang } from '@/lib/antiAi';
import { parseAiJson } from '@/lib/ai';
import { deAiScrub } from '@/lib/editorial/craft';
import { scoreVoice, asLang, type VoiceReport } from '@/lib/voice/score';
import { checkFacts, overlap, type FactsReport, type OverlapReport } from '@/lib/voice/guards';
import { judge, MAX_OVERLAP, MAX_RUN, type GateVerdict } from '@/lib/voice/gate';
import { voiceSystem, reviseUser } from '@/lib/voice/prompt';
import type { Desk } from '@/lib/voice/desks';

export interface ModelReply { text?: string; error?: string }
/** `pass` is the number of the rewrite pass (1 = first): a later pass is a harder case and may think harder. */
export type CallModel = (system: string, user: string, pass?: number) => Promise<ModelReply>;

export interface ReviseInput {
  title: string; body: string; lang: string; desk: Desk;
  /** External source text (a scraped article): enables the originality guard and is the fact baseline. */
  source?: string | null;
  callModel: CallModel;
  maxPasses?: number;
  budgetMs?: number;
  now?: () => number;
}

export interface ReviseResult {
  title: string; body: string;
  changed: boolean;
  before: VoiceReport; after: VoiceReport;
  verdict: GateVerdict;
  overlap: OverlapReport | null; facts: FactsReport | null;
  passes: number;
  log: string[];
}

export const isHtmlBody = (s: string): boolean => /<\/?(?:p|div|h[1-6]|ul|ol|li|a|strong|em|b|i|br|blockquote|figure|img|span|section|article)\b/i.test(String(s || ''));

/** Deterministic clean in the right mode (HTML-aware for HTML). Idempotent. */
export function mechanicalClean(body: string, lang: Lang): string {
  const h = isHtmlBody(body) ? humanizeHtml(body, lang) : humanizeText(body, lang);
  return deAiScrub(h);
}

const stripFences = (s: string) => s.replace(/^\s*```(?:html|markdown|md)?\s*/i, '').replace(/\s*```\s*$/i, '');

export async function reviseToStandard(inp: ReviseInput): Promise<ReviseResult> {
  const lang = asLang(inp.lang);
  const now = inp.now || Date.now;
  const t0 = now();
  const budget = inp.budgetMs ?? 45_000;
  const maxPasses = inp.maxPasses ?? 2;
  const html = isHtmlBody(inp.body);
  const factBase = inp.source && inp.source.trim() ? inp.source : inp.body;     // what the rewrite must stay true to
  const external = !!(inp.source && inp.source.trim());                          // originality only against an outside source
  const log: string[] = [];

  const evaluate = (title: string, body: string) => {
    const report = scoreVoice({ title, body, lang, desk: inp.desk });
    const ov = external ? overlap(inp.source as string, body) : null;
    const facts = checkFacts(factBase, body, { sameLanguage: true, lang });
    return { report, ov, facts, verdict: judge({ report, overlap: ov, facts }) };
  };

  const before = evaluate(inp.title, inp.body).report;
  let best = { title: inp.title, body: inp.body, ...evaluate(inp.title, inp.body) };
  log.push(`start: score ${best.report.score}`);

  // 1. mechanical clean (free).
  const cleaned = mechanicalClean(inp.body, lang);
  if (cleaned !== inp.body) {
    const ev = evaluate(inp.title, cleaned);
    if (ev.facts.ok && ev.report.score <= best.report.score) { best = { title: inp.title, body: cleaned, ...ev }; log.push(`mechanical clean: score ${ev.report.score}`); }
  }

  // 2. model passes until the gate is cleared.
  let passes = 0;
  const tooClose = (ov: OverlapReport | null) => !!ov && (ov.ratio > MAX_OVERLAP || ov.longestRun > MAX_RUN);
  while ((!best.verdict.voiceOk || tooClose(best.ov)) && passes < maxPasses && now() - t0 < budget) {
    passes++;
    const reply = await inp.callModel(
      voiceSystem({ lang, desk: inp.desk, pass: passes }),
      reviseUser({
        title: best.title, body: best.body, tells: best.report.tells, issues: best.report.issues, pass: passes,
        notes: tooClose(best.ov) ? [`Your wording is too close to the source article (${Math.round((best.ov?.ratio ?? 0) * 100)}% shared five-word runs, longest copied run ${best.ov?.longestRun} words). Re-report every paragraph in entirely new sentences and a new order of presentation; keep only the facts.`] : [],
      }),
      passes,
    );
    if (reply.error || !reply.text) { log.push(`pass ${passes}: model error ${reply.error || 'empty reply'}`); break; }
    const parsed = parseAiJson<{ title?: string; body?: string; body_html?: string; content_html?: string }>(reply.text);
    const rawBody = stripFences(String(parsed.body ?? parsed.body_html ?? parsed.content_html ?? ''));
    if (!rawBody.trim()) { log.push(`pass ${passes}: unparseable reply`); continue; }
    const candBody = mechanicalClean(rawBody, lang);
    const candTitle = mechanicalClean(String(parsed.title || best.title), lang).replace(/<[^>]+>/g, '').trim() || best.title;

    // Guards on the candidate.
    const ratio = candBody.length / Math.max(1, best.body.length);
    if (ratio < 0.6 || ratio > 1.3) { log.push(`pass ${passes}: rejected, length changed ×${ratio.toFixed(2)}`); continue; }
    if (html && !isHtmlBody(candBody)) { log.push(`pass ${passes}: rejected, HTML structure lost`); continue; }
    const ev = evaluate(candTitle, candBody);
    if (!ev.facts.ok) { log.push(`pass ${passes}: rejected, ${ev.facts.reasons.join('; ')}`); continue; }
    if (ev.ov && tooClose(ev.ov) && ev.ov.ratio >= (best.ov?.ratio ?? 1)) { log.push(`pass ${passes}: rejected, no closer to original than before (${Math.round(ev.ov.ratio * 100)}% shared with the source)`); continue; }
    if (ev.report.score >= best.report.score && best.report.score > 0 && !tooClose(best.ov)) { log.push(`pass ${passes}: no improvement (${ev.report.score} vs ${best.report.score})`); continue; }
    best = { title: candTitle, body: candBody, ...ev };
    log.push(`pass ${passes}: score ${ev.report.score}`);
  }

  const changed = best.body !== inp.body || best.title !== inp.title;
  return { title: best.title, body: best.body, changed, before, after: best.report, verdict: best.verdict, overlap: best.ov, facts: best.facts, passes, log };
}
