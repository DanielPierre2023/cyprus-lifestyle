// lib/directory/enrichment-data.ts
// ============================================================================
// Server side of "Complete every listing" (Admin → Directory → Complete listings):
// reads the map population (published + listed, occupied north excluded) from
// directory_listings, builds the Excel list / the scraper's website CSV, and writes an
// import plan — only ever filling EMPTY fields, re-checked against the database at
// write time. All via the service role; the API route is admin-only.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { writeXlsx, readXlsx, gridToObjects, type Cell, type Sheet } from '@/lib/xlsx';
import {
  missingOf, exportRow, priorityOf, isOwnWebsite, offerFrom, planImport, parseDelimited, urlKey, hostOf, FILL_COLUMNS, NEED_LABEL, NEED_KEYS,
  type ListingRow, type NeedKey, type ImportPlan, type Patch,
} from './enrichment';
import { startSheet, scraperSheet, columnsSheet, rulesSheet, FILL_WIDTHS } from './enrichment-guide';
import { cleanEmail, cleanPhone, photoList, safeUrl } from '@/lib/map/explorer-index';

const STATUSES = ['published', 'listed'];
const PAGE = 1000;
const COLSETS = [
  'slug, type, status, name_en, canonical_category, district, address, url, phone, email, image, gallery, owned_photos, socials, hours, rating_count',
  'slug, type, status, name_en, canonical_category, district, address, url, phone, email, image, rating_count',
  'slug, type, status, name_en, district, address, url, phone, image',
];

function base(cols: string) {
  return supabaseAdmin().from('directory_listings').select(cols).in('status', STATUSES).not('north', 'is', true);
}

