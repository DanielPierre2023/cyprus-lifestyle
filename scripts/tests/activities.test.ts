// Experiences catalogue — kinds, our own gazetteer, the cleaning rules (our titles,
// summaries, tags, price bands, map points), occupied-north rules, the catalogue →
// SQL import, multilingual matching for the concierge, partner links, de-stacking
// of map points and the concierge grounding block. Also checks the committed
// catalogue file itself (valid, and free of third-party content).
import { readFileSync } from 'node:fs';
import {
  ACTIVITY_KINDS, isNorthPoint, basedNorth, visitsNorth, parseDurationMinutes,
  affiliateUrl, spreadStacks, priceBasisLabel, kindLabel,
} from '@/lib/activities/classify';
import { findTown, findLandmarks, foldText, TOWNS, LANDMARKS } from '@/lib/activities/places';
import { kindFor, curateRow, durationLabel, priceBand, priceBasis, cleanBookingUrl, departureOf, listJoin } from '@/lib/activities/curate';
import { parseCsv, toCsv } from '@/lib/activities/csv';
import { rankActivities, activityIntent, type ActivityLite } from '@/lib/activities/match';
import { cleanExport, OVERRIDES, CATALOG_COLS } from '../activities/clean-export';
import { readCatalog, spread, toSql } from '../activities/import-catalog';
import { groundingBlock, type ConciergeContext } from '@/lib/concierge/brain';
import * as GYG from '@/lib/gyg';
import { eq, ok, report } from './_harness';

const LOCALES = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];

// ── Kinds ─────────────────────────────────────────────────────────────────────────
ok('kind keys unique', new Set(ACTIVITY_KINDS.map((k) => k.key)).size === ACTIVITY_KINDS.length);
ok('every kind labelled in 7 languages', ACTIVITY_KINDS.every((k) => LOCALES.every((l) => (k.label[l] || '').length > 2)));
ok('every kind has guest words', ACTIVITY_KINDS.every((k) => k.words.length >= 7));
eq('pirate cruise → boat', kindFor('Ayia Napa: Black Pearl Pirate Boat Cruise with Cannon Show'), 'boat');
eq('scuba → diving', kindFor('Ayia Napa: MUSAN Museum Discover Scuba Diving Experience'), 'diving');
eq('cruise with snorkelling → boat', kindFor('Larnaca Bay Cruise with Snorkeling'), 'boat');
eq('snorkelling first → diving', kindFor('FROM PAPHOS: Snorkeling at Moulia Rocks (boat)'), 'diving');
eq('jeep → safari', kindFor('Akamas Jeep Safari Tour from Paphos'), 'safari');
eq('jeep + cruise combo → safari', kindFor('Famagusta Jeep Tour & Blue Lagoon Cruise Combination'), 'safari');
eq('buggy to a shipwreck is still a safari', kindFor('Buggy Tour to Adonis Falls, Sea Caves, Shipwreck & Lara Bay'), 'safari');
eq('"surf and turf" jeep combo → safari', kindFor('Surf and Turf Jeep Tour and Cruise Combination'), 'safari');
eq('boat "safari" stays a boat', kindFor('Cyprus: Odyssey Boat Safari from Larnaca to Protaras'), 'boat');
eq('wine tasting → food', kindFor('From Paphos: Troodos Mountains & Villages Free Wine Tasting'), 'food');
eq('cookies are not a cooking class', kindFor('Nicosia: Workshops - Baklava and Traditional Cypriot Cookies'), 'food');
eq('geology hike → nature', kindFor('Troodos: Golden‑Hour Geophotography Hike'), 'nature');
eq('waterfall hike → nature', kindFor('Cyprus: Paradision Waterfall Hike in a Hidden Gorge'), 'nature');
eq('kourion → culture', kindFor('From Ayia Napa: Paphos and Kourion Day Trip'), 'culture');
eq('fishing → boat', kindFor('Limassol Marine: Tuna Fishing Trip'), 'boat');
eq('"Transfers: … Cruise" stays a cruise', kindFor('Transfers: Paphos to Latchi, BBQ & Waterslide Cruise'), 'boat');
eq('photoshoot → classes', kindFor('Cyprus: Luxury Vacation Photoshoot Experience'), 'classes');
eq('fallback → sightseeing', kindFor('Cape Greco Region - private guided Highlight Tour'), 'sightseeing');
eq('kind label el', kindLabel('boat', 'el'), 'Κρουαζιέρες & εκδρομές με σκάφος');

