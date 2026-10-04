// scripts/activities/import-catalog.ts
// ============================================================================
// The experiences catalogue (data/activities/cyprus-experiences.csv — our own
// entries) → a re-runnable SQL seed for public.activities.
//
//   npx tsx scripts/activities/import-catalog.ts data/activities/cyprus-experiences.csv \
//     supabase/migrations/20261004120100_activities_seed.sql
//
// Run the generated file in the Supabase SQL editor (after 20261004120000_activities.sql).
// Every row is validated first (kind, price band, booking link, coordinates inside the
// Republic, district) — a bad row stops the import with its line number. Re-running
// UPDATES rows (upsert on provider + external_id) and removes seeded rows that are no
// longer in the catalogue; rows you add by hand with source = 'manual' are kept.
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../../lib/activities/csv';
import { ACTIVITY_KIND_KEYS, isNorthPoint, spreadStacks } from '../../lib/activities/classify';

const DISTRICTS = ['paphos', 'limassol', 'larnaca', 'nicosia', 'famagusta'];
const BANDS = ['€', '€€', '€€€', '€€€€'];

export interface SeedRow {
  external_id: string; slug: string; title: string; summary: string | null; kind: string; tags: string[];
  district: string | null; town: string | null; landmark: string | null; lat: number | null; lng: number | null;
  geo_precision: string | null; duration_min: number | null; duration_label: string | null;
  price_band: string | null; price_basis: string | null; group_max: number | null; booking_url: string;
  priority: number; visits_north: boolean; north_site: string | null;
}

const num = (v: string) => { const n = Number(v); return v !== '' && v != null && Number.isFinite(n) ? n : null; };
const nul = (v: string) => (v === '' || v == null ? null : v);

/** Parse + validate the catalogue. Throws with the CSV line number on the first bad row. */
export function readCatalog(text: string): SeedRow[] {
  const rows = parseCsv(text);
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const line = i + 2;
    const fail = (why: string): never => { throw new Error(`catalogue line ${line} (${r.gyg_id || '?'}): ${why}`); };
    const lat = num(r.lat), lng = num(r.lng);
    const row: SeedRow = {
      external_id: (r.gyg_id || '').trim(), slug: (r.slug || '').trim(), title: (r.title || '').trim(), summary: nul(r.summary),
      kind: r.kind, tags: (r.tags || '').split(';').map((t) => t.trim()).filter(Boolean),
      district: nul(r.district), town: nul(r.town), landmark: nul(r.landmark), lat, lng,
      geo_precision: nul(r.geo_precision), duration_min: num(r.duration_min), duration_label: nul(r.duration_label),
      price_band: nul(r.price_band), price_basis: nul(r.price_basis), group_max: num(r.group_max), booking_url: (r.booking_url || '').trim(),
      priority: Math.max(0, Math.min(3, Math.round(num(r.priority || '') || 0))),
      visits_north: /^true$/i.test(r.visits_north || ''), north_site: nul(r.north_site),
    };
    if (!/^\d+$/.test(row.external_id)) fail('gyg_id must be the booking partner\'s numeric product id');
    if (seen.has(row.external_id)) fail('duplicate gyg_id');
    seen.add(row.external_id);
    if (!row.title || row.title.length > 110) fail('title missing or longer than 110 characters');
    if (!ACTIVITY_KIND_KEYS.includes(row.kind)) fail(`unknown kind "${row.kind}"`);
    if (row.price_band && !BANDS.includes(row.price_band)) fail(`price_band must be one of ${BANDS.join(' ')}`);
    if (row.price_basis && !['person', 'group'].includes(row.price_basis)) fail('price_basis must be person or group');
    if (row.district && !DISTRICTS.includes(row.district)) fail(`unknown district "${row.district}"`);
    if (!/^https:\/\/www\.getyourguide\.com\/[^?#\s]+-t\d+\/$/.test(row.booking_url)) fail('booking_url must be a clean https://www.getyourguide.com/…-t<id>/ link (no query string)');
    if (!row.booking_url.includes(`-t${row.external_id}/`)) fail('booking_url does not match gyg_id');
    if ((lat == null) !== (lng == null)) fail('lat and lng must both be set or both empty');
    if (lat != null && lng != null) {
      if (!(lat >= 34.4 && lat <= 35.9 && lng >= 32.0 && lng <= 34.7)) fail('point outside Cyprus');
      if (isNorthPoint(row.district, lat)) fail('point lies in the occupied north');
    }
    if (!row.slug) row.slug = `${row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}-${row.external_id}`;
    return row;
  });
}

