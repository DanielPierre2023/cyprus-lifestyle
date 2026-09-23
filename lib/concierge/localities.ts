// lib/concierge/localities.ts
// ============================================================================
// Cyprus localities → district, for the coordinate FAST PASS (geocode-directory).
// ----------------------------------------------------------------------------
// The bulk import (14,671 listings) has no coordinates, so the concierge's radius
// search ("nearest to me") skips every one of them. Geocoding 14,671 free-text
// addresses one by one against a rate-limited geocoder would crawl. Instead we
// geocode each DISTINCT town/village ONCE (there are ~100, cached in geocode_cache),
// then stamp that town's coordinate on every business in it — so "an air-conditioning
// specialist in Pyla" gets real Pyla businesses within radius in minutes. The existing
// per-address job (geocode_listing) then refines precision in the background.
//
// This file is pure (no I/O) so findLocality is unit-tested. Names are real Republic-
// of-Cyprus (south) localities; district is the canonical key the directory uses.
// ============================================================================

export type District = 'larnaca' | 'limassol' | 'paphos' | 'nicosia' | 'famagusta';

export interface Locality { name: string; district: District; lat: number; lng: number; aliases?: string[] }

// Proper display name per district, for a well-disambiguated geocoder query
// (e.g. "Sotira, Famagusta, Cyprus" — there is also a Sotira in Limassol).
export const DISTRICT_NAME: Record<District, string> = {
  larnaca: 'Larnaca', limassol: 'Limassol', paphos: 'Paphos', nicosia: 'Nicosia', famagusta: 'Famagusta',
};

