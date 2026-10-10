// lib/journalism/checks.ts — the deterministic checks the article desk hands to the pipeline, built on the voice engine's guards.
// Pure. One implementation for the app and the Supabase edge function (generated copy).
import { overlapProse, overlapRuns, checkFacts } from '@/lib/voice/guards';

/** Share (0-1) of the output's 5-word runs that also occur in the source. Quotations of eight words or more are left out on both sides. */
export function overlapRatio(outputHtml: string, source: string): number {
  return overlapProse(source, outputHtml).ratio;
}

/** true when a rewrite kept every figure and quotation of the text it was made from, and added none (same language). */
export function factsKept(before: string, after: string, lang: string): boolean {
  const r = checkFacts(before, after, { sameLanguage: true, lang });
  return r.invented.length === 0 && r.droppedSample.length === 0 && r.changedQuotes.length === 0 && r.newNames.length === 0;
}

/** Figures in `text` that occur nowhere in `allowed` (single digits and 10 do not count). */
export function inventedFigures(text: string, allowed: string): string[] {
  return checkFacts(allowed, text, { sameLanguage: false }).invented;
}

/** The runs of words (five or more) that the output still shares with the source, longest first. */
export function sharedRuns(outputHtml: string, source: string, max = 8): string[] {
  return overlapRuns(source, outputHtml, max);
}
