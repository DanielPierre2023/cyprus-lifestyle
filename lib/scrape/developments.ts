// Living-knowledge engine — Phase 1: developer projects.
// For each due developer source in scrape_sources, we fetch the site (respecting
// robots.txt), find its project/portfolio pages, and extract the REAL projects it
// publishes into directory_listings as type='development' — each row stamped with
// its source_url + fetched_at. Nothing is invented: the model may only record what
// the page actually states. Change-detection (content_hash) skips the AI call when
// a site hasn't changed, so a daily rotation stays cheap. Time-boxed for the Hobby
// 60s cron. Phases 2/3 reuse scrape_sources with a different category.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, CLAUDE_HAIKU, parseAiJson } from '@/lib/ai';
import { fetchText, stripHtml, sha256, abs, robotsAllows } from '@/lib/scrape/http';
// Re-export the shared primitives some callers/tests import from here.
export { sha256, stripHtml, robotsForbids } from '@/lib/scrape/http';

const DISTRICTS = ['nicosia', 'limassol', 'larnaca', 'famagusta', 'paphos'];
const DEV_STATUS = ['planning', 'under-construction', 'ready', 'sold-out'];
const LOCALES6 = ['el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;

export interface ScrapeSource {
  id: string; category: string; name: string | null; url: string;
  developer_slug: string | null; district: string | null; cadence_days: number;
  content_hash: string | null;
}
export interface RawProject {
  name?: string; district?: string | null; location?: string | null;
  price_from?: number | null; price_to?: number | null; bedrooms?: string | null;
  dev_status?: string | null; completion?: string | null; property_types?: string[] | null;
  url?: string | null; summary?: string | null;
}
export interface ScrapeSummary {
  sources_considered: number; sources_processed: number; sources_unchanged: number;
  projects_upserted: number; errors: { url: string; error: string }[]; ran_ms: number;
}

// ── small utilities ───────────────────────────────────────────────────────────
export function slugify(s: string): string {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
export function projectSlug(developer: string, name: string): string {
  const d = slugify(developer), n = slugify(name);
  return (d && !n.startsWith(d) ? `${d}-${n}` : n || d).slice(0, 80);
}
export function normalizePrice(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v) && v > 0) return Math.round(v);
  if (typeof v === 'string') { const n = Number(v.replace(/[^0-9.]/g, '')); if (isFinite(n) && n > 0) return Math.round(n); }
  return null;
}
export function canonDistrict(v: unknown): string | null {
  const s = String(v || '').toLowerCase();
  for (const d of DISTRICTS) if (s.includes(d)) return d;
  if (/ayia napa|agia napa|protaras|paralimni|deryneia|kapparis/.test(s)) return 'famagusta'; // free (southern) Famagusta
  return null;
}
const canonStatus = (v: unknown): string | null => { const s = String(v || '').toLowerCase().replace(/\s+/g, '-'); return DEV_STATUS.find((d) => s.includes(d)) || null; };

// From a listing/home page, find links that look like project/portfolio pages.
export function discoverProjectLinks(html: string, baseUrl: string, cap = 6): string[] {
  const out: string[] = []; const seen = new Set<string>();
  const rx = /href\s*=\s*["']([^"']+)["']/gi; let m: RegExpExecArray | null;
  const want = /(project|development|portfolio|properties|property|for-sale|residenc|apartment|villa|our-homes|listings?)/i;
  const skip = /(mailto:|tel:|\.(pdf|jpg|jpeg|png|webp|zip|doc)|facebook|instagram|linkedin|youtube|twitter|wa\.me|whatsapp|privacy|cookie|terms)/i;
  while ((m = rx.exec(html)) && out.length < cap) {
    const href = m[1]; if (skip.test(href) || !want.test(href)) continue;
    const a = abs(href, baseUrl); if (!a) continue;
    try { if (new URL(a).origin !== new URL(baseUrl).origin) continue; } catch { continue; }
    const key = a.split('#')[0]; if (seen.has(key)) continue; seen.add(key); out.push(key);
  }
  return out;
}

// ── AI extraction (strict, grounded, JSON) ────────────────────────────────────
export function buildExtractionPrompt(developer: string, hintDistrict: string | null): string {
  return [
    `You are extracting REAL real-estate development projects from a Cyprus property developer's own website text.`,
    `Developer: ${developer || 'unknown'}.${hintDistrict ? ` Likely district: ${hintDistrict}.` : ''}`,
    `Return ONLY projects that are ACTUALLY described in the provided text. If the text has no concrete projects, return {"projects":[]}.`,
    `NEVER invent a name, price, location, status or figure. Leave a field null if the text doesn't state it.`,
    `ONLY the Republic of Cyprus (the south). EXCLUDE anything in the occupied north (Kyrenia/Girne, Famagusta city/Gazimağusa, Morphou, "TRNC"). Ayia Napa/Protaras/Paralimni ARE in the south (Famagusta district) and are allowed.`,
    `For each project return: name (string), district (one of nicosia|limassol|larnaca|famagusta|paphos, or null), location (short text or null), price_from (integer EUR or null), price_to (integer EUR or null), bedrooms (e.g. "1-3" or null), dev_status (planning|under-construction|ready|sold-out or null), completion (e.g. "Q4 2026" or null), property_types (array of short strings or null), url (the project's page URL if present in the text, else null), summary (ONE factual English sentence, or null).`,
    `Respond as {"projects":[ ... ]} with at most 25 items.`,
  ].join('\n');
}

