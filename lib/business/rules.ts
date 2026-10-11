// lib/business/rules.ts — pure rules of the Business Hub (no I/O): submission validation, the submission lifecycle,
// lead statuses and the analytics roll-up. Unit-tested in scripts/tests/business.hub.test.ts.
//
// Deliberately honest about scope: the hub enforces exactly what is below and nothing more — there are no plans, quotas or
// tiers here, and "approved" for a `news` proposal only means "the desk will follow up" (nothing is published by itself).
import { sanitizeDescription, sanitizePhotos, sanitizeUrl } from '@/lib/directory/owner';

export const LOGIN_TTL_MS = 30 * 60 * 1000;
export const LOGIN_MAX_PER_HOUR = 3;
export const SESSION_TTL_DAYS = 14;
export const SESSION_COOKIE = 'cl_business';
/** At most this many proposals may wait on the desk per listing (stops a flood; the cap is checked in code). */
export const MAX_OPEN_PER_LISTING = 5;

export const SUBMISSION_KINDS = ['description', 'photos', 'news'] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];
export const isKind = (v: unknown): v is SubmissionKind => (SUBMISSION_KINDS as readonly string[]).includes(String(v));

export const SUBMISSION_STATUSES = ['submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
/** Statuses where the proposal is still alive (counts towards the cap, can be withdrawn). */
export const OPEN_STATUSES: readonly SubmissionStatus[] = ['submitted', 'changes_requested'];

export const LEAD_STATUSES = ['new', 'seen', 'replied', 'closed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const isLeadStatus = (v: unknown): v is LeadStatus => (LEAD_STATUSES as readonly string[]).includes(String(v));

export const NEWS_TITLE_MAX = 140;
export const NEWS_BODY_MAX = 2000;

export type Payload =
  | { text: string }
  | { urls: string[]; rights: true }
  | { title: string; body: string; url?: string };

export type ValidationError = 'kind' | 'rights' | 'empty' | 'too_long' | 'invalid_url' | 'title' | 'body';
export type Validated = { ok: true; payload: Payload } | { ok: false; error: ValidationError };

/** Validate and sanitise the payload a business sent for a given kind. Never throws. */
export function validateSubmission(kind: unknown, raw: unknown): Validated {
  if (!isKind(kind)) return { ok: false, error: 'kind' };
  const src = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  if (kind === 'description') {
    const text = sanitizeDescription(src.text);
    if (text.length < 20) return { ok: false, error: 'empty' };
    if (String(src.text ?? '').trim().length > 4000) return { ok: false, error: 'too_long' };
    return { ok: true, payload: { text } };
  }
  if (kind === 'photos') {
    const given = Array.isArray(src.urls) ? src.urls : String(src.urls ?? '').split(/[\n,]/);
    const nonEmpty = given.map((x) => String(x ?? '').trim()).filter(Boolean);
    if (!nonEmpty.length) return { ok: false, error: 'empty' };
    if (src.rights !== true) return { ok: false, error: 'rights' };   // the business declares it may let us show these photos
    if (nonEmpty.length > 12) return { ok: false, error: 'too_long' };
    if (nonEmpty.some((u) => !sanitizeUrl(u))) return { ok: false, error: 'invalid_url' };
    const urls = sanitizePhotos(nonEmpty);
    return { ok: true, payload: { urls, rights: true } };
  }
  const title = String(src.title ?? '').replace(/\s+/g, ' ').trim();
  const body = String(src.body ?? '').trim();
  if (!title) return { ok: false, error: 'title' };
  if (title.length > NEWS_TITLE_MAX) return { ok: false, error: 'too_long' };
  if (!body) return { ok: false, error: 'body' };
  if (body.length > NEWS_BODY_MAX) return { ok: false, error: 'too_long' };
  const urlRaw = String(src.url ?? '').trim();
  const url = urlRaw ? sanitizeUrl(urlRaw) : null;
  if (urlRaw && !url) return { ok: false, error: 'invalid_url' };
  return { ok: true, payload: url ? { title, body, url } : { title, body } };
}

// ── lifecycle ────────────────────────────────────────────────────────────────
export type Actor = 'business' | 'desk';
const TRANSITIONS: Record<Actor, Partial<Record<SubmissionStatus, readonly SubmissionStatus[]>>> = {
  business: { submitted: ['withdrawn'], changes_requested: ['submitted', 'withdrawn'] },
  desk: { submitted: ['approved', 'rejected', 'changes_requested'] },
};
export function canTransition(from: string, to: string, actor: Actor): boolean {
  return !!(TRANSITIONS[actor][from as SubmissionStatus] || []).includes(to as SubmissionStatus);
}
/** Only these may be edited by the business (and resubmitted). */
export const isEditable = (status: string) => status === 'changes_requested';
export const isOpen = (status: string) => (OPEN_STATUSES as readonly string[]).includes(status);

export type DeskAction = 'approve' | 'reject' | 'request_changes';
export const normalizeDeskAction = (v: unknown): DeskAction | null => (v === 'approve' || v === 'reject' || v === 'request_changes' ? v : null);
export const ACTION_TARGET: Record<DeskAction, SubmissionStatus> = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' };
/** A rejection or change request must tell the business why. */
export const noteRequired = (a: DeskAction) => a !== 'approve';
export const cleanNote = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);

/** What approving does: description/photos change the listing; news does not publish anything. */
export const appliesToListing = (kind: string) => kind === 'description' || kind === 'photos';

// ── analytics roll-up (existing counters only) ───────────────────────────────────
export interface LeadRow { listing_slug: string; status: string; created_at: string }
export interface CtaRow { slug: string; cta: string; clicks: number | string }
export interface AttributionRow { slug: string; impressions: number | string; clicks: number | string }
export interface ReviewRow { listing_slug: string; rating: number | null }
export interface ListingStats {
  slug: string;
  enquiries: { total: number; last30d: number; new: number };
  cta: { label: string; clicks: number }[];           // last 90 days (view cta_by_listing)
  ctaTotal: number;
  recommended: number;                                // concierge recommendations, as recorded in listing_attribution
  recommendedClicks: number;                          // clicks on those, last 90 days
  reviews: { count: number; average: number | null };  // approved reviews only
}
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export function rollUp(slugs: string[], leads: LeadRow[], cta: CtaRow[], attr: AttributionRow[], reviews: ReviewRow[], now: Date = new Date()): ListingStats[] {
  const since = now.getTime() - 30 * 86_400_000;
  return slugs.map((slug) => {
    const L = leads.filter((l) => l.listing_slug === slug);
    const C = cta.filter((c) => c.slug === slug).map((c) => ({ label: String(c.cta || 'other'), clicks: n(c.clicks) })).sort((a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label));
    const A = attr.find((a) => a.slug === slug);
    const R = reviews.filter((r) => r.listing_slug === slug && typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5);
    return {
      slug,
      enquiries: { total: L.length, last30d: L.filter((l) => Date.parse(l.created_at) >= since).length, new: L.filter((l) => l.status === 'new').length },
      cta: C, ctaTotal: C.reduce((s, c) => s + c.clicks, 0),
      recommended: n(A?.impressions), recommendedClicks: n(A?.clicks),
      reviews: { count: R.length, average: R.length ? Math.round((R.reduce((s, r) => s + (r.rating as number), 0) / R.length) * 10) / 10 : null },
    };
  });
}

/** E-mail → the form the database stores and compares. '' when it is not a plausible address. */
export function normEmail(raw: unknown): string {
  const e = typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 254) : '';
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : '';
}
