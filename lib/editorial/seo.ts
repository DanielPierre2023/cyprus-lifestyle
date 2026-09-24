// lib/editorial/seo.ts
// ============================================================================
// The SEO + editorial PACKAGE — pure logic (prompt builders, coercers, length
// clamps, tag/faq normalisers, and a deterministic fallback). No I/O, so it
// bundles and unit-tests like the other pure suites. lib/editorial/generate.ts
// wraps these with the model calls (packagePiece / translatePackage).
//
// A "package" is everything an article needs BEYOND its body, produced for every
// edition so search + social + cards are complete in all seven languages:
//   • seoTitle       — the <title> / meta title (≤60, keyword & place front-loaded)
//   • seoDescription — the meta description (≤155, a real hook, place + keyword)
//   • excerpt        — the on-page standfirst / dek (one elegant house-voice line)
//   • summary        — 2–3 sentences for cards, search and social
//   • tags           — 5–10 lowercase tags (subject + place + theme + long-tail)
//   • faq            — 0–5 {q,a} for the FAQPage rich result ("People also ask")
// ============================================================================

export interface FaqItem { q: string; a: string }
export interface PackageFields {
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  summary: string;
  tags: string[];
  faq: FaqItem[];
}

// Length budgets. Titles/descriptions are what Google renders; the rest are ours.
export const SEO = {
  titleMax: 60,
  descMax: 155,
  descMin: 110,
  excerptMax: 200,
  summaryMax: 320,
  tagsMin: 5,
  tagsMax: 10,
  tagMaxLen: 40,
  faqMax: 5,
} as const;

// ── text helpers ──────────────────────────────────────────────────────────────