export async function extractProjects(pageText: string, developer: string, hintDistrict: string | null): Promise<RawProject[]> {
  if (pageText.trim().length < 80) return [];
  const { text, error } = await callClaude({
    systemInstruction: buildExtractionPrompt(developer, hintDistrict),
    userMessage: `WEBSITE TEXT:\n"""${pageText.slice(0, 14000)}"""`,
    model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 2200, fn: 'scrape-developments',
  });
  if (error) throw new Error(error);
  const parsed = parseAiJson<{ projects?: RawProject[] }>(text);
  return Array.isArray(parsed.projects) ? parsed.projects : [];
}

// One cheap batched call to localise the short summaries into the other 6 editions
// (honours the all-languages rule without a call per project). Best-effort.
async function translateSummaries(summaries: string[]): Promise<Record<string, string[]> | null> {
  const clean = summaries.map((s) => (s || '').trim());
  if (!clean.some(Boolean)) return null;
  const { text, error } = await callClaude({
    systemInstruction: `Translate each English sentence into Greek (el), Romanian (ro), Arabic (ar), German (de), Polish (pl) and Russian (ru). Keep proper nouns and figures. Return JSON {"el":[...],"ro":[...],"ar":[...],"de":[...],"pl":[...],"ru":[...]} with arrays the SAME length and order as the input.`,
    userMessage: JSON.stringify(clean),
    model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 2600, fn: 'scrape-translate',
  });
  if (error) return null;
  const j = parseAiJson<Record<string, string[]>>(text);
  return LOCALES6.every((l) => Array.isArray(j[l]) && j[l].length === clean.length) ? j : null;
}

// ── persistence ───────────────────────────────────────────────────────────────
interface DevRow { phone?: string | null; email?: string | null; url?: string | null }
async function developerContacts(sb: SupabaseClient, developerSlug: string | null): Promise<DevRow> {
  if (!developerSlug) return {};
  const { data } = await sb.from('directory_listings').select('phone,email,url').eq('slug', developerSlug).maybeSingle();
  return (data as DevRow) || {};
}