// ── Our gazetteer ─────────────────────────────────────────────────────────────────────
ok('place keys unique', new Set([...TOWNS, ...LANDMARKS].map((p) => p.key)).size === TOWNS.length + LANDMARKS.length);
ok('every place inside Cyprus and in the south', [...TOWNS, ...LANDMARKS].every((p) => p.lat > 34.5 && p.lat < 35.2 && p.lng > 32.2 && p.lng < 34.6 && !isNorthPoint(p.district, p.lat)));
eq('fold', foldText('Aphrodite’s Rock — Ágia'), "aphrodite's rock — agia");
eq('first town in text', findTown('From Larnaca/Ayia Napa/Protaras: …')?.key, 'larnaca');
eq('Latsi spelling', findTown('LATSI')?.key, 'latchi');
eq('Blue Lagoon west (Latchi)', findLandmarks('Latchi: Blue Lagoon Cruise', null)[0]?.key, 'blue-lagoon-akamas');
eq('Blue Lagoon east (Protaras)', findLandmarks('Protaras: Blue Lagoon & Turtle Bay Cruise', null).map((p) => p.key), ['blue-lagoon-cape-greco', 'turtle-cove']);
eq('Blue Lagoon east by departure', findLandmarks('Blue Lagoon VIP Cruise', findTown('Ayia Napa'))[0]?.key, 'blue-lagoon-cape-greco');
eq('the text beats the departure (Latchi named)', findLandmarks('Blue Lagoon Latchi, coach transfer+boat trip', findTown('Ayia Napa'))[0]?.key, 'blue-lagoon-akamas');
eq('sea caves west (Paphos)', findLandmarks('Paphos: Family Adventure with Sea Caves', null)[0]?.key, 'peyia-sea-caves');
eq('Turtle Bay west = Lara', findLandmarks('Adonis Falls & Lara Bay (Turtle Bay) Buggy guided tour', null).map((p) => p.key), ['adonis-baths', 'lara-bay']);
eq('a Limassol wreck dive is not at Peyia', findLandmarks('Limassol: Shipwreck Dive with Guide', findTown('Limassol')), []);
eq('Green Bay statues are not MUSAN', findLandmarks("Beginner Scuba Dive at Green Bay's Underwater statues", null).map((p) => p.key), ['green-bay']);
eq('departure from "From X"', departureOf('Sea Star Cruise to Coral Bay from Paphos', '', '').place?.key, 'paphos');
eq('departure list with &', departureOf('Lefkara & Nicosia walking tour from Aphrodite & Pissouri Bay', 'NICOSIA', '').place?.key, 'pissouri');
eq('landmark prefix is not a departure', departureOf('St Neophyte Monastery & Latchi: Guided Excursion', 'PAPHOS', '').place?.key, 'paphos');

// ── Occupied north (same geography as migration 0062) ──────────────────────────────────
ok('Kyrenia district is north', isNorthPoint('kyrenia', 35.33));
ok('north Nicosia', isNorthPoint('nicosia', 35.19) && !isNorthPoint('nicosia', 35.16));
ok('Ayia Napa is south', !isNorthPoint('famagusta', 34.99));
ok('Paphos never north', !isNorthPoint('paphos', 35.2));
ok('based north: From North Cyprus', basedNorth('From North Cyprus: Nicosia city walking tour', 'NICOSIA', 'city'));
ok('based north: Turkey', basedNorth('Divided Capital & Kyrenia Castles Tour', 'EDIRNE', 'NOT CYPRUS - Turkey'));
ok('NOT based north: Paphos to Kyrenia', !basedNorth('Paphos to Kyrenia: A Scenic Escape', 'PAPHOS', 'city'));
eq('visits north: Varosha', visitsNorth('From Ayia Napa: Varosha Ghost Town Tour on a Red Bus', '', '', ''), 'Varosha');
eq('visits north: Famagusta city', visitsNorth('From Paphos: Discover Famagusta', '', '', ''), 'Famagusta');
eq('southern Vouni village is not north', visitsNorth('Guided Wine & Village Tour: Koilani, Vouni & Omodos', '', '', ''), null);
eq('Protaras cruise is not north', visitsNorth('Protaras: Morning Cruise with Swimming Stops', '', '', ''), null);

