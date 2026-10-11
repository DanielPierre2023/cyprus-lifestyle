// lib/journalism/corpus.ts — the CORPUS MONITOR: what repeats across many articles. Pure (imports ./sentences, ./evidence's folding and the
// voice engine's paragraph reader). Used by the admin page /admin/corpus; the same idea feeds the writers in small form (the openings of
// the latest pieces, see prompts.ts).
//
// Why: a single article can pass every check and still be one of forty that open "The Limassol …", end on a forecast and share the phrase
// "plays a key role". Readers feel that long before any detector does, and no test of one article can see it. The monitor reads the latest
// published pieces of ONE language and reports the repetition: the openings, the endings, the headline templates, the phrases that occur in
// many pieces, and the words that paragraphs begin with. It reports; it does not edit.
import { paragraphsOf } from '@/lib/voice/structure';
import { splitSentences } from './sentences';
import { foldForMatch } from './evidence';

export interface CorpusPiece { id: string; slug: string; title: string; html: string }
export interface Example { slug: string; text: string }
export interface Group { key: string; count: number; share: number; examples: Example[] }
export interface Phrase { phrase: string; pieces: number; share: number; examples: Example[] }
export interface Mix { concrete: number; quote: number; forward: number; other: number }
export interface CorpusReport {
  lang: string; pieces: number;
  openings: Group[]; openingWords: Group[]; openingShape: { figure: number; quote: number };
  endings: Group[]; endingMix: Mix;
  titles: Group[]; titleShapes: Group[];
  phrases: Phrase[];
  paragraphOpeners: Group[];
  parts: { openings: number; endings: number; titles: number; phrases: number; openingWord: number; forward: number };
  index: number;
  verdict: 'too_few' | 'varied' | 'watch' | 'repetitive';
}

/** A repetition counts when it occurs in at least this many pieces, and in at least this share of the corpus. */
export const MIN_PIECES = 8;
export const MIN_REPEAT = 2;
export const MIN_SHARE = 0.08;
const PHRASE_LEN = [5, 4];

const tokens = (s: string): string[] => foldForMatch(s).split(' ').filter(Boolean);
const cut = (s: string, n = 150): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Forward-looking closers ("the coming weeks will show"), in folded form, by language. */
const FORWARD: Record<string, RegExp> = {
  en: /\b(?:remains to be seen|only time will tell|time will tell|will show|in the coming (?:weeks|months|days|years)|the next (?:weeks|months)|going forward)\b/,
  de: /\b(?:bleibt abzuwarten|wird sich zeigen|zeit wird zeigen|in den kommenden (?:wochen|monaten|tagen)|in den nachsten (?:wochen|monaten))\b/,
  el: /(?:θα δειξει ο χρονος|θα φανει|τισ επομενεσ (?:εβδομαδεσ|μηνεσ|ημερεσ)|το μελλον θα δειξει)/,
  ro: /\b(?:va ramane de vazut|timpul va arata|in urmatoarele (?:saptamani|luni|zile)|ramane de vazut)\b/,
  ru: /(?:покажет время|время покажет|остается (?:ждать|открытым)|в ближайшие (?:недели|месяцы|дни))/,
  pl: /\b(?:czas pokaze|pokaze czas|w nadchodzacych (?:tygodniach|miesiacach|dniach)|okaze sie)\b/,
  ar: /(?:ستكشف الايام|سيتضح|في الاسابيع المقبلة|في الاشهر المقبلة|الايام المقبلة)/,
};

function groups(map: Map<string, Example[]>, total: number, min: number): Group[] {
  return [...map.entries()]
    .filter(([, ex]) => ex.length >= min && ex.length / total >= MIN_SHARE * 0.5)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([key, ex]) => ({ key, count: ex.length, share: +(ex.length / total).toFixed(3), examples: ex.slice(0, 3) }));
}
const push = (m: Map<string, Example[]>, key: string, e: Example) => { if (!key) return; const l = m.get(key); if (l) l.push(e); else m.set(key, [e]); };

