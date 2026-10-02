// lib/directory/moderation.ts
// ============================================================================
// Server-only engine for the admin MODERATION console (/admin/moderation).
// Two queues, both read/written ONLY via supabaseAdmin() (service role) behind the
// admin-auth check in app/api/admin/moderation/*:
//
//   1. OWNER EDITS — public.directory_listing_edits rows at status='pending',
//      proposed by owner-verified businesses through the owner editor
//      (lib/directory/owner.ts). The owner editor queues free-text / high-display-
//      risk fields here instead of publishing them live:
//        • field='description' — proposed_value is a JSON STRING (the text).
//        • field='photos'      — proposed_value is a JSON ARRAY of photo URLs.
//      APPROVE applies the proposed value to the listing (description → summary_en,
//      photos → owned_photos) and closes the edit 'approved'. REJECT closes it
//      'rejected'. Both stamp reviewed_at. The table is RLS service-role-only (no
//      policies), so this is the only access path — the browser can never read or
//      write it.
//
//   2. ENRICHMENT REVIEW — public.directory_listings at text_status='review': the
//      stub-enrichment job (lib/directory/enrich.ts) generated a blurb that failed
//      the grounding gate, so it held the row back and left summary_en hollow (kept
//      out of the sitemap). The desk can:
//        • 'save'    — hand-write summary_en (→ text_status='owned', first-party).
//        • 'requeue' — mark text_status='stub' so the next enrichment run retries.
//        • 'skip'    — leave it in 'review' (dismiss from the console for now).
//
// No new migration: this uses the tables/columns created by
// 20261001140000_owner_editor.sql and 20261001150000_stub_text_status.sql.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hasTextStatusColumn } from '@/lib/directory/enrich';
import { categoryLabel } from '@/lib/directory/taxonomy';

// ── pure helpers (unit-tested) ───────────────────────────────────────────────
export type EditAction = 'approve' | 'reject';
export type ReviewAction = 'save' | 'requeue' | 'skip';

/** The max length an admin-written / approved description may be (mirrors the owner
 *  editor's MAX_DESCRIPTION_LEN so the two paths agree). */
export const MAX_DESCRIPTION_LEN = 4000;

export function normalizeEditAction(v: unknown): EditAction | null {
  return v === 'approve' || v === 'reject' ? v : null;
}
export function normalizeReviewAction(v: unknown): ReviewAction | null {
  return v === 'save' || v === 'requeue' || v === 'skip' ? v : null;
}

/** Public directory URL for a listing. The site routes listings at
 *  /directory/<type>/<slug>; fall back to /directory/<slug> when type is unknown. */
export function listingUrl(type: string | null | undefined, slug: string): string {
  const t = String(type || '').trim();
  const s = String(slug || '').trim();
  return t ? `/directory/${t}/${s}` : `/directory/${s}`;
}

/**
 * Coerce a 'description' edit's proposed_value into plain text. supabase-js returns
 * a jsonb string as a JS string already; this also tolerates a double-encoded JSON
 * string literal ("\"…\"") and any other shape, so a malformed row never throws.
 */
export function coerceDescription(proposed: unknown): string {
  if (typeof proposed === 'string') {
    const s = proposed.trim();
    if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
      try { const inner = JSON.parse(s); if (typeof inner === 'string') return inner.trim(); } catch { /* not double-encoded */ }
    }
    return s;
  }
  if (proposed == null) return '';
  return String(proposed).trim();
}

/**
 * Coerce a 'photos' edit's proposed_value into a de-duplicated string[] of URLs.
 * supabase-js returns the jsonb array as a JS array; a stringified array is also
 * tolerated. The owner editor already sanitises these URLs before queueing them.
 */
export function coercePhotos(proposed: unknown): string[] {
  let arr: unknown[] = [];
  if (Array.isArray(proposed)) arr = proposed;
  else if (typeof proposed === 'string') {
    try { const p = JSON.parse(proposed); if (Array.isArray(p)) arr = p; } catch { /* not a JSON array */ }
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const u = String(x ?? '').trim();
    if (u && !seen.has(u)) { seen.add(u); out.push(u); }
  }
  return out;
}