// ── Helpers ─────────────────────────────────────────────────────────────────────────────
eq('duration hours', parseDurationMinutes('4 hours'), 240);
eq('duration range → lower', parseDurationMinutes('4 - 7 hours'), 240);
eq('duration days', parseDurationMinutes('2 days'), 2880);
eq('labels', [durationLabel('4 hours', 240), durationLabel('2 - 6 hours', 120), durationLabel('80 minutes', 80), durationLabel('45 minutes', 45), durationLabel('2.5 hours', 150), durationLabel('1 day', 1440), durationLabel('3 days', 4320)],
  ['4 h', '2–6 h', '1 h 20 min', '45 min', '2.5 h', 'full day', '3 days']);
eq('price bands', [priceBand(12), priceBand(30), priceBand(79), priceBand(80), priceBand(199), priceBand(900), priceBand(null)], ['€', '€€', '€€', '€€€', '€€€', '€€€€', null]);
eq('price basis', [priceBasis('per person'), priceBasis('per group up to 6'), priceBasis('per group up to 1')],
  [{ basis: 'person', groupMax: null }, { basis: 'group', groupMax: 6 }, { basis: 'person', groupMax: null }]);
eq('clean booking link (tracking dropped)', cleanBookingUrl('https://www.getyourguide.com/paphos-l426/x-t1/?ranking_uuid=abc#r'), 'https://www.getyourguide.com/paphos-l426/x-t1/');
eq('only the booking partner', [cleanBookingUrl('http://www.getyourguide.com/x-t1'), cleanBookingUrl('https://evil.example/x-t1')], [null, null]);
eq('list join', [listJoin(['a']), listJoin(['a', 'b']), listJoin(['a', 'b', 'c'])], ['a', 'a & b', 'a, b & c']);
eq('affiliate appended', affiliateUrl('https://www.getyourguide.com/a-t1/', 'P1'), 'https://www.getyourguide.com/a-t1/?partner_id=P1&utm_medium=online_publisher');
eq('no partner → plain', affiliateUrl('https://www.getyourguide.com/a-t1/', null), 'https://www.getyourguide.com/a-t1/');
eq('non-http rejected', affiliateUrl('javascript:x', 'P1'), null);
eq('basis labels', [priceBasisLabel('group', 'pl', 4), priceBasisLabel('person', 'ru'), priceBasisLabel('group', 'de'), priceBasisLabel('per group up to 6', 'en')],
  ['za grupę do 4', 'с человека', 'pro Gruppe', 'per group up to 6']);
{
  const stack = Array.from({ length: 30 }, (_, i) => ({ key: `k${String(i).padStart(2, '0')}`, lat: 34.7744, lng: 32.4232 }));
  const out = spreadStacks(stack);
  eq('all kept', out.length, 30);
  eq('every point distinct', new Set(out.map((p) => `${p.lat},${p.lng}`)).size, 30);
  ok('within ~1.5 km', out.every((p) => Math.abs(p.lat - 34.7744) < 0.014 && Math.abs(p.lng - 32.4232) < 0.017));
  eq('deterministic', JSON.stringify(spreadStacks(stack)), JSON.stringify(out));
}

