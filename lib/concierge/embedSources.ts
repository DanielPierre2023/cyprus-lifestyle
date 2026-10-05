// lib/concierge/embedSources.ts
// ============================================================================
// Pure: turn articles / events / experiences into the text we embed, and decide which of them
// actually need (re-)embedding. Nothing here calls an API or the database; the job route
// (app/api/concierge/embed-sources) injects both. One vector per item — the text carries every
// language's title so a guest writing in any of the seven finds it (same approach as the directory).
// ============================================================================
import { createHash } from 'node:crypto';
import { SOURCE_LOCALES, safeText, approxTokens } from '@/lib/concierge/sources';

export type EmbedSource = 'article' | 'event' | 'activity';
export interface EmbedDoc { source: EmbedSource; ref: string; text: string; hash: string; }
type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v).trim());
export const hashText = (t: string) => createHash('sha256').update(t).digest('hex');

function titles(r: Row, base = 'title'): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const l of SOURCE_LOCALES) { const t = s(r[`${base}_${l}`]); if (t && !seen.has(t)) { seen.add(t); out.push(t); } }
  return out;
}
const tags = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).map(String).filter(Boolean) : []);

export function articleDoc(r: Row): EmbedDoc | null {
  const ref = s(r.slug); const t = titles(r); if (!ref || !t.length) return null;
  const parts = [t.join(' | '), s(r.category), s(r.county), tags(r.tags_en).join(', '),
    safeText(r.excerpt_en || r.summary_en, 500), safeText(r.content_en, 1500)].filter(Boolean);
  const text = parts.join('\n').slice(0, 4000);
  return { source: 'article', ref, text, hash: hashText(text) };
}
export function eventDoc(r: Row): EmbedDoc | null {
  const ref = s(r.slug); const t = titles(r); if (!ref || !t.length) return null;
  const parts = [t.join(' | '), safeText(r.summary_en, 500), s(r.venue), s(r.district), s(r.organizer), tags(r.tags).join(', ')].filter(Boolean);
  const text = parts.join('\n').slice(0, 2500); // dates are deliberately NOT embedded: they are filtered in SQL/JS, and a changing date must not force a re-embed
  return { source: 'event', ref, text, hash: hashText(text) };
}
export function activityDoc(r: Row): EmbedDoc | null {
  const ref = s(r.external_id); const title = s(r.title); if (!ref || !title) return null;
  const parts = [title, s(r.kind), safeText(r.summary, 400), [s(r.town), s(r.landmark), s(r.district)].filter(Boolean).join(', '), tags(r.tags).join(', '), s(r.duration_label)].filter(Boolean);
  const text = parts.join('\n').slice(0, 2000);
  return { source: 'activity', ref, text, hash: hashText(text) };
}

/** Docs whose stored hash differs (or is absent). `existing` key is `${source}:${ref}`. */
export function planEmbeds(docs: EmbedDoc[], existing: ReadonlyMap<string, string>, force = false): EmbedDoc[] {
  return docs.filter((d) => force || existing.get(`${d.source}:${d.ref}`) !== d.hash);
}
export const chunk = <T>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
export const tokensOf = (docs: EmbedDoc[]) => docs.reduce((n, d) => n + approxTokens(d.text), 0);

// ── nightly / resumable run helpers (increment 2.1b) ─────────────────────────
/** Stop STARTING new embedding calls after this; Vercel Hobby kills a function at 60 s. */
export const EMBED_BUDGET_MS = 45_000;
export const EMBED_BATCH_SIZE = 64;
/** Cap for a single OpenAI call so one slow response cannot run past the budget. */
export const EMBED_CALL_TIMEOUT_MS = 20_000;
const PRIORITY: Record<EmbedSource, number> = { event: 0, article: 1, activity: 2 };

/** Deterministic order (so a resumed run continues where the last stopped): events first (they expire), then articles, then experiences. */
export function orderPending(docs: EmbedDoc[]): EmbedDoc[] {
  return [...docs].sort((a, b) => (PRIORITY[a.source] - PRIORITY[b.source]) || a.ref.localeCompare(b.ref));
}
/** May another embedding call start? Needs room for one call (`callMs`) inside the budget. */
export const canStartBatch = (elapsedMs: number, budgetMs = EMBED_BUDGET_MS, callMs = EMBED_CALL_TIMEOUT_MS) => elapsedMs + callMs <= budgetMs + 1000;
/** Per-call timeout: never longer than what is left of the budget (minimum 3 s). */
export const callTimeout = (elapsedMs: number, budgetMs = EMBED_BUDGET_MS) => Math.max(3000, Math.min(EMBED_CALL_TIMEOUT_MS, budgetMs - elapsedMs + 5000));

export interface EmbedParams { force: boolean; dry: boolean; batch: boolean; limit: number | null; }
export function parseEmbedParams(sp: URLSearchParams): EmbedParams {
  const n = Number(sp.get('limit'));
  return { force: sp.get('force') === '1', dry: sp.get('dry') === '1', batch: sp.get('batch') === '1', limit: Number.isFinite(n) && n > 0 ? Math.floor(n) : null };
}