// Curated list — district capitals, suburbs and the well-known villages, across all
// five districts. Enough to localize the great majority of imported businesses; the
// rest fall through to the per-address geocode queue.
export const CY_LOCALITIES: Locality[] = [
  // Larnaca. Coordinates are town/village centroids (WGS84) — good for radius ranking;
  // the per-address geocode_listing job refines to street level in the background.
  { name: 'Larnaca', district: 'larnaca', lat: 34.9182, lng: 33.6236, aliases: ['larnaka'] },
  { name: 'Mackenzie', district: 'larnaca', lat: 34.9000, lng: 33.6333, aliases: ['makenzy', 'mackenzy'] },
  { name: 'Aradippou', district: 'larnaca', lat: 34.9333, lng: 33.5833 },
  { name: 'Pyla', district: 'larnaca', lat: 34.9833, lng: 33.6917, aliases: ['pila'] },
  { name: 'Oroklini', district: 'larnaca', lat: 34.9833, lng: 33.6500, aliases: ['voroklini'] },
  { name: 'Livadia', district: 'larnaca', lat: 34.9500, lng: 33.6167 },
  { name: 'Kiti', district: 'larnaca', lat: 34.8417, lng: 33.5667 },
  { name: 'Perivolia', district: 'larnaca', lat: 34.8333, lng: 33.6000 },
  { name: 'Dromolaxia', district: 'larnaca', lat: 34.8833, lng: 33.6000 },
  { name: 'Meneou', district: 'larnaca', lat: 34.8500, lng: 33.6000 },
  { name: 'Tersefanou', district: 'larnaca', lat: 34.8400, lng: 33.5500 },
  { name: 'Kornos', district: 'larnaca', lat: 34.9333, lng: 33.4333 },
  { name: 'Lefkara', district: 'larnaca', lat: 34.8667, lng: 33.3000, aliases: ['pano lefkara', 'kato lefkara'] },
  { name: 'Athienou', district: 'larnaca', lat: 35.0500, lng: 33.5333 },
  { name: 'Kalavasos', district: 'larnaca', lat: 34.7667, lng: 33.2917 },
  { name: 'Mazotos', district: 'larnaca', lat: 34.7900, lng: 33.4900 },
  { name: 'Alethriko', district: 'larnaca', lat: 34.8500, lng: 33.5167 },
  { name: 'Kofinou', district: 'larnaca', lat: 34.8333, lng: 33.4167, aliases: ['kophinou'] },
  { name: 'Xylofagou', district: 'larnaca', lat: 34.9667, lng: 33.8500, aliases: ['xylophagou'] },
  { name: 'Xylotympou', district: 'larnaca', lat: 34.9667, lng: 33.8167 },
  { name: 'Ormideia', district: 'larnaca', lat: 34.9833, lng: 33.7833 },

  // Limassol
  { name: 'Limassol', district: 'limassol', lat: 34.7071, lng: 33.0226, aliases: ['lemesos'] },
  { name: 'Germasogeia', district: 'limassol', lat: 34.7167, lng: 33.0833, aliases: ['yermasoyia', 'germasoyia'] },
  { name: 'Mesa Geitonia', district: 'limassol', lat: 34.6939, lng: 33.0553 },
  { name: 'Agios Athanasios', district: 'limassol', lat: 34.7050, lng: 33.0450 },
  { name: 'Ypsonas', district: 'limassol', lat: 34.7000, lng: 32.9667 },
  { name: 'Kato Polemidia', district: 'limassol', lat: 34.7000, lng: 33.0000, aliases: ['polemidia'] },
  { name: 'Agios Tychonas', district: 'limassol', lat: 34.7100, lng: 33.1333, aliases: ['agios tychon'] },
  { name: 'Mouttagiaka', district: 'limassol', lat: 34.7167, lng: 33.1000 },
  { name: 'Parekklisia', district: 'limassol', lat: 34.7333, lng: 33.1667 },
  { name: 'Pissouri', district: 'limassol', lat: 34.6667, lng: 32.7000 },
  { name: 'Kolossi', district: 'limassol', lat: 34.6667, lng: 32.9333 },
  { name: 'Erimi', district: 'limassol', lat: 34.6833, lng: 32.9167 },
  { name: 'Episkopi', district: 'limassol', lat: 34.6667, lng: 32.8833 },
  { name: 'Platres', district: 'limassol', lat: 34.8917, lng: 32.8667, aliases: ['pano platres'] },
  { name: 'Omodos', district: 'limassol', lat: 34.8500, lng: 32.8000 },
  { name: 'Pelendri', district: 'limassol', lat: 34.9000, lng: 32.9833 },
  { name: 'Palodia', district: 'limassol', lat: 34.7500, lng: 33.0500 },
  { name: 'Pyrgos', district: 'limassol', lat: 34.7167, lng: 33.2167 },
  { name: 'Monagroulli', district: 'limassol', lat: 34.7333, lng: 33.2500 },

  // Paphos
  { name: 'Paphos', district: 'paphos', lat: 34.7720, lng: 32.4297, aliases: ['pafos'] },
  { name: 'Geroskipou', district: 'paphos', lat: 34.7600, lng: 32.4500, aliases: ['yeroskipou'] },
  { name: 'Peyia', district: 'paphos', lat: 34.8833, lng: 32.3833, aliases: ['pegeia'] },
  { name: 'Coral Bay', district: 'paphos', lat: 34.8583, lng: 32.3667 },
  { name: 'Chloraka', district: 'paphos', lat: 34.7833, lng: 32.4167, aliases: ['chlorakas'] },
  { name: 'Kissonerga', district: 'paphos', lat: 34.8167, lng: 32.4000 },
  { name: 'Tala', district: 'paphos', lat: 34.8333, lng: 32.4333 },
  { name: 'Emba', district: 'paphos', lat: 34.8000, lng: 32.4333, aliases: ['empa'] },
  { name: 'Konia', district: 'paphos', lat: 34.7833, lng: 32.4500 },
  { name: 'Tsada', district: 'paphos', lat: 34.8333, lng: 32.4667 },
  { name: 'Kathikas', district: 'paphos', lat: 34.9000, lng: 32.4000 },
  { name: 'Polis', district: 'paphos', lat: 35.0367, lng: 32.4267, aliases: ['polis chrysochous', 'polis chrysochou'] },
  { name: 'Latchi', district: 'paphos', lat: 35.0400, lng: 32.3967, aliases: ['latsi'] },
  { name: 'Kouklia', district: 'paphos', lat: 34.7000, lng: 32.5833 },
  { name: 'Mandria', district: 'paphos', lat: 34.7000, lng: 32.5333 },
  { name: 'Argaka', district: 'paphos', lat: 35.0500, lng: 32.3500 },
  { name: 'Pomos', district: 'paphos', lat: 35.1500, lng: 32.5500 },

  // Nicosia
  { name: 'Nicosia', district: 'nicosia', lat: 35.1856, lng: 33.3823, aliases: ['lefkosia'] },
  { name: 'Strovolos', district: 'nicosia', lat: 35.1333, lng: 33.3500 },
  { name: 'Lakatamia', district: 'nicosia', lat: 35.1167, lng: 33.3167, aliases: ['lakatameia'] },
  { name: 'Aglantzia', district: 'nicosia', lat: 35.1500, lng: 33.4000, aliases: ['aglandjia'] },
  { name: 'Latsia', district: 'nicosia', lat: 35.1000, lng: 33.3833 },
  { name: 'Engomi', district: 'nicosia', lat: 35.1667, lng: 33.3333, aliases: ['egkomi'] },
  { name: 'Kaimakli', district: 'nicosia', lat: 35.1833, lng: 33.3833 },
  { name: 'Agios Dometios', district: 'nicosia', lat: 35.1667, lng: 33.3333, aliases: ['ayios dometios'] },
  { name: 'Tseri', district: 'nicosia', lat: 35.0833, lng: 33.3333 },
  { name: 'Dali', district: 'nicosia', lat: 35.0167, lng: 33.4167, aliases: ['idalion'] },
  { name: 'Geri', district: 'nicosia', lat: 35.1000, lng: 33.4167 },
  { name: 'Lympia', district: 'nicosia', lat: 34.9833, lng: 33.4667 },
  { name: 'Deftera', district: 'nicosia', lat: 35.0833, lng: 33.2833, aliases: ['kato deftera', 'pano deftera'] },
  { name: 'Anthoupoli', district: 'nicosia', lat: 35.1500, lng: 33.3167 },
  { name: 'Kokkinotrimithia', district: 'nicosia', lat: 35.1333, lng: 33.2167 },
  { name: 'Kakopetria', district: 'nicosia', lat: 34.9833, lng: 32.9000 },
  { name: 'Astromeritis', district: 'nicosia', lat: 35.1333, lng: 33.0667 },

  // Famagusta (the free south — Ayia Napa / Paralimni area)
  { name: 'Ayia Napa', district: 'famagusta', lat: 34.9880, lng: 33.9997, aliases: ['agia napa'] },
  { name: 'Protaras', district: 'famagusta', lat: 35.0122, lng: 34.0583 },
  { name: 'Paralimni', district: 'famagusta', lat: 35.0381, lng: 33.9822 },
  { name: 'Kapparis', district: 'famagusta', lat: 35.0333, lng: 34.0333 },
  { name: 'Deryneia', district: 'famagusta', lat: 35.0500, lng: 33.9667, aliases: ['dherynia', 'derynia'] },
  { name: 'Sotira', district: 'famagusta', lat: 35.0333, lng: 33.9500 },
  { name: 'Frenaros', district: 'famagusta', lat: 35.0333, lng: 33.9167 },
  { name: 'Avgorou', district: 'famagusta', lat: 35.0333, lng: 33.8667 },
  { name: 'Liopetri', district: 'famagusta', lat: 35.0000, lng: 33.8833 },
  { name: 'Vrysoulles', district: 'famagusta', lat: 35.0167, lng: 33.8667 },
  { name: 'Acheritou', district: 'famagusta', lat: 35.0000, lng: 33.8500 },
];

