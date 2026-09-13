// Cyprus Lifestyle — processing queue (Node port of TT enqueue/process-rewrite-job
// + sweep_stuck_rewrite_jobs). Claims pending scraped_articles using the unique
// active-article lock (uq_rewrite_jobs_active_article), processes within a time
// budget, and frees crashed locks via the sweeper. Safe to run from Vercel Cron.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { processScrapedArticle, type ScrapedRow } from '@/lib/desk/pipeline';

const SELECT = 'id, original_title, original_content, original_content_full, category, county, original_url, cover_image, status, is_used, marked_for_deletion';

export interface BatchResult { claimed: number; committed: number; failed: number; skipped_locked: number; swept: number; ids: string[] }

// Acquire the per-article lock by inserting a 'processing' rewrite_jobs row.
// The unique partial index makes a second concurrent claim fail with 23505.
async function acquire(sb: SupabaseClient, articleId: string): Promise<string | null> {
  const { data, error } = await sb.from('rewrite_jobs')
    .insert({ article_id: articleId, scraped_article_id: articleId, status: 'processing', started_at: new Date().toISOString() })
    .select('id').single();
  if (error) return null;               // 23505 (locked) or other → don't process
  return (data as { id: string }).id;
}

async function release(sb: SupabaseClient, jobId: string, ok: boolean, msg?: string) {
  await sb.from('rewrite_jobs').update({
    status: ok ? 'done' : 'failed',
    finished_at: new Date().toISOString(),
    error_message: ok ? null : (msg || 'error'),
    error_code: ok ? null : 'desk_error',
  }).eq('id', jobId);
}

export async function processBatch(
  sb: SupabaseClient,
  opts: { autoPublish: boolean; max?: number; deadlineMs?: number },
): Promise<BatchResult> {
  const max = opts.max ?? 5;
  const deadline = Date.now() + (opts.deadlineMs ?? 240_000); // stay under maxDuration
  const res: BatchResult = { claimed: 0, committed: 0, failed: 0, skipped_locked: 0, swept: 0, ids: [] };

  // Free any locks left by a crashed/timed-out run.
  const { data: swept } = await sb.rpc('sweep_stuck_rewrite_jobs');
  res.swept = typeof swept === 'number' ? swept : 0;

  const { data: rows } = await sb.from('scraped_articles')
    .select(SELECT)
    .eq('status', 'scraped').eq('is_used', false)
    .or('marked_for_deletion.is.null,marked_for_deletion.eq.false')
    .order('created_at', { ascending: true })
    .limit(max * 3);

  const candidates = (rows || []) as Array<ScrapedRow & { status: string }>;
  for (const row of candidates) {
    if (res.committed + res.failed >= max) break;
    if (Date.now() > deadline) break;

    const jobId = await acquire(sb, row.id);
    if (!jobId) { res.skipped_locked++; continue; }
    res.claimed++;

    try {
      const out = await processScrapedArticle(sb, row, opts.autoPublish);
      if (out.ok) {
        await sb.from('scraped_articles').update({ is_used: true }).eq('id', row.id);
        await release(sb, jobId, true);
        res.committed++; res.ids.push(out.postId || row.id);
      } else {
        await sb.from('scraped_articles').update({ status: 'error', error_message: out.error || 'desk error' }).eq('id', row.id);
        await release(sb, jobId, false, out.error);
        res.failed++;
      }
    } catch (e) {
      await sb.from('scraped_articles').update({ status: 'error', error_message: (e as Error).message }).eq('id', row.id);
      await release(sb, jobId, false, (e as Error).message);
      res.failed++;
    }
  }
  return res;
}
