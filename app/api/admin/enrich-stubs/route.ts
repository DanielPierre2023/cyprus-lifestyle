// Admin — STUB ENRICHMENT for the public directory.
//
// ~2,066 PUBLISHED directory_listings carry a HOLLOW "stub" summary (empty / too
// short / placeholder / boilerplate). They are live and indexable, which hurts SEO
// and trust. This route finds them and fills summary_en with a GROUNDED, model-
// generated 2-4 sentence description built ONLY from the fields the listing already
// has (name, category, district, tags, its own imported text) — no invented prices
// or claims. A validation gate rejects anything doubtful and marks it 'review'
// instead of publishing it. The sitemap SEO gate keeps still-hollow stubs out of
// the index until a real description exists, and lets a filled one back in
// automatically. Idempotent, batched, concurrency-capped, resumable, dry-run-first.
//
//   GET                     → DRY-RUN census: how many stubs remain (by type) + a cost estimate
//   POST { limit?, concurrency?, translate?, model?, dryRun? }
//                           → generate + write up to `limit` stubs, then report
//
// Auth: an admin session, OR `Authorization: Bearer <ENRICH_STUBS_SECRET>` (falls
// back to CRON_SECRET) for a headless drain loop (see scripts/enrich-stubs.ts).
// Mirrors app/api/admin/backfill-translations (the house pattern for bulk jobs).
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { countStubs, enrichStubs } from '@/lib/directory/enrich';
import { costUsd, modelIds } from '@/lib/journalism/models';
import { auditAdminRequest } from '@/lib/auditRequest';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap; raise to 300 on Vercel Pro for bigger batches

// Rough per-row spend: the English blurb is ~600 tokens in and ~150 out plus ~1,500 of thinking, priced from the same table the
// model client uses, + the 25% COST_MARKUP_PCT the ai layer applies. Actuals are logged to ai_spend_log; this is only a planning estimate.
const rowUsd = (inTok: number, outTok: number) => costUsd(modelIds(process.env).luna, { inputTokens: inTok, cachedTokens: 0, outputTokens: outTok, reasoningTokens: 0 }, process.env) * 1.25;
const USD_PER_ROW_EN = +rowUsd(600, 1_650).toFixed(6);
// Translation (opt-in) adds six faithful translations of a short text (each ~400 in, ~1,500 out); ~6x.
const USD_PER_ROW_TRANSLATED = +(USD_PER_ROW_EN + 6 * rowUsd(400, 1_500)).toFixed(6);

async function authed(req: NextRequest): Promise<boolean> {
  if (await isAdmin()) return true;
  const secret = process.env.ENRICH_STUBS_SECRET || process.env.CRON_SECRET;
  if (secret) {
    const hdr = req.headers.get('authorization') || '';
    if (hdr === `Bearer ${secret}`) return true;
  }
  return false;
}

// GET — pure diagnostic. Counts the stub backlog (by type) without generating or
// writing anything, so the desk sees the scope and cost before spending a cent.
export async function GET(req: NextRequest) {
  if (!(await authed(req))) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const census = await countStubs();
  return NextResponse.json({
    ok: true,
    published_scanned: census.publishedScanned,
    stubs: census.stubs,
    owner_verified_skipped: census.ownerVerifiedSkipped,
    already_generated: census.alreadyGenerated,
    by_type: census.byType,
    cost_estimate_usd: {
      english_only: +(census.stubs * USD_PER_ROW_EN).toFixed(2),
      with_translation: +(census.stubs * USD_PER_ROW_TRANSLATED).toFixed(2),
      per_row_en: USD_PER_ROW_EN,
      per_row_translated: USD_PER_ROW_TRANSLATED,
    },
    note: 'POST { limit } to fill a batch. Idempotent + resumable — POST again to continue. English blurb only by default; pass translate:true to also fill the six other editions.',
  });
}

// POST — generate + write up to `limit` stubs, then report what is left.
export async function POST(req: NextRequest) {
  if (!(await authed(req))) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  auditAdminRequest(req, 'enrich-stubs');
  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun === true;
  // Bound per-call work so it never trips the serverless timeout. Translation is ~6x
  // the model calls per row, so the ceiling is lower when it is on.
  const translate = body.translate === true;
  const hardMax = translate ? 8 : 20;   // a reasoning model needs seconds per row, and the route has 60
  const limit = Math.min(Math.max(1, Number(body.limit) || 10), hardMax);
  const concurrency = Math.min(Math.max(1, Number(body.concurrency) || 4), 8);
  const model = typeof body.model === 'string' && body.model ? body.model : undefined;

  const report = await enrichStubs({ limit, dryRun, concurrency, translate, model });

  return NextResponse.json({
    ok: true,
    ...report,
    note: dryRun
      ? 'Dry run — nothing written.'
      : (report.candidates >= limit
        ? 'A full batch was processed — more may remain. POST again to continue (idempotent).'
        : 'Backlog clear for this scope.'),
  });
}
