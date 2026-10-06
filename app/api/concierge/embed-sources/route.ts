// GET|POST /api/concierge/embed-sources[?batch=1][&force=1][&dry=1][&limit=N]
// Embeds published ARTICLES, published EVENTS and bookable EXPERIENCES into concierge_embeddings so the
// concierge can search them by meaning (supabase/migrations/20261006110000_concierge_sources.sql).
//
// Nightly use (increment 2.1b): pg_cron -> ops.cron_post('site', '/api/concierge/embed-sources?batch=1')
// authenticates with CRON_SECRET (header x-cron-secret or Authorization: Bearer). A signed-in admin or the
// ENRICH_SECRET key still work for manual runs.
//   • IDEMPOTENT  — only items whose text hash changed (or are new) are embedded; a second run costs nothing.
//     Upserts key on (source, ref), so overlapping runs cannot create duplicates.
//   • TIME-BOXED  — never starts an embedding call past ~45 s (Vercel Hobby limit is 60 s), and each call has a timeout.
//   • RESUMABLE   — the pending list is recomputed from stored hashes on every run, in a fixed order (events,
//     articles, experiences); a run that hit the budget simply leaves `remaining > 0` and the next run continues.
//   • ?dry=1 reports what WOULD be embedded (+ token estimate) and makes NO paid call.
//   • kb_docs: the ~816 scraped pages already have vectors in kb_embeddings (match_kb_docs reads them) — they are
//     NOT embedded a second time here. The response only reports how many published pages still lack a vector.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { embedBatch, hasEmbeddings, EMBED_MODEL } from '@/lib/concierge/embed';
import { keyGateDeny } from '@/lib/auth/keyGate';
import { isCronAuthorized } from '@/lib/cron';
import {
  articleDoc, eventDoc, activityDoc, planEmbeds, chunk, tokensOf, orderPending, canStartBatch, callTimeout,
  parseEmbedParams, EMBED_BATCH_SIZE, type EmbedDoc,
} from '@/lib/concierge/embedSources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Row = Record<string, unknown>;
const LOCS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
const loc = (b: string) => LOCS.map((l) => `${b}_${l}`).join(',');
const PAGE = 1000; // PostgREST caps a response at 1000 rows by default, so page explicitly (a single large limit is silently truncated)

async function pageAll(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<{ rows: Row[]; error?: string }> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) return { rows, error: error.message };
    const part = (data as Row[] | null) || [];
    rows.push(...part);
    if (part.length < PAGE) break;
  }
  return { rows };
}

async function loadDocs(): Promise<{ docs: EmbedDoc[]; error?: string }> {
  const sb = supabaseAdmin();
  const docs: EmbedDoc[] = [];
  const art = await pageAll((a, b) => sb.from('blog_posts').select(`slug,category,county,tags_en,content_en,${loc('title')},excerpt_en,summary_en`).eq('status', 'published').order('slug').range(a, b));
  if (art.error) return { docs, error: art.error };
  for (const r of art.rows) { const d = articleDoc(r); if (d) docs.push(d); }
  const ev = await pageAll((a, b) => sb.from('events').select(`slug,venue,district,organizer,tags,summary_en,${loc('title')}`).eq('status', 'published').order('slug').range(a, b));
  if (ev.error) return { docs, error: ev.error };
  for (const r of ev.rows) { const d = eventDoc(r); if (d) docs.push(d); }
  const ac = await pageAll((a, b) => sb.from('activities').select('external_id,title,kind,summary,town,landmark,district,tags,duration_label').eq('status', 'active').order('external_id').range(a, b));
  if (ac.error) return { docs, error: ac.error };
  for (const r of ac.rows) { const d = activityDoc(r); if (d) docs.push(d); }
  return { docs };
}

/** Free: how many published kb_docs have no (or a stale) vector. Reported only, never embedded here. */
async function kbDocsMissing(): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin().rpc('kb_docs_needing_embedding', { match_count: 1000 });
    if (error || !Array.isArray(data)) return null;
    return data.length;
  } catch { return null; }
}

