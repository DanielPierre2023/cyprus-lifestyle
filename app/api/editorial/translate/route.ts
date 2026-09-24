// POST /api/editorial/translate?id=<pieceId>&key=<ENRICH_SECRET>
// Translate the drafted source edition into the other six editions, looping the
// seven locales (en, el, ro, ar, de, pl, ru) — the source locale is left as-is.
// Writes title_<locale> / content_<locale> for each and advances pipeline_status to
// 'translating'. Key-gated like the concierge routes.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { denyReason } from '@/lib/editorial/gate';
import { translatePiece, translatePackage, packagePiece } from '@/lib/editorial/generate';
import { LOCALES } from '@/lib/editorial/pipeline';
import { packageColumns, packageFromPiece, packageIsEmpty, pieceToPackageInput } from '@/lib/editorial/packageWrite';
import type { PackageResult } from '@/lib/editorial/generate';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(req: NextRequest): Promise<Record<string, unknown>> {
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return { ok: false, error: 'Missing ?id= (the piece id).' };
  const sb = supabaseAdmin();

  const { data: piece, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false, error: `Could not load the piece: ${error.message}` };
  if (!piece) return { ok: false, error: 'No piece with that id.' };
  const p = piece as Record<string, unknown>;

  const source = (typeof p.source_lang === 'string' && p.source_lang) || 'en';
  const srcTitle = String(p[`title_${source}`] || '');
  const srcBody = String(p[`content_${source}`] || '');
  if (!srcBody.trim()) return { ok: false, error: `The source edition (${source}) has no body yet — draft the piece before translating.` };

  // Mark the piece as being translated.
  await sb.from('blog_posts').update({ pipeline_status: 'translating' }).eq('id', id);

  // The SEO + editorial package is translated alongside the body, so every edition
  // ships complete (excerpt, summary, SEO title/description, tags, FAQ). If the source
  // edition has no package yet (an older piece), generate it once from the source body.
  let sourcePkg = packageFromPiece(p, source);
  if (packageIsEmpty(sourcePkg)) {
    const gen = await packagePiece(pieceToPackageInput(p, source, srcBody));
    if (!packageIsEmpty(gen)) {
      sourcePkg = gen;
      await sb.from('blog_posts').update(packageColumns(source, gen)).eq('id', id);
    }
  }
  const havePkg = !packageIsEmpty(sourcePkg);

  // Loop the seven locales; the source is a no-op. The other six run in parallel
  // (Haiku, independent) so the whole set finishes within the function budget. Each
  // locale translates the body AND the package concurrently.
  const targets = LOCALES.filter((l) => l !== source);
  const results = await Promise.all(
    targets.map(async (locale) => {
      const [t, pkg] = await Promise.all([
        translatePiece(srcTitle, srcBody, locale),
        havePkg ? translatePackage(sourcePkg, locale) : Promise.resolve<PackageResult | null>(null),
      ]);
      return { locale, ...t, pkg };
    }),
  );

  const upd: Record<string, unknown> = {};
  const translated: string[] = [];
  const failed: { locale: string; error: string }[] = [];
  for (const r of results) {
    // The package is independent of the body: store it whenever we have one, even if
    // the body translation for that edition failed and will be retried.
    if (r.pkg && !packageIsEmpty(r.pkg)) Object.assign(upd, packageColumns(r.locale, r.pkg));
    if (r.error || !r.body) { failed.push({ locale: r.locale, error: r.error || 'empty translation' }); continue; }
    upd[`content_${r.locale}`] = r.body;
    if (r.title) upd[`title_${r.locale}`] = r.title;
    translated.push(r.locale);
  }

  if (Object.keys(upd).length) {
    const { error: ue } = await sb.from('blog_posts').update(upd).eq('id', id);
    if (ue) return { ok: false, error: `Translated but could not save: ${ue.message}`, translated, failed };
  }

  return {
    ok: failed.length === 0,
    id,
    source,
    translated,
    failed,
    pipeline_status: 'translating',
    note: failed.length
      ? `Translated ${translated.length}/${targets.length}; retry to fill the ${failed.length} that failed.`
      : `All ${translated.length} editions translated. Next: schedule, then POST /api/editorial/publish?id=${id}`,
  };
}

export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