/** Every listing on the map (paged; falls back to fewer columns if one is missing). */
export async function fetchListingsForEnrichment(opts: { status?: string; district?: string; slugs?: string[] } = {}): Promise<ListingRow[]> {
  for (const cols of COLSETS) {
    const out: ListingRow[] = [];
    let failed = false;
    for (let from = 0; from < 60000; from += PAGE) {
      let q = base(cols);
      if (opts.status && STATUSES.includes(opts.status)) q = q.eq('status', opts.status);
      if (opts.district) q = q.eq('district', opts.district);
      if (opts.slugs) q = q.in('slug', opts.slugs);
      const { data, error } = await q.order('slug', { ascending: true }).range(from, from + PAGE - 1);
      if (error) { console.error('[enrichment] listings', error.message); failed = true; break; }
      const rows = (data || []) as unknown as ListingRow[];
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
    if (!failed) return out;
  }
  throw new Error('directory_listings could not be read');
}

export interface ExportOptions { status?: string; district?: string; need?: NeedKey | 'any'; limit?: number; site?: string }

function selectRows(all: ListingRow[], o: ExportOptions) {
  const need = o.need && o.need !== 'any' ? o.need : null;
  return all
    .map((r) => ({ r, miss: missingOf(r) }))
    .filter(({ miss }) => (need ? miss.includes(need) : miss.length > 0))
    .sort((a, b) => priorityOf(b.r) - priorityOf(a.r) || a.r.slug.localeCompare(b.r.slug))
    .slice(0, Math.max(1, Math.min(o.limit || 50000, 50000)));
}

/** The Excel workbook: guide sheets + "Fill in" + "Websites to scan" + Columns + Rules. */
export async function buildEnrichmentWorkbook(o: ExportOptions): Promise<{ buf: Buffer; rows: number }> {
  const all = await fetchListingsForEnrichment(o);
  const picked = selectRows(all, o);
  const byNeed: Record<string, number> = {};
  for (const { miss } of picked) for (const k of miss) byNeed[NEED_LABEL[k]] = (byNeed[NEED_LABEL[k]] || 0) + 1;
  const site = o.site || 'https://cypruslifestyle.eu';
  const fill: Cell[][] = [[...FILL_COLUMNS]];
  const sites: Cell[][] = [['slug', 'name', 'url']];
  for (const { r } of picked) {
    const e = exportRow(r, site);
    fill.push(FILL_COLUMNS.map((c) => (c === 'our_page' || c === 'look_up') && e[c] ? { text: c === 'look_up' ? 'look up' : 'open', link: e[c] } : e[c]));
    if (isOwnWebsite(r.url)) sites.push([r.slug, e.name, safeUrl(r.url)!]);
  }
  const sheets: Sheet[] = [
    startSheet({ total: all.length, missingAny: picked.length, withWebsite: sites.length - 1, built: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', byNeed }),
    scraperSheet(),
    { name: 'Fill in', rows: fill, header: true, widths: FILL_WIDTHS },
    { name: 'Websites to scan', rows: sites, header: true, widths: [36, 40, 50] },
    columnsSheet(),
    rulesSheet(),
  ];
  return { buf: writeXlsx(sheets), rows: picked.length };
}

/** The scraper's input: slug, name, url (own websites only). */
export async function buildWebsitesCsv(o: ExportOptions): Promise<{ csv: string; rows: number }> {
  const picked = selectRows(await fetchListingsForEnrichment(o), o).filter(({ r }) => isOwnWebsite(r.url));
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = ['slug,name,url', ...picked.map(({ r }) => [r.slug, String(r.name_en || r.slug), safeUrl(r.url) || ''].map(esc).join(','))];
  return { csv: `﻿${lines.join('\r\n')}\r\n`, rows: picked.length };
}

/** Read an uploaded .xlsx / .csv into offers (every sheet with a usable header). */
export function readUpload(name: string, buf: Buffer) {
  const isZip = buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50;
  let rows: Record<string, string>[] = [];
  if (isZip || /\.xlsx$/i.test(name)) {
    for (const sh of readXlsx(buf)) {
      const objs = gridToObjects(sh.rows);
      if (!objs.length) continue;
      const head = Object.keys(objs[0]).map((h) => h.toLowerCase());
      // Sheets that can carry data: ours ("Fill in"), the scraper's export, anything with slug / URL columns.
      if (head.some((h) => h === 'slug' || /url|website|link|domain/.test(h))) rows.push(...objs);
    }
  } else {
    rows = parseDelimited(buf.toString('utf8'));
  }
  return rows.map(offerFrom);
}

/** Full rows for a set of slugs (chunked so the request URL stays short). */
export async function fetchBySlugs(slugs: string[]): Promise<ListingRow[]> {
  const out: ListingRow[] = [];
  const uniq = Array.from(new Set(slugs));
  for (let i = 0; i < uniq.length; i += 100) out.push(...await fetchListingsForEnrichment({ slugs: uniq.slice(i, i + 100) }));
  return out;
}

/** Plan against the current database: a light pass finds which listings the file can touch, then only those are read in full. */
export async function planUpload(name: string, buf: Buffer): Promise<ImportPlan> {
  const offers = readUpload(name, buf);
  if (!offers.length) return { rows: 0, matched: 0, unmatched: 0, noNews: 0, patches: [], filled: {}, unmatchedSamples: [] };
  const light: { slug: string; url: string | null }[] = [];
  for (let from = 0; from < 60000; from += PAGE) {
    const { data, error } = await base('slug, url').order('slug', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    light.push(...((data || []) as unknown as { slug: string; url: string | null }[]));
    if (!data || data.length < PAGE) break;
  }
  const wantSlugs = new Set(offers.map((o) => o.slug).filter(Boolean) as string[]);
  const wantUrls = new Set(offers.flatMap((o) => o.matchUrls.map(urlKey)).filter(Boolean));
  const wantHosts = new Set(offers.flatMap((o) => o.matchUrls.filter(isOwnWebsite).map(hostOf)).filter(Boolean));
  const candidates = light.filter((l) => wantSlugs.has(l.slug) || wantUrls.has(urlKey(l.url)) || (isOwnWebsite(l.url) && wantHosts.has(hostOf(l.url))));
  const listings = await fetchBySlugs(candidates.map((c) => c.slug));
  return planImport(offers, listings);
}

/**
 * Write the plan. Each field is re-checked against the row as it is NOW and only written
 * when still empty, so two people uploading at once never overwrite each other.
 */
export async function applyPlan(patches: Patch[]): Promise<{ updated: number; fields: number; skipped: number; errors: string[] }> {
  const errors: string[] = []; let updated = 0; let fields = 0; let skipped = 0;
  for (let i = 0; i < patches.length; i += 100) {
    const chunk = patches.slice(i, i + 100);
    const fresh = await fetchListingsForEnrichment({ slugs: chunk.map((p) => p.slug) });
    const now = new Map(fresh.map((r) => [r.slug, r]));
    for (const p of chunk) {
      const cur = now.get(p.slug);
      if (!cur) { skipped++; continue; }
      const write: Record<string, unknown> = {};
      for (const [col, v] of Object.entries(p.fields)) {
        if (col === 'url' && !safeUrl(cur.url)) write.url = v;
        else if (col === 'email' && !cleanEmail(cur.email)) write.email = v;
        else if (col === 'phone' && !cleanPhone(cur.phone)) write.phone = v;
        else if (col === 'image' && !photoList(cur.image, cur.owned_photos, cur.gallery).length) write.image = v;
        else if (col === 'address' && !String(cur.address || '').trim()) write.address = v;
        else if (col === 'hours' && !(cur.hours && typeof cur.hours === 'object' && Object.values(cur.hours as object).some(Boolean))) write.hours = v;
        else if (col === 'socials') {
          const have = (cur.socials && typeof cur.socials === 'object' ? cur.socials : {}) as Record<string, string>;
          const merged = { ...(v as Record<string, string>), ...Object.fromEntries(Object.entries(have).filter(([, x]) => !!safeUrl(x))) };
          if (Object.keys(merged).length > Object.keys(have).filter((k) => !!safeUrl(have[k])).length) write.socials = merged;
        }
      }
      if (!Object.keys(write).length) { skipped++; continue; }
      const { error } = await supabaseAdmin().from('directory_listings').update(write).eq('slug', p.slug);
      if (error) { if (errors.length < 10) errors.push(`${p.slug}: ${error.message}`); continue; }
      updated++; fields += Object.keys(write).length;
    }
  }
  return { updated, fields, skipped, errors };
}

export { NEED_KEYS };