const bySource = (list: EmbedDoc[]) => ({ article: list.filter((d) => d.source === 'article').length, event: list.filter((d) => d.source === 'event').length, activity: list.filter((d) => d.source === 'activity').length });

async function run(t0: number, force: boolean, dry: boolean, limit: number | null): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const { docs, error } = await loadDocs();
  if (error) return { ok: false, error };
  const existing = new Map<string, string>();
  if (!force) {
    const ex = await pageAll((a, b) => sb.from('concierge_embeddings').select('source,ref,content_hash').order('source').order('ref').range(a, b));
    if (ex.error) return { ok: false, error: `${ex.error} (has migration 20261006110000_concierge_sources.sql been run?)` };
    for (const r of ex.rows) existing.set(`${r.source}:${r.ref}`, String(r.content_hash || ''));
  }
  const pending = orderPending(planEmbeds(docs, existing, force));
  const kbMissing = await kbDocsMissing();
  if (dry) return { ok: true, dry: true, model: EMBED_MODEL, total: bySource(docs), changed: bySource(pending), approxTokens: tokensOf(pending), kbDocsMissingVectors: kbMissing, note: 'dry run: no embedding call was made' };
  if (pending.length === 0) return { ok: true, model: EMBED_MODEL, total: docs.length, changed: 0, embedded: 0, remaining: 0, done: true, kbDocsMissingVectors: kbMissing, elapsedMs: Date.now() - t0, note: 'Nothing new to embed.' };
  if (!hasEmbeddings()) return { ok: false, error: 'OPENAI_API_KEY not configured' };

  const todo = limit ? pending.slice(0, limit) : pending;
  let embedded = 0; let attempted = 0; let failed = 0; let stoppedBy: 'budget' | 'failure' | null = null;
  for (const part of chunk(todo, EMBED_BATCH_SIZE)) {
    const elapsed = Date.now() - t0;
    if (!canStartBatch(elapsed)) { stoppedBy = 'budget'; break; }
    const vecs = await embedBatch(part.map((d) => d.text), callTimeout(elapsed));
    attempted += part.length;
    const rows = part.map((d, i) => (vecs[i] ? { source: d.source, ref: d.ref, content_hash: d.hash, embedding: vecs[i] as number[], updated_at: new Date().toISOString() } : null)).filter(Boolean) as Row[];
    failed += part.length - rows.length;
    for (const sub of chunk(rows, 100)) {
      const { error: e } = await sb.from('concierge_embeddings').upsert(sub, { onConflict: 'source,ref' });
      if (e) return { ok: false, error: e.message, embedded, remaining: pending.length - embedded };
      embedded += sub.length;
    }
    // A failed call (quota, outage) is not retried in a loop: stop, and the next run picks the rest up.
    if (rows.length < part.length) { stoppedBy = 'failure'; break; }
  }
  const remaining = Math.max(0, pending.length - embedded);
  return {
    ok: true, model: EMBED_MODEL, total: docs.length, changed: pending.length, attempted, embedded, failed, remaining,
    done: remaining === 0, stoppedBy, kbDocsMissingVectors: kbMissing, elapsedMs: Date.now() - t0,
    note: remaining === 0 ? 'Sources fully embedded.' : stoppedBy === 'failure' ? 'An embedding call failed (key/quota?) — the rest stays pending for the next run.' : 'Time budget reached — the next run continues with the rest.',
  };
}

async function handle(req: NextRequest) {
  const t0 = Date.now();
  if (!isCronAuthorized(req)) {
    const deny = await keyGateDeny(req);
    if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  }
  const p = parseEmbedParams(req.nextUrl.searchParams);
  try {
    const out = await run(t0, p.force, p.dry, p.limit);
    return NextResponse.json(out, { status: out.ok === false && /OPENAI_API_KEY/.test(String(out.error)) ? 503 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
