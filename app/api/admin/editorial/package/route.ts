// POST /api/admin/editorial/package   (admin session-gated)
// Generate the SEO + editorial package (excerpt, summary, SEO title/description,
// tags, FAQ) for a piece — the on-demand + backfill path (e.g. for pieces written
// before packaging existed, like the Feedos review).
//
// Two modes:
//   A) { id, all?, locale? }         — read the piece from the DB, generate the
//        package for `locale` (default = its source edition) from that edition's body,
//        and SAVE it. With all:true, also translate the package into the other six
//        editions and save them. Returns a summary.
//   B) { content: { title, body, locale?, category?, place?, franchise?, kind? } }
//        — STATELESS: generate a package and return it, writing nothing. Used by the
//        editor's "AI SEO" button so it can fill the fields before the piece is saved.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { packagePiece, translatePackage } from '@/lib/editorial/generate';
import { packageColumns, packageIsEmpty, pieceToPackageInput } from '@/lib/editorial/packageWrite';
import { LOCALES } from '@/lib/editorial/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

const asStr = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  // ── Mode B: stateless generate (editor button, pre-save) ──────────────────────
  const content = body.content && typeof body.content === 'object' ? body.content as Record<string, unknown> : null;
  if (content) {
    const title = asStr(content.title);
    const text = asStr(content.body);
    if (!title && !text) return NextResponse.json({ ok: false, error: 'Provide content.title and/or content.body.' }, { status: 400 });
    const pkg = await packagePiece({
      title, body: text, locale: asStr(content.locale) || 'en',
      category: asStr(content.category) || null, place: asStr(content.place) || null,
      franchise: asStr(content.franchise) || null, kind: asStr(content.kind) || null,
    });
    return NextResponse.json({ ok: true, package: pkg });
  }

  // ── Mode A: read piece, generate + save ───────────────────────────────────────
  const id = asStr(body.id);
  if (!id) return NextResponse.json({ ok: false, error: 'Provide { id } or { content }.' }, { status: 400 });
  const all = body.all === true;

  const sb = supabaseAdmin();
  const { data: piece, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error || !piece) return NextResponse.json({ ok: false, error: 'Piece not found.' }, { status: 404 });
  const p = piece as Record<string, unknown>;
  const source = asStr(p.source_lang) || 'en';
  const locale = asStr(body.locale) || source;

  // Generate the requested edition's package from its own body (falling back to en).
  const gen = await packagePiece(pieceToPackageInput(p, locale));
  if (packageIsEmpty(gen)) {
    return NextResponse.json({ ok: false, error: 'Could not generate a package (no body to write from, or the model failed).' }, { status: 502 });
  }
  const upd: Record<string, unknown> = { ...packageColumns(locale, gen) };
  const done: string[] = [locale];

  if (all) {
    // Translate the just-generated package into every other edition.
    const targets = LOCALES.filter((l) => l !== locale);
    const results = await Promise.all(targets.map(async (l) => ({ l, pkg: await translatePackage(gen, l) })));
    for (const r of results) {
      if (r.pkg && !packageIsEmpty(r.pkg)) { Object.assign(upd, packageColumns(r.l, r.pkg)); done.push(r.l); }
    }
  }

  const { error: ue } = await sb.from('blog_posts').update(upd).eq('id', id);
  if (ue) return NextResponse.json({ ok: false, error: `Generated but could not save: ${ue.message}` }, { status: 500 });

  return NextResponse.json({
    ok: true, id, locale, locales: done.sort(),
    package: gen,
    note: all ? `SEO package written for all ${done.length} editions.` : `SEO package written for ${locale}.`,
  });
}
