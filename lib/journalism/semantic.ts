// lib/journalism/semantic.ts — how close is an edition to its source in MEANING and in ORDER? Pure (imports ./embeddings and ./sentences).
// Shared by the Supabase edge function (generated copy) and the app.
//
// The 5-word-run test (lib/voice/guards.ts) catches copied wording and nothing else: a sentence-by-sentence paraphrase shares no five
// words with its original, and an edition in another language shares none at all. Two honest texts about the same facts will have
// sentences that mean the same; what an independent text does NOT have is the same sentences in the same order. The desk therefore
// measures both:
//   close   the share of the edition's sentences whose best match in the source is nearly the same meaning;
//   tau     the order agreement of those matches (Kendall: +1 = the edition walks through the source in its own order, 0 = unrelated order);
//   lede    how close the edition's first sentence is to the source's opening (title and first three sentences).
// An edition is "a copy in structure" when most of its sentences have a close match AND they follow the source's order. That is a
// paraphrase of the original, not a report from the facts, and it is sent back for a rewrite from the fact core.
//
// The thresholds are deliberately cautious (they should rarely fire on honest work); every measurement is logged with the article so
// that they can be tuned against real runs.
import { cosine } from './embeddings';
import { splitSentences, substantive } from './sentences';

export interface Thresholds { closeAt: number; ledeAt: number }
/** Same language: paraphrases of one sentence sit near 0.9; unrelated sentences of one topic near 0.5. Across languages the scores run lower. */
export const SEMANTIC = {
  same: { closeAt: 0.86, ledeAt: 0.92 } as Thresholds,
  cross: { closeAt: 0.78, ledeAt: 0.86 } as Thresholds,
  /** Share of the edition's sentences that must be close for a structure copy. */
  copyClose: 0.6,
  /** Order agreement at or above which close sentences count as following the source. */
  copyTau: 0.75,
  /** An edition shorter than this is not judged on structure. */
  minSentences: 5,
  /** Close sentences needed to speak of an order at all. */
  minMatched: 4,
  maxSourceSentences: 80,
  maxEditionSentences: 60,
};

export interface SentenceSet { sents: string[]; vecs: number[][] }
export interface ClosePair { edition: string; source: string; sim: number }
export interface SemanticReport {
  sameLang: boolean; closeAt: number; ledeAt: number;
  editionSentences: number; sourceSentences: number;
  close: number; mean: number; tau: number | null; ledeSim: number;
  copy: boolean; ledeCopy: boolean;
  worst: ClosePair[];
}

/** The sentences of a plain text that are worth comparing, capped. */
export const sentencesFor = (text: string, max: number): string[] => substantive(splitSentences(text)).slice(0, max);

/** Kendall's tau of a sequence against its index (+1 ascending, -1 descending); null with fewer than three values. */
export function kendallTau(values: readonly number[]): number | null {
  const n = values.length;
  if (n < 3) return null;
  let c = 0; let d = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const dv = values[j] - values[i]; if (dv > 0) c++; else if (dv < 0) d++; }
  return c + d ? (c - d) / (c + d) : null;
}

export function compareToSource(src: SentenceSet, ed: SentenceSet, o: { sameLang: boolean; titleVec?: number[] | null }): SemanticReport {
  const th = o.sameLang ? SEMANTIC.same : SEMANTIC.cross;
  const base: SemanticReport = { sameLang: o.sameLang, closeAt: th.closeAt, ledeAt: th.ledeAt, editionSentences: ed.sents.length, sourceSentences: src.sents.length, close: 0, mean: 0, tau: null, ledeSim: 0, copy: false, ledeCopy: false, worst: [] };
  if (!src.sents.length || !ed.sents.length) return base;

  const best: Array<{ s: number; sim: number }> = ed.vecs.map((v) => {
    let bi = 0; let bs = -1;
    src.vecs.forEach((w, j) => { const c = cosine(v, w); if (c > bs) { bs = c; bi = j; } });
    return { s: bi, sim: bs };
  });
  const closeIdx = best.map((b, i) => (b.sim >= th.closeAt ? i : -1)).filter((i) => i >= 0);
  const close = closeIdx.length / ed.sents.length;
  const mean = best.reduce((n, b) => n + b.sim, 0) / best.length;
  const tau = closeIdx.length >= SEMANTIC.minMatched ? kendallTau(closeIdx.map((i) => best[i].s)) : null;

  const openers = [...(o.titleVec ? [o.titleVec] : []), ...src.vecs.slice(0, 3)];
  const ledeSim = ed.vecs.length && openers.length ? Math.max(...openers.map((w) => cosine(ed.vecs[0], w))) : 0;

  const worst = best.map((b, i) => ({ edition: ed.sents[i], source: src.sents[b.s], sim: b.sim })).sort((a, b) => b.sim - a.sim).slice(0, 3).map((p) => ({ edition: p.edition.slice(0, 160), source: p.source.slice(0, 160), sim: +p.sim.toFixed(3) }));
  const copy = ed.sents.length >= SEMANTIC.minSentences && close >= SEMANTIC.copyClose && tau !== null && tau >= SEMANTIC.copyTau;
  return { ...base, close: +close.toFixed(3), mean: +mean.toFixed(3), tau: tau === null ? null : +tau.toFixed(3), ledeSim: +ledeSim.toFixed(3), copy, ledeCopy: ledeSim >= th.ledeAt, worst };
}

/** What the writer is told when a rewrite from the core was ordered because of this measurement. */
export function semanticReasons(r: SemanticReport): string[] {
  const out: string[] = [];
  if (r.copy) out.push(`it follows the original: ${Math.round(r.close * 100)}% of its sentences restate a sentence of the original at the same place in the story (order agreement ${r.tau}); an independent report builds its own order`);
  if (r.ledeCopy) out.push('its opening says what the original\'s opening says; open with a different element of the story (the consequence, the figure, the person, the place) and different words');
  return out;
}

/** The one-line summary that goes into the article's log. */
export const semanticSummary = (r: SemanticReport): string => `close ${Math.round(r.close * 100)}% · order ${r.tau === null ? 'n/a' : r.tau} · lede ${r.ledeSim} · mean ${r.mean} (${r.sameLang ? 'same' : 'cross'}-language, ${r.editionSentences}/${r.sourceSentences} sentences)`;
