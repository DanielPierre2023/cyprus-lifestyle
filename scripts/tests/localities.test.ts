// Cyprus locality matcher — the pure helper behind the coordinate fast pass. It decides
// which town a business is in (so it inherits that town's centroid), which is what makes
// "nearest in Pyla" work for the bulk import — so the district mapping must be right.
import { findLocality, localityQuery, CY_LOCALITIES, DISTRICT_NAME, type District } from '@/lib/concierge/localities';
import { eq, ok, report } from './_harness';

const dist = (s: string) => findLocality(s)?.district ?? null;
const nm = (s: string) => findLocality(s)?.name ?? null;

// ── District mapping across all five districts ──────────────────────────────────
eq('Pyla → larnaca', dist('Spyrou Kyprianou 12, 7080 Pyla'), 'larnaca');
eq('pila (alias) → larnaca', dist('reparator aer condiționat în pila'), 'larnaca');
eq('Oroklini → larnaca', dist('Oroklini, Larnaca'), 'larnaca');
eq('voroklini (alias) → larnaca', dist('Voroklini seafront'), 'larnaca');
eq('Ypsonas → limassol', dist('12 Industrial Area, Ypsonas'), 'limassol');
eq('Mesa Geitonia → limassol', dist('Mesa Geitonia avenue'), 'limassol');
eq('Kato Polemidia → limassol', dist('Kato Polemidia'), 'limassol');
eq('polemidia (alias) → limassol', dist('Polemidia roundabout'), 'limassol');
eq('Peyia → paphos', dist('Peyia, Coral Bay road'), 'paphos');
eq('Pegeia (alias) → paphos', dist('Pegeia municipality'), 'paphos');
eq('Geroskipou → paphos', dist('Geroskipou, Paphos'), 'paphos');
eq('Lakatamia → nicosia', dist('Lakatamia, Nicosia'), 'nicosia');
eq('Strovolos → nicosia', dist('28 Strovolos Avenue'), 'nicosia');
eq('Paralimni → famagusta', dist('Paralimni centre'), 'famagusta');
eq('Ayia Napa → famagusta', dist('Nissi Avenue, Ayia Napa'), 'famagusta');
eq('Agia Napa (alias) → famagusta', dist('Agia Napa harbour'), 'famagusta');
eq('Sotira → famagusta', dist('Sotira, Ammochostos'), 'famagusta');

// ── Names resolve to the canonical name ─────────────────────────────────────────
eq('address resolves to the town name', nm('Leoforos Larnakos 5, 7080 Pyla'), 'Pyla');
eq('longest match wins (Mesa Geitonia, not a bare town)', nm('shop in Mesa Geitonia'), 'Mesa Geitonia');

// ── Word-boundary safety — a town name inside a longer word must NOT match ───────
eq('"prokitika" does not match "Kiti"', findLocality('prokitika services ltd'), null);
eq('unrecognisable address → null', findLocality('123 Main Road, Cyprus'), null);
eq('too short → null', findLocality('a'), null);

// ── Diacritics are folded ───────────────────────────────────────────────────────
eq('accented Yeroskípou → paphos', dist('Yeroskípou'), 'paphos');

// ── Query building is district-qualified (disambiguates duplicate village names) ──
{
  const sotira = CY_LOCALITIES.find((l) => l.name === 'Sotira')!;
  eq('locality query is district-qualified', localityQuery(sotira), 'Sotira, Famagusta, Cyprus');
}

// ── List integrity ──────────────────────────────────────────────────────────────
{
  const valid: District[] = ['larnaca', 'limassol', 'paphos', 'nicosia', 'famagusta'];
  ok('every locality has a valid district', CY_LOCALITIES.every((l) => valid.includes(l.district)));
  ok('all five districts are represented', valid.every((d) => CY_LOCALITIES.some((l) => l.district === d)));
  ok('every district has a display name', valid.every((d) => !!DISTRICT_NAME[d]));
  ok('names are non-trivial', CY_LOCALITIES.every((l) => l.name.length >= 3));
  // Coordinate integrity — every centroid must sit inside the Cyprus bounding box, so a
  // typo (wrong sign, transposed digits) can never place a business off-island.
  ok('every locality centroid is inside Cyprus', CY_LOCALITIES.every((l) =>
    typeof l.lat === 'number' && typeof l.lng === 'number' &&
    l.lat > 34.4 && l.lat < 35.8 && l.lng > 32.2 && l.lng < 34.7));
  // Spot-checks against known town centres (±0.1° ≈ 11 km tolerance).
  const near = (a: number, b: number) => Math.abs(a - b) < 0.1;
  const L = (n: string) => CY_LOCALITIES.find((x) => x.name === n)!;
  ok('Larnaca centroid is right', near(L('Larnaca').lat, 34.92) && near(L('Larnaca').lng, 33.62));
  ok('Paphos centroid is right', near(L('Paphos').lat, 34.77) && near(L('Paphos').lng, 32.43));
  ok('Ayia Napa centroid is right', near(L('Ayia Napa').lat, 34.99) && near(L('Ayia Napa').lng, 34.00));
}

report('localities.pure');
