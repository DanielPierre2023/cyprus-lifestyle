// lib/events/rules.ts — the auto-publish rule. Pure; unit-tested.
// An event goes live without a human only when ALL hold: the source is allowed to auto-publish and is an official / public-data
// / municipal / venue source (never media or ticket resellers), the date is confirmed, there is a place (district or venue; public
// holidays are exempt), the title is real, and the date is inside the plausible window. Everything else is filed as a draft in
// Admin -> Agenda for one-click approval.
import type { EventSource, NormEvent } from './types';

const TRUSTED_KINDS = new Set(['official', 'municipal', 'public-data', 'venue']);
const DAY = 86_400_000;

export function decidePublication(ev: NormEvent, src: EventSource, now: number, sourceOverride?: 'auto' | 'draft' | null): { status: 'published' | 'draft'; reason: string } {
  if (sourceOverride === 'draft') return { status: 'draft', reason: 'admin: this source is set to draft-only' };
  if (!src.autoPublish && sourceOverride !== 'auto') return { status: 'draft', reason: 'source is not allowed to auto-publish' };
  if (!TRUSTED_KINDS.has(src.kind)) return { status: 'draft', reason: `source kind "${src.kind}" needs review` };
  if (ev.dateConfidence !== 'confirmed') return { status: 'draft', reason: 'date is approximate' };
  const holiday = ev.tags.includes('public-holiday');
  if (!holiday && !ev.district && !ev.venue) return { status: 'draft', reason: 'no place given' };
  if (ev.title.length < 4) return { status: 'draft', reason: 'title too short' };
  const s = Date.parse(ev.startsAt);
  if (!(s >= now - DAY && s <= now + 548 * DAY)) return { status: 'draft', reason: 'date outside the plausible window' };
  return { status: 'published', reason: 'official source with a confirmed date and place' };
}

/** Freshness rule used by System health and by the admin page: how many REAL events (not public holidays) are coming up. */
export const FRESH_MIN_UPCOMING_30D = 5;     // below this: warn
export const PIPELINE_MAX_SILENCE_H = 36;    // no successful pipeline run for this long: red
