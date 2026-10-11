// lib/business/data.ts — what a signed-in business may see and do, plus the desk's moderation of its proposals.
// Every function takes the service-role client as a parameter (injected I/O, unit-tested with a fake) and scopes every
// query to the listings the account VERIFIABLY owns right now (managedListings), never to ids supplied by the browser.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { escapeLike } from '@/lib/concierge/restoreToken';
import { coerceDescription, coercePhotos } from '@/lib/directory/moderation';
import {
  ACTION_TARGET, MAX_OPEN_PER_LISTING, OPEN_STATUSES, appliesToListing, canTransition, cleanNote, isEditable, isLeadStatus, noteRequired, rollUp,
  validateSubmission, type DeskAction, type LeadRow, type ListingStats, type SubmissionKind, type SubmissionStatus,
} from '@/lib/business/rules';
import type { BusinessAccount } from '@/lib/business/auth';

export interface ManagedListing { slug: string; name: string; type: string | null; district: string | null; status: string | null }

/** The listings this account owns right now: linked in business_listings AND still owner-verified for this e-mail address. */
export async function managedListings(sb: SupabaseClient, account: Pick<BusinessAccount, 'id' | 'email'>): Promise<ManagedListing[]> {
  const { data: links, error } = await sb.from('business_listings').select('listing_slug').eq('account_id', account.id);
  if (error || !links || links.length === 0) return [];
  const slugs = (links as { listing_slug: string }[]).map((l) => l.listing_slug);
  const { data, error: le } = await sb.from('directory_listings').select('slug, name_en, type, district, status, provenance, claim_contact')
    .in('slug', slugs).eq('provenance', 'owner-verified').ilike('claim_contact', escapeLike(account.email));
  if (le || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    slug: String(r.slug), name: String(r.name_en || r.slug), type: (r.type as string) ?? null, district: (r.district as string) ?? null, status: (r.status as string) ?? null,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

// ── leads inbox ──────────────────────────────────────────────────────────────
export interface LeadItem { id: string; listing_slug: string; listing_name: string | null; name: string; email: string; message: string | null; status: string; created_at: string }
export async function listLeads(sb: SupabaseClient, slugs: string[], limit = 200): Promise<LeadItem[]> {
  if (!slugs.length) return [];
  const { data, error } = await sb.from('directory_leads').select('id, listing_slug, listing_name, name, email, message, status, created_at')
    .in('listing_slug', slugs).order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data as LeadItem[];
}
/** Change the status of one enquiry — only if it belongs to one of the account's listings. */
export async function setLeadStatus(sb: SupabaseClient, slugs: string[], id: unknown, status: unknown): Promise<boolean> {
  if (!slugs.length || typeof id !== 'string' || !id || !isLeadStatus(status)) return false;
  const { data, error } = await sb.from('directory_leads').update({ status }).eq('id', id).in('listing_slug', slugs).select('id');
  return !error && !!data && data.length > 0;
}

// ── analytics (counters that already exist; nothing is invented) ───────────────────
export async function listingStats(sb: SupabaseClient, slugs: string[], now: Date = new Date()): Promise<ListingStats[]> {
  if (!slugs.length) return [];
  const [leads, cta, attr, reviews] = await Promise.all([
    sb.from('directory_leads').select('listing_slug, status, created_at').in('listing_slug', slugs).limit(5000),
    sb.from('cta_by_listing').select('slug, cta, clicks').in('slug', slugs),
    sb.from('listing_attribution').select('slug, impressions, clicks').in('slug', slugs),
    sb.from('directory_reviews').select('listing_slug, rating').in('listing_slug', slugs).eq('status', 'approved').limit(5000),
  ]);
  return rollUp(slugs, (leads.data || []) as LeadRow[], (cta.data || []) as never[], (attr.data || []) as never[], (reviews.data || []) as never[], now);
}

// ── submissions (business side) ────────────────────────────────────────────────────
export interface SubmissionItem {
  id: string; account_id: string; listing_slug: string; kind: SubmissionKind; payload: Record<string, unknown>; status: SubmissionStatus;
  desk_note: string | null; created_at: string; updated_at: string; reviewed_at: string | null; applied_at: string | null;
}
const SUB_COLS = 'id, account_id, listing_slug, kind, payload, status, desk_note, created_at, updated_at, reviewed_at, applied_at';

export async function listSubmissions(sb: SupabaseClient, accountId: string, limit = 100): Promise<SubmissionItem[]> {
  const { data, error } = await sb.from('business_submissions').select(SUB_COLS).eq('account_id', accountId).order('created_at', { ascending: false }).limit(limit);
  return error || !data ? [] : (data as SubmissionItem[]);
}

export type SubmitResult = { ok: true; id: string | null } | { ok: false; error: 'forbidden' | 'invalid' | 'limit' | 'failed'; detail?: string };

export async function createSubmission(sb: SupabaseClient, account: Pick<BusinessAccount, 'id' | 'email'>, input: { listingSlug: unknown; kind: unknown; payload: unknown }, now: Date = new Date()): Promise<SubmitResult> {
  const slug = typeof input.listingSlug === 'string' ? input.listingSlug : '';
  const owned = await managedListings(sb, account);
  if (!slug || !owned.some((l) => l.slug === slug)) return { ok: false, error: 'forbidden' };
  const v = validateSubmission(input.kind, input.payload);
  if (!v.ok) return { ok: false, error: 'invalid', detail: v.error };
  const { data: open, error: oe } = await sb.from('business_submissions').select('id').eq('account_id', account.id).eq('listing_slug', slug).in('status', [...OPEN_STATUSES]).limit(MAX_OPEN_PER_LISTING);
  if (oe) return { ok: false, error: 'failed' };
  if ((open || []).length >= MAX_OPEN_PER_LISTING) return { ok: false, error: 'limit' };
  const { data, error } = await sb.from('business_submissions').insert({
    account_id: account.id, listing_slug: slug, kind: input.kind, payload: v.payload, status: 'submitted', created_at: now.toISOString(), updated_at: now.toISOString(),
  }).select('id').maybeSingle();
  if (error) return { ok: false, error: 'failed' };
  return { ok: true, id: data ? String((data as { id: string }).id) : null };
}

/** Edit a proposal the desk sent back and put it in the queue again. */
export async function reviseSubmission(sb: SupabaseClient, account: Pick<BusinessAccount, 'id' | 'email'>, id: unknown, payload: unknown, now: Date = new Date()): Promise<SubmitResult> {
  if (typeof id !== 'string' || !id) return { ok: false, error: 'forbidden' };
  const { data: row } = await sb.from('business_submissions').select('id, account_id, listing_slug, kind, status').eq('id', id).eq('account_id', account.id).maybeSingle();
  const s = row as { id: string; listing_slug: string; kind: string; status: string } | null;
  if (!s || !isEditable(s.status) || !canTransition(s.status, 'submitted', 'business')) return { ok: false, error: 'forbidden' };
  if (!(await managedListings(sb, account)).some((l) => l.slug === s.listing_slug)) return { ok: false, error: 'forbidden' };
  const v = validateSubmission(s.kind, payload);
  if (!v.ok) return { ok: false, error: 'invalid', detail: v.error };
  const { data, error } = await sb.from('business_submissions').update({ payload: v.payload, status: 'submitted', updated_at: now.toISOString() })
    .eq('id', id).eq('account_id', account.id).eq('status', 'changes_requested').select('id');
  if (error || !data || data.length === 0) return { ok: false, error: 'failed' };
  return { ok: true, id };
}

export async function withdrawSubmission(sb: SupabaseClient, accountId: string, id: unknown, now: Date = new Date()): Promise<boolean> {
  if (typeof id !== 'string' || !id) return false;
  const { data, error } = await sb.from('business_submissions').update({ status: 'withdrawn', updated_at: now.toISOString() })
    .eq('id', id).eq('account_id', accountId).in('status', [...OPEN_STATUSES]).select('id');
  return !error && !!data && data.length > 0;
}

// ── desk side (admin, English) ───────────────────────────────────────────────────────
export interface QueueItem extends SubmissionItem {
  account_email: string; listing_name: string; current_description: string; current_photos: string[]; owner_still_verified: boolean;
}
export async function listQueue(sb: SupabaseClient, statuses: SubmissionStatus[] = ['submitted'], limit = 200): Promise<QueueItem[]> {
  const { data, error } = await sb.from('business_submissions').select(SUB_COLS).in('status', statuses).order('created_at', { ascending: true }).limit(limit);
  if (error || !data) return [];
  const subs = data as SubmissionItem[];
  const accIds = [...new Set(subs.map((s) => s.account_id))], slugs = [...new Set(subs.map((s) => s.listing_slug))];
  const [{ data: accs }, { data: ls }] = await Promise.all([
    accIds.length ? sb.from('business_accounts').select('id, email').in('id', accIds) : Promise.resolve({ data: [] }),
    slugs.length ? sb.from('directory_listings').select('slug, name_en, summary_en, owned_photos, provenance, claim_contact').in('slug', slugs) : Promise.resolve({ data: [] }),
  ]);
  const email = new Map(((accs || []) as { id: string; email: string }[]).map((a) => [a.id, a.email]));
  const listing = new Map(((ls || []) as Record<string, unknown>[]).map((l) => [String(l.slug), l]));
  return subs.map((s) => {
    const l = listing.get(s.listing_slug);
    const e = email.get(s.account_id) || '';
    return {
      ...s, account_email: e, listing_name: String(l?.name_en || s.listing_slug),
      current_description: String(l?.summary_en || ''), current_photos: Array.isArray(l?.owned_photos) ? (l!.owned_photos as unknown[]).map(String) : [],
      owner_still_verified: !!l && l.provenance === 'owner-verified' && String(l.claim_contact || '').toLowerCase() === e.toLowerCase(),
    };
  });
}

export type DecisionResult = { ok: true; status: SubmissionStatus; applied: 'description' | 'photos' | null } | { ok: false; error: string };

/**
 * Apply a desk decision. Approving a description/photos proposal writes it to the listing FIRST (as the existing owner-edit
 * queue does), then closes the proposal; approving `news` publishes nothing. The proposal must still be `submitted` and its
 * author must still own the listing, so a stale or superseded proposal can never overwrite a listing.
 */
export async function decideSubmission(
  sb: SupabaseClient, id: unknown, action: DeskAction, note: unknown, adminEmail: string | null, opts: { textStatusColumn: boolean }, now: Date = new Date(),
): Promise<DecisionResult> {
  if (typeof id !== 'string' || !id) return { ok: false, error: 'Missing submission id.' };
  const cleaned = cleanNote(note);
  if (noteRequired(action) && !cleaned) return { ok: false, error: 'Please write a short note: the business sees it.' };
  const { data: row } = await sb.from('business_submissions').select('id, account_id, listing_slug, kind, payload, status').eq('id', id).maybeSingle();
  const s = row as { id: string; account_id: string; listing_slug: string; kind: string; payload: Record<string, unknown>; status: string } | null;
  if (!s) return { ok: false, error: 'Submission not found.' };
  const target = ACTION_TARGET[action];
  if (!canTransition(s.status, target, 'desk')) return { ok: false, error: `This proposal is already ${s.status}.` };
  const stamp = { status: target, desk_note: cleaned || null, reviewed_at: now.toISOString(), reviewed_by: adminEmail, updated_at: now.toISOString() };

  let applied: 'description' | 'photos' | null = null;
  if (action === 'approve' && appliesToListing(s.kind)) {
    const { data: acc } = await sb.from('business_accounts').select('id, email, status').eq('id', s.account_id).maybeSingle();
    const a = acc as { id: string; email: string; status: string } | null;
    const { data: l } = await sb.from('directory_listings').select('slug, provenance, claim_contact').eq('slug', s.listing_slug).maybeSingle();
    const li = l as { provenance?: string; claim_contact?: string } | null;
    if (!a || a.status !== 'active' || !li || li.provenance !== 'owner-verified' || String(li.claim_contact || '').toLowerCase() !== a.email.toLowerCase()) {
      return { ok: false, error: 'The author no longer owns this listing: reject the proposal instead.' };
    }
    if (s.kind === 'description') {
      const text = coerceDescription(s.payload?.text);
      if (!text) return { ok: false, error: 'Proposed description is empty.' };
      const patch: Record<string, unknown> = { summary_en: text, updated_at: now.toISOString() };
      if (opts.textStatusColumn) patch.text_status = 'owned';
      const r = await sb.from('directory_listings').update(patch).eq('slug', s.listing_slug);
      if (r.error) return { ok: false, error: r.error.message };
      applied = 'description';
    } else {
      const photos = coercePhotos(s.payload?.urls);
      if (!photos.length) return { ok: false, error: 'Proposed photo list is empty.' };
      const r = await sb.from('directory_listings').update({ owned_photos: photos, updated_at: now.toISOString() }).eq('slug', s.listing_slug);
      if (r.error) return { ok: false, error: r.error.message };
      applied = 'photos';
    }
  }
  const { data: closed, error } = await sb.from('business_submissions')
    .update({ ...stamp, ...(applied ? { applied_at: now.toISOString() } : {}) }).eq('id', id).eq('status', 'submitted').select('id');
  if (error) return { ok: false, error: error.message };
  if (!closed || closed.length === 0) return { ok: false, error: 'This proposal was changed meanwhile (for example withdrawn). Reload the queue.' };
  return { ok: true, status: target, applied };
}