// ── Pure matcher (unit-tested). ───────────────────────────────────────────────
const deacc = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s: string) => deacc(String(s || '').toLowerCase());

// Every (token → locality) pair, longest token first so multi-word / more specific
// names win ("Mesa Geitonia" before a bare "Geitonia", "Ayia Napa" before "Napa",
// "Kato Polemidia" before "Polemidia"). Built once at module load.
interface Tok { token: string; loc: Locality }
const TOKENS: Tok[] = (() => {
  const out: Tok[] = [];
  for (const loc of CY_LOCALITIES) {
    out.push({ token: norm(loc.name), loc });
    for (const a of loc.aliases || []) out.push({ token: norm(a), loc });
  }
  return out.sort((a, b) => b.token.length - a.token.length);
})();

// True when `token` appears in `text` delimited by non-letters (so "kiti" does not
// match inside "prokitika", but "kiti," / " kiti" / "kiti" at the end all do).
function hasWord(text: string, token: string): boolean {
  let from = 0;
  for (;;) {
    const i = text.indexOf(token, from);
    if (i < 0) return false;
    const before = i === 0 ? '' : text[i - 1];
    const after = i + token.length >= text.length ? '' : text[i + token.length];
    const okBefore = before === '' || !/[a-z]/.test(before);
    const okAfter = after === '' || !/[a-z]/.test(after);
    if (okBefore && okAfter) return true;
    from = i + 1;
  }
}

// Find the locality named in a free-text address/name. Longest match wins; null when
// nothing recognisable (those rows go to the per-address geocode queue instead).
export function findLocality(text: string): Locality | null {
  const t = norm(text);
  if (t.length < 3) return null;
  for (const { token, loc } of TOKENS) {
    if (token.length >= 3 && hasWord(t, token)) return loc;
  }
  return null;
}

// The geocoder query for a locality — district-qualified so duplicate village names
// across districts (e.g. Sotira) resolve to the right one.
export function localityQuery(loc: Locality): string {
  return `${loc.name}, ${DISTRICT_NAME[loc.district]}, Cyprus`;
}
