// lib/journalism/merge.ts — two accounts of one event become ONE article: finding the second account in the queue. Pure (imports ./embeddings'
// cosine and ./evidence's figure reader). Shared by the Supabase edge function (generated copy) and the app.
//
// Why: an article built on one source is, however well rewritten, that source's story in the same order with the same gaps, and its facts
// are as good as that one source. Two outlets reporting the same event rarely agree on every detail, and where they do agree the fact is
// stronger; where they differ the difference is itself information (a conflict the core records instead of a guess). The desk therefore
// looks, before it writes, for a second account of the same event among the articles waiting in the queue.
//
// This module only PROPOSES a partner, and it is strict about it, because a wrong merge would put two different stories into one article:
// the two texts must be close in meaning (embeddings, titles and openings) AND share concrete anchors (a figure, three capitalised names).
// The research editor then has the last word (the core's same_story verdict), and the facts of a second account that is not the same story
// are dropped by the evidence check, since their passages are not in the first source.
import { cosine } from './embeddings';
import { figuresOf, foldForMatch } from './evidence';

export interface QueueItem { id: string; title: string; text: string; url: string; sourceId?: string | null; createdAt?: string }

/** The opening of an article as it is embedded: title and the first part of the text. */
export const leadOf = (title: string, text: string, chars = 450): string => `${String(title || '').trim()}. ${String(text || '').replace(/\s+/g, ' ').trim().slice(0, chars)}`;

const COMMON = new Set(['this', 'that', 'with', 'from', 'there', 'their', 'after', 'while', 'about', 'which', 'would', 'these', 'those', 'where', 'when', 'what', 'also', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december']);
/** What an account names: its figures of consequence and its capitalised words of five letters or more (folded). */
export function anchorsOf(text: string): { figures: Set<string>; names: Set<string> } {
  const t = String(text || '');
  const names = new Set<string>();
  for (const m of t.matchAll(/\p{Lu}[\p{L}\p{M}]{4,}/gu)) { const f = foldForMatch(m[0]); if (f && !COMMON.has(f)) names.add(f); }
  return { figures: new Set(figuresOf(t)), names };
}
export interface Shared { figures: string[]; names: string[] }
export function sharedAnchors(a: string, b: string): Shared {
  const x = anchorsOf(a); const y = anchorsOf(b);
  return { figures: [...x.figures].filter((f) => y.figures.has(f)), names: [...x.names].filter((n) => y.names.has(n)) };
}
/** Enough in common to be one event: a shared figure of consequence, or at least three shared names. */
export const enoughShared = (s: Shared): boolean => s.figures.length >= 1 || s.names.length >= 3;

export interface MergePick { item: QueueItem; sim: number; shared: Shared }
/**
 * The best partner for `target` among `items` (vectors in the same order, from embedding leadOf()), or null. A partner comes from another
 * outlet, is close in meaning (cosine at least `minSim`), and shares anchors with the target's text.
 */
export function pickPartner(target: QueueItem & { vec: number[] }, items: readonly QueueItem[], vecs: ReadonlyArray<number[]>, o: { minSim?: number } = {}): MergePick | null {
  const minSim = o.minSim ?? 0.82;
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  let best: MergePick | null = null;
  items.forEach((it, i) => {
    if (it.id === target.id) return;
    if ((target.sourceId && it.sourceId && target.sourceId === it.sourceId) || host(it.url) === host(target.url)) return;   // a second OUTLET
    const sim = cosine(target.vec, vecs[i] || []);
    if (sim < minSim) return;
    const shared = sharedAnchors(`${target.title}\n${target.text}`, `${it.title}\n${it.text}`);
    if (!enoughShared(shared)) return;
    if (!best || sim > best.sim) best = { item: it, sim, shared };
  });
  return best;
}
