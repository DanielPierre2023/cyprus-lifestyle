// scripts/activities/clean-export.ts
// ============================================================================
// ONE-TIME conversion: a bookable-trips export → the Cyprus Lifestyle experiences
// catalogue (data/activities/cyprus-experiences.csv), which is the source of truth
// from then on — edit that file (or add rows) and re-run import-catalog.ts.
//
//   npx tsx scripts/activities/clean-export.ts <export.csv> data/activities/cyprus-experiences.csv [review.csv]
//
// Keeps FACTS only (kind, places, departure, duration, inclusions, price level, booking
// link) and writes our own title + summary for each trip (lib/activities/curate.ts).
// Dropped on purpose: third-party titles, descriptions, photos, ratings, review counts,
// badges, supplier and pickup-hotel lists. Rows that are not ours to show (operators in
// the occupied north / outside Cyprus, editorial exclusions) go to the review file only.
// ============================================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseCsv, toCsv } from '../../lib/activities/csv';
import { curateRow, slugify, type CatalogRow, type Override } from '../../lib/activities/curate';

// Hand corrections after reviewing every generated row (keyed by booking-partner product id).
// kind / town / landmark use our keys (lib/activities/classify.ts, lib/activities/places.ts).
export const OVERRIDES: Record<string, Override> = {
  // Editorial exclusion
  '1312042': { hide: 'editorial: adult-entertainment venue' },
  // Departure missing or wrong in the export
  '420930': { town: 'ayia-napa' },                      // Cape Greco kayaking, listed under Peyia
  '596285': { town: 'paphos' },                         // Latchi Blue Lagoon by coach + boat, listed under Ayia Napa
  '644997': { town: 'latchi' },
  '456212': { town: 'latchi', title: 'Private yacht charter to the Blue Lagoon with drinks' },
  '696573': { town: 'avgorou', landmark: 'cyherbia' },
  '988926': { town: 'ayia-napa' },
  '1390541': { town: 'limassol', title: 'Luxury beach picnic' },
  // Kind corrections
  '1111349': { kind: 'boat', title: 'Fancy-dress sunset boat party with a DJ' },
  '493977': { kind: 'boat', title: 'Sunset cruise along the Protaras & Ayia Napa coast with dinner' },
  '726465': { kind: 'boat', title: 'Private motor-yacht charter to the Blue Lagoon' },
  '1292352': { kind: 'safari', title: 'Full-day jeep safari in the Akamas + boat trip to the Blue Lagoon' },
  '1305358': { kind: 'diving', title: 'Private Zenobia wreck dive with full gear' },
  '473217': { kind: 'culture', title: 'Private Larnaca tour: old town, Salt Lake & a boat trip to the Zenobia wreck' },
  '1277461': { kind: 'sightseeing', title: 'Day trip: Ayia Napa, Cape Greco, the Blue Lagoon & the sea caves' },
  '700777': { kind: 'sightseeing', title: 'Day trip: Ayia Napa, Cape Greco, the Blue Lagoon & the sea caves' },
  '1405484': { kind: 'water', title: 'Guided open-water swim to the Blue Lagoon' },
  '1410020': { title: 'Boat ride back to Latchi from the Blue Lagoon' },
  '616860': { kind: 'nature', title: 'Donkey farm day trip with lunch & tastings' },
  '212889': { kind: 'food', title: 'Tastes of Cyprus food day trip (Polish-speaking guide)' },
  // Titles the rules can't phrase well
  '1195273': { title: 'Snorkelling trip: a Protaras bay or the MUSAN underwater museum' },
  '1140553': { title: 'Village traditions experience with lunch' },
  '1445032': { title: 'Traditional village experience with lunch' },
  '1268004': { title: 'Authentic villages & donkey farm day trip' },
  '1303886': { title: 'Island highlights day trip' },
  '970890': { title: 'Private south-coast day trip with a local' },
  '1215717': { title: 'Nature & lost places tour: mines & lakes' },
  '1215751': { title: 'Planetarium, painted churches & mine tour' },
  '1208799': { title: 'Lefkara village, olive farm & donkey farm tour' },
  '1276970': { title: 'Village tour by vintage red bus' },
  '1447454': { title: 'Quad-bike safari near Larnaca' },
  '1478269': { title: '7-day private sailing voyage around Cyprus' },
  '204589': { title: 'Private walk around Lefkara village & lake' },
  '211104': { title: 'Day trip in the footsteps of Aphrodite (Polish-speaking guide)' },
  '618520': { title: 'Authentic Cyprus day trip with lunch (Polish-speaking guide)' },
  '720432': { title: 'Authentic Cyprus day trip with lunch (Romanian-speaking guide)' },
  '1377311': { title: 'Day trip: UNESCO painted churches & monasteries' },
  '1366967': { title: 'Folklore & history half-day trip' },
  '132288': { title: 'Cyprus-through-the-ages day trip with lunch & wine' },
  '1280777': { title: 'Village bread-making & wine-tasting tour' },
  '1033559': { title: 'Private shore excursion: olive farm, Lefkara & Limassol' },
  '1148856': { title: 'Family day out: sea caves, donkeys & cats' },
  '480348': { title: 'Cruise to the Blue Lagoon with water slide' },
  '459179': { title: 'Paphos Zoo visit & Blue Lagoon cruise with lunch' },
  '459969': { title: 'Day trip: Fikardou, Machairas Monastery & Lefkara' },
  '781324': { title: 'Snorkelling in the Paphos marine area (from the shore)' },
  '268637': { duration_min: null },                      // a 2-day pass, not a 50-day activity
  // The "visits the north" flag
  '973059': { north: false },                            // Limassol & Aphrodite's Rock — the export's landmark (Salamis) is wrong
  '705484': { north: false },                            // a cruise that views Famagusta from the sea
};