// ── Cleaning an export row into OUR catalogue entry ───────────────────────────────────────
const HEAD = 'activity_id,title,activity_url,supplier,price_eur,price_before_discount_eur,price_basis,currency,duration,features,badge,rating,review_count,category,breadcrumb,district,location_label,city_slug,gyg_city_id,town_lat,town_lon,town_place_type,poi_name,poi_lat,poi_lon,poi_geo_status,itinerary_stops,description,image_1,image_2,image_3,price_cross_check,geo_note';
const CSV = [HEAD,
  '1,"Paphos: Blue Lagoon Boat Trip, with Transfers",https://www.getyourguide.com/paphos-l426/p-t1/?ranking=x,GetYourGuide,40,50,per person,EUR,6 hours,Pickup available; Meal included,Likely to sell out,4.7,300,Blue Lagoon,x,Paphos District,PAPHOS,paphos,1,34.92,33.62,city,Blue Lagoon,35.0631,32.3077,poi,Hotel A > Hotel B,"A boat, a lagoon ""and"" lunch.",https://cdn/x.jpg,,,ok,n',
  '2,From Paphos: Troodos Day Trip,https://www.getyourguide.com/p-t2/,GetYourGuide,55,,per person,EUR,8 hours,,,4.7,2000,Troodos Mountains,x,Paphos District,FROM PAPHOS,troodos,2,34.93,32.86,mountain range,Troodos Mountains,34.93,32.86,poi,,Mountains.,https://cdn/y.jpg,,,ok,n',
  '3,North Cyprus ATV Tour,https://www.getyourguide.com/k-t3/,GetYourGuide,60,,per person,EUR,2 hours,,,4.9,10,Kyrenia,x,,KYRENIA,kyrenia,3,35.335,33.319,town,Kyrenia,35.335,33.319,poi,,ATV.,https://cdn/z.jpg,,,ok,n',
  '4,From Ayia Napa: Varosha Ghost Town Tour,https://www.getyourguide.com/a-t4/,GetYourGuide,35,,per person,EUR,4 hours,,,4.4,90,Varosha,x,,AYIA NAPA,ayia-napa,4,34.9893,33.9962,town,Varosha,35.11,33.96,poi,,Ghost town.,https://cdn/w.jpg,,,ok,n',
  '5,Fun Photo Shoot in Cyprus,https://www.getyourguide.com/c-t5/,GetYourGuide,90,,per person,EUR,1 hour,,,5,4,Cyprus,x,,,cyprus,5,35.1,33.4,country,Cyprus,,,,,Photos.,https://cdn/v.jpg,,,ok,n',
  '6,Paphos: Private Sunset Cruise,https://www.getyourguide.com/p-t6/,GetYourGuide,300,,per group up to 6,EUR,2 hours,Private group,,4.8,50,Tours in Paphos,x,Paphos District,PAPHOS,paphos,1,34.7744,32.4232,city,Tours in Paphos,,,administrative label - use town coords,,Sunset.,https://cdn/u.jpg,,,ok,n',
  '7,Paphos: Jeep Safari to Avakas Gorge,https://www.getyourguide.com/p-t7/,GetYourGuide,20,,per person,EUR,20 days,Small group,,4.1,8,Avakas,x,,PAPHOS,paphos,1,34.7744,32.4232,city,Avakas Gorge Canyon,,,,,Jeep.,https://cdn/t.jpg,,,ok,n',
].join('\n');
{
  const rows = parseCsv(CSV);
  eq('csv rows', rows.length, 7);
  eq('quoted comma kept', rows[0].title, 'Paphos: Blue Lagoon Boat Trip, with Transfers');
  eq('escaped quotes kept', rows[0].description, 'A boat, a lagoon "and" lunch.');
  const by = Object.fromEntries(rows.map((r) => [r.activity_id, curateRow(r)]));
  const b = by['1'];
  eq('our own title', b.title, 'Day trip by coach & boat to the Blue Lagoon with lunch');
  ok('title is not the source title', b.title !== rows[0].title);
  eq('pinned at OUR Blue Lagoon point (not the export geocode)', [b.landmark, b.lat, b.geo_precision, b.district], ['Blue Lagoon (Akamas)', 35.0828, 'landmark', 'paphos']);
  eq('departure', b.town, 'Paphos');
  eq('price band + basis, no exact price', [b.price_band, b.price_basis, 'price_eur' in b], ['€€', 'person', false]);
  eq('tags', b.tags, ['pickup', 'meal', 'full-day']);
  eq('summary is ours', b.summary, 'About 6 h, from Paphos. Takes in the Blue Lagoon. Includes hotel pickup and a meal. Price level €€ per person.');
  eq('booking link cleaned', b.booking_url, 'https://www.getyourguide.com/paphos-l426/p-t1/');
  const keys = new Set(Object.values(by).flatMap((r) => Object.keys(r)));
  ok('no rating / review / photo / badge / description / supplier fields at all', !['rating', 'review_count', 'images', 'image', 'badge', 'description', 'supplier', 'itinerary', 'price_eur', 'price_before_eur'].some((k) => keys.has(k)));
  const text = Object.values(by).flatMap((r) => Object.entries(r).filter(([k, v]) => typeof v === 'string' && k !== 'booking_url').map(([, v]) => v)).join(' | ');
  ok('no third-party wording carried over', !/Likely to sell out|cdn\/|lagoon "and"|Hotel A|GetYourGuide|Blue Lagoon Boat Trip, with Transfers/.test(text));
  eq('day trip from Paphos', [by['2'].title, by['2'].town, by['2'].landmark], ['Day trip: Troodos Mountains', 'Paphos', 'Troodos Mountains']);
  eq('north-based hidden', [by['3'].status, by['3'].hidden_reason?.slice(0, 22)], ['hidden', 'operator based in the ']);
  eq('visits-north flagged, still active, pinned in the south', [by['4'].status, by['4'].visits_north, by['4'].north_site, by['4'].lat! < 35.0], ['active', true, 'Varosha', true]);
  eq('island-wide product: no map point, still active', [by['5'].lat, by['5'].status], [null, 'active']);
  eq('private sunset cruise', [by['6'].title, by['6'].price_band, by['6'].price_basis, by['6'].group_max, by['6'].tags.includes('private')],
    ['Private sunset cruise along the Paphos coast', '€€€€', 'group', 6, true]);
  eq('obvious duration error dropped', [by['7'].duration_min, by['7'].duration_label], [null, null]);
  eq('override: town + title', curateRow(rows[1], { town: 'limassol', title: 'X' }).town, 'Limassol');
  eq('override: hide', curateRow(rows[1], { hide: 'editorial' }).status, 'hidden');
  eq('override: north off', curateRow(rows[3], { north: false }).visits_north, false);
  const { active, dropped } = cleanExport(rows);
  eq('catalogue keeps active rows only', [active.length, dropped.length], [6, 1]);
  const csv = toCsv(CATALOG_COLS as string[], active as unknown as Record<string, unknown>[]);
  const back = readCatalog(csv);
  eq('catalogue CSV round-trips through the importer', back.length, 6);
  eq('tags survive', back.find((r) => r.external_id === '1')!.tags, ['pickup', 'meal', 'full-day']);
}

