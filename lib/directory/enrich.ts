// lib/directory/enrich.ts
// ============================================================================
// STUB-ENRICHMENT for the public directory.
//
// ~2,066 PUBLISHED directory_listings carry a HOLLOW "stub" summary (empty, too
// short, placeholder, or boilerplate). They are live and indexable, which hurts
// SEO and trust. This module provides:
//
//   • isStubText / isStub  — a precise, PURE heuristic for "hollow display text".
//   • countStubs           — a read-only dry-run census (counts, no writes).
//   • generateDescription  — a GROUNDED 2-4 sentence British-English blurb built
//                            ONLY from the fields the listing already has (name,
//                            category, district, tags, its own source text). It
//                            invents no prices, ratings, awards or history, and a
//                            validation gate rejects any output that slipped a
//                            fabricated fact or unverifiable claim through
//                            (conservative: mark 'review' rather than publish it).
//   • enrichStubs          — the idempotent, batched, concurrency-capped,
//                            resumable driver: find stubs → generate → write
//                            summary_en with a 'generated' flag → report.
//
// MULTILINGUAL: the English summary is the one GENERATED here (grounded). The six
// other editions (el/ro/ar/de/pl/ru) are produced the same way the rest of the
// site produces non-English copy — by FAITHFUL TRANSLATION of the grounded English
// via lib/translate.ts (translateText → the shared anti-AI humaniser), which adds
// no new facts. Translation is opt-in (translate:true) to keep per-row cost
// predictable; when a locale summary is absent the site already falls back to the
// English one (lib/queries.ts `pick`), so leaving them empty is safe.
//
// GROUNDING vs the claim-to-own workstream: a generated blurb is still REFERENCE
// data, so we leave directory_listings.provenance ('reference' | 'owner-verified')
// untouched and record the generated/owned/review marker in text_status instead —
// the two never collide. Owner-verified rows are never touched.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAI } from '@/lib/ai';
import { humanizeText, scoreAiTells, type Lang } from '@/lib/antiAi';
import { translateText } from '@/lib/translate';
import { LOCALES, type Locale } from '@/lib/locales';

// ── Stub-detection heuristic (PURE) ──────────────────────────────────────────
//
// A listing's DISPLAYED text is summary_<locale>, falling back to summary_en, so
// the gate keys on summary_en (what the reader and Google actually see). A summary
// is a STUB when it is hollow by ANY of these precise rules:
//
//   1. empty / whitespace only
//   2. a known PLACEHOLDER / boilerplate phrase ("coming soon", "n/a", lorem…)
//   3. too SHORT — under STUB_MIN_CHARS characters, or under STUB_MIN_WORDS words
//   4. a NAME ECHO — once the business name is removed, under 5 words of real text
//      remain (i.e. it is just "<Name>" or "<Name> — restaurant, Paphos")
//
// A genuine 2-sentence editorial blurb clears all four comfortably (≈120+ chars,
// ≈20+ words). The thresholds are deliberately conservative to avoid de-listing
// real content (a false positive removes a good page from the sitemap).

/** Under this many characters of display text → stub. */
export const STUB_MIN_CHARS = 80;
/** Under this many words of display text → stub. */
export const STUB_MIN_WORDS = 12;
/** After removing the name, under this many words of real text → name-echo stub. */
export const STUB_MIN_WORDS_SANS_NAME = 5;

// Phrases that ARE the stub (match the whole trimmed value, case-insensitive).
const PLACEHOLDER_EXACT: RegExp[] = [
  /^[\s.\-–—_·•*]*$/,                         // only punctuation / dashes / dots
  /^(n\.?\/?a\.?|na|tbd|tba|todo|xxx+|none|null|undefined|unknown|\?+)$/i,
];
// Phrases that, appearing ANYWHERE, mark the text as a placeholder (not real copy).
const PLACEHOLDER_CONTAINS: RegExp[] = [
  /lorem ipsum/i,
  /\bplaceholder\b/i,
  /no (description|summary|details?|info(?:rmation)?)\b/i,
  /(description|summary|details?|content|info(?:rmation)?)\s+(coming|to follow|pending|not (?:yet )?available|unavailable|will follow)/i,
  /\bcoming soon\b/i,
  /\bto be (?:added|written|completed|confirmed)\b/i,
  /\b(details?|more info(?:rmation)?)\s+(?:coming|soon|to follow)\b/i,
];

