// Admin — backfill the German / Polish / Russian editions for LEGACY articles.
//
// When Cyprus Lifestyle ran four editions (en·el·ro·ar), articles scraped or
// seeded then have NULL de/pl/ru columns and fall back to English at render — the
// one thing we never want. Newer articles (desk pipeline + 0032) already ship all
// seven. This route finds the gaps and fills them with real, structure-preserving
// translations of the stored English, using the same translator + anti-AI
// humanizer as the live pipeline. Idempotent (skips editions already present),
// batched (bounded work per call so it never trips the serverless timeout), and
// cost-visible (GET reports the exact backlog before you spend a cent).
//
//   GET                       → diagnostic: how many (article × edition) gaps remain
//   POST { limit?, targets?, includeDrafts? } → fill up to `limit` gaps, report the rest
//
// `targets` defaults to de/pl/ru (the editions the four-edition era left NULL); it
// also accepts any subset of the six non-English editions to patch legacy el/ro/ar gaps.
//
// Auth: an admin session, OR `Authorization: Bearer <BACKFILL_SECRET>` for a
// headless loop. Every gap filled is one fewer English fallback on the site.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/supabase/server';
import { translateHtml, translateBundle } from '@/lib/translate';
import { isLocale, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap; raise to 300 on Vercel Pro for bigger batches

const TARGETS: Locale[] = ['de', 'pl', 'ru']; // default backfill scope (the de/pl/ru gap)
// Any non-English edition MAY be requested via POST { targets } to patch legacy gaps
// (e.g. an older el/ro/ar row missing a field). en is the source, never a target.
const ALLOWED_TARGETS: Locale[] = ['el', 'ro', 'ar', 'de', 'pl', 'ru'];
const FETCH_CAP = 2000; // rows scanned per call to build the backlog

const empty = (v: unknown) => v == null || String(v).trim() === '';

// The English source fields + every target field we may fill, so we can respect
// any edition that already exists and only translate what's genuinely missing.
function selectCols(targets: Locale[]): string {
  const en = ['title_en', 'content_en', 'excerpt_en', 'summary_en', 'seo_title_en', 'seo_description_en', 'tags_en'];
  const tgt = targets.flatMap((l) => [`title_${l}`, `content_${l}`, `excerpt_${l}`, `summary_${l}`, `seo_title_${l}`, `seo_description_${l}`, `tags_${l}`]);
  return ['id', 'slug', 'status', ...en, ...tgt].join(',');
}

type Row = Record<string, unknown> & { id: string; slug: string; status: string };

// An edition is "missing" when its title OR its body is absent — the two fields a
// reader actually sees. (A stray empty SEO field alone isn't worth a model call.)
function missingLangs(r: Row, targets: Locale[]): Locale[] {
  return targets.filter((l) => empty(r[`title_${l}`]) || empty(r[`content_${l}`]));
}

async function loadBacklog(targets: Locale[], includeDrafts: boolean): Promise<Row[]> {
  let q = supabaseAdmin().from('blog_posts').select(selectCols(targets))
    .not('content_en', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(FETCH_CAP);
  if (!includeDrafts) q = q.eq('status', 'published');
  const { data } = await q;
  const rows = ((data as Row[] | null) || []).filter((r) => !empty(r.content_en));
  return rows.filter((r) => missingLangs(r, targets).length > 0);
}

async function authed(req: NextRequest): Promise<boolean> {
  if (await isAdmin()) return true;
  const secret = process.env.BACKFILL_SECRET || process.env.CRON_SECRET;
  if (secret) {
    const hdr = req.headers.get('authorization') || '';
    if (hdr === `Bearer ${secret}`) return true;
  }
  return false;
}

function parseTargets(raw: unknown): Locale[] {
  if (!Array.isArray(raw)) return TARGETS;
  const t = [...new Set(raw.map(String).filter(isLocale).filter((l) => ALLOWED_TARGETS.includes(l as Locale)))] as Locale[];
  return t.length ? t : TARGETS;
}

// GET — pure diagnostic. Counts the backlog without translating anything, so the
// desk can see the scope (and cost) before running the fill.
export async function GET(req: NextRequest) {
  if (!(await authed(req))) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const includeDrafts = new URL(req.url).searchParams.get('includeDrafts') === '1';
  const rows = await loadBacklog(TARGETS, includeDrafts);
  const byLang: Record<string, number> = { de: 0, pl: 0, ru: 0 };
  let tasks = 0;
  for (const r of rows) for (const l of missingLangs(r, TARGETS)) { byLang[l]++; tasks++; }
  return NextResponse.json({
    ok: true,
    articles_with_gaps: rows.length,
    edition_gaps: byLang,
    tasks_remaining: tasks,
    note: 'POST { limit } to fill. Each task = one article × one edition (≈2 model calls). Idempotent.',
  });
}

// POST — fill up to `limit` (article × edition) gaps, then report what's left.
export async function POST(req: NextRequest) {
  if (!(await authed(req))) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(1, Number(body.limit) || 3), 8); // bound per-call work
  const targets = parseTargets(body.targets);
  const includeDrafts = body.includeDrafts === true;

  const rows = await loadBacklog(targets, includeDrafts);

  // Flatten to (row, lang) tasks and take this batch.
  const tasks: { row: Row; lang: Locale }[] = [];
  for (const r of rows) for (const l of missingLangs(r, targets)) tasks.push({ row: r, lang: l });
  const batch = tasks.slice(0, limit);

  const sb = supabaseAdmin();
  const processed: { slug: string; lang: string; ok: boolean }[] = [];

  await Promise.all(batch.map(async ({ row, lang }) => {
    try {
      const [bodyRes, bundle] = await Promise.all([
        translateHtml(String(row.content_en || ''), 'en', lang),
        translateBundle({
          title: String(row.title_en || ''),
          excerpt: String(row.excerpt_en || ''),
          summary: String(row.summary_en || ''),
          seo_title: String(row.seo_title_en || ''),
          seo_description: String(row.seo_description_en || ''),
          tags: Array.isArray(row.tags_en) ? (row.tags_en as string[]).join(', ') : '',
        }, 'en', lang),
      ]);

      // Only write editions that are still empty — never clobber an existing or
      // hand-edited translation.
      const patch: Record<string, unknown> = {};
      const setIf = (col: string, val: unknown) => { if (empty(row[col]) && val != null && String(val).trim() !== '') patch[col] = val; };
      if (bodyRes.ok && bodyRes.html) setIf(`content_${lang}`, bodyRes.html);
      setIf(`title_${lang}`, bundle.title);
      setIf(`excerpt_${lang}`, bundle.excerpt);
      setIf(`summary_${lang}`, bundle.summary);
      setIf(`seo_title_${lang}`, bundle.seo_title);
      setIf(`seo_description_${lang}`, bundle.seo_description);
      const tags = (bundle.tags || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (empty(row[`tags_${lang}`]) && tags.length) patch[`tags_${lang}`] = tags;

      if (Object.keys(patch).length) await sb.from('blog_posts').update(patch).eq('id', row.id);
      processed.push({ slug: row.slug, lang, ok: !!(bodyRes.ok || Object.keys(patch).length) });
    } catch (e) {
      processed.push({ slug: row.slug, lang, ok: false });
      void e;
    }
  }));

  return NextResponse.json({
    ok: true,
    processed,
    filled: processed.filter((p) => p.ok).length,
    tasks_remaining: Math.max(0, tasks.length - batch.length),
    note: tasks.length > batch.length ? 'More remain — POST again to continue.' : 'Backlog clear for the selected scope.',
  });
}