// ── Catalogue → SQL ────────────────────────────────────────────────────────────────────────
{
  const head = CATALOG_COLS.join(',');
  const good = 'x-1,1,Boat trip,Sum,boat,pickup;meal,paphos,Paphos,,34.7754,32.4218,town,120,2 h,€€,person,,https://www.getyourguide.com/p-t1/,0,false,';
  const bad = (cells: Record<number, string>) => `${head}\n${good.split(',').map((c, i) => (i in cells ? cells[i] : c)).join(',')}\n`;
  const throws = (csv: string, rx: RegExp) => { try { readCatalog(csv); return false; } catch (e) { return rx.test(String(e)); } };
  eq('valid row reads', readCatalog(`${head}\n${good}\n`).length, 1);
  ok('unknown kind rejected', throws(bad({ 4: 'rocket' }), /unknown kind/));
  ok('bad band rejected', throws(bad({ 14: '$$' }), /price_band/));
  ok('foreign booking link rejected', throws(bad({ 17: 'https://example.com/p-t1/' }), /booking_url/));
  ok('link must match the id', throws(bad({ 17: 'https://www.getyourguide.com/p-t9/' }), /does not match/));
  ok('point in the north rejected', throws(bad({ 6: 'nicosia', 9: '35.21', 10: '33.36' }), /occupied north/));
  ok('point outside Cyprus rejected', throws(bad({ 9: '48.1', 10: '11.5' }), /outside Cyprus/));
  const rows = spread(readCatalog(`${head}\n${good}\n${good.replace('x-1,1,', 'x-2,2,').replace('p-t1', 'p-t2')}\n`));
  ok('stacked pins spread', rows[0].lat !== rows[1].lat || rows[0].lng !== rows[1].lng);
  const sql = toSql(rows, 'fixture.csv', '2026-10-04T00:00:00Z');
  ok('sql upsert', sql.includes('on conflict (provider, external_id) do update set'));
  ok('sql keeps editorial priority on re-seed', !/priority = excluded\.priority/.test(sql));
  ok('sql text[] arrays', sql.includes("array['pickup','meal']::text[]"));
  ok('sql removes vanished seeded rows, keeps manual ones', sql.includes("source is distinct from 'manual'") && sql.includes("external_id not in ('1', '2')"));
}