export const CATALOG_COLS: (keyof CatalogRow)[] = [
  'slug', 'gyg_id', 'title', 'summary', 'kind', 'tags', 'district', 'town', 'landmark', 'lat', 'lng', 'geo_precision',
  'duration_min', 'duration_label', 'price_band', 'price_basis', 'group_max', 'booking_url', 'priority', 'visits_north', 'north_site',
];

export function cleanExport(rows: Record<string, string>[]): { active: CatalogRow[]; dropped: CatalogRow[] } {
  const seen = new Set<string>();
  const active: CatalogRow[] = []; const dropped: CatalogRow[] = [];
  for (const raw of rows) {
    const id = String(raw.activity_id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const r = curateRow(raw, OVERRIDES[id]);
    (r.status === 'active' ? active : dropped).push(r);
  }
  // Several operators run the same kind of trip from the same town ("Cruise to the Blue
  // Lagoon" from Latchi). Where their durations differ, say so in the title so guests can
  // tell them apart in lists and search.
  const groups = new Map<string, CatalogRow[]>();
  for (const r of active) { const k = `${r.title}|${r.town}`; const g = groups.get(k); if (g) g.push(r); else groups.set(k, [r]); }
  for (const g of groups.values()) {
    if (g.length < 2 || OVERRIDES[g[0].gyg_id]?.title) continue;
    const durs = new Set(g.map((r) => r.duration_label));
    if (durs.size < 2) continue;
    for (const r of g) if (r.duration_label) { r.title = /\)$/.test(r.title) ? r.title.replace(/\)$/, `, ${r.duration_label})`) : `${r.title} (${r.duration_label})`; r.slug = `${slugify(r.title).slice(0, 64).replace(/-[^-]*$/, '')}-${r.gyg_id}`; }
  }
  active.sort((a, b) => (a.district || 'zz').localeCompare(b.district || 'zz') || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
  return { active, dropped };
}

const isMain = /clean-export\.(ts|js|mjs)$/.test(process.argv[1] || '');
const [, , inPath, outPath, reviewPath] = process.argv;
if (isMain && inPath && outPath) {
  const { active, dropped } = cleanExport(parseCsv(readFileSync(inPath, 'utf8')));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, toCsv(CATALOG_COLS as string[], active as unknown as Record<string, unknown>[]));
  if (reviewPath) {
    const rev = [...dropped, ...active.filter((r) => r.visits_north)];
    writeFileSync(reviewPath, toCsv(['gyg_id', 'status', 'hidden_reason', 'visits_north', 'north_site', 'town', 'kind', 'title', 'booking_url'], rev as unknown as Record<string, unknown>[]));
  }
  const count = (k: keyof CatalogRow) => active.reduce<Record<string, number>>((m, r) => { const v = String(r[k]); m[v] = (m[v] || 0) + 1; return m; }, {});
  console.log(JSON.stringify({ catalogue: active.length, dropped: dropped.length, visitsNorth: active.filter((r) => r.visits_north).length,
    kinds: count('kind'), districts: count('district'), precision: count('geo_precision'), bands: count('price_band') }, null, 1));
}
