// GET|POST /api/concierge/embed-sources?key=<ENRICH_SECRET>[&force=1][&dry=1]
// Re-runnable job: embed published ARTICLES, published EVENTS and bookable EXPERIENCES into
// concierge_embeddings so the concierge can search them by meaning (see
// supabase/migrations/20261006110000_concierge_sources.sql). Only items whose text changed are
// re-embedded (content_hash) unless ?force=1. ?dry=1 reports what WOULD be embedded and the
// estimated token count, and makes NO paid call. Needs OPENAI_API_KEY; gated like embed-directory.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { embedBatch, hasEmbeddings, EMBED_MODEL } from '@/lib/concierge/embed';
import { keyGateDeny as denyReason } from '@/lib/auth/keyGate';
import { articleDoc, eventDoc, activityDoc, planEmbeds, chunk, tokensOf, type EmbedDoc } from '@/lib/concierge/embedSources';

export const runtime = 'nodejs';
export const maxDuration = 60;
type Row = Record<string, unknown>;
const LOCS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
const loc = (b: string) => LOCS.map((l) => `${b}_${l}`).join(',');

async function loadDocs(): Promise<{ docs: EmbedDoc[]; error?: string }> {
  const sb = supabaseAdmin();
  const docs: EmbedDoc[] = [];
  const art = await sb.from('blog_posts').select(`slug,category,county,tags_en,content_en,${loc('title')},excerpt_en,summary_en`).eq('status', 'published').limit(5000);
  if (art.error) return { docs, error: art.error.message };
  for (const r of (art.data as unknown as Row[]) || []) { const d = articleDoc(r); if (d) docs.push(d); }
  const ev = await sb.from('events').select(`slug,venue,district,organizer,tags,summary_en,${loc('title')}`).eq('status', 'published').limit(2000);
  if (ev.error) return { docs, error: ev.error.message };
  for (const r of (ev.data as unknown as Row[]) || []) { const d = eventDoc(r); if (d) docs.push(d); }
  const ac = await sb.from('activities').select('external_id,title,kind,summary,town,landmark,district,tags,duration_label').eq('status', 'active').limit(5000);
  if (ac.error) return { docs, error: ac.error.message };
  for (const r of (ac.data as unknown as Row[]) || []) { const d = activityDoc(r); if (d) docs.push(d); }
  return { docs };
}

async function run(force: boolean, dry: boolean): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const { docs, error } = await loadDocs();
  if (error) return { ok: false, error };
  const existing = new Map<string, string>();
  if (!force) {
    for (let from = 0; ; from += 1000) {
      const { data, error: e } = await sb.from('concierge_embeddings').select('source,ref,content_hash').range(from, from + 999);
      if (e) return { ok: false, error: `${e.message} (has migration 20261006110000_concierge_sources.sql been run?)` };
      const rows = (data as Row[] | null) || [];
      for (const r of rows) existing.set(`${r.source}:${r.ref}`, String(r.content_hash || ''));
      if (rows.length < 1000) break;
    }
  }
  const pending = planEmbeds(docs, existing, force);
  const bySource = (list: EmbedDoc[]) => ({ article: list.filter((d) => d.source === 'article').length, event: list.filter((d) => d.source === 'event').length, activity: list.filter((d) => d.source === 'activity').length });
  if (dry) return { ok: true, dry: true, model: EMBED_MODEL, total: bySource(docs), changed: bySource(pending), approxTokens: tokensOf(pending), note: 'dry run: no embedding call was made' };
  if (!hasEmbeddings()) return { ok: false, error: 'OPENAI_API_KEY not configured' };

  const started = Date.now(); const BUDGET_MS = 50_000;
  let embedded = 0; let done = 0;
  for (const part of chunk(pending, 128)) {
    if (Date.now() - started > BUDGET_MS) break;
    const vecs = await embedBatch(part.map((d) => d.text));
    const rows = part.map((d, i) => (vecs[i] ? { source: d.source, ref: d.ref, content_hash: d.hash, embedding: vecs[i] as number[], updated_at: new Date().toISOString() } : null)).filter(Boolean) as Row[];
    for (const sub of chunk(rows, 100)) {
      const { error: e } = await sb.from('concierge_embeddings').upsert(sub, { onConflict: 'source,ref' });
      if (e) return { ok: false, error: e.message, embedded };
      embedded += sub.length;
    }
    done += part.length;
  }
  const remaining = Math.max(0, pending.length - done);
  return { ok: true, model: EMBED_MODEL, total: docs.length, changed: pending.length, embedded, remaining, note: remaining > 0 ? 'Time budget reached — call again to embed the rest.' : 'Sources fully embedded.' };
}

async function handle(req: NextRequest) {
  const deny = await denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await run(sp.get('force') === '1', sp.get('dry') === '1'));
}
export const GET = handle;
export const POST = handle;
