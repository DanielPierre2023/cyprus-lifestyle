// Admin: editorial quality scan. Read-only. Walks the most recent published
// blog_posts and, for every non-source edition, flags (a) untranslated editions
// (empty or still serving English) and (b) how AI the local draft reads.
// The shared scan logic lives in '@/lib/editorial/qualityScan' — a Next.js route
// module may only export HTTP handlers + config, so nothing else is exported here.
//   GET|POST /api/admin/editorial/quality-scan?includeDrafts=1&limit=150
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SCAN_COLS, WORST_CAP, clampLimit, scanPosts, rankWorst, type RawPost } from '@/lib/editorial/qualityScan';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Shared read + scan for GET and POST. Reads with the service-role client, having
// already gated on isAdmin(); strictly read-only.
async function runScan(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('includeDrafts') === '1';
  const limit = clampLimit(searchParams.get('limit'));

  const sb = supabaseAdmin();
  let q = sb
    .from('blog_posts')
    .select(SCAN_COLS)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!includeDrafts) q = q.eq('status', 'published');

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // supabase-js widens a non-literal select() to GenericStringError[]; bridge via unknown.
  const { scanned, perLang, editions } = scanPosts((data as unknown as RawPost[] | null) || []);
  const worst = rankWorst(editions, WORST_CAP);
  return NextResponse.json({ ok: true, scanned, includeDrafts, limit, perLang, worst });
}

export async function GET(req: NextRequest) {
  return runScan(req);
}
export async function POST(req: NextRequest) {
  return runScan(req);
}