// ── The committed catalogue file ─────────────────────────────────────────────────────────
{
  const text = readFileSync('data/activities/cyprus-experiences.csv', 'utf8');
  const cat = readCatalog(text);
  ok('catalogue has ~570 experiences', cat.length > 500);
  ok('every kind used is known', cat.every((r) => ACTIVITY_KINDS.some((k) => k.key === r.kind)));
  ok('no third-party content: no photos, ratings, reviews, badges', !/cdn\.getyourguide|★|\breviews?\b|likely to sell out|bestseller|top pick/i.test(text.replace(/https:\/\/www\.getyourguide\.com\/[^,\n]*/g, '')));
  ok('the booking partner is named only in links', !/getyourguide/i.test(text.replace(/https:\/\/www\.getyourguide\.com\/[^,\n]*/g, '')));
  ok('no departure-prefix titles copied ("Town: …")', cat.every((r) => !/^(paphos|ayia napa|protaras|larnaca|limassol|latchi|nicosia)\s*:/i.test(r.title)));
  ok('every entry has a summary and a booking link', cat.every((r) => !!r.summary && r.booking_url.startsWith('https://www.getyourguide.com/')));
  ok('every override targets a real row', Object.keys(OVERRIDES).every((id) => cat.some((r) => r.external_id === id) || OVERRIDES[id].hide));
  ok('pins on the map for nearly all', cat.filter((r) => r.lat != null).length >= cat.length - 5);
}

// ── Matching (concierge) — multilingual ───────────────────────────────────────────────────
const L = (o: Partial<ActivityLite> & { external_id: string; title: string; kind: string }): ActivityLite =>
  ({ district: 'paphos', town: 'Paphos', landmark: null, tags: [], priority: 0, ...o });
const pool: ActivityLite[] = [
  L({ external_id: 'b1', title: 'Cruise to the Blue Lagoon with BBQ', kind: 'boat', town: 'Latchi', landmark: 'Blue Lagoon (Akamas)', tags: ['meal'], priority: 2 }),
  L({ external_id: 'b2', title: 'Sunset cruise along the Larnaca coast with drinks', kind: 'boat', district: 'larnaca', town: 'Larnaca', tags: ['sunset'] }),
  L({ external_id: 'd1', title: 'Try-dive for beginners', kind: 'diving', district: 'famagusta', town: 'Protaras', tags: ['beginners'] }),
  L({ external_id: 's1', title: 'Full-day jeep safari in the Akamas', kind: 'safari', landmark: 'Akamas Peninsula' }),
  L({ external_id: 'f1', title: 'Wine tour: Troodos Mountains', kind: 'food', landmark: 'Troodos Mountains' }),
  L({ external_id: 'c1', title: 'Day trip: Ancient Kourion & Kolossi Castle', kind: 'culture', district: 'limassol', town: 'Limassol', landmark: 'Ancient Kourion' }),
  L({ external_id: 'p1', title: 'Private sunset cruise along the Paphos coast', kind: 'boat', tags: ['private', 'sunset'] }),
  L({ external_id: 'k1', title: 'Pirate-ship cruise along the Paphos coast', kind: 'boat', tags: ['family'] }),
];
const ids = (q: string, o: Parameters<typeof rankActivities>[2] = {}) => rankActivities(pool, q, o).map((a) => a.external_id);
eq('en boat → the editorial pick first', ids('a boat trip please').slice(0, 1), ['b1']);
ok('el κρουαζιέρα → boats', ids('θέλουμε κρουαζιέρα').length > 0 && ids('θέλουμε κρουαζιέρα').every((i) => /^[bpk]/.test(i)));
eq('de Tauchen → diving', ids('Tauchen für Anfänger')[0], 'd1');
eq('ru джип → safari', ids('сафари на джипе')[0], 's1');
eq('pl winnica → food', ids('degustacja wina w górach')[0], 'f1');
eq('ro muzeu/castel → culture', ids('vrem să vedem un castel antic')[0], 'c1');
eq('ar boat → boat', ids('رحلة بحرية')[0], 'b1');
eq('landmark by name', ids('what can we do at the Blue Lagoon?')[0], 'b1');
eq('district respected', ids('sunset cruise', { district: 'larnaca' })[0], 'b2');
eq('luxury → private', ids('a private yacht at sunset', { luxury: true, district: 'paphos' })[0], 'p1');
eq('kids → family-tagged', ids('a boat trip with the kids', { district: 'paphos' })[0], 'k1');
ok('generic → varied kinds', new Set(rankActivities(pool, 'things to do in Paphos', { district: 'paphos' }).map((a) => a.kind)).size >= 3);
eq('not an activity question → nothing', ids('I need an accountant for my company'), []);
eq('intent', activityIntent('una excursie cu barca').kinds.includes('boat'), true);
eq('understanding keywords help', ids('qualcosa di bello', { keywords: ['snorkeling', 'diving'] })[0], 'd1');
eq('"romantic" is not Romanian "antic" (culture), "diving" is not "vin" (wine)', [activityIntent('a romantic sunset').kinds, activityIntent('diving').kinds], [[], ['diving']]);
eq('romantic → sunset-tagged', ids('a romantic evening', { district: 'paphos' })[0], 'p1');
eq('a place alone is not an ask', ids('what is the weather in Limassol?'), []);
eq('Arabic family ask', activityIntent('يوم عائلي مع الأطفال').generic || ids('يوم عائلي مع الأطفال', { district: 'paphos' })[0] === 'k1', true);