export function buildProjectRow(p: RawProject, source: ScrapeSource, contacts: DevRow, publish: boolean, now: string) {
  const name = String(p.name || '').trim().slice(0, 160);
  const developer = source.name || source.developer_slug || '';
  const slug = projectSlug(developer, name);
  const district = canonDistrict(p.district) || canonDistrict(p.location) || source.district || null;
  const summary = (p.summary || '').trim().slice(0, 400) || null;
  const pageUrl = (p.url && /^https?:\/\//.test(p.url) ? p.url : null) || source.url;
  const price_from = normalizePrice(p.price_from), price_to = normalizePrice(p.price_to);
  const tags = Array.isArray(p.property_types) ? p.property_types.filter(Boolean).map((t) => String(t).slice(0, 40)).slice(0, 8) : [];
  return {
    slug, type: 'development' as const, category_group: 'realestate' as const,
    district,
    name_en: name, name_el: name, name_ro: name, name_ar: name, name_de: name, name_pl: name, name_ru: name,
    summary_en: summary,
    price_from, price_to, price_currency: 'EUR',
    dev_status: canonStatus(p.dev_status),
    bedrooms: (p.bedrooms || '').toString().slice(0, 40) || null,
    completion: (p.completion || '').toString().slice(0, 40) || null,
    developer_slug: source.developer_slug || slugify(developer) || null,
    url: pageUrl, source_url: pageUrl, fetched_at: now,
    phone: contacts.phone ?? null, email: contacts.email ?? null,
    tags, status: publish ? 'published' : 'draft',
    updated_at: now,
  };
}

// Upsert by slug; tolerate the dedup-guard unique index (0074) by skipping a genuine
// cross-slug name collision rather than erroring the whole run.
async function upsertProjectRow(sb: SupabaseClient, row: ReturnType<typeof buildProjectRow>): Promise<boolean> {
  const { data: existing } = await sb.from('directory_listings').select('id, status').eq('slug', row.slug).maybeSingle();
  if (existing) {
    // Don't silently unpublish a listing an admin already published/curated.
    const { status: _drop, ...patch } = row;
    const { error } = await sb.from('directory_listings').update(patch).eq('slug', row.slug);
    return !error;
  }
  const { error } = await sb.from('directory_listings').insert(row);
  if (error) return false; // 23505 dedup collision or transient — skip, logged by caller count
  return true;
}

// ── seeding ───────────────────────────────────────────────────────────────────
// Register developer / estate-agent listings that have a website as development
// sources, so the rotation starts from your real directory with no manual list.
export async function seedSourcesFromDirectory(sb: SupabaseClient, limit = 200): Promise<number> {
  const { data } = await sb.from('directory_listings')
    .select('slug, name_en, district, url, subtype, category_group, type')
    .eq('status', 'published').eq('category_group', 'realestate')
    .not('url', 'is', null).limit(limit);
  const rows = (data as { slug: string; name_en: string; district: string | null; url: string; type: string }[] | null) || [];
  let added = 0;
  for (const r of rows) {
    if (!r.url || !/^https?:\/\//.test(r.url)) continue;
    if (r.type === 'development') continue; // a project row, not a developer site
    const { error } = await sb.from('scrape_sources').insert({
      category: 'development', name: r.name_en, url: r.url.split('#')[0],
      developer_slug: r.slug, district: r.district, cadence_days: 7,
    });
    if (!error) added++; // unique(category,url) makes re-seeding idempotent
  }
  return added;
}

// ── the run (time-boxed rotation) ─────────────────────────────────────────────
export async function runDevelopmentsScrape(
  sb: SupabaseClient,
  opts?: { deadlineMs?: number; maxSources?: number; autopublish?: boolean; force?: boolean },
): Promise<ScrapeSummary> {
  const t0 = Date.now();
  const deadline = t0 + (opts?.deadlineMs ?? 25_000);
  const maxSources = opts?.maxSources ?? 4;
  const summary: ScrapeSummary = { sources_considered: 0, sources_processed: 0, sources_unchanged: 0, projects_upserted: 0, errors: [], ran_ms: 0 };
  const robotsCache = new Map<string, string>();

  // Due = enabled, and either never fetched or older than cadence. Oldest first.
  const { data: srcs } = await sb.from('scrape_sources')
    .select('id, category, name, url, developer_slug, district, cadence_days, content_hash, last_fetched_at')
    .eq('category', 'development').eq('enabled', true)
    .order('last_fetched_at', { ascending: true, nullsFirst: true })
    .limit(maxSources * 3);
  const now = Date.now();
  const due = ((srcs as (ScrapeSource & { last_fetched_at: string | null })[] | null) || []).filter((s) =>
    opts?.force || !s.last_fetched_at || (now - new Date(s.last_fetched_at).getTime()) >= s.cadence_days * 86_400_000
  ).slice(0, maxSources);

  for (const src of due) {
    if (Date.now() > deadline) break;
    summary.sources_considered++;
    try {
      if (!(await robotsAllows(src.url, robotsCache))) { await markSource(sb, src.id, { status: 'disabled', last_error: 'robots.txt disallows' }); continue; }
      const home = await fetchText(src.url);
      if (!home.ok) { await markSource(sb, src.id, { status: 'error', last_error: `fetch ${home.status}` }); summary.errors.push({ url: src.url, error: `fetch ${home.status}` }); continue; }

      const links = discoverProjectLinks(home.html, src.url);
      const pages: string[] = [stripHtml(home.html)];
      for (const link of links) {
        if (Date.now() > deadline) break;
        if (!(await robotsAllows(link, robotsCache))) continue;
        const pg = await fetchText(link);
        if (pg.ok) pages.push(stripHtml(pg.html));
      }
      const corpus = pages.join('\n\n').slice(0, 16000);
      const hash = sha256(corpus);
      if (!opts?.force && hash === src.content_hash) { summary.sources_unchanged++; await markSource(sb, src.id, { last_fetched_at: new Date().toISOString(), status: 'active', last_error: null }); continue; }

      const raw = await extractProjects(corpus, src.name || '', src.district);
      const projects = raw.filter((p) => p && String(p.name || '').trim().length >= 2).slice(0, 25);

      // Localise summaries in one batched call (best-effort; en stands if it fails).
      const translations = await translateSummaries(projects.map((p) => p.summary || ''));
      const contacts = await developerContacts(sb, src.developer_slug);
      const nowIso = new Date().toISOString();
      let upserted = 0;
      for (let i = 0; i < projects.length; i++) {
        const row = buildProjectRow(projects[i], src, contacts, Boolean(opts?.autopublish), nowIso) as Record<string, unknown>;
        if (translations) for (const l of LOCALES6) row[`summary_${l}`] = translations[l][i] || row.summary_en;
        if (await upsertProjectRow(sb, row as ReturnType<typeof buildProjectRow>)) upserted++;
      }
      summary.projects_upserted += upserted;
      summary.sources_processed++;
      await markSource(sb, src.id, { last_fetched_at: nowIso, content_hash: hash, status: 'active', last_error: null, last_found: projects.length });
    } catch (e) {
      const msg = (e as Error).message.slice(0, 200);
      summary.errors.push({ url: src.url, error: msg });
      await markSource(sb, src.id, { status: 'error', last_error: msg, last_fetched_at: new Date().toISOString() });
    }
  }
  summary.ran_ms = Date.now() - t0;
  return summary;
}

async function markSource(sb: SupabaseClient, id: string, patch: Record<string, unknown>) {
  try { await sb.from('scrape_sources').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id); } catch { /* best effort */ }
}