function norm(s: string | null | undefined): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}
function wordCount(s: string): number {
  const t = norm(s);
  return t ? t.split(/\s+/).length : 0;
}

/**
 * The PURE core: is this piece of display text hollow? Optionally pass the
 * business name so the "name echo" rule can strip it. No I/O; unit-tested.
 */
export function isStubText(summary: string | null | undefined, name?: string | null): boolean {
  const s = norm(summary);
  if (!s) return true;                                         // (1) empty
  for (const re of PLACEHOLDER_EXACT) if (re.test(s)) return true;   // (2a) exact placeholder
  for (const re of PLACEHOLDER_CONTAINS) if (re.test(s)) return true; // (2b) placeholder phrase
  if (s.length < STUB_MIN_CHARS) return true;                 // (3a) too short (chars)
  if (wordCount(s) < STUB_MIN_WORDS) return true;             // (3b) too short (words)
  // (4) name echo: strip the name and any category/location filler and see what is
  // left. A real description still has substance after the name is removed.
  const nm = norm(name);
  if (nm && nm.length >= 3) {
    const sansName = s.replace(new RegExp(nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
    if (wordCount(sansName) < STUB_MIN_WORDS_SANS_NAME) return true;
  }
  return false;
}

// ── Row shapes ───────────────────────────────────────────────────────────────
/** Minimal shape for detection + the SEO gate. */
export interface StubRow {
  summary_en?: string | null;
  name_en?: string | null;
  provenance?: string | null;
  text_status?: string | null;
}
/** Full shape the generator grounds on (superset of StubRow). */
export interface EnrichRow extends StubRow {
  id: string;
  slug: string;
  type?: string | null;
  subtype?: string | null;
  canonical_category?: string | null;
  category_group?: string | null;
  district?: string | null;
  tags?: string[] | null;
  price_band?: string | null;
  source_description?: string | null;
}

/**
 * Should the enrichment job treat this row as an enrichable stub?
 * TRUE only when the display text is hollow AND the row is safe to write:
 *   • never touch owner-verified / first-party rows (provenance)
 *   • never touch rows already enriched or marked owned (text_status) — idempotent
 */
export function isStub(row: StubRow): boolean {
  if ((row.provenance || '') === 'owner-verified') return false;
  const ts = row.text_status || '';
  if (ts === 'generated' || ts === 'owned') return false;
  return isStubText(row.summary_en, row.name_en);
}

/**
 * SEO gate: should this PUBLISHED row appear in the sitemap / be indexable?
 * A row is publishable when it has REAL display text, OR it is owner-verified
 * (first-party rows are always surfaced). Reads live text, so it flips
 * automatically the moment a real description is written — no flag required.
 */
export function isPublishableListing(row: StubRow): boolean {
  if ((row.provenance || '') === 'owner-verified') return true;
  return !isStubText(row.summary_en, row.name_en);
}

// ── Grounded generation ──────────────────────────────────────────────────────
export interface GroundingFacts {
  name: string;
  category: string | null;
  district: string | null;
  tags: string[];
  priceBand: string | null;
  ownText: string | null; // the business's own imported description (facts only)
}

/** Pull the grounded facts out of a row (PURE). Nothing invented, nothing fetched. */
export function groundingFacts(row: EnrichRow): GroundingFacts {
  const category = norm(row.canonical_category) || norm(row.category_group) || norm(row.subtype) || norm(row.type) || null;
  const tags = Array.isArray(row.tags) ? row.tags.map((t) => norm(t)).filter(Boolean).slice(0, 12) : [];
  return {
    name: norm(row.name_en) || norm(row.slug),
    category: category ? category.replace(/[-_]+/g, ' ') : null,
    district: norm(row.district) || null,
    tags,
    priceBand: norm(row.price_band) || null,
    ownText: norm(row.source_description) || null,
  };
}

const PRICE_BAND_WORDS: Record<string, string> = {
  '€': 'budget-friendly', '€€': 'mid-range', '€€€': 'upmarket', '€€€€': 'high-end',
};

/** Build the grounded {system, user} prompt (PURE) — easy to inspect / test. */
export function buildDescriptionPrompt(facts: GroundingFacts): { system: string; user: string } {
  const system = [
    'You are a factual directory editor for Cyprus Lifestyle, a Cyprus guide.',
    'Write a concise description of ONE business for its directory listing.',
    '',
    'LENGTH & STYLE:',
    '- 2 to 4 sentences. British English. Plain text only — no markdown, no headings, no quotation marks, no lists.',
    '- Neutral and informative, not promotional. No em dashes or en dashes (— –); use commas, full stops or parentheses.',
    '- Avoid AI-tell words and filler (delve, nestled, boasts, "a testament to", "in the heart of", "a wide range of").',
    '',
    'GROUNDING — THIS IS A HARD RULE:',
    '- Use ONLY the facts given below. Do NOT invent or infer anything that is not stated.',
    '- Never state prices, figures, ratings, review counts, dates, years, phone numbers, URLs, addresses, opening hours, distances, ownership, history, menu items or specialities unless they appear in the facts.',
    '- Never use unverifiable praise or awards: no "best", "finest", "top", "leading", "renowned", "award-winning", "world-class", "five-star", "luxury", "number one".',
    '- Describe plainly WHAT the business is, its category, and WHERE it is. You may note its general type of offering from the tags, without embellishment.',
    '- If there is very little to say, write a short, correct, general description rather than padding it with invented detail.',
    '',
    'Output ONLY the description text. No preamble, no notes, no label.',
  ].join('\n');

  const lines: string[] = [];
  lines.push(`Name: ${facts.name}`);
  if (facts.category) lines.push(`Category: ${facts.category}`);
  if (facts.district) lines.push(`District / location in Cyprus: ${facts.district}`);
  if (facts.tags.length) lines.push(`Tags (its own keywords): ${facts.tags.join(', ')}`);
  if (facts.priceBand && PRICE_BAND_WORDS[facts.priceBand]) {
    lines.push(`Price tier (describe only in general words, never a number): ${PRICE_BAND_WORDS[facts.priceBand]}`);
  }
  if (facts.ownText) {
    lines.push('');
    lines.push("The business's OWN description (use only the plain facts from it; do NOT copy it verbatim, and ignore any prices, claims, superlatives, contact details or links it contains):");
    lines.push(facts.ownText.slice(0, 800));
  }
  return { system, user: lines.join('\n') };
}

// Patterns that betray a FABRICATED fact or an unverifiable claim in the output.
const BANNED_CLAIMS = /\b(best|finest|top|leading|renowned|famous|legendary|award[- ]winning|world[- ]class|five[- ]star|5[- ]star|luxur(?:y|ious)|number one|no\.?\s?1|#1|voted|premier|unrivalled|unparalleled)\b/i;
const CONTACT_LIKE = /(https?:\/\/|www\.|@[a-z0-9]|\+?\d[\d\s().-]{6,}\d)/i;
const MONEY_LIKE = /[€$£]|\b(eur|usd|gbp)\b/i;

/**
 * Validate a generated description against its grounding (PURE, no I/O).
 * Returns the humanised text on success, or a reason the caller records as
 * 'review'. Conservative: anything that looks fabricated fails rather than ships.
 */
export function validateGeneratedDescription(
  raw: string,
  row: EnrichRow,
): { ok: true; text: string } | { ok: false; reason: string } {
  const facts = groundingFacts(row);
  let text = norm(raw).replace(/^["'`\s]+|["'`\s]+$/g, '');
  // Strip any stray code fences / leading label the model may add.
  text = text.replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').trim();
  if (!text) return { ok: false, reason: 'empty output' };
  if (text.length > 700) return { ok: false, reason: 'too long' };
  if (isStubText(text, facts.name)) return { ok: false, reason: 'output is itself a stub' };
  if (wordCount(text) < 14) return { ok: false, reason: 'too short / thin' };
  const sentences = text.split(/[.!?]+(?:\s|$)/).map((s) => s.trim()).filter(Boolean).length;
  if (sentences < 1 || sentences > 6) return { ok: false, reason: `sentence count ${sentences} out of range` };
  if (MONEY_LIKE.test(text)) return { ok: false, reason: 'contains a price / currency (not grounded)' };
  if (CONTACT_LIKE.test(text)) return { ok: false, reason: 'contains a URL / email / phone (not grounded)' };
  if (BANNED_CLAIMS.test(text)) return { ok: false, reason: 'contains an unverifiable claim / superlative' };
  // Digit runs (3+) are years / counts / prices. Allow only digits that appear in
  // the grounding facts (rare); otherwise reject as fabricated.
  const groundText = [facts.name, facts.category, facts.district, facts.tags.join(' '), facts.ownText || '']
    .join(' ').toLowerCase();
  const digitRuns = text.match(/\d{3,}/g) || [];
  for (const d of digitRuns) if (!groundText.includes(d)) return { ok: false, reason: `fabricated number "${d}"` };
  // Must be anchored to the entity it describes.
  if (facts.name.length >= 3 && !text.toLowerCase().includes(facts.name.toLowerCase())) {
    return { ok: false, reason: 'does not mention the business name' };
  }
  // House anti-AI humaniser (same path as the editorial pipeline).
  const humanised = humanizeText(text, 'en' as Lang);
  if (scoreAiTells({ content: humanised, lang: 'en' }).level === 'high') {
    return { ok: false, reason: 'reads as AI-generated (high tell score)' };
  }
  return { ok: true, text: humanised };
}

export interface GenerateResult {
  ok: boolean;
  text?: string;
  reason?: string;
  usd?: number;
}

/**
 * Generate ONE grounded English description for a listing. Returns { ok:false,
 * reason } when generation errors or the output fails the grounding gate — the
 * caller then records 'review' and leaves summary_en hollow (stays out of the
 * sitemap) rather than publishing anything doubtful.
 */
export async function generateDescription(
  row: EnrichRow,
  _opts: { model?: string } = {},   // kept for callers; the routing table (task 'short') picks the model and the effort
): Promise<GenerateResult> {
  const facts = groundingFacts(row);
  if (!facts.name) return { ok: false, reason: 'no name to ground on' };
  const { system, user } = buildDescriptionPrompt(facts);
  const { text, error, usd } = await callAI({
    systemInstruction: system,
    userMessage: user,
    task: 'short',
    expectTokens: 400,
    background: true,
    fn: 'directory-enrich',
  });
  if (error) return { ok: false, reason: `model error: ${error}`, usd };
  const v = validateGeneratedDescription(text || '', row);
  if (!v.ok) return { ok: false, reason: v.reason, usd };
  return { ok: true, text: v.text, usd };
}

/** Translate a grounded English summary into the other editions (faithful, no new
 *  facts). Best-effort per locale; a failed locale is simply left empty (the site
 *  falls back to English). */
export async function translateSummary(
  english: string,
  targets: Locale[] = LOCALES.filter((l) => l !== 'en'),
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  // The locales are independent: translated side by side, so a row takes one call's time, not six.
  await Promise.all(targets.filter((l) => l !== 'en').map(async (l) => {
    try {
      const t = await translateText(english, 'en', l, 'description');
      if (t && t.trim() && !isStubText(t)) out[`summary_${l}`] = t.trim();
    } catch { /* leave empty → English fallback */ }
  }));
  return out;
}

// ── DB access (service role) ─────────────────────────────────────────────────
const ENRICH_COLS =
  'id, slug, type, subtype, canonical_category, category_group, district, tags, price_band, provenance, name_en, summary_en, source_description';
const SCAN_PAGE = 1000;

// Probe once whether the text_status column exists (the migration is optional).
let _hasTextStatus: boolean | null = null;
export async function hasTextStatusColumn(): Promise<boolean> {
  if (_hasTextStatus !== null) return _hasTextStatus;
  try {
    const { error } = await supabaseAdmin()
      .from('directory_listings').select('text_status').limit(1);
    _hasTextStatus = !error;
  } catch {
    _hasTextStatus = false;
  }
  return _hasTextStatus;
}

export interface StubCensus {
  publishedScanned: number;
  stubs: number;
  ownerVerifiedSkipped: number;
  alreadyGenerated: number;
  byType: Record<string, number>;
}

/**
 * DRY-RUN census: scan PUBLISHED rows and count how many are enrichable stubs,
 * broken down by type. Read-only — no writes, no model calls, no cost.
 */
export async function countStubs(opts: { maxScan?: number } = {}): Promise<StubCensus> {
  const maxScan = opts.maxScan ?? 30_000;
  const withTs = await hasTextStatusColumn();
  const cols = withTs ? 'type, name_en, summary_en, provenance, text_status' : 'type, name_en, summary_en, provenance';
  const sb = supabaseAdmin();
  const census: StubCensus = { publishedScanned: 0, stubs: 0, ownerVerifiedSkipped: 0, alreadyGenerated: 0, byType: {} };
  for (let from = 0; from < maxScan; from += SCAN_PAGE) {
    const { data, error } = await sb.from('directory_listings').select(cols)
      .eq('status', 'published').order('slug', { ascending: true }).range(from, from + SCAN_PAGE - 1);
    if (error) break;
    const rows = (data || []) as unknown as (StubRow & { type?: string | null })[];
    for (const r of rows) {
      census.publishedScanned++;
      if ((r.provenance || '') === 'owner-verified') { census.ownerVerifiedSkipped++; continue; }
      if (withTs && (r.text_status === 'generated' || r.text_status === 'owned')) { census.alreadyGenerated++; continue; }
      if (isStubText(r.summary_en, r.name_en)) {
        census.stubs++;
        const ty = r.type || 'unknown';
        census.byType[ty] = (census.byType[ty] || 0) + 1;
      }
    }
    if (rows.length < SCAN_PAGE) break;
  }
  return census;
}

/**
 * Fetch up to `limit` enrichable stub rows (full grounding columns). Pages through
 * PUBLISHED rows (skipping owner-verified / already-generated via the text_status
 * pre-filter when available) and JS-filters with isStub. Resumable: re-running
 * naturally skips rows whose summary_en is no longer hollow.
 */
export async function fetchStubCandidates(limit: number, opts: { maxScan?: number } = {}): Promise<EnrichRow[]> {
  const maxScan = opts.maxScan ?? 30_000;
  const withTs = await hasTextStatusColumn();
  const cols = withTs ? `${ENRICH_COLS}, text_status` : ENRICH_COLS;
  const sb = supabaseAdmin();
  const out: EnrichRow[] = [];
  for (let from = 0; from < maxScan && out.length < limit; from += SCAN_PAGE) {
    let q = sb.from('directory_listings').select(cols).eq('status', 'published');
    // Narrow to not-yet-handled rows at the DB when the column exists.
    if (withTs) q = q.or('text_status.is.null,text_status.eq.stub,text_status.eq.review');
    const { data, error } = await q.order('slug', { ascending: true }).range(from, from + SCAN_PAGE - 1);
    if (error) break;
    const rows = (data || []) as unknown as EnrichRow[];
    for (const r of rows) {
      if (isStub(r)) out.push(r);
      if (out.length >= limit) break;
    }
    if (rows.length < SCAN_PAGE) break;
  }
  return out;
}

// Tiny concurrency pool — run `fn` over `items`, at most `n` in flight.
async function mapPool<T, R>(items: T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface EnrichOptions {
  /** Max stub rows to process this run. Default 50. */
  limit?: number;
  /** Count only — no model calls, no writes. Default false. */
  dryRun?: boolean;
  /** Max concurrent model calls. Default 4. */
  concurrency?: number;
  /** Also translate the generated English into the six other editions. Default false. */
  translate?: boolean;
  /** Ignored: the routing table picks model and effort (task 'short'). Kept so older callers compile. */
  model?: string;
  /** How far to scan for candidates. Default 30000. */
  maxScan?: number;
  /** Per-row callback for progress logging (optional). */
  onRow?: (ev: { slug: string; status: 'generated' | 'review' | 'error'; reason?: string }) => void;
}

export interface EnrichReport {
  dryRun: boolean;
  scanned?: number;
  candidates: number;
  generated: number;
  review: number;
  errors: number;
  usd: number;
  translated: number;
  census?: StubCensus;
  samples: { slug: string; status: string; reason?: string }[];
}

/**
 * The driver. Idempotent, batched, concurrency-capped, resumable, dry-run-able.
 *   dryRun:true  → returns a census (counts by type) and writes nothing.
 *   dryRun:false → generates + validates + writes summary_en for up to `limit`
 *                  stubs, flags each row ('generated' | 'review') via text_status
 *                  when the column exists, and reports throughput + spend.
 */
export async function enrichStubs(opts: EnrichOptions = {}): Promise<EnrichReport> {
  const {
    limit = 50, dryRun = false, concurrency = 4, translate = false,
    model, maxScan = 30_000, onRow,
  } = opts;

  if (dryRun) {
    const census = await countStubs({ maxScan });
    return {
      dryRun: true, scanned: census.publishedScanned, candidates: census.stubs,
      generated: 0, review: 0, errors: 0, usd: 0, translated: 0, census, samples: [],
    };
  }

  const withTs = await hasTextStatusColumn();
  const sb = supabaseAdmin();
  const candidates = await fetchStubCandidates(limit, { maxScan });

  let generated = 0, review = 0, errors = 0, translated = 0, usd = 0;
  const samples: { slug: string; status: string; reason?: string }[] = [];

  await mapPool(candidates, concurrency, async (row) => {
    try {
      // Re-guard at write time: never clobber real or owner text.
      if (!isStub(row)) return;
      const gen = await generateDescription(row, { model });
      usd += gen.usd || 0;

      if (!gen.ok || !gen.text) {
        review++;
        if (withTs) await sb.from('directory_listings')
          .update({ text_status: 'review' }).eq('id', row.id);
        samples.push({ slug: row.slug, status: 'review', reason: gen.reason });
        onRow?.({ slug: row.slug, status: 'review', reason: gen.reason });
        return;
      }

      const patch: Record<string, unknown> = { summary_en: gen.text };
      if (withTs) { patch.text_status = 'generated'; patch.text_generated_at = new Date().toISOString(); }
      if (translate) {
        const tr = await translateSummary(gen.text);
        Object.assign(patch, tr);
        translated += Object.keys(tr).length;
      }
      const { error } = await sb.from('directory_listings').update(patch).eq('id', row.id);
      if (error) {
        errors++;
        samples.push({ slug: row.slug, status: 'error', reason: error.message });
        onRow?.({ slug: row.slug, status: 'error', reason: error.message });
        return;
      }
      generated++;
      if (samples.length < 5) samples.push({ slug: row.slug, status: 'generated' });
      onRow?.({ slug: row.slug, status: 'generated' });
    } catch (e) {
      errors++;
      const reason = (e as Error).message;
      samples.push({ slug: row.slug, status: 'error', reason });
      onRow?.({ slug: row.slug, status: 'error', reason });
    }
  });

  return {
    dryRun: false, candidates: candidates.length,
    generated, review, errors, usd: +usd.toFixed(6), translated, samples,
  };
}
