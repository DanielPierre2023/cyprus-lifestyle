// GET|POST /api/concierge/embed-directory?key=<ENRICH_SECRET>[&force=1]
// Re-runnable job: embed every concierge-visible directory listing (status
// 'published' OR 'listed' — the latter being the bulk import) into
// directory_embeddings so the concierge can search the whole directory by meaning
// (see 0051 + 0105). Only listings whose text changed are
// re-embedded (content_hash) unless ?force=1. Needs OPENAI_API_KEY, gated by
// ENRICH_SECRET. Works within maxDuration; if a very large directory can't finish
// in one pass, the response reports `remaining` > 0 — simply call it again.
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { embedBatch, hasEmbeddings, EMBED_MODEL } from '@/lib/concierge/embed';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LOCS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;
const SELECT = [
  'slug', 'type', 'subtype', 'category_group', 'district', 'address', 'price_band', 'luxury', 'tags',
  ...LOCS.map((l) => `name_${l}`), ...LOCS.map((l) => `summary_${l}`),
].join(',');

type Row = Record<string, unknown>;

// A rich, multilingual document per listing — what it is, where it is, how it
// feels — so oblique queries in any of the seven languages can match by meaning.
function dirDoc(r: Row): string {
  const s = (k: string) => (r[k] == null ? '' : String(r[k]).trim());
  const nameEn = s('name_en') || s('name_el') || s('slug');
  const parts: string[] = [];
  const cls = [s('type'), s('subtype'), s('category_group')].filter(Boolean).join(' / ');
  parts.push(cls ? `${nameEn} — ${cls}` : nameEn);
  const where = [s('district'), s('address')].filter(Boolean).join(', ');
  if (where) parts.push(where);
  const band = [s('price_band'), r.luxury ? 'luxury' : ''].filter(Boolean).join(' ');
  if (band) parts.push(band);
  const tags = Array.isArray(r.tags) ? (r.tags as unknown[]).map(String).filter(Boolean) : [];
  if (tags.length) parts.push('Tags: ' + tags.join(', '));
  for (const l of LOCS) {
    const summ = s(`summary_${l}`); if (summ) parts.push(summ);
    const nm = s(`name_${l}`); if (nm && nm !== nameEn) parts.push(nm);
  }
  return parts.join('\n').slice(0, 6000);
}

const hashOf = (t: string) => createHash('sha256').update(t).digest('hex');

async function run(force: boolean): Promise<Record<string, unknown>> {
  if (!hasEmbeddings()) return { ok: false, error: 'OPENAI_API_KEY not configured' };
  const sb = supabaseAdmin();
  const started = Date.now();
  const BUDGET_MS = 45_000;

  // Existing hashes — so we only re-embed listings whose text actually changed.
  const existing = new Map<string, string>();
  if (!force) {
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from('directory_embeddings').select('slug,content_hash').range(from, from + 999);
      const rows = (data as Row[] | null) || [];
      for (const r of rows) existing.set(String(r.slug), String(r.content_hash || ''));
      if (rows.length < 1000) break;
    }
  }

  // Page through all published listings; collect the ones needing (re)embedding.
  const pending: { slug: string; doc: string; h: string }[] = [];
  let total = 0;
  const PAGE = 500;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('directory_listings').select(SELECT)
      .in('status', ['published', 'listed']).order('slug').range(from, from + PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const rows = (data as unknown as Row[] | null) || [];
    total += rows.length;
    for (const r of rows) {
      const slug = String(r.slug || ''); if (!slug) continue;
      const doc = dirDoc(r); const h = hashOf(doc);
      if (force || existing.get(slug) !== h) pending.push({ slug, doc, h });
    }
    if (rows.length < PAGE) break;
  }

  // Embed the changed listings in batches, upserting as we go, within the budget.
  // Anything not reached is picked up on the next call (its hash stays unwritten).
  let embedded = 0;
  const BATCH = 96;
  let i = 0;
  for (; i < pending.length; i += BATCH) {
    if (Date.now() - started > BUDGET_MS) break;
    const chunk = pending.slice(i, i + BATCH);
    const vecs = await embedBatch(chunk.map((c) => c.doc));
    const rows = chunk
      .map((c, j) => (vecs[j] ? { slug: c.slug, embedding: vecs[j] as number[], content_hash: c.h, updated_at: new Date().toISOString() } : null))
      .filter(Boolean) as { slug: string; embedding: number[]; content_hash: string; updated_at: string }[];
    if (rows.length) {
      const { error } = await sb.from('directory_embeddings').upsert(rows, { onConflict: 'slug' });
      if (error) return { ok: false, error: error.message, embedded };
      embedded += rows.length;
    }
  }

  const remaining = Math.max(0, pending.length - i);
  return {
    ok: true, model: EMBED_MODEL, total, changed: pending.length, embedded,
    skipped: total - pending.length, remaining,
    note: remaining > 0 ? 'Time budget reached — call again to embed the rest.' : 'Directory fully embedded.',
  };
}

// A clear reason instead of a bare "unauthorized", so the cause is obvious.
function denyReason(req: NextRequest): string | null {
  if (!process.env.ENRICH_SECRET) {
    return 'ENRICH_SECRET is not set on the server. Add it in Vercel → Settings → Environment Variables, redeploy, then call this URL with ?key=<that same value>.';
  }
  if ((req.nextUrl.searchParams.get('key') || '') !== process.env.ENRICH_SECRET) {
    return 'Unauthorized — the ?key= value does not match ENRICH_SECRET set on the server.';
  }
  return null;
}

export async function GET(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req.nextUrl.searchParams.get('force') === '1'));
}
export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req.nextUrl.searchParams.get('force') === '1'));
}