// ── OWNER EDITS queue ─────────────────────────────────────────────────────────
export interface PendingEdit {
  id: string;
  listing_slug: string;
  field: string;                 // 'description' | 'photos'
  status: string;
  submitted_by: string | null;
  created_at: string;
  // joined listing context
  name: string;
  type: string | null;
  url: string;                   // public listing URL (type-aware)
  listing_found: boolean;        // false when the slug no longer resolves to a listing
  // current live value vs the proposed value (only the relevant pair is populated)
  current_description: string;
  proposed_description: string;
  current_photos: string[];
  proposed_photos: string[];
}

/** List pending owner edits, newest first, each joined to its listing's live values. */
export async function listPendingEdits(limit = 200): Promise<PendingEdit[]> {
  const sb = supabaseAdmin();
  const { data: edits, error } = await sb
    .from('directory_listing_edits')
    .select('id, listing_slug, field, proposed_value, status, submitted_by, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !edits) return [];

  const slugs = Array.from(new Set((edits as Record<string, unknown>[])
    .map((e) => String(e.listing_slug || '')).filter(Boolean)));
  const bySlug = new Map<string, Record<string, unknown>>();
  if (slugs.length) {
    const { data: listings } = await sb
      .from('directory_listings')
      .select('slug, name_en, type, summary_en, owned_photos')
      .in('slug', slugs);
    for (const l of (listings || []) as Record<string, unknown>[]) bySlug.set(String(l.slug), l);
  }

  return (edits as Record<string, unknown>[]).map((e) => {
    const slug = String(e.listing_slug || '');
    const l = bySlug.get(slug);
    const isDesc = e.field === 'description';
    const isPhotos = e.field === 'photos';
    return {
      id: String(e.id),
      listing_slug: slug,
      field: String(e.field),
      status: String(e.status),
      submitted_by: e.submitted_by ? String(e.submitted_by) : null,
      created_at: String(e.created_at),
      name: String((l?.name_en as string) || slug),
      type: l?.type ? String(l.type) : null,
      url: listingUrl(l?.type as string | null, slug),
      listing_found: !!l,
      current_description: isDesc ? String((l?.summary_en as string) || '') : '',
      proposed_description: isDesc ? coerceDescription(e.proposed_value) : '',
      current_photos: isPhotos && Array.isArray(l?.owned_photos) ? (l!.owned_photos as unknown[]).map(String) : [],
      proposed_photos: isPhotos ? coercePhotos(e.proposed_value) : [],
    };
  });
}

export interface EditDecisionResult {
  ok: boolean;
  status?: 'approved' | 'rejected';
  applied?: 'description' | 'photos' | null; // what was written to the listing on approve
  error?: string;
}

/**
 * Apply an admin decision to one pending owner edit. APPROVE writes the proposed
 * value onto the listing (description → summary_en + text_status='owned'; photos →
 * owned_photos), then closes the edit 'approved'. REJECT just closes it 'rejected'.
 * Both stamp reviewed_at. The edit must still be 'pending' (guards double-apply).
 */
export async function applyEditDecision(id: string, action: EditAction): Promise<EditDecisionResult> {
  const sb = supabaseAdmin();
  const eid = String(id || '').trim();
  if (!eid) return { ok: false, error: 'Missing edit id.' };

  const { data, error } = await sb
    .from('directory_listing_edits')
    .select('id, listing_slug, field, proposed_value, status')
    .eq('id', eid)
    .maybeSingle();
  const edit = data as Record<string, unknown> | null;
  if (error || !edit) return { ok: false, error: 'Edit not found.' };
  if (String(edit.status) !== 'pending') return { ok: false, error: `Edit is already ${String(edit.status)}.` };

  const nowIso = new Date().toISOString();
  const slug = String(edit.listing_slug || '');

  if (action === 'reject') {
    const { error: uErr } = await sb.from('directory_listing_edits')
      .update({ status: 'rejected', reviewed_at: nowIso })
      .eq('id', eid).eq('status', 'pending');
    if (uErr) return { ok: false, error: uErr.message };
    return { ok: true, status: 'rejected', applied: null };
  }

  // action === 'approve' — apply to the listing FIRST, then close the edit.
  let applied: 'description' | 'photos' | null = null;
  if (edit.field === 'description') {
    const text = coerceDescription(edit.proposed_value);
    if (!text) return { ok: false, error: 'Proposed description is empty.' };
    const patch: Record<string, unknown> = { summary_en: text, updated_at: nowIso };
    // Owner-approved copy is first-party: mark it 'owned' so enrichment never
    // overwrites it. Guarded because the text_status column is from a separate,
    // optional migration than the owner-edit tables.
    if (await hasTextStatusColumn()) patch.text_status = 'owned';
    const { error: lErr } = await sb.from('directory_listings').update(patch).eq('slug', slug);
    if (lErr) return { ok: false, error: lErr.message };
    applied = 'description';
  } else if (edit.field === 'photos') {
    const photos = coercePhotos(edit.proposed_value);
    const { error: lErr } = await sb.from('directory_listings')
      .update({ owned_photos: photos, updated_at: nowIso }).eq('slug', slug);
    if (lErr) return { ok: false, error: lErr.message };
    applied = 'photos';
  } else {
    return { ok: false, error: `Unsupported field "${String(edit.field)}".` };
  }

  const { error: cErr } = await sb.from('directory_listing_edits')
    .update({ status: 'approved', reviewed_at: nowIso })
    .eq('id', eid).eq('status', 'pending');
  if (cErr) return { ok: false, error: cErr.message };
  return { ok: true, status: 'approved', applied };
}

// ── ENRICHMENT REVIEW queue ───────────────────────────────────────────────────
export interface ReviewListing {
  slug: string;
  name: string;
  type: string | null;
  category: string | null;        // raw category key
  category_label: string | null;  // human label (taxonomy)
  district: string | null;
  url: string;
  current_summary: string;        // hollow by definition (held out of the sitemap)
  text_generated_at: string | null;
}

/** List listings the enrichment job held back for a human (text_status='review'). */
export async function listReviewListings(limit = 200): Promise<ReviewListing[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('directory_listings')
    .select('slug, name_en, type, canonical_category, category_group, district, summary_en, text_generated_at')
    .eq('text_status', 'review')
    .order('text_generated_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => {
    const catKey = (r.canonical_category as string) || (r.category_group as string) || '';
    return {
      slug: String(r.slug),
      name: String((r.name_en as string) || r.slug),
      type: r.type ? String(r.type) : null,
      category: catKey || null,
      category_label: catKey ? categoryLabel(catKey) : null,
      district: r.district ? String(r.district) : null,
      url: listingUrl(r.type as string | null, String(r.slug)),
      current_summary: String((r.summary_en as string) || ''),
      text_generated_at: r.text_generated_at ? String(r.text_generated_at) : null,
    };
  });
}