export function analyzeCorpus(pieces: readonly CorpusPiece[], lang: string): CorpusReport {
  const rows = pieces.map((p) => {
    const paras = paragraphsOf(p.html);
    const first = splitSentences(paras[0] || '')[0] || '';
    const lastSents = splitSentences(paras[paras.length - 1] || '');
    const last = lastSents[lastSents.length - 1] || '';
    return { slug: p.slug, title: p.title, paras, first, last };
  }).filter((r) => r.paras.length >= 1 && r.first);
  const n = rows.length;
  const empty: CorpusReport = {
    lang, pieces: n, openings: [], openingWords: [], openingShape: { figure: 0, quote: 0 }, endings: [], endingMix: { concrete: 0, quote: 0, forward: 0, other: 0 }, titles: [], titleShapes: [], phrases: [], paragraphOpeners: [],
    parts: { openings: 0, endings: 0, titles: 0, phrases: 0, openingWord: 0, forward: 0 }, index: 0, verdict: 'too_few',
  };
  if (n < MIN_PIECES) return empty;

  const min = Math.max(MIN_REPEAT, Math.ceil(n * MIN_SHARE * 0.5));
  // openings: the first three words of the first sentence, and the first word alone
  const open3 = new Map<string, Example[]>(); const open1 = new Map<string, Example[]>();
  let figure = 0; let quote = 0;
  for (const r of rows) {
    const t = tokens(r.first); const ex = { slug: r.slug, text: cut(r.first) };
    push(open3, t.slice(0, 3).join(' '), ex); push(open1, t[0] || '', ex);
    if (/^[\s"“„«'‘(]*[\d€$£]/.test(r.first)) figure++;
    if (/^[\s]*["“„«]/.test(r.first)) quote++;
  }
  const openings = groups(open3, n, min);
  const openingWords = [...open1.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([key, ex]) => ({ key, count: ex.length, share: +(ex.length / n).toFixed(3), examples: ex.slice(0, 3) }));

  // endings: the last three words of the last sentence, and what kind of ending it is
  const end3 = new Map<string, Example[]>();
  const mix: Mix = { concrete: 0, quote: 0, forward: 0, other: 0 };
  const fwd = FORWARD[lang] || FORWARD.en;
  for (const r of rows) {
    const t = tokens(r.last); const ex = { slug: r.slug, text: cut(r.last) };
    push(end3, t.slice(-3).join(' '), ex);
    const folded = foldForMatch(r.last);
    if (fwd.test(folded)) mix.forward++;
    else if (/["”»]\s*$/.test(r.last.trim()) || /^[\s]*["“„«]/.test(r.last)) mix.quote++;
    else if (/\d/.test(r.last)) mix.concrete++;
    else mix.other++;
  }
  const endings = groups(end3, n, min);
  const endingMix: Mix = { concrete: +(mix.concrete / n).toFixed(3), quote: +(mix.quote / n).toFixed(3), forward: +(mix.forward / n).toFixed(3), other: +(mix.other / n).toFixed(3) };

  // headlines: the first two words (a template), and the shape
  const title2 = new Map<string, Example[]>(); const shapes = new Map<string, Example[]>();
  for (const r of rows) {
    const t = tokens(r.title); const ex = { slug: r.slug, text: cut(r.title, 120) };
    push(title2, t.slice(0, 2).join(' '), ex);
    const raw = r.title.trim();
    push(shapes, /\?\s*$/.test(raw) ? 'a question' : /:/.test(raw) ? 'a colon (“Topic: statement”)' : /^[\d€$£]/.test(raw) ? 'starts with a figure' : /^["“„«]/.test(raw) ? 'starts with a quotation' : t.length > 14 ? 'long (over 14 words)' : t.length <= 5 ? 'short (5 words or fewer)' : 'a plain statement', ex);
  }
  const titles = groups(title2, n, Math.max(3, min));
  const titleShapes = [...shapes.entries()].sort((a, b) => b[1].length - a[1].length).map(([key, ex]) => ({ key, count: ex.length, share: +(ex.length / n).toFixed(3), examples: ex.slice(0, 2) }));

  // phrases that occur in many different pieces
  const phraseMap = new Map<string, Set<string>>();
  const sample = new Map<string, string>();
  for (const r of rows) {
    const seen = new Set<string>();
    for (const p of r.paras) {
      const t = tokens(p);
      for (const len of PHRASE_LEN) for (let i = 0; i + len <= t.length; i++) {
        const g = t.slice(i, i + len);
        if (g.some((w) => /^\d+$/.test(w)) || g.filter((w) => w.length >= 4).length < 2) continue;
        const key = g.join(' ');
        if (seen.has(key)) continue;
        seen.add(key);
        let set = phraseMap.get(key); if (!set) { set = new Set(); phraseMap.set(key, set); }
        set.add(r.slug);
        if (!sample.has(key)) sample.set(key, cut(p, 160));
      }
    }
  }
  const need = Math.max(3, Math.ceil(n * MIN_SHARE));
  const found = [...phraseMap.entries()].filter(([, s]) => s.size >= need).sort((a, b) => b[1].size - a[1].size || b[0].length - a[0].length);
  const kept: Array<[string, Set<string>]> = [];
  for (const [k, s] of found) { if (!kept.some(([k2, s2]) => s2.size === s.size && k2.includes(k))) kept.push([k, s]); if (kept.length >= 15) break; }
  const phrases: Phrase[] = kept.map(([phrase, s]) => ({ phrase, pieces: s.size, share: +(s.size / n).toFixed(3), examples: [...s].slice(0, 3).map((slug) => ({ slug, text: sample.get(phrase) || '' })) }));

  // what paragraphs begin with, across the corpus
  const pOpen = new Map<string, Example[]>();
  let paraTotal = 0;
  for (const r of rows) for (const p of r.paras.slice(1)) { paraTotal++; push(pOpen, tokens(p)[0] || '', { slug: r.slug, text: cut(p, 100) }); }
  const paragraphOpeners = [...pOpen.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([key, ex]) => ({ key, count: ex.length, share: paraTotal ? +(ex.length / paraTotal).toFixed(3) : 0, examples: ex.slice(0, 2) }));

  // the repetition index (0 = every piece begins, ends and is titled in its own way)
  const share = (g: Group[]) => Math.min(1, g.reduce((a, x) => a + x.count, 0) / n);
  const topFirst = openingWords[0]?.share ?? 0;
  const parts = {
    openings: +share(openings).toFixed(3), endings: +share(endings).toFixed(3), titles: +share(titles).toFixed(3),
    phrases: +Math.min(1, phrases.length / 10).toFixed(3), openingWord: +Math.max(0, (topFirst - 0.25) / 0.75).toFixed(3), forward: +(mix.forward / n).toFixed(3),
  };
  const index = Math.min(100, Math.round(100 * (0.28 * parts.openings + 0.18 * parts.endings + 0.18 * parts.titles + 0.18 * parts.phrases + 0.08 * parts.openingWord + 0.1 * parts.forward)));
  return { lang, pieces: n, openings, openingWords, openingShape: { figure: +(figure / n).toFixed(3), quote: +(quote / n).toFixed(3) }, endings, endingMix, titles, titleShapes, phrases, paragraphOpeners, parts, index, verdict: index <= 15 ? 'varied' : index <= 35 ? 'watch' : 'repetitive' };
}
