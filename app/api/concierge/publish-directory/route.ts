// GET|POST /api/concierge/publish-directory?key=<ENRICH_SECRET>[&dryRun=1]
// Make the GOOD imported ('listed') businesses public — never dump thin rows. The
// ~14.7k imported directory rows sit at status='listed': the concierge searches them,
// but the public/Google never see them, because the 0018 RLS policy exposes only
// status='published'. This flips 'listed' -> 'published' (stamping published_at) for
// rows that pass a strict PREMIUM quality gate, in batches within a ~45s budget.
//
// THE QUALITY GATE — a 'listed' row is publish-ready ONLY if ALL of:
//   • lat AND lng are not null                                 (mappable)
//   • image is non-empty OR source_image is non-empty          (has a photo)
//   • source_description is non-empty OR summary_en is non-empty(has text)
//   • canonical_category is not null AND <> 'general-vendor'    (properly classified)
// The gate is enforced in code (isReady) as the single source of truth, so a row that
// fails it is NEVER published — whatever DB pre-filters are used to find candidates fast.
//
// ?dryRun=1  -> returns counts only { ready, notReady, alreadyPublished }, modifies nothing.
// (no dryRun) -> publishes publish-ready rows in batches, returns { published, remainingReady }.
// Re-runnable and chunked: call repeatedly until "remainingReady":0. Needs ENRICH_SECRET.
// Additive: it only changes status/published_at of rows that pass the gate; RLS is untouched.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PAGE = 1000;                 // rows scanned per DB page (tiny columns, so pages fly)
const UPDATE_CHUNK = 200;          // ids per UPDATE (matches the other directory drains)
const PUBLISH_BUDGET_MS = 42_000;  // leave headroom under maxDuration for the remaining count
const COUNT_BUDGET_MS = 12_000;    // cap the best-effort remaining/ready scan

// Only the columns the gate needs. status is filtered in the query.
const SELECT = 'id,lat,lng,image,source_image,source_description,summary_en,canonical_category';

interface Row {
  id: string;
  lat: number | null;
  lng: number | null;
  image: string | null;
  source_image: string | null;
  source_description: string | null;
  summary_en: string | null;
  canonical_category: string | null;
}

// Mirrors the SQL gate EXACTLY (a Postgres `<> ''` matches a non-empty string; a lone
// space counts as non-empty, so we do NOT trim). `!= null` treats 0 as present (lat/lng
// near the equator/meridian never occur in Cyprus, but 0 is still a real coordinate).
const nonEmpty = (s: string | null): boolean => s != null && s !== '';
function isReady(r: Row): boolean {
  return (
    r.lat != null && r.lng != null &&
    (nonEmpty(r.image) || nonEmpty(r.source_image)) &&
    (nonEmpty(r.source_description) || nonEmpty(r.summary_en)) &&
    r.canonical_category != null && r.canonical_category !== 'general-vendor'
  );
}

type Sb = ReturnType<typeof supabaseAdmin>;

// A fresh keyset page of 'listed' candidates, pre-filtered on the unambiguous, index-
// backed part of the gate (directory_publish_ready_idx). isReady() still re-checks the
// full gate per row, so the photo/text half is what actually decides publication.
function candidatePage(sb: Sb, after: string) {
  let q = sb
    .from('directory_listings')
    .select(SELECT)
    .eq('status', 'listed')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('canonical_category', 'is', null)
    .neq('canonical_category', 'general-vendor')
    .order('id')
    .limit(PAGE);
  if (after) q = q.gt('id', after);
  return q;
}

// Count 'listed' rows that pass the FULL gate. Best-effort under a time cap (like the
// other directory drains' counts); `capped` says whether the scan ran out of time.
async function countReady(sb: Sb): Promise<{ ready: number; capped: boolean }> {
  const started = Date.now();
  let ready = 0, after = '';
  for (;;) {
    if (Date.now() - started > COUNT_BUDGET_MS) return { ready, capped: true };
    const { data, error } = await candidatePage(sb, after);
    if (error) return { ready, capped: true };
    const rows = (data as Row[] | null) || [];
    if (!rows.length) break;
    after = rows[rows.length - 1].id;
    ready += rows.filter(isReady).length;
  }
  return { ready, capped: false };
}

async function headCount(sb: Sb, status: string): Promise<number | null> {
  try {
    const { count } = await sb
      .from('directory_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    return count ?? null;
  } catch {
    return null;
  }
}

// dryRun: counts only, modifies nothing.
async function preview(): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const listedTotal = await headCount(sb, 'listed');
  const alreadyPublished = await headCount(sb, 'published');
  const { ready, capped } = await countReady(sb);
  const notReady = listedTotal != null ? Math.max(listedTotal - ready, 0) : null;
  return {
    ok: true,
    dryRun: true,
    ready,
    notReady,
    alreadyPublished,
    listedTotal,
    approximate: capped || undefined,
    note: capped
      ? 'Counts are a partial scan (time budget) — the numbers are a lower bound; call again for a fuller count.'
      : `${ready} listed row(s) are publish-ready under the gate. Call without dryRun to publish them.`,
  };
}

// Live run: publish publish-ready rows in batches within the time budget.
async function run(): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const started = Date.now();
  const nowIso = new Date().toISOString();
  let published = 0, after = '';

  for (;;) {
    if (Date.now() - started > PUBLISH_BUDGET_MS) break;
    const { data, error } = await candidatePage(sb, after);
    if (error) return { ok: false, error: error.message, published };
    const rows = (data as Row[] | null) || [];
    if (!rows.length) break;
    after = rows[rows.length - 1].id; // advance keyset BEFORE publishing (published rows fall out of future pages, which start at id > after)

    const readyIds = rows.filter(isReady).map((r) => r.id);
    for (let i = 0; i < readyIds.length; i += UPDATE_CHUNK) {
      const chunk = readyIds.slice(i, i + UPDATE_CHUNK);
      // Re-guard status='listed' on the UPDATE so a concurrent run can never double-
      // publish or touch a row that isn't still listed.
      const { error: ue, count } = await sb
        .from('directory_listings')
        .update({ status: 'published', published_at: nowIso }, { count: 'exact' })
        .in('id', chunk)
        .eq('status', 'listed');
      if (!ue) published += count ?? chunk.length;
    }
  }

  const { ready: remainingReady, capped } = await countReady(sb);
  return {
    ok: true,
    published,
    remainingReady,
    remainingApproximate: capped || undefined,
    note: remainingReady > 0
      ? 'Time budget reached — call again to publish the rest (repeat until "remainingReady":0).'
      : 'All publish-ready listed businesses are now public.',
  };
}

function denyReason(req: NextRequest): string | null {
  if (!process.env.ENRICH_SECRET) return 'ENRICH_SECRET is not set on the server. Add it in Vercel → Settings → Environment Variables, redeploy, then call this URL with ?key=<that same value>.';
  if ((req.nextUrl.searchParams.get('key') || '') !== process.env.ENRICH_SECRET) return 'Unauthorized — the ?key= value does not match ENRICH_SECRET set on the server.';
  return null;
}

async function handle(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  if (req.nextUrl.searchParams.get('dryRun') === '1') return NextResponse.json(await preview());
  return NextResponse.json(await run());
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
