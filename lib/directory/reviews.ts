// Cyprus Lifestyle — first-party directory reviews (server-only).
// Read/aggregate APPROVED reviews and submit new (pending) ones. All reads/writes
// go through the SERVICE ROLE (supabaseAdmin), matching lib/queries.ts — the
// public.directory_reviews table has RLS on with no public policies, so this is
// the only read path. Every function degrades cleanly ([]/null/{ok:false}) on
// error, mirroring the codebase's try/catch style, so a listing page never throws
// because of reviews.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DirectoryReview {
  id: string;
  listing_slug: string;
  author_name: string | null;
  rating: number;
  body: string | null;
  verified_visit: boolean;
  owner_reply: string | null;
  owner_reply_at: string | null;
  locale: string | null;
  created_at: string;
}

export interface FirstPartyRating {
  avg: number | null;   // Bayesian-smoothed average, or null when count === 0
  count: number;        // number of APPROVED reviews
}

export interface SubmitReviewInput {
  slug: string;
  author?: string | null;
  contact?: string | null;
  rating: number;
  body?: string | null;
  locale?: string | null;
}

// `author_contact` is intentionally NOT selected — it is private moderation data,
// never rendered publicly.
const REVIEW_COLS =
  'id, listing_slug, author_name, rating, body, verified_visit, owner_reply, owner_reply_at, locale, created_at';

/** Approved reviews for a listing, newest first. [] on empty or any error. */
export async function getApprovedReviews(slug: string, limit = 20): Promise<DirectoryReview[]> {
  const s = (slug || '').trim();
  if (!s) return [];
  const cap = Math.min(Math.max(Math.trunc(limit) || 20, 1), 50);
  try {
    const { data, error } = await supabaseAdmin()
      .from('directory_reviews')
      .select(REVIEW_COLS)
      .eq('listing_slug', s)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(cap);
    if (error || !Array.isArray(data)) return [];
    return data as unknown as DirectoryReview[];
  } catch {
    return [];
  }
}

/** First-party (owned) rating for a listing via the B3 RPC. null on error. */
export async function getFirstPartyRating(slug: string): Promise<FirstPartyRating | null> {
  const s = (slug || '').trim();
  if (!s) return null;
  try {
    const { data, error } = await supabaseAdmin().rpc('directory_first_party_rating', { slug: s });
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as { avg: number | string | null; count: number | string } | null | undefined;
    if (!row) return { avg: null, count: 0 };
    const count = Number(row.count) || 0;
    const avgNum = row.avg == null ? NaN : Number(row.avg);
    return { avg: Number.isFinite(avgNum) ? avgNum : null, count };
  } catch {
    return null;
  }
}

/** Insert a new review as status='pending' (awaiting moderation). */
export async function submitReview(input: SubmitReviewInput): Promise<{ ok: boolean; error?: string }> {
  const slug = (input.slug || '').trim().slice(0, 200);
  const rating = Math.trunc(Number(input.rating));
  if (!slug) return { ok: false, error: 'Missing listing.' };
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Rating must be between 1 and 5.' };
  try {
    const { error } = await supabaseAdmin().from('directory_reviews').insert({
      listing_slug: slug,
      author_name: (input.author ?? '').toString().trim().slice(0, 120) || null,
      author_contact: (input.contact ?? '').toString().trim().slice(0, 200) || null,
      rating,
      body: (input.body ?? '').toString().trim().slice(0, 4000) || null,
      locale: (input.locale ?? '').toString().trim().slice(0, 8) || null,
      status: 'pending',
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
