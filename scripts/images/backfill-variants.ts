// Local CLI: create the pre-resized WebP variants for Supabase Storage images.
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/images/backfill-variants.ts [--bucket blog-images] [--apply] [--batch 20]
// Default is a DRY RUN (lists what it would do). Free: sharp + Supabase Storage only.
import { createClient } from '@supabase/supabase-js';
import { backfillBucket } from '../../lib/imageVariants.node';

const arg = (n: string, d?: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const apply = process.argv.includes('--apply');
const bucket = arg('bucket', 'blog-images')!;
const batch = Number(arg('batch', '20'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  let created = 0, failed = 0;
  for (let round = 1; round <= 500; round++) {
    const r = await backfillBucket(sb, bucket, { limit: batch, dryRun: !apply });
    created += r.created; failed += r.failed;
    console.log(`round ${round}: scanned ${r.scanned}, ${apply ? 'created' : 'would create'} ${r.created}, skipped ${r.skipped}, failed ${r.failed}`);
    r.notes.slice(0, 5).forEach((n) => console.log('  ', n));
    if (r.done || !apply) break; // a dry run lists one batch only
  }
  console.log(`${apply ? 'created' : 'would create'} ${created}, failed ${failed}`);
  if (!apply) console.log('Dry run. Re-run with --apply, then set NEXT_PUBLIC_IMAGE_VARIANTS=1 in Vercel and redeploy.');
})();
