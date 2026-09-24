// GET|POST /api/editorial/polish?key=<ENRICH_SECRET>&id=<blog_post_id>[&locale=en]
// The pipeline's editing pass: take a draft and elevate it to the House standard —
// enforce the franchise format, lift the craft to NYT/Vogue/WaPo level, and strip
// every AI tell (em dashes, tell-tale phrases) — in the given edition. Writes the
// polished title + body back and reports the AI tells before/after. Key-gated.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { denyReason } from '@/lib/editorial/gate';
import { isLocale, isPieceKind, type PieceKind } from '@/lib/editorial/pipeline';
import { polishPiece } from '@/lib/editorial/generate';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(req: NextRequest): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const id = req.nextUrl.searchParams.get('id') || '';
  const locale = req.nextUrl.searchParams.get('locale') || 'en';
  if (!id) return { ok: false, error: 'Provide ?id=<blog_post_id>.' };
  if (!isLocale(locale)) return { ok: false, error: `Unknown locale "${locale}".` };

  const { data, error } = await sb.from('blog_posts')
    .select(`id, franchise, kind, title_${locale}, content_${locale}`)
    .eq('id', id).maybeSingle();
  if (error || !data) return { ok: false, error: 'Piece not found.' };
  const row = data as Record<string, unknown>;
  const title = String(row[`title_${locale}`] || '');
  const body = String(row[`content_${locale}`] || '');
  if (!body.trim()) return { ok: false, error: `This piece has no ${locale} body to polish yet.` };
  const kind = (typeof row.kind === 'string' && isPieceKind(row.kind) ? row.kind : 'feature') as PieceKind;
  const franchise = typeof row.franchise === 'string' ? row.franchise : null;

  const res = await polishPiece(title, body, franchise, kind, locale);
  if (res.error || !res.bodyMd) return { ok: false, error: res.error || 'Polish produced nothing.', tellsBefore: res.tellsBefore };

  const upd: Record<string, unknown> = { [`content_${locale}`]: res.bodyMd };
  if (res.title) upd[`title_${locale}`] = res.title;
  const { error: uErr } = await sb.from('blog_posts').update(upd).eq('id', id);
  if (uErr) return { ok: false, error: `Polished, but could not save: ${uErr.message}` };

  return {
    ok: true, id, locale,
    tellsBefore: res.tellsBefore, tellsAfter: res.tellsAfter,
    removed: res.tellsBefore.filter((t) => !res.tellsAfter.includes(t)),
    note: res.tellsAfter.length ? 'Polished. A few flags remain — run again or review by hand.' : 'Polished — no AI tells detected.',
  };
}

export async function GET(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