/** Give every pin of a shared point its own spot (deterministic golden-angle spiral). */
export function spread(rows: SeedRow[]): SeedRow[] {
  const pts = rows.filter((r) => r.lat != null && r.lng != null).map((r) => ({ key: r.external_id, lat: r.lat!, lng: r.lng! }));
  const moved = new Map(spreadStacks(pts).map((p) => [p.key, p]));
  return rows.map((r) => { const m = moved.get(r.external_id); return m ? { ...r, lat: m.lat, lng: m.lng } : r; });
}

const lit = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.length ? `array[${v.map(lit).join(',')}]::text[]` : `'{}'::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const COLS: (keyof SeedRow)[] = ['external_id', 'slug', 'title', 'summary', 'kind', 'tags', 'district', 'town', 'landmark', 'lat', 'lng', 'geo_precision',
  'duration_min', 'duration_label', 'price_band', 'price_basis', 'group_max', 'booking_url', 'priority', 'visits_north', 'north_site'];

export function toSql(rows: SeedRow[], sourceName: string, curatedAt: string): string {
  const head = `-- Cyprus Lifestyle experiences catalogue — generated by scripts/activities/import-catalog.ts from ${sourceName}\n` +
    `-- ${rows.length} experiences (${rows.filter((r) => r.visits_north).length} visit northern sites — shown only if ACTIVITIES_NORTH_TOURS=show).\n` +
    `-- Our own titles, summaries, tags, price bands and map areas; each links out to book with the booking partner.\n` +
    `-- Re-runnable: upserts on (provider, external_id); seeded rows no longer in the catalogue are removed (source = 'manual' rows are kept).\n\n`;
  const values = rows.map((r) => `('getyourguide', ${COLS.map((c) => lit(r[c])).join(', ')}, 'active', null, 'catalogue', ${lit(curatedAt)}::timestamptz)`).join(',\n');
  // priority is editorial: a re-seed never resets a pick made in the database.
  const upd = [...COLS.filter((c) => c !== 'external_id' && c !== 'priority'), 'status', 'hidden_reason', 'source', 'curated_at'].map((c) => `${c} = excluded.${c}`).join(', ');
  return head +
    `insert into public.activities (provider, ${COLS.join(', ')}, status, hidden_reason, source, curated_at) values\n${values}\n` +
    `on conflict (provider, external_id) do update set ${upd}, updated_at = now();\n\n` +
    `delete from public.activities\n where provider = 'getyourguide' and source is distinct from 'manual'\n   and external_id not in (${rows.map((r) => lit(r.external_id)).join(', ')});\n\n` +
    `select status, visits_north, count(*) from public.activities group by 1, 2 order by 1, 2;\n`;
}

// CLI — only when this file is the entry point (importing it, e.g. from tests, never writes files).
const isMain = /import-catalog\.(ts|js|mjs)$/.test(process.argv[1] || '');
const [, , csvPath, outSql] = process.argv;
if (isMain && csvPath && outSql) {
  const rows = spread(readCatalog(readFileSync(csvPath, 'utf8')));
  writeFileSync(outSql, toSql(rows, csvPath.split('/').pop() || 'catalogue.csv', new Date().toISOString()));
  console.log(`${rows.length} experiences → ${outSql}`);
}
