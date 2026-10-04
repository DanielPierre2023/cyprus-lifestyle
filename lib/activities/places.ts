// lib/activities/places.ts
// ============================================================================
// Cyprus Lifestyle's own gazetteer for the experiences catalogue — towns and
// landmarks in the Republic of Cyprus (south), each with a district key, a map
// point and the phrase we use for it in titles. Pure data + a matcher; no I/O.
//
// Coordinates are public geographic facts (checked against OpenStreetMap).
// Experiences are pinned here instead of at any third-party geocode, so a pin
// means "this is the area" — never an exact meeting point.
// ============================================================================

export interface Place {
  key: string;
  name: string;            // display name
  phrase?: string;         // how a title refers to it ("the Blue Lagoon"); defaults to name
  district: 'paphos' | 'limassol' | 'larnaca' | 'nicosia' | 'famagusta';
  lat: number; lng: number;
  type: 'town' | 'landmark';
  rx: RegExp;              // matched against folded (accent-free, lower-case) text
}

/** Accent-free lower-case, curly quotes straightened — what every matcher sees. */
export const foldText = (s: string) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[‘’ʼ`]/g, "'").replace(/[“”]/g, '"')
  .toLowerCase();

// ── Towns & villages (departure points) ─────────────────────────────────────────────
export const TOWNS: Place[] = [
  { key: 'paphos', name: 'Paphos', district: 'paphos', lat: 34.7754, lng: 32.4218, type: 'town', rx: /\b(kato )?(paphos|pafos|papfos)\b/ },
  { key: 'peyia', name: 'Peyia', district: 'paphos', lat: 34.8850, lng: 32.3820, type: 'town', rx: /\b(peyia|pegeia)\b/ },
  { key: 'coral-bay-town', name: 'Coral Bay', district: 'paphos', lat: 34.8538, lng: 32.3699, type: 'town', rx: /\bcoral bay\b/ },
  { key: 'polis', name: 'Polis', district: 'paphos', lat: 35.0344, lng: 32.4264, type: 'town', rx: /\bpolis\b/ },
  { key: 'latchi', name: 'Latchi', district: 'paphos', lat: 35.0399, lng: 32.3962, type: 'town', rx: /\b(latchi|latsi|latchi harbou?r)\b/ },
  { key: 'neo-chorio', name: 'Neo Chorio', district: 'paphos', lat: 35.0265, lng: 32.3634, type: 'town', rx: /\bneo chorio\b/ },
  { key: 'chloraka', name: 'Chloraka', district: 'paphos', lat: 34.7995, lng: 32.4079, type: 'town', rx: /\b(chloraka|chlorakas)\b/ },
  { key: 'yeroskipou', name: 'Yeroskipou', district: 'paphos', lat: 34.7611, lng: 32.4526, type: 'town', rx: /\b(yeroskipou|geroskipou)\b/ },
  { key: 'tala', name: 'Tala', district: 'paphos', lat: 34.8361, lng: 32.4310, type: 'town', rx: /\btala\b/ },
  { key: 'kathikas', name: 'Kathikas', district: 'paphos', lat: 34.9175, lng: 32.4330, type: 'town', rx: /\bkathikas\b/ },
  { key: 'mandria', name: 'Mandria', district: 'paphos', lat: 34.7027, lng: 32.5248, type: 'town', rx: /\bmandria\b/ },
  { key: 'limassol', name: 'Limassol', district: 'limassol', lat: 34.6800, lng: 33.0400, type: 'town', rx: /\b(limassol|lemesos)\b/ },
  { key: 'germasogeia', name: 'Germasogeia', district: 'limassol', lat: 34.7120, lng: 33.0880, type: 'town', rx: /\bgermasog(e)?ia\b/ },
  { key: 'kato-polemidia', name: 'Kato Polemidia', district: 'limassol', lat: 34.6905, lng: 33.0034, type: 'town', rx: /\bkato polemidia\b/ },
  { key: 'pissouri', name: 'Pissouri', district: 'limassol', lat: 34.6689, lng: 32.7010, type: 'town', rx: /\bpissouri\b/ },
  { key: 'omodos', name: 'Omodos', district: 'limassol', lat: 34.8480, lng: 32.8078, type: 'town', rx: /\bomodos\b/ },
  { key: 'platres', name: 'Platres', district: 'limassol', lat: 34.8886, lng: 32.8648, type: 'town', rx: /\bplatres\b/ },
  { key: 'koilani', name: 'Koilani', district: 'limassol', lat: 34.8340, lng: 32.8505, type: 'town', rx: /\bkoilani\b/ },  // approximate village centre
  { key: 'vouni', name: 'Vouni', district: 'limassol', lat: 34.8215, lng: 32.8630, type: 'town', rx: /\bvouni\b/ },       // approximate village centre
  { key: 'agros', name: 'Agros', district: 'limassol', lat: 34.9176, lng: 33.0184, type: 'town', rx: /\bagros\b/ },
  { key: 'amiantos', name: 'Amiantos', district: 'limassol', lat: 34.9180, lng: 32.9357, type: 'town', rx: /\b(kato )?amiantos\b/ },
  { key: 'gerovasa', name: 'Gerovasa', district: 'limassol', lat: 34.8141, lng: 32.7363, type: 'town', rx: /\bgerovasa\b/ },
  { key: 'eptagonia', name: 'Eptagonia', district: 'limassol', lat: 34.8468, lng: 33.1584, type: 'town', rx: /\beptagonia\b/ },
  { key: 'anogyra', name: 'Anogyra', district: 'limassol', lat: 34.7398, lng: 32.7341, type: 'town', rx: /\banogyra\b/ },
  { key: 'troodos', name: 'Troodos', district: 'limassol', lat: 34.9227, lng: 32.8780, type: 'town', rx: /\btroodos( mountains?)?\b/ },
  { key: 'kakopetria', name: 'Kakopetria', district: 'nicosia', lat: 34.9690, lng: 32.8994, type: 'town', rx: /\bkakopetria\b/ },
  { key: 'kalopanayiotis', name: 'Kalopanayiotis', district: 'nicosia', lat: 34.9920, lng: 32.8281, type: 'town', rx: /\bkalopanayiotis\b/ },
  { key: 'larnaca', name: 'Larnaca', district: 'larnaca', lat: 34.9165, lng: 33.6300, type: 'town', rx: /\b(larnaca|larnaka)\b/ },
  { key: 'pyla', name: 'Pyla', district: 'larnaca', lat: 35.0138, lng: 33.6918, type: 'town', rx: /\bpyla\b/ },
  { key: 'oroklini', name: 'Oroklini', district: 'larnaca', lat: 34.9822, lng: 33.6558, type: 'town', rx: /\boroklini\b/ },
  { key: 'mazotos', name: 'Mazotos', district: 'larnaca', lat: 34.8041, lng: 33.4884, type: 'town', rx: /\bmazotos\b/ },
  { key: 'skarinou', name: 'Skarinou', district: 'larnaca', lat: 34.8214, lng: 33.3572, type: 'town', rx: /\bskarinou\b/ },
  { key: 'lefkara', name: 'Lefkara', district: 'larnaca', lat: 34.8666, lng: 33.3069, type: 'town', rx: /\b(pano )?lefkara\b/ },
  { key: 'avgorou', name: 'Avgorou', district: 'famagusta', lat: 35.0356, lng: 33.8401, type: 'town', rx: /\bavgorou\b/ },
  { key: 'nicosia', name: 'Nicosia', district: 'nicosia', lat: 35.1700, lng: 33.3600, type: 'town', rx: /\b(nicosia|nikosia|lefkosia)\b/ },
  { key: 'ayia-napa', name: 'Ayia Napa', district: 'famagusta', lat: 34.9893, lng: 33.9962, type: 'town', rx: /\b(ayia|agia|aiya) napa\b|^napa\b/ },
  { key: 'protaras', name: 'Protaras', district: 'famagusta', lat: 35.0149, lng: 34.0531, type: 'town', rx: /\bprotaras\b/ },
  { key: 'paralimni', name: 'Paralimni', district: 'famagusta', lat: 35.0391, lng: 33.9828, type: 'town', rx: /\bparalimni\b/ },
  { key: 'pernera', name: 'Pernera', district: 'famagusta', lat: 35.0275, lng: 34.0460, type: 'town', rx: /\bpernera\b/ },
  { key: 'frenaros', name: 'Frenaros', district: 'famagusta', lat: 35.0421, lng: 33.9223, type: 'town', rx: /\bfrenaros\b/ },
];

// ── Landmarks (what an experience is about) ──────────────────────────────────────────
// Order = priority when a title names several; specific before generic.
export const LANDMARKS: Place[] = [
  // Paphos — Akamas & west coast
  { key: 'blue-lagoon-akamas', name: 'Blue Lagoon (Akamas)', phrase: 'the Blue Lagoon', district: 'paphos', lat: 35.0828, lng: 32.3058, type: 'landmark', rx: /\bblue lagoon\b/ },
  { key: 'baths-of-aphrodite', name: 'Baths of Aphrodite', phrase: "the Baths of Aphrodite", district: 'paphos', lat: 35.0564, lng: 32.3439, type: 'landmark', rx: /\b(baths of aphrodite|aphrodite'?s baths)\b/ },
  { key: 'fontana-amorosa', name: 'Fontana Amorosa', district: 'paphos', lat: 35.0894, lng: 32.3008, type: 'landmark', rx: /\bfontana amorosa\b/ },
  { key: 'avakas-gorge', name: 'Avakas Gorge', district: 'paphos', lat: 34.9257, lng: 32.3314, type: 'landmark', rx: /\bavaka(s)? gorge\b|\bavakas\b/ },
  { key: 'lara-bay', name: 'Lara Bay', district: 'paphos', lat: 34.9567, lng: 32.3143, type: 'landmark', rx: /\blara (bay|beach)\b|\bturtle (bay|beach)\b/ },
  { key: 'akamas', name: 'Akamas Peninsula', phrase: 'the Akamas', district: 'paphos', lat: 35.0530, lng: 32.3220, type: 'landmark', rx: /\bakamas\b/ },
  { key: 'adonis-baths', name: 'Adonis Baths', district: 'paphos', lat: 34.8703, lng: 32.4346, type: 'landmark', rx: /\badonis( baths| falls| waterfalls?)?\b/ },
  { key: 'peyia-sea-caves', name: 'Peyia sea caves', phrase: 'the Peyia sea caves', district: 'paphos', lat: 34.8615, lng: 32.3530, type: 'landmark', rx: /\bsea ?caves?\b|\bedro\b|\bshipwreck\b(?=.*(lara|coral|adonis))|(?<=(adonis|lara).*)\bshipwreck\b/ },
  { key: 'coral-bay', name: 'Coral Bay', district: 'paphos', lat: 34.8538, lng: 32.3699, type: 'landmark', rx: /\bcoral bay\b/ },
  { key: 'moulia-rocks', name: 'Moulia Rocks', district: 'paphos', lat: 34.7240, lng: 32.4347, type: 'landmark', rx: /\bmoulia\b/ },
  { key: 'tombs-of-the-kings', name: 'Tombs of the Kings', phrase: 'the Tombs of the Kings', district: 'paphos', lat: 34.7763, lng: 32.4050, type: 'landmark', rx: /\btombs( of the kings)?\b/ },
  { key: 'paphos-archaeological-park', name: 'Paphos Archaeological Park', district: 'paphos', lat: 34.7596, lng: 32.4075, type: 'landmark', rx: /\b(archaeolog\w*|mosaics?)\b(?=.*pa(ph|f)os)|\bkato paphos\b/ },
  { key: 'paphos-harbour', name: 'Paphos Harbour', district: 'paphos', lat: 34.7556, lng: 32.4110, type: 'landmark', rx: /\bpa(ph|f)os harbou?r\b/ },
  { key: 'aphrodite-waterpark', name: 'Aphrodite Waterpark', district: 'paphos', lat: 34.7423, lng: 32.4414, type: 'landmark', rx: /\b(aphrodite )?water ?park\b(?=.*pa(ph|f)os)|\baphrodite water ?park\b/ },
  { key: 'paphos-zoo', name: 'Paphos Zoo', district: 'paphos', lat: 34.8928, lng: 32.3418, type: 'landmark', rx: /\bzoo\b/ },
  { key: 'agios-neophytos', name: 'Agios Neophytos Monastery', district: 'paphos', lat: 34.8453, lng: 32.4473, type: 'landmark', rx: /\b(agios |st\.? |saint )?neophyt(os|e)\b/ },
  { key: 'chrysoroyiatissa', name: 'Chrysoroyiatissa Monastery', district: 'paphos', lat: 34.8835, lng: 32.6163, type: 'landmark', rx: /\bchrysoro(yi|gi)atissa\b/ },
  { key: 'aphrodites-rock', name: "Aphrodite's Rock", district: 'paphos', lat: 34.6641, lng: 32.6271, type: 'landmark', rx: /\b(aphrodite'?s? rock|rock of aphrodite|aphrodite'?s birthplace|petra tou romiou|afrotide'?s rock)\b/ },
  // Limassol & Troodos
  { key: 'kourion', name: 'Ancient Kourion', district: 'limassol', lat: 34.6642, lng: 32.8880, type: 'landmark', rx: /\bkourion\b/ },
  { key: 'kolossi', name: 'Kolossi Castle', district: 'limassol', lat: 34.6652, lng: 32.9343, type: 'landmark', rx: /\bkolossi\b/ },
  { key: 'limassol-marina', name: 'Limassol Marina', district: 'limassol', lat: 34.6696, lng: 33.0402, type: 'landmark', rx: /\blimassol (marina|marine|old port)\b/ },
  { key: 'limassol-castle', name: 'Limassol old town', district: 'limassol', lat: 34.6722, lng: 33.0417, type: 'landmark', rx: /\blimassol castle\b/ },
  { key: 'paradox-museum', name: 'Paradox Museum', district: 'limassol', lat: 34.6706, lng: 33.0406, type: 'landmark', rx: /\bparadox museum\b/ },
  { key: 'cape-gata', name: 'Cape Gata', district: 'limassol', lat: 34.5672, lng: 33.0173, type: 'landmark', rx: /\bcape gata\b/ },
  { key: 'kykkos', name: 'Kykkos Monastery', district: 'nicosia', lat: 34.9839, lng: 32.7412, type: 'landmark', rx: /\bkykkos\b/ },
  { key: 'mount-olympus', name: 'Mount Olympus', district: 'limassol', lat: 34.9365, lng: 32.8635, type: 'landmark', rx: /\b(mount )?olympus\b|\bartemis trail\b/ },
  { key: 'caledonia-falls', name: 'Caledonia Waterfall', district: 'limassol', lat: 34.9010, lng: 32.8680, type: 'landmark', rx: /\bcaledonia\b/ },
  { key: 'millomeris-falls', name: 'Millomeris Waterfall', district: 'limassol', lat: 34.8872, lng: 32.8640, type: 'landmark', rx: /\bmillomeris\b/ },
  { key: 'chantara-falls', name: 'Chantara Waterfall', district: 'limassol', lat: 34.9051, lng: 32.8408, type: 'landmark', rx: /\bchantara\b/ },
  { key: 'tzelefos-bridge', name: 'Tzelefos Bridge', district: 'paphos', lat: 34.8899, lng: 32.7472, type: 'landmark', rx: /\btzelefos\b/ },
  { key: 'troodos-mountains', name: 'Troodos Mountains', phrase: 'the Troodos Mountains', district: 'limassol', lat: 34.9227, lng: 32.8780, type: 'landmark', rx: /\btroodos\b/ },
  // Larnaca
  { key: 'zenobia', name: 'Zenobia wreck', phrase: 'the Zenobia wreck', district: 'larnaca', lat: 34.9005, lng: 33.6580, type: 'landmark', rx: /\bzenobia\b/ },
  { key: 'larnaca-salt-lake', name: 'Larnaca Salt Lake', phrase: 'the Salt Lake', district: 'larnaca', lat: 34.8791, lng: 33.6197, type: 'landmark', rx: /\bsalt lake\b/ },
  { key: 'hala-sultan-tekke', name: 'Hala Sultan Tekke', district: 'larnaca', lat: 34.8854, lng: 33.6100, type: 'landmark', rx: /\bhala sultan\b/ },
  { key: 'st-lazarus', name: 'Church of St Lazarus', district: 'larnaca', lat: 34.9118, lng: 33.6357, type: 'landmark', rx: /\b(saint|st\.?) lazarus\b/ },
  { key: 'finikoudes', name: 'Finikoudes', district: 'larnaca', lat: 34.9125, lng: 33.6368, type: 'landmark', rx: /\bfinikoudes\b/ },
  { key: 'larnaca-marina', name: 'Larnaca Marina', district: 'larnaca', lat: 34.9177, lng: 33.6406, type: 'landmark', rx: /\blarnaca (marina|bay)\b/ },
  { key: 'choirokoitia', name: 'Choirokoitia', district: 'larnaca', lat: 34.7982, lng: 33.3488, type: 'landmark', rx: /\b(choirokoitia|khirokitia)\b|\bunesco\b(?=.*(lefkara|larnaka|larnaca|donkey|white rocks))/ },
  { key: 'golden-donkeys', name: 'Golden Donkeys Farm', district: 'larnaca', lat: 34.8184, lng: 33.3339, type: 'landmark', rx: /\bgolden donkeys?\b/ },
  { key: 'camel-park', name: 'Camel Park', district: 'larnaca', lat: 34.8001, lng: 33.5076, type: 'landmark', rx: /\bcamel park\b/ },
  // Nicosia
  { key: 'nicosia-old-town', name: 'Nicosia old town', phrase: 'Nicosia old town', district: 'nicosia', lat: 35.1753, lng: 33.3620, type: 'landmark', rx: /\b(walled city|old town)\b(?=.*nicosia)|\bnicosia\b(?=.*(old town|walking|walk|bike|green line|buffer|divided|ledra))/ },
  { key: 'machairas', name: 'Machairas Monastery', district: 'nicosia', lat: 34.9440, lng: 33.1950, type: 'landmark', rx: /\bmach(a|ai)ras\b/ },
  // Famagusta (free area) — Ayia Napa & Protaras coast
  { key: 'musan', name: 'MUSAN underwater museum', phrase: 'the MUSAN underwater museum', district: 'famagusta', lat: 34.9826, lng: 33.9839, type: 'landmark', rx: /\bmusan\b|underwater (sculpture )?museum|sculpture museum/ },
  { key: 'cyclops-cave', name: 'Cyclops Cave', district: 'famagusta', lat: 34.9865, lng: 34.0765, type: 'landmark', rx: /\bcyclops\b/ },
  { key: 'blue-lagoon-cape-greco', name: 'Blue Lagoon (Cape Greco)', phrase: 'the Blue Lagoon', district: 'famagusta', lat: 34.9662, lng: 34.0798, type: 'landmark', rx: /\bblue lagoon\b/ },
  { key: 'ayia-napa-sea-caves', name: 'Ayia Napa sea caves', phrase: 'the sea caves', district: 'famagusta', lat: 34.9684, lng: 34.0546, type: 'landmark', rx: /\bsea ?caves?\b|\bcaves\b/ },
  { key: 'cape-greco', name: 'Cape Greco', district: 'famagusta', lat: 34.9600, lng: 34.0838, type: 'landmark', rx: /\b(cape|cavo) gre(c|k)o\b|\beast coast national park\b/ },
  { key: 'konnos-bay', name: 'Konnos Bay', district: 'famagusta', lat: 34.9840, lng: 34.0703, type: 'landmark', rx: /\bkonnos\b/ },
  { key: 'love-bridge', name: 'Bridge of Love', district: 'famagusta', lat: 34.9760, lng: 34.0135, type: 'landmark', rx: /\b(lovers?|love) bridge\b|\bbridge of (love|lovers)\b/ },
  { key: 'green-bay', name: 'Green Bay', district: 'famagusta', lat: 34.9996, lng: 34.0666, type: 'landmark', rx: /\bgreen bay\b/ },
  { key: 'fig-tree-bay', name: 'Fig Tree Bay', district: 'famagusta', lat: 35.0128, lng: 34.0588, type: 'landmark', rx: /\bfig tree bay\b/ },
  { key: 'turtle-cove', name: 'Turtle Cove', district: 'famagusta', lat: 34.9720, lng: 34.0480, type: 'landmark', rx: /\bturtle (cove|beach cove|bay)\b/ },
  { key: 'nissi-beach', name: 'Nissi Beach', district: 'famagusta', lat: 34.9875, lng: 33.9678, type: 'landmark', rx: /\bnissi\b/ },
  { key: 'makronissos', name: 'Makronissos', district: 'famagusta', lat: 34.9828, lng: 33.9553, type: 'landmark', rx: /\bmakronissos\b/ },
  { key: 'cyherbia', name: 'CyHerbia Botanical Park', district: 'famagusta', lat: 35.0140, lng: 33.8300, type: 'landmark', rx: /\bcyherbia\b/ },
];

const ALL: Place[] = [...LANDMARKS, ...TOWNS];
export const placeByKey = (k: string | null | undefined) => (k ? ALL.find((p) => p.key === k) || null : null);

export const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2));
};

/** The first known town named in a piece of text (folded). */
export function findTown(text: string): Place | null {
  const s = foldText(text);
  let best: { p: Place; at: number } | null = null;
  for (const p of TOWNS) {
    const m = p.rx.exec(s);
    if (m && (!best || m.index < best.at)) best = { p, at: m.index };
  }
  return best ? best.p : null;
}

/**
 * Landmarks named in a title, in the order they appear. "Blue Lagoon" exists twice
 * (Akamas in the west, Cape Greco in the east): the east one is chosen when the text
 * or the departure town is on the east coast.
 */
export function findLandmarks(text: string, departure: Place | null): Place[] {
  const s = foldText(text);
  // Blue Lagoon, "sea caves" and "Turtle Bay" exist on both coasts: the text decides
  // first (east: Ayia Napa / Protaras / Cape Greco; west: Latchi / Akamas / Paphos),
  // then the departure town.
  const eastWords = /\b(ayia|agia) napa\b|\bprotaras\b|\b(cape|cavo) gre(c|k)o\b|\bparalimni\b|\bpernera\b|\blimnara\b/.test(s);
  const westWords = /\blatchi\b|\blatsi\b|\bpolis\b|\bakamas\b|\bpa(ph|f)os\b|\bcoral bay\b|\bpeyia\b|\blara\b|\badonis\b|\baphrodite/.test(s);
  const east = eastWords || (!westWords && departure?.district === 'famagusta');
  const WEST_ONLY = new Set(['blue-lagoon-akamas', 'peyia-sea-caves', 'lara-bay']);
  const EAST_ONLY = new Set(['blue-lagoon-cape-greco', 'ayia-napa-sea-caves', 'turtle-cove']);
  const hits: { p: Place; at: number }[] = [];
  for (const p of LANDMARKS) {
    if (WEST_ONLY.has(p.key) && east) continue;
    if (EAST_ONLY.has(p.key) && !east) continue;
    const m = p.rx.exec(s);
    if (m && !hits.some((h) => h.p.key === p.key)) hits.push({ p, at: m.index });
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.p);
}
