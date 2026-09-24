// Admin: editorial quality scan. Read-only. Walks the most recent published
// blog_posts and, for every non-source edition, flags the two failure modes the
// desk cares about:
//   (a) untranslated — the edition is empty, or it is still serving the English
//       copy verbatim instead of the local language;
//   (b) AI-tell — how much the local-language draft still reads as machine output,
//       via scoreAiTells() from '@/lib/antiAi'.
// The pure helpers (stripHtml / scanPosts / rankWorst) are exported so the
// /admin/quality page and the unit test share one implementation — Next only
// reads the HTTP-method and config exports here, the rest are plain modules.
//   GET|POST /api/admin/editorial/quality-scan?includeDrafts=1&limit=150
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { scoreAiTells, type Lang } from '@/lib/antiAi';

export const runtime = 'nodejs';
export const maxDuration = 60;

// The seven editions Cyprus Lifestyle publishes. Kept as a plain string list so
// the scoreAiTells cast below compiles whether '@/lib/antiAi' currently types Lang
// as four languages or the full seven (the anti-AI module is being extended in
// parallel); an edition it does not yet know is scored as English until it lands.
export const LANGS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;
export type Edition = (typeof LANGS)[number];

export const EDITION_NAMES: Record<Edition, string> = {
  en: 'English', el: 'Greek', ro: 'Romanian', ar: 'Arabic', de: 'German', pl: 'Polish', ru: 'Russian',
};

const DEFAULT_LIMIT = 150;
const MAX_LIMIT = 300;
export const WORST_CAP = 50;

// Every column the scan needs: identity + status + each edition's title and body.
export const SCAN_COLS = [
  'id', 'slug', 'status', 'source_lang', 'published_at', 'created_at',
  ...LANGS.map((l) => `title_${l}`),
  ...LANGS.map((l) => `content_${l}`),
].join(', ');

export type Level = 'clean' | 'low' | 'medium' | 'high';

export interface EditionFinding {
  id: string;
  slug: string;
  title: string;
  lang: Edition;
  untranslated: boolean;
  score: number;
  level: Level;
}

export interface LangSummary {
  total: number;        // non-source editions of this language across scanned posts
  untranslated: number; // editions that are empty or still serving English
  scored: number;       // translated editions actually scored in this language
  avgScore: number;     // mean AI-tell score over `scored` editions (0 when none)
  high: number;         // scored editions whose AI level is 'high'
}

export interface ScanResult {
  scanned: number;
  perLang: Record<Edition, LangSummary>;
  editions: EditionFinding[]; // every non-source edition finding (unranked)
}

// Raw blog_posts row — dynamic title_/content_ columns, so index-signature typed.
export interface RawPost {
  id?: string | number | null;
  slug?: string | null;
  status?: string | null;
  source_lang?: string | null;
  [key: string]: unknown;
}

// Minimal, dependency-free HTML → text. Drops script/style, strips tags, unwraps a
// few common entities and collapses whitespace. Both editions being compared are
// stripped the same way, so consistency matters more than perfect decoding.
export function stripHtml(html: unknown): string {
  if (!html) return '';
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:#39|apos|rsquo|lsquo);/gi, "'")
    .replace(/&[#0-9a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// source_lang normalised to a known edition; anything unexpected defaults to en.
function sourceOf(v: unknown): Edition {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return (LANGS as readonly string[]).includes(s) ? (s as Edition) : 'en';
}

function emptyPerLang(): Record<Edition, LangSummary> {
  return Object.fromEntries(
    LANGS.map((l) => [l, { total: 0, untranslated: 0, scored: 0, avgScore: 0, high: 0 }]),
  ) as Record<Edition, LangSummary>;
}

// Pure: turn raw rows into per-edition findings + per-language rollups. No I/O, so
// the route, the page and the test all run exactly the same scan.
export function scanPosts(posts: RawPost[]): ScanResult {
  const perLang = emptyPerLang();
  const scoreSum = Object.fromEntries(LANGS.map((l) => [l, 0])) as Record<Edition, number>;
  const editions: EditionFinding[] = [];

  for (const p of posts) {
    const src = sourceOf(p.source_lang);
    const enStripped = stripHtml(p.content_en);
    const id = p.id == null ? '' : String(p.id);
    const slug = str(p.slug);

    for (const l of LANGS) {
      if (l === src) continue; // only editions that should be translations of the source
      const stripped = stripHtml(p[`content_${l}`]);
      // Untranslated: nothing there, or (for a non-English edition) byte-identical
      // to the English body — i.e. English is being served in its place.
      const untranslated =
        stripped === '' || (l !== 'en' && enStripped !== '' && stripped === enStripped);

      const r = scoreAiTells({ title: str(p[`title_${l}`]), content: stripped, lang: l as Lang });
      const title = str(p[`title_${l}`]) || str(p.title_en) || slug || '(untitled)';

      const sum = perLang[l];
      sum.total += 1;
      if (untranslated) {
        sum.untranslated += 1;
      } else {
        // Averages/high counts cover translated editions only — scoring served
        // English under a non-English edition would be noise in the local metric.
        sum.scored += 1;
        scoreSum[l] += r.score;
        if (r.level === 'high') sum.high += 1;
      }
      editions.push({ id, slug, title, lang: l, untranslated, score: r.score, level: r.level });
    }
  }

  for (const l of LANGS) {
    perLang[l].avgScore = perLang[l].scored ? Math.round(scoreSum[l] / perLang[l].scored) : 0;
  }
  return { scanned: posts.length, perLang, editions };
}

// Pure: worst offenders — untranslated editions first, then by AI score descending.
export function rankWorst(editions: EditionFinding[], cap: number = WORST_CAP): EditionFinding[] {
  return [...editions]
    .sort((a, b) => (a.untranslated === b.untranslated ? 0 : a.untranslated ? -1 : 1) || b.score - a.score)
    .slice(0, cap);
}

export function clampLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

// Shared read + scan for GET and POST. Reads with the service-role client, having
// already gated on isAdmin(); strictly read-only.
async function runScan(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get('includeDrafts') === '1';
  const limit = clampLimit(searchParams.get('limit'));

  const sb = supabaseAdmin();
  let q = sb
    .from('blog_posts')
    .select(SCAN_COLS)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!includeDrafts) q = q.eq('status', 'published');

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // supabase-js widens a non-literal select() to GenericStringError[]; bridge via unknown.
  const { scanned, perLang, editions } = scanPosts((data as unknown as RawPost[] | null) || []);
  const worst = rankWorst(editions, WORST_CAP);
  return NextResponse.json({ ok: true, scanned, includeDrafts, limit, perLang, worst });
}

export async function GET(req: NextRequest) {
  return runScan(req);
}
export async function POST(req: NextRequest) {
  return runScan(req);
}
