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

export interface Locality { name: string; district: District; aliases?: string[] }

// Proper display name per district, for a well-disambiguated geocoder query
// (e.g. "Sotira, Famagusta, Cyprus" — there is also a Sotira in Limassol).
export const DISTRICT_NAME: Record<District, string> = {
  larnaca: 'Larnaca', limassol: 'Limassol', paphos: 'Paphos', nicosia: 'Nicosia', famagusta: 'Famagusta',
};

// Curated list — district capitals, suburbs and the well-known villages, across all
// five districts. Enough to localize the great majority of imported businesses; the
// rest fall through to the per-address geocode queue.
export const CY_LOCALITIES: Locality[] = [
  // Larnaca
  { name: 'Larnaca', district: 'larnaca', aliases: ['larnaka'] },
  { name: 'Mackenzie', district: 'larnaca', aliases: ['makenzy', 'mackenzy'] },
  { name: 'Aradippou', district: 'larnaca' },
  { name: 'Pyla', district: 'larnaca', aliases: ['pila'] },
  { name: 'Oroklini', district: 'larnaca', aliases: ['voroklini'] },
  { name: 'Livadia', district: 'larnaca' },
  { name: 'Kiti', district: 'larnaca' },
  { name: 'Perivolia', district: 'larnaca' },
  { name: 'Dromolaxia', district: 'larnaca' },
  { name: 'Meneou', district: 'larnaca' },
  { name: 'Tersefanou', district: 'larnaca' },
  { name: 'Kornos', district: 'larnaca' },
  { name: 'Lefkara', district: 'larnaca', aliases: ['pano lefkara', 'kato lefkara'] },
  { name: 'Athienou', district: 'larnaca' },
  { name: 'Kalavasos', district: 'larnaca' },
  { name: 'Mazotos', district: 'larnaca' },
  { name: 'Alethriko', district: 'larnaca' },
  { name: 'Kofinou', district: 'larnaca', aliases: ['kophinou'] },
  { name: 'Xylofagou', district: 'larnaca', aliases: ['xylophagou'] },
  { name: 'Xylotympou', district: 'larnaca' },
  { name: 'Ormideia', district: 'larnaca' },

  // Limassol
  { name: 'Limassol', district: 'limassol', aliases: ['lemesos'] },
  { name: 'Germasogeia', district: 'limassol', aliases: ['yermasoyia', 'germasoyia'] },
  { name: 'Mesa Geitonia', district: 'limassol' },
  { name: 'Agios Athanasios', district: 'limassol' },
  { name: 'Ypsonas', district: 'limassol' },
  { name: 'Kato Polemidia', district: 'limassol', aliases: ['polemidia'] },
  { name: 'Agios Tychonas', district: 'limassol', aliases: ['agios tychon'] },
  { name: 'Mouttagiaka', district: 'limassol' },
  { name: 'Parekklisia', district: 'limassol' },
  { name: 'Pissouri', district: 'limassol' },
  { name: 'Kolossi', district: 'limassol' },
  { name: 'Erimi', district: 'limassol' },
  { name: 'Episkopi', district: 'limassol' },
  { name: 'Platres', district: 'limassol', aliases: ['pano platres'] },
  { name: 'Omodos', district: 'limassol' },
  { name: 'Pelendri', district: 'limassol' },
  { name: 'Palodia', district: 'limassol' },
  { name: 'Pyrgos', district: 'limassol' },
  { name: 'Monagroulli', district: 'limassol' },

  // Paphos
  { name: 'Paphos', district: 'paphos', aliases: ['pafos'] },
  { name: 'Geroskipou', district: 'paphos', aliases: ['yeroskipou'] },
  { name: 'Peyia', district: 'paphos', aliases: ['pegeia'] },
  { name: 'Coral Bay', district: 'paphos' },
  { name: 'Chloraka', district: 'paphos', aliases: ['chlorakas'] },
  { name: 'Kissonerga', district: 'paphos' },
  { name: 'Tala', district: 'paphos' },
  { name: 'Emba', district: 'paphos', aliases: ['empa'] },
  { name: 'Konia', district: 'paphos' },
  { name: 'Tsada', district: 'paphos' },
  { name: 'Kathikas', district: 'paphos' },
  { name: 'Polis', district: 'paphos', aliases: ['polis chrysochous', 'polis chrysochou'] },
  { name: 'Latchi', district: 'paphos', aliases: ['latsi'] },
  { name: 'Kouklia', district: 'paphos' },
  { name: 'Mandria', district: 'paphos' },
  { name: 'Argaka', district: 'paphos' },
  { name: 'Pomos', district: 'paphos' },

  // Nicosia
  { name: 'Nicosia', district: 'nicosia', aliases: ['lefkosia'] },
  { name: 'Strovolos', district: 'nicosia' },
  { name: 'Lakatamia', district: 'nicosia', aliases: ['lakatameia'] },
  { name: 'Aglantzia', district: 'nicosia', aliases: ['aglandjia'] },
  { name: 'Latsia', district: 'nicosia' },
  { name: 'Engomi', district: 'nicosia', aliases: ['egkomi'] },
  { name: 'Kaimakli', district: 'nicosia' },
  { name: 'Agios Dometios', district: 'nicosia', aliases: ['ayios dometios'] },
  { name: 'Tseri', district: 'nicosia' },
  { name: 'Dali', district: 'nicosia', aliases: ['idalion'] },
  { name: 'Geri', district: 'nicosia' },
  { name: 'Lympia', district: 'nicosia' },
  { name: 'Deftera', district: 'nicosia', aliases: ['kato deftera', 'pano deftera'] },
  { name: 'Anthoupoli', district: 'nicosia' },
  { name: 'Kokkinotrimithia', district: 'nicosia' },
  { name: 'Kakopetria', district: 'nicosia' },
  { name: 'Astromeritis', district: 'nicosia' },

  // Famagusta (the free south — Ayia Napa / Paralimni area)
  { name: 'Ayia Napa', district: 'famagusta', aliases: ['agia napa'] },
  { name: 'Protaras', district: 'famagusta' },
  { name: 'Paralimni', district: 'famagusta' },
  { name: 'Kapparis', district: 'famagusta' },
  { name: 'Deryneia', district: 'famagusta', aliases: ['dherynia', 'derynia'] },
  { name: 'Sotira', district: 'famagusta' },
  { name: 'Frenaros', district: 'famagusta' },
  { name: 'Avgorou', district: 'famagusta' },
  { name: 'Liopetri', district: 'famagusta' },
  { name: 'Vrysoulles', district: 'famagusta' },
  { name: 'Acheritou', district: 'famagusta' },
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
