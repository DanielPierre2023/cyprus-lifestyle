// scripts/directory/enrichment-template.ts
// ============================================================================
// Writes the "Complete every listing" workbook as a TEMPLATE (no database): the same guide
// sheets as the live download in Admin → Directory → Complete listings, example rows, and
// the SQL to pull the real list straight from Supabase.
//
//   npx tsx scripts/directory/enrichment-template.ts out/complete-listings-template.xlsx
// ============================================================================
import { writeFileSync } from 'node:fs';
import { writeXlsx, type Cell } from '../../lib/xlsx';
import { exportRow, FILL_COLUMNS, type ListingRow } from '../../lib/directory/enrichment';
import { startSheet, scraperSheet, columnsSheet, rulesSheet, FILL_WIDTHS } from '../../lib/directory/enrichment-guide';

const EXAMPLES: ListingRow[] = [
  { slug: 'example-taverna-limassol', name_en: 'EXAMPLE Taverna', type: 'restaurant', canonical_category: 'restaurant', status: 'listed', district: 'limassol', url: 'https://www.example-taverna.cy/', phone: '+357 25 000000', address: '1 Example Street, Limassol' },
  { slug: 'example-dental-clinic-paphos', name_en: 'EXAMPLE Dental Clinic', type: 'vendor', canonical_category: 'dentist', status: 'published', district: 'paphos', image: 'https://cdn.example.cy/clinic.jpg', email: 'info@example-clinic.cy' },
  { slug: 'example-surf-school-larnaca', name_en: 'EXAMPLE Surf School', type: 'vendor', canonical_category: 'watersports', status: 'listed', district: 'larnaca', url: 'https://www.facebook.com/examplesurf' },
];

export const EXPORT_SQL = `-- Businesses on the map that miss something — Supabase → SQL Editor → Run → "Download CSV".
select slug, name_en as name, coalesce(canonical_category, type) as category, district, status,
  concat_ws(', ',
    case when coalesce(image, '') = '' and coalesce(gallery::text, '[]') in ('[]', 'null') and coalesce(owned_photos::text, '[]') in ('[]', 'null') then 'photo' end,
    case when coalesce(phone, '') = '' then 'phone' end,
    case when coalesce(email, '') = '' then 'email' end,
    case when coalesce(url, '') = '' then 'website' end,
    case when hours is null or hours = '{}'::jsonb then 'opening hours' end,
    case when socials is null or socials = '{}'::jsonb then 'social links' end) as missing,
  url as website, phone, email, image as image_url, address
from public.directory_listings
where status in ('published', 'listed') and lat is not null and lng is not null and north is not true
  and (coalesce(image, '') = '' or coalesce(phone, '') = '' or coalesce(email, '') = '' or coalesce(url, '') = ''
       or hours is null or hours = '{}'::jsonb or socials is null or socials = '{}'::jsonb)
order by (status = 'published') desc, rating_count desc nulls last, slug;`;

export const STATS_SQL = `-- How complete is the directory? (one row per status)
select status, count(*) as on_map,
  count(*) filter (where coalesce(image, '') = '') as no_photo,
  count(*) filter (where coalesce(phone, '') = '') as no_phone,
  count(*) filter (where coalesce(email, '') = '') as no_email,
  count(*) filter (where coalesce(url, '') = '') as no_website,
  count(*) filter (where hours is null or hours = '{}'::jsonb) as no_hours,
  count(*) filter (where socials is null or socials = '{}'::jsonb) as no_socials,
  count(*) filter (where rating is null) as no_rating
from public.directory_listings
where status in ('published', 'listed') and lat is not null and lng is not null and north is not true
group by status order by status;`;

export function templateWorkbook(): Buffer {
  const fill: Cell[][] = [[...FILL_COLUMNS]];
  for (const r of EXAMPLES) { const e = exportRow(r); fill.push(FILL_COLUMNS.map((c) => (c === 'look_up' || c === 'our_page') && e[c] ? { text: c === 'look_up' ? 'look up' : 'open', link: e[c] } : e[c])); }
  return writeXlsx([
    startSheet(null),
    scraperSheet(),
    { name: 'Fill in', rows: fill, header: true, widths: FILL_WIDTHS },
    { name: 'Websites to scan', rows: [['slug', 'name', 'url'], ['example-taverna-limassol', 'EXAMPLE Taverna', 'https://www.example-taverna.cy/']], header: true, widths: [36, 40, 50] },
    columnsSheet(),
    rulesSheet(),
    { name: 'SQL', rows: [[{ text: 'Get the real list without the admin page', style: 'title' }], [{ text: 'Paste into Supabase → SQL Editor → Run, then "Download CSV". Same rows as the "Fill in" sheet of the admin download (without the social and hours columns).', style: 'note' }], [''], [EXPORT_SQL], [''], [STATS_SQL]], widths: [160], wrap: true },
  ]);
}

const isMain = /enrichment-template\.(ts|js|mjs)$/.test(process.argv[1] || '');
if (isMain) {
  const out = process.argv[2] || 'complete-listings-template.xlsx';
  writeFileSync(out, templateWorkbook());
  console.log('wrote', out);
}
