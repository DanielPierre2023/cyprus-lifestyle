// GET  /api/concierge/saved?cid=&kind=   → the guest's saved items / trip plan
// POST /api/concierge/saved { cid, slug, kind, action:'add'|'remove', note? }
// Roadmap item 10. Server-persisted by anonymous cid (cross-device). Service role;
// scoped by cid here. Rate-limited, best-effort.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidCid } from '@/lib/concierge/memory';
import { normalizeKind, sanitizeSlug, isSaveAction } from '@/lib/concierge/saved';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cid = String(req.nextUrl.searchParams.get('cid') || '');
  if (!isValidCid(cid)) return NextResponse.json({ ok: true, items: [] });
  const kind = req.nextUrl.searchParams.get('kind');
  const sb = supabaseAdmin();
  let q = sb.from('saved_items').select('slug, kind, note, created_at').eq('cid', cid).order('created_at', { ascending: false }).limit(100);
  if (kind === 'trip' || kind === 'saved') q = q.eq('kind', kind);
  let items: { slug: string; kind: string; note: string | null }[] = [];
  try { const { data } = await q; items = (data as typeof items) || []; } catch { /* best-effort */ }
  // Hydrate with listing name/type/district for display.
  const slugs = items.map((i) => i.slug);
  const meta: Record<string, { name: string | null; type: string | null; district: string | null }> = {};
  if (slugs.length) {
    try {
      const { data } = await sb.from('directory_listings').select('slug, name_en, type, district').in('slug', slugs);
      for (const r of (data as { slug: string; name_en: string | null; type: string | null; district: string | null }[] | null) || []) {
        meta[r.slug] = { name: r.name_en, type: r.type, district: r.district };
      }
    } catch { /* names optional */ }
  }
  return NextResponse.json({ ok: true, items: items.map((i) => ({ ...i, ...(meta[i.slug] || {}) })) });
}

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'saved', 60, 60))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const cid = String(body.cid || '');
  const slug = sanitizeSlug(body.slug);
  const kind = normalizeKind(body.kind);
  const action = isSaveAction(body.action) ? body.action : 'add';
  if (!isValidCid(cid) || !slug) return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
  const sb = supabaseAdmin();
  try {
    if (action === 'remove') {
      await sb.from('saved_items').delete().eq('cid', cid).eq('slug', slug).eq('kind', kind);
    } else {
      await sb.from('saved_items').upsert({ cid, slug, kind, note: (body.note ? String(body.note).slice(0, 300) : null) }, { onConflict: 'cid,slug,kind' });
    }
  } catch { return NextResponse.json({ ok: false, error: 'could not save' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