export interface ReviewDecisionResult {
  ok: boolean;
  action?: ReviewAction;
  text_status?: string;
  error?: string;
}

/**
 * Apply an admin decision to one in-review listing.
 *   'save'    — write the hand-authored summary_en and mark text_status='owned'.
 *   'requeue' — mark text_status='stub' so the next enrichment run retries it.
 *   'skip'    — no write; leave it in 'review' (the console just dismisses it).
 * save/requeue confirm the row is still in 'review' first, so they never clobber a
 * row that was meanwhile published or owned.
 */
export async function applyReviewDecision(slug: string, action: ReviewAction, text?: string): Promise<ReviewDecisionResult> {
  const sb = supabaseAdmin();
  const s = String(slug || '').trim();
  if (!s) return { ok: false, error: 'Missing slug.' };

  if (action === 'skip') return { ok: true, action: 'skip' };

  const nowIso = new Date().toISOString();
  const { data, error } = await sb.from('directory_listings')
    .select('slug, text_status').eq('slug', s).maybeSingle();
  const row = data as Record<string, unknown> | null;
  if (error || !row) return { ok: false, error: 'Listing not found.' };
  if (String(row.text_status || '') !== 'review') {
    return { ok: false, error: `Listing is not in review (text_status=${String(row.text_status || 'null')}).` };
  }

  if (action === 'requeue') {
    const { error: uErr } = await sb.from('directory_listings')
      .update({ text_status: 'stub', updated_at: nowIso }).eq('slug', s);
    if (uErr) return { ok: false, error: uErr.message };
    return { ok: true, action: 'requeue', text_status: 'stub' };
  }

  // action === 'save'
  const body = String(text ?? '').trim();
  if (!body) return { ok: false, error: 'Provide a description to save.' };
  if (body.length > MAX_DESCRIPTION_LEN) return { ok: false, error: `Description is too long (max ${MAX_DESCRIPTION_LEN} chars).` };
  const { error: uErr } = await sb.from('directory_listings')
    .update({ summary_en: body, text_status: 'owned', updated_at: nowIso }).eq('slug', s);
  if (uErr) return { ok: false, error: uErr.message };
  return { ok: true, action: 'save', text_status: 'owned' };
}
