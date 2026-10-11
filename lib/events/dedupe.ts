// lib/events/dedupe.ts — fuzzy duplicate detection across sources: title + date + venue/district. Pure.
// The same festival is listed by a tourism board, a municipality and a ticket shop under slightly different names; we keep
// the first row and count the rest as duplicates (empty fields of the kept row are filled from the newcomer by the pipeline).
import type { ExistingEvent, NormEvent } from './types';
import { nicosiaDayKey } from './time';
import { cleanTitle } from './normalise';

const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'at', 'on', 'and', 'for', 'to', 'with', 'by', 'από', 'και', 'το', 'η', 'ο', 'των', 'στο', 'στη', 'στην', 'cyprus', 'live']);

export function normText(s: string | null | undefined): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function normTitle(s: string | null | undefined): string {
  return normText(cleanTitle(String(s ?? ''))).split(' ').filter((w) => w && !STOP.has(w)).join(' ');
}
function bigrams(s: string): string[] { const t = s.replace(/ /g, '_'); const o: string[] = []; for (let i = 0; i < t.length - 1; i++) o.push(t.slice(i, i + 2)); return o; }
export function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a), B = bigrams(b);
  if (!A.length || !B.length) return 0;
  const m = new Map<string, number>();
  for (const x of A) m.set(x, (m.get(x) || 0) + 1);
  let hit = 0;
  for (const x of B) { const c = m.get(x); if (c) { hit++; m.set(x, c - 1); } }
  return (2 * hit) / (A.length + B.length);
}
/** 0..1 similarity of two event titles: best of bigram-Dice and token containment (one title extends the other). */
export function titleSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const x = normTitle(a), y = normTitle(b);
  if (!x || !y) return 0;
  let best = dice(x, y);
  const tx = x.split(' '), ty = y.split(' ');
  const [small, big] = tx.length <= ty.length ? [tx, new Set(ty)] : [ty, new Set(tx)];
  if (small.length >= 2) { const inter = small.filter((w) => big.has(w)).length; if (inter === small.length) best = Math.max(best, 0.9); else best = Math.max(best, (inter / small.length) * 0.85); }
  return best;
}
export function venueSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const x = normText(a), y = normText(b);
  if (!x || !y) return 0;
  return Math.max(dice(x, y), x.includes(y) || y.includes(x) ? 0.9 : 0);
}

/** Compare event pages by address, ignoring scheme, "www.", trailing slash and tracking parameters (the #fragment is kept: it is identity for fragment-addressed items). */
const canonUrl = (u: string | null | undefined): string => {
  const s = String(u ?? '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '');
  const [path, ...hash] = s.split('#');
  const [p, q = ''] = path.split('?');
  const keep = q.split('&').filter((kv) => kv && !/^(utm_|fbclid|gclid|ref=|mc_)/.test(kv)).sort().join('&');
  return p.replace(/\/+$/, '') + (keep ? `?${keep}` : '') + (hash.length ? `#${hash.join('#')}` : '');
};

export interface DupMatch { id: string; reason: 'same-key' | 'same-url' | 'title+date' | 'title+date+venue' | 'title+time+district'; score: number }

interface Prepared { e: ExistingEvent; nt: string; s: number; en: number; sDay: string; eDay: string; url: string }
export interface DupIndex { rows: Prepared[] }

export function buildIndex(existing: ExistingEvent[]): DupIndex {
  return { rows: existing.map((e) => prepare(e)) };
}
function prepare(e: ExistingEvent): Prepared {
  const s = Date.parse(e.starts_at), en = e.ends_at ? Date.parse(e.ends_at) : s;
  return { e, nt: normTitle(e.title_en), s, en: Number.isFinite(en) ? en : s, sDay: nicosiaDayKey(s), eDay: nicosiaDayKey(Number.isFinite(en) ? en : s), url: canonUrl(e.source_url) };
}
export function addToIndex(ix: DupIndex, e: ExistingEvent): void { ix.rows.push(prepare(e)); }

export function findDuplicate(c: Pick<NormEvent, 'ingestKey' | 'url' | 'title' | 'startsAt' | 'endsAt' | 'venue' | 'district'>, ix: DupIndex): DupMatch | null {
  const cs = Date.parse(c.startsAt), cDay = nicosiaDayKey(cs);
  const cEnd = c.endsAt ? Date.parse(c.endsAt) : cs, cEDay = nicosiaDayKey(cEnd);
  const cu = canonUrl(c.url), nt = normTitle(c.title);
  let best: DupMatch | null = null;
  const take = (m: DupMatch) => { if (!best || m.score > best.score) best = m; };
  for (const p of ix.rows) {
    if (p.e.ingest_key && p.e.ingest_key === c.ingestKey) return { id: p.e.id, reason: 'same-key', score: 1 };
    if (cu && p.url && cu === p.url) return { id: p.e.id, reason: 'same-url', score: 1 };
    // Same moment? The same Cyprus calendar day, or starts within 4 h of each other (one source may write UTC, another local
    // time, so a late-evening start can fall on different days). Consecutive days are NOT the same event: a workshop that runs
    // every day, or a weekly class, is a series of distinct dates. A multi-day range that overlaps counts too.
    const sameDay = cDay === p.sDay || Math.abs(cs - p.s) <= 4 * 3_600_000;
    const overlap = cDay <= p.eDay && p.sDay <= cEDay;
    if (!sameDay && !overlap) continue;
    const sim = nt === p.nt && nt ? 1 : titleSimilarity(c.title, p.e.title_en);
    if (sim >= 0.86 && (sameDay || (overlap && sim >= 0.92))) { take({ id: p.e.id, reason: 'title+date', score: sim }); continue; }
    const vs = venueSimilarity(c.venue, p.e.venue);
    if (sim >= 0.62 && vs >= 0.6) { take({ id: p.e.id, reason: 'title+date+venue', score: 0.8 + sim * 0.1 }); continue; }
    if (sim >= 0.74 && c.district && c.district === p.e.district && Math.abs(cs - p.s) <= 30 * 60_000) take({ id: p.e.id, reason: 'title+time+district', score: 0.75 + sim * 0.1 });
  }
  return best;
}
