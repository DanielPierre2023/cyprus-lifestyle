// lib/concierge/saved.ts — saved items / trip plan helpers (roadmap item 10). Pure,
// so the API route and the concierge brain share one definition of what's valid.

export const SAVED_KINDS = ['saved', 'trip'] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

export function normalizeKind(k: unknown): SavedKind {
  return k === 'trip' ? 'trip' : 'saved';
}
export function sanitizeSlug(s: unknown): string {
  return String(s || '').trim().slice(0, 200);
}
export function isSaveAction(a: unknown): a is 'add' | 'remove' {
  return a === 'add' || a === 'remove';
}

export interface SavedRow { slug: string; kind: SavedKind; note?: string | null; name?: string | null; type?: string | null; district?: string | null }

// A short grounding block so the concierge knows what the guest has saved / put on their
// trip plan, and can reference and offer to arrange them. Empty string when nothing saved.
export function savedBlock(rows: SavedRow[]): string {
  if (!rows || rows.length === 0) return '';
  const trip = rows.filter((r) => r.kind === 'trip');
  const saved = rows.filter((r) => r.kind === 'saved');
  const line = (r: SavedRow) => `• ${r.name || r.slug}${r.district ? ` (${r.district})` : ''}`;
  const parts: string[] = ['\n\nTHE GUEST’S SAVED ITEMS — you may reference these by name, weave them into a plan, and warmly offer to arrange or book them (capturing a contact as usual). Do not invent details beyond the directory context.'];
  if (trip.length) parts.push('Trip plan:\n' + trip.map(line).join('\n'));
  if (saved.length) parts.push('Saved:\n' + saved.map(line).join('\n'));
  return parts.join('\n');
}
