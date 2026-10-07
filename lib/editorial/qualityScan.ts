// lib/editorial/qualityScan.ts
// ============================================================================
// Editorial quality scan — shared, pure logic. Lives OUTSIDE the route file
// because a Next.js App Router route module may only export HTTP-method handlers
// and config (runtime/maxDuration/…); any other named export (stripHtml, scanPosts,
// …) fails `next build` with "not a valid Route export field". The route and the
// /admin/quality page both import from here so they run one implementation.
//
// For every non-source edition of a post it flags the two failure modes:
//   (a) untranslated — the edition is empty, or still serving the English copy;
//   (b) AI-tell — how much the local draft reads as machine output (scoreAiTells).
// ============================================================================
import type { Lang } from '@/lib/antiAi';
import { scoreVoice } from '@/lib/voice/score';
import { deskFor } from '@/lib/voice/desks';
import { parityOf, type PLang } from '@/lib/voice/parity';

// The seven editions Cyprus Lifestyle publishes.
export const LANGS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;
export type Edition = (typeof LANGS)[number];

export const EDITION_NAMES: Record<Edition, string> = {
  en: 'English', el: 'Greek', ro: 'Romanian', ar: 'Arabic', de: 'German', pl: 'Polish', ru: 'Russian',
};

export const DEFAULT_LIMIT = 150;
export const MAX_LIMIT = 300;
export const WORST_CAP = 50;

// Every column the scan needs: identity + status + each edition's title and body.
export const SCAN_COLS = [
  'id', 'slug', 'status', 'source_lang', 'published_at', 'created_at', 'category', 'franchise', 'kind', 'author_name',
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
  // The strongest tells behind the score (label, severity, count) so the admin page can
  // say WHY an edition reads as machine output. Flag-only: nothing here blocks publishing.
  tells: Array<{ key: string; label: string; severity: 'high' | 'medium' | 'low'; count: number }>;
}

export interface LangSummary {
  total: number;        // non-source editions of this language across scanned posts
  untranslated: number; // editions that are empty or still serving English
  scored: number;       // translated editions actually scored in this language
  avgScore: number;     // mean AI-tell score over `scored` editions (0 when none)
  high: number;         // scored editions whose AI level is 'high'
  flagged: number;      // scored editions at 'medium' or 'high' (worth a human pass)
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
    // Block ends become a blank line so paragraph-level detectors (summary openers,
    // uniform paragraph sizes) still see paragraphs after the tags are gone.
    .replace(/<\s*(?:br|\/p|\/div|\/li|\/h[1-6]|\/blockquote|\/tr)\s*\/?>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:#39|apos|rsquo|lsquo);/gi, "'")
    .replace(/&[#0-9a-z]+;/gi, ' ')
    .replace(/[ \t\f\v\r\u00a0]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
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
    LANGS.map((l) => [l, { total: 0, untranslated: 0, scored: 0, avgScore: 0, high: 0, flagged: 0 }]),
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
    // Do the seven editions say the same thing? (length, figures; the outlier is named whichever language it is)
    const parity = parityOf(Object.fromEntries(LANGS.map((x) => [x, str(p[`content_${x}`])])) as Partial<Record<PLang, string>>);

    for (const l of LANGS) {
      // The source edition is scored too: that is where most machine patterns are born, and every translation inherits them.
      void src;
      const stripped = stripHtml(p[`content_${l}`]);
      // Untranslated: nothing there, or (for a non-English edition) byte-identical
      // to the English body — i.e. English is being served in its place.
      const untranslated =
        stripped === '' || (l !== 'en' && enStripped !== '' && stripped === enStripped);

      // One scorer for the whole site (lib/voice): words, sentence shape, layout and per-language tells, on the body as published.
      const desk = deskFor({ category: str(p.category) || null, franchise: str(p.franchise) || null, kind: str(p.kind) || null, evergreen: p.author_name === 'The Cyprus Lifestyle Desk' });
      const r = scoreVoice({ title: str(p[`title_${l}`]), body: str(p[`content_${l}`]), lang: l as Lang, desk });
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
        if (r.level === 'high' || r.level === 'medium') sum.flagged += 1;
      }
      const tells = r.tells.slice(0, 4).map((t) => ({ key: t.key, label: t.label, severity: t.severity, count: t.count }));
      // Parity problems of THIS edition rank it for repair: a lost half of the text matters more than a stock phrase.
      const pe = parity.editions.find((e) => e.lang === l);
      let score = r.score, level: Level = r.level;
      const pp = parity.problems.filter((x) => x.startsWith(`${l}:`));
      if (pe && pe.status !== 'ok' && !untranslated) {
        tells.unshift({ key: `parity_${pe.status}`, label: pp[0] || `Edition differs from the others (${pe.status})`, severity: 'high', count: 1 });
        score = Math.min(100, score + 25);
        level = 'high';
      }
      editions.push({ id, slug, title, lang: l, untranslated, score, level, tells });
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