/** Strip HTML to plain text (for feeding a stored body to the model). */
export function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|blockquote|div|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&(quot|#34);/gi, '"').replace(/&(#39|rsquo|lsquo);/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Clamp to `max` chars on a word boundary, no mid-word cut, no trailing bracket/comma. */
export function clampText(s: string, max: number): string {
  const clean = String(s || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const out = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
  return out.replace(/[\s,;:–—-]+$/u, '').trim();
}

/** First `n` sentences of a text (naive, punctuation-based). */
function firstSentences(text: string, n: number): string {
  const parts = String(text || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+/g);
  if (!parts) return String(text || '').trim();
  return parts.slice(0, n).join(' ').trim();
}

// ── normalisers / coercers (defensive against model output) ─────────────────────

export function normalizeTags(input: unknown): string[] {
  const arr = Array.isArray(input)
    ? input
    : typeof input === 'string' ? input.split(/[,\n;]/) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const t = String(raw ?? '')
      .toLowerCase()
      .replace(/^#/, '')
      .replace(/["'.]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!t || t.length > SEO.tagMaxLen) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= SEO.tagsMax) break;
  }
  return out;
}

export function coerceFaq(input: unknown): FaqItem[] {
  if (!Array.isArray(input)) return [];
  const out: FaqItem[] = [];
  for (const it of input) {
    if (!it || typeof it !== 'object') continue;
    const o = it as Record<string, unknown>;
    const q = String(o.q ?? o.question ?? '').replace(/\s+/g, ' ').trim();
    const a = String(o.a ?? o.answer ?? '').replace(/\s+/g, ' ').trim();
    if (q.length < 6 || a.length < 12) continue;
    out.push({ q, a: clampText(a, 320) });
    if (out.length >= SEO.faqMax) break;
  }
  return out;
}

/** Coerce a raw model JSON object into a clamped, safe PackageFields. */
export function coercePackage(json: unknown): PackageFields {
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const str = (k: string, alt?: string) =>
    String(o[k] ?? (alt ? o[alt] : '') ?? '').replace(/\s+/g, ' ').trim();
  return {
    seoTitle: clampText(str('seo_title', 'seoTitle'), SEO.titleMax),
    seoDescription: clampText(str('seo_description', 'seoDescription'), SEO.descMax),
    excerpt: clampText(str('excerpt', 'standfirst'), SEO.excerptMax),
    summary: clampText(str('summary'), SEO.summaryMax),
    tags: normalizeTags(o.tags),
    faq: coerceFaq(o.faq),
  };
}

/** True if a package respects the hard limits (used in tests). */
export function withinLimits(p: PackageFields): boolean {
  return p.seoTitle.length <= SEO.titleMax
    && p.seoDescription.length <= SEO.descMax
    && p.excerpt.length <= SEO.excerptMax
    && p.summary.length <= SEO.summaryMax
    && p.tags.length <= SEO.tagsMax
    && p.faq.length <= SEO.faqMax;
}

/** Deterministic package from the title + body — the safety net when the model
 *  fails, and a decent baseline that still beats empty fields. */
export function fallbackPackage(title: string, bodyText: string): PackageFields {
  const text = stripHtml(bodyText);
  const excerpt = clampText(firstSentences(text, 1), SEO.excerptMax);
  const summary = clampText(firstSentences(text, 3), SEO.summaryMax);
  return {
    seoTitle: clampText(title, SEO.titleMax),
    seoDescription: clampText(summary || excerpt || title, SEO.descMax),
    excerpt,
    summary,
    tags: [],
    faq: [],
  };
}

/** Merge a (possibly partial) package over a deterministic base, so no field is
 *  ever empty when we have a title + body to fall back on. */
export function fillPackage(p: Partial<PackageFields>, title: string, bodyText: string): PackageFields {
  const base = fallbackPackage(title, bodyText);
  return {
    seoTitle: p.seoTitle || base.seoTitle,
    seoDescription: p.seoDescription || base.seoDescription,
    excerpt: p.excerpt || base.excerpt,
    summary: p.summary || base.summary,
    tags: p.tags && p.tags.length ? p.tags : base.tags,
    faq: p.faq && p.faq.length ? p.faq : base.faq,
  };
}

// ── prompt builders ─────────────────────────────────────────────────────────────

export interface PackagePromptOpts {
  langName: string;              // e.g. 'English', 'Greek'
  category?: string | null;      // department/subcategory key or label
  place?: string | null;         // district, e.g. 'Limassol'
  franchise?: string | null;
  kind?: string | null;
}

/** System prompt: the SEO editor + standfirst writer of Cyprus Lifestyle. */
export function packageSystem(opts: PackagePromptOpts): string {
  const place = opts.place && opts.place.toLowerCase() !== 'national' ? opts.place : 'Cyprus';
  const cat = opts.category ? ` in the ${opts.category} section` : '';
  return [
    `You are the SEO editor and standfirst writer of Cyprus Lifestyle, a premium English-language magazine covering the Republic of Cyprus. You are given a finished article${cat}. Produce the metadata package that makes it win in search and read beautifully on cards and social — grounded in the real place: ${place}.`,
    '',
    'Return ONLY this JSON object, nothing else:',
    '{',
    `  "seo_title": "<=60 characters. Front-load the strongest real search term (the business/subject name, the place, and the category word people would type). Compelling, specific, human. NOT clickbait. No trailing site name.",`,
    `  "seo_description": "110-155 characters. One or two sentences that earn the click: the concrete hook + the place + the primary keyword, written naturally. No 'Discover', no 'In this article', no ellipsis.",`,
    `  "excerpt": "The on-page standfirst: ONE elegant sentence in the magazine's own voice that sits under the headline. <=200 characters. Not a summary of the summary — a line with a point of view.",`,
    `  "summary": "2-3 sentences for cards, search and social. Plain, informative, self-contained; names the subject and the place; <=320 characters.",`,
    `  "tags": ["5-10 lowercase tags: the subject, the place/district, the category, and 1-2 long-tail phrases a reader would search (e.g. 'where to eat limassol'). No hashes."],`,
    `  "faq": [{"q":"a real question a reader would ask about this subject","a":"a concise, factual answer in 1-2 sentences"}]  // 0-4 items. ONLY genuinely useful, answerable-from-the-article questions. Omit rather than pad.`,
    '}',
    '',
    'Rules: British English. Ground every place, institution and name in Cyprus (never a foreign namesake). Do not invent facts, prices, ratings or quotes that are not supported by the article. Do not use an em dash. Avoid AI-tell phrasing.',
  ].join('\n');
}

export function packageUser(title: string, bodyText: string): string {
  const body = stripHtml(bodyText);
  return `HEADLINE:\n${String(title || '').trim()}\n\nARTICLE:\n${body.slice(0, 6000)}`;
}

/** System prompt for translating an existing package into a target language. */
export function translatePackageSystem(langName: string): string {
  return [
    `You are the ${langName} editor of Cyprus Lifestyle. Translate and localise this article metadata package into ${langName}, as a native editor would write it — not a literal translation.`,
    '',
    'Return ONLY the same JSON shape (seo_title, seo_description, excerpt, summary, tags, faq).',
    '',
    `Constraints: keep seo_title <=60 characters IN ${langName} (rewrite for length if a literal translation would overflow), and seo_description between 110 and 155 characters IN ${langName}. Localise the tags naturally (keep real place and brand names; translate the descriptive ones) and keep them lowercase. Translate the faq questions and answers. Preserve proper nouns (business names, districts). British-English conventions where Latin script. Do not use an em dash. Avoid AI-tell phrasing.`,
  ].join('\n');
}

export function translatePackageUser(p: PackageFields): string {
  return JSON.stringify(
    { seo_title: p.seoTitle, seo_description: p.seoDescription, excerpt: p.excerpt, summary: p.summary, tags: p.tags, faq: p.faq },
    null, 2,
  );
}
