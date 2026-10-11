// lib/imageVariants.node.ts — generate + backfill the pre-resized WebP variants
// (480/960/1440 px) of Supabase Storage images with `sharp`. Server-only; no paid API.
// Used by scripts/images/backfill-variants.ts (local CLI) and
// app/api/admin/images/variants (admin button / curl, one small batch per 60 s call).
//
// Storage cost: free tier = 1 GB. A 1440-px WebP cover is ~100-180 KB, so ~350 KB per
// image for all three - a 1.5-2 MB AI PNG becomes ~0.35 MB of variants (the original is
// kept; delete nothing). Free egress is 5 GB/month, which smaller files also stretch.
// NOTE: deliberately no `import 'server-only'` - the local CLI (tsx) imports this too. Never import from a Client Component.
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LADDER, VARIANT_DIR, VARIANT_QUALITY, isRasterPath, isVariantPath, variantPath } from '@/lib/imageVariants';

/** Resize one source into every ladder step (never upscales; small sources yield same-size WebPs). */
export async function makeVariants(source: Buffer): Promise<Array<{ width: number; bytes: Buffer }>> {
  const base = sharp(source, { failOn: 'none' }).rotate();
  const out: Array<{ width: number; bytes: Buffer }> = [];
  for (const width of LADDER) {
    const bytes = await base.clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: VARIANT_QUALITY, effort: 4 })
      .toBuffer();
    out.push({ width, bytes });
  }
  return out;
}

export interface BackfillResult { scanned: number; created: number; skipped: number; failed: number; done: boolean; notes: string[] }

/** Every raster object under `prefix` (recursive), excluding the variant folder. */
async function* walk(sb: SupabaseClient, bucket: string, prefix: string): AsyncGenerator<string> {
  const PAGE = 100;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data?.length) return;
    for (const e of data) {
      const p = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.name === VARIANT_DIR && !prefix) continue;
      if (e.id === null) yield* walk(sb, bucket, p);   // folder
      else if (isRasterPath(p) && !isVariantPath(p)) yield p;
    }
    if (data.length < PAGE) return;
  }
}

/**
 * Create the missing variants for up to `limit` originals. Idempotent: an original whose
 * largest variant already exists is skipped, so repeated calls walk forward through the bucket.
 */
export async function backfillBucket(
  sb: SupabaseClient,
  bucket: string,
  opts: { limit?: number; dryRun?: boolean; prefix?: string } = {},
): Promise<BackfillResult> {
  const limit = opts.limit ?? 6;
  const res: BackfillResult = { scanned: 0, created: 0, skipped: 0, failed: 0, done: true, notes: [] };
  const store = sb.storage.from(bucket);
  for await (const path of walk(sb, bucket, opts.prefix ?? '')) {
    res.scanned++;
    const last = variantPath(path, LADDER[LADDER.length - 1]);
    const dir = last.includes('/') ? last.slice(0, last.lastIndexOf('/')) : '';
    const name = last.slice(last.lastIndexOf('/') + 1);
    const { data: have } = await store.list(dir, { search: name, limit: 1 });
    if (have?.some((f) => f.name === name)) { res.skipped++; continue; }
    if (res.created + res.failed >= limit) { res.done = false; break; }
    if (opts.dryRun) { res.created++; res.notes.push(`would create variants for ${path}`); continue; }
    try {
      const { data: blob, error } = await store.download(path);
      if (error || !blob) throw new Error(error?.message || 'download failed');
      const variants = await makeVariants(Buffer.from(await blob.arrayBuffer()));
      for (const v of variants) {
        const { error: upErr } = await store.upload(variantPath(path, v.width), v.bytes, {
          contentType: 'image/webp', cacheControl: '31536000', upsert: true,
        });
        if (upErr) throw new Error(upErr.message);
      }
      res.created++;
    } catch (e) {
      res.failed++;
      res.notes.push(`${path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return res;
}

/** Call right after uploading a NEW image so it never needs the backfill. Best-effort. */
export async function ensureVariants(sb: SupabaseClient, bucket: string, path: string, bytes: Buffer): Promise<boolean> {
  if (!isRasterPath(path) || isVariantPath(path)) return false;
  try {
    for (const v of await makeVariants(bytes)) {
      const { error } = await sb.storage.from(bucket).upload(variantPath(path, v.width), v.bytes, {
        contentType: 'image/webp', cacheControl: '31536000', upsert: true,
      });
      if (error) return false;
    }
    return true;
  } catch { return false; }
}
