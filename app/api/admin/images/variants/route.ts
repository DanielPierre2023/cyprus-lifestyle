// Admin: create the pre-resized WebP variants (480/960/1440) for Storage images that
// don't have them yet. One small batch per call so it stays inside Vercel Hobby's
// function budget; call repeatedly until { done: true }. Free: sharp + Supabase Storage.
//   POST { bucket?: "blog-images", limit?: 6, dryRun?: true, prefix?: "ai-covers" }
// Afterwards set NEXT_PUBLIC_IMAGE_VARIANTS=1 in Vercel and redeploy to start serving them.
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { backfillBucket } from '@/lib/imageVariants.node';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKETS = new Set(['blog-images']);

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { bucket?: unknown; limit?: unknown; dryRun?: unknown; prefix?: unknown };
  const bucket = typeof b.bucket === 'string' ? b.bucket : 'blog-images';
  if (!BUCKETS.has(bucket)) return NextResponse.json({ ok: false, error: 'bucket not allowed' }, { status: 400 });
  const limit = Math.min(12, Math.max(1, Number(b.limit) || 6));
  const prefix = typeof b.prefix === 'string' && /^[a-z0-9][a-z0-9/_-]{0,80}$/i.test(b.prefix) ? b.prefix : '';
  const result = await backfillBucket(supabaseAdmin(), bucket, { limit, dryRun: b.dryRun === true, prefix });
  return NextResponse.json({ ok: true, ...result });
}
