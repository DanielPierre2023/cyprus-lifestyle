// Admin: create the pre-resized WebP variants (480/960/1440) for Storage images that
// don't have them yet. One small batch per call so it stays inside Vercel Hobby's
// function budget; call repeatedly until { done: true }. Free: sharp + Supabase Storage.
//   POST { bucket?: "blog-images", limit?: 6, dryRun?: true, prefix?: "ai-covers" }
//   POST { path: "covers/123-abc.jpg" }   - ONE just-uploaded image (the cover picker calls this after a browser upload)
// Afterwards set NEXT_PUBLIC_IMAGE_VARIANTS=1 in Vercel and redeploy to start serving them.
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { backfillBucket, ensureVariants } from '@/lib/imageVariants.node';
import { isRasterPath, isVariantPath } from '@/lib/imageVariants';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKETS = new Set(['blog-images']);

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { bucket?: unknown; limit?: unknown; dryRun?: unknown; prefix?: unknown; path?: unknown };
  const bucket = typeof b.bucket === 'string' ? b.bucket : 'blog-images';
  if (!BUCKETS.has(bucket)) return NextResponse.json({ ok: false, error: 'bucket not allowed' }, { status: 400 });
  if (typeof b.path === 'string') {
    if (!isRasterPath(b.path) || isVariantPath(b.path) || !/^[a-z0-9][a-z0-9/_.-]{0,200}$/i.test(b.path) || b.path.includes('..')) {
      return NextResponse.json({ ok: false, error: 'path not allowed' }, { status: 400 });
    }
    const sb = supabaseAdmin();
    const { data: blob, error } = await sb.storage.from(bucket).download(b.path);
    if (error || !blob) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    const created = await ensureVariants(sb, bucket, b.path, Buffer.from(await blob.arrayBuffer()));
    return NextResponse.json({ ok: true, created });
  }
  const limit = Math.min(12, Math.max(1, Number(b.limit) || 6));
  const prefix = typeof b.prefix === 'string' && /^[a-z0-9][a-z0-9/_-]{0,80}$/i.test(b.prefix) ? b.prefix : '';
  const result = await backfillBucket(supabaseAdmin(), bucket, { limit, dryRun: b.dryRun === true, prefix });
  return NextResponse.json({ ok: true, ...result });
}