// ── Concierge grounding ──────────────────────────────────────────────────────────────────────
{
  const ctx: ConciergeContext = { candidates: [], picks: [], guides: [], articles: [], kb: [], canRoute: false, luxury: false,
    activities: [{ id: '1', title: 'Cruise to the Blue Lagoon with BBQ', kind: 'boat', kindLabel: 'Boat trips & cruises', district: 'paphos', town: 'Latchi', area: 'Blue Lagoon (Akamas)',
      priceBand: '€€', priceBasis: 'per person', duration: '4 h', tags: ['meal', 'half-day'],
      url: 'https://www.getyourguide.com/p-t1/?partner_id=P', summary: 'About 4 h, from Latchi. Includes a meal.' }] };
  const g = groundingBlock(ctx, 'en');
  ok('grounding lists the experience', g.includes('BOOKABLE EXPERIENCES') && g.includes('Cruise to the Blue Lagoon with BBQ'));
  ok('grounding gives the price LEVEL, not a price', g.includes('price level €€ per person') && !/€\d/.test(g));
  ok('grounding names the booking partner and what it confirms', g.includes('booking partner GetYourGuide') && g.includes('exact meeting point'));
  ok('grounding gives facts to paraphrase', g.includes('facts: About 4 h, from Latchi. Includes a meal.'));
  ok('grounding has no ratings or reviews', !/★|review/i.test(g));
  ok('grounding never pastes the booking URL', !g.includes('getyourguide.com'));
  ok('no "no matches" ladder when activities exist', !g.includes('No specific matches'));
}

// ── GetYourGuide partner links & locations (lib/gyg.ts) ──────────────────────────────────────
{
  const g = GYG;
  eq('default partner id', g.gygPartnerIdFromEnv(), 'YEP5D0C');
  eq('campaign tagged', g.gygLink('https://www.getyourguide.com/paphos-l426/x-t1/', { partnerId: 'YEP5D0C', campaign: 'cl-map' }),
    'https://www.getyourguide.com/paphos-l426/x-t1/?partner_id=YEP5D0C&utm_medium=online_publisher&cmp=cl-map');
  eq('non-GetYourGuide link untouched', g.gygLink('https://example.com/a', { partnerId: 'YEP5D0C' }), 'https://example.com/a');
  eq('district → GYG location', [g.gygLocationFor('famagusta').name, g.gygLocationFor('paphos').id, g.gygLocationFor('nowhere').id], ['Ayia Napa', 426, 169006]);
  ok('never Sydney (200)', Object.values(g.GYG_LOCATIONS).every((l) => l.id !== 200));
  eq('locale codes', [g.gygLocaleCode('de'), g.gygLocaleCode('el')], ['de-DE', 'en-US']);
  eq('location fallback link', g.gygLocationLink(g.GYG_LOCATIONS.cyprus, 'cl-widget', 'YEP5D0C'),
    'https://www.getyourguide.com/cyprus-l169006/?partner_id=YEP5D0C&utm_medium=online_publisher&cmp=cl-widget');
  ok('activity links default to the account partner id', (affiliateUrl('https://www.getyourguide.com/a-t1/', 'YEP5D0C', 'cl-concierge') || '').endsWith('partner_id=YEP5D0C&utm_medium=online_publisher&cmp=cl-concierge'));
}

report('activities');
