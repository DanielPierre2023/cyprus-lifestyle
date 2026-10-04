// lib/activities/classify.ts
// ============================================================================
// Bookable EXPERIENCES (the Cyprus Lifestyle experiences catalogue) — the pure rules
// shared by the catalogue scripts, the map explorer and the concierge. No I/O; unit-tested.
//
//   • 12 experience KINDS (boat trips, diving, safaris, culture, food & wine …) with an
//     icon, a name in all seven languages, an English pattern and the words guests use
//     for it in all seven languages (lib/activities/curate.ts decides an entry's kind),
//   • the occupied-north rules (same geography as migration 0062), and
//   • small helpers: duration parsing, partner booking links, de-stacking map points,
//     price-basis labels.
// ============================================================================

import { gygLink } from '@/lib/gyg';

export interface ActivityKind {
  key: string;
  icon: string;                            // inner SVG markup (24×24, stroked currentColor)
  label: Record<string, string>;           // en el ro ar de pl ru
  rx: RegExp;                              // English classifier (title / category / description)
  words: string[];                         // guest wording, all seven languages (de-accented, lower-case match)
}

const ic = {
  boat: '<path d="M3 17h18l-3 4H6z"/><path d="M12 3v10"/><path d="M12 5l7 8H5z"/>',
  mask: '<path d="M3 9h18v4a3 3 0 0 1-3 3h-2.5l-1.5-2.2h-4L8.5 16H6a3 3 0 0 1-3-3z"/><path d="M19.5 9V4.5"/>',
  wave: '<path d="M2 16c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6 2-1.6 4-1.6"/><path d="M2 20c2 0 2-1.6 4-1.6s2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6 2-1.6 4-1.6"/><circle cx="15" cy="5.5" r="2"/><path d="M8.5 12.5l3.5-4.5 3 2.2"/>',
  jeep: '<path d="M3 15v-4.5L5 6h9l2.2 4.5H20a1.5 1.5 0 0 1 1.5 1.5V15"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/><path d="M9 16h6M3 10.5h13"/>',
  landmark: '<path d="M3 21h18M4 10h16M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6"/>',
  wine: '<path d="M8 3h8s0 7-4 7-4-7-4-7z"/><path d="M12 10v8"/><path d="M8 21h8"/>',
  mountain: '<path d="M2.5 20l6.5-12 4.2 7.4 2.3-3.4 6 8z"/><path d="M13.5 6.5l1.6-2.3 1.6 2.3"/>',
  glider: '<path d="M3 8.5c3-3.5 15-3.5 18 0"/><path d="M3 8.5l9 6.5 9-6.5"/><circle cx="12" cy="17" r="1.6"/><path d="M12 18.6V21"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  car: '<path d="M4 15l1.4-4.2A2 2 0 0 1 7.3 9.4h9.4a2 2 0 0 1 1.9 1.4L20 15v3H4z"/><path d="M4 15h16"/><circle cx="7.5" cy="18" r="1.4"/><circle cx="16.5" cy="18" r="1.4"/>',
  cap: '<path d="M12 4l10 4-10 4L2 8z"/><path d="M6 10v5c0 1.5 3 2.5 6 2.5s6-1 6-2.5v-5"/>',
  ticket: '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10"/>',
};

// Order matters: the FIRST kind whose pattern matches wins (specific before generic;
// 'transfer' after the boat/safari kinds so "Transfers: … Cruise" stays a cruise).
export const ACTIVITY_KINDS: ActivityKind[] = [
  { key: 'diving', icon: ic.mask,
    label: { en: 'Diving & snorkelling', el: 'Καταδύσεις & snorkeling', ro: 'Scufundări & snorkeling', ar: 'الغوص والسنوركل', de: 'Tauchen & Schnorcheln', pl: 'Nurkowanie i snorkeling', ru: 'Дайвинг и снорклинг' },
    rx: /\bdiv(e|es|ing)\b|scuba|snorkel|underwater|wreck|zenobia|musan|sea ?scooter|free ?div/i,
    words: ['diving', 'dive', 'scuba', 'snorkel', 'wreck', 'zenobia', 'underwater', 'καταδυσ', 'αναπνευστηρ', 'ναυαγι', 'scufund', 'snorkeling', 'epava', 'tauch', 'schnorchel', 'wrack', 'nurkow', 'wrak', 'дайвинг', 'погружени', 'снорклинг', 'сноркел', 'затонувш', 'غوص', 'سنوركل', 'حطام'] },
  { key: 'water', icon: ic.wave,
    label: { en: 'Watersports & waterparks', el: 'Θαλάσσια σπορ & υδάτινα πάρκα', ro: 'Sporturi nautice & aquaparcuri', ar: 'الرياضات المائية والحدائق المائية', de: 'Wassersport & Wasserparks', pl: 'Sporty wodne i aquaparki', ru: 'Водные развлечения и аквапарки' },
    rx: /jet ?ski|parasail|kayak|canoe|paddle|\bsup\b|stand.?up|flyboard|banana|wakeboard|kite|windsurf|water ?sports?|water ?park|aqua ?park|\bsurf/i,
    words: ['watersport', 'water sport', 'jet ski', 'jetski', 'kayak', 'paddle', 'sup', 'parasail', 'waterpark', 'water park', 'aquapark', 'θαλασσια σπορ', 'τζετ σκι', 'καγιακ', 'νεροτσουλ', 'υδατινο παρκο', 'sporturi nautice', 'caiac', 'aquapark', 'wassersport', 'kajak', 'wasserpark', 'sporty wodne', 'skuter wodny', 'park wodny', 'водные', 'гидроцикл', 'каяк', 'аквапарк', 'رياضات مائية', 'جت سكي', 'كاياك', 'حديقة مائية'] },
  { key: 'air', icon: ic.glider,
    label: { en: 'Adventure & air', el: 'Περιπέτεια & πτήσεις', ro: 'Aventură & zbor', ar: 'المغامرة والطيران', de: 'Abenteuer & Flüge', pl: 'Przygoda i loty', ru: 'Приключения и полёты' },
    rx: /paraglid|skydiv|zip.?line|helicopter|balloon|\bflight|bungee|climb|abseil|canyon|shooting|clay|escape room|archery/i,
    words: ['paraglid', 'skydiv', 'zipline', 'helicopter', 'adventure', 'adrenaline', 'αλεξιπτωτ', 'ελικοπτερ', 'περιπετει', 'parapanta', 'elicopter', 'aventura', 'gleitschirm', 'fallschirm', 'hubschrauber', 'abenteuer', 'paralotni', 'helikopter', 'przygod', 'параплан', 'вертолет', 'приключен', 'адреналин', 'باراشوت', 'مظلة', 'هليكوبتر', 'مغامرة'] },
  { key: 'safari', icon: ic.jeep,
    label: { en: 'Jeep, quad & buggy safaris', el: 'Σαφάρι με τζιπ, γουρούνες & buggy', ro: 'Safari cu jeep, ATV & buggy', ar: 'سفاري بالجيب والدراجات الرباعية', de: 'Jeep-, Quad- & Buggy-Safaris', pl: 'Safari jeepem, quadem i buggy', ru: 'Джип-, квадро- и багги-сафари' },
    rx: /\bjeep|4x4|4wd|safari|\bquad|\batv\b|buggy|off.?road|land ?rover|segway|e-?bike/i,
    words: ['jeep', 'safari', 'quad', 'atv', 'buggy', 'off-road', 'offroad', '4x4', 'τζιπ', 'σαφαρι', 'γουρουν', 'τετρατροχ', 'jeep', 'atv', 'gelandewagen', 'jeep', 'quad', 'джип', 'сафари', 'квадроцикл', 'багги', 'جيب', 'سفاري', 'دراجة رباعية', 'باجي'] },
  { key: 'boat', icon: ic.boat,
    label: { en: 'Boat trips & cruises', el: 'Κρουαζιέρες & εκδρομές με σκάφος', ro: 'Croaziere & plimbări cu barca', ar: 'الرحلات البحرية', de: 'Bootstouren & Kreuzfahrten', pl: 'Rejsy i wycieczki łodzią', ru: 'Морские прогулки и круизы' },
    rx: /cruise|\bboat|catamaran|yacht|sail|pirate|glass.?bottom|speedboat|\brib\b|turtle cove|blue lagoon|fishing/i,
    words: ['boat', 'cruise', 'fishing', 'ψαρεμα', 'pescuit', 'angeln', 'wedkowanie', 'рыбалк', 'صيد السمك', 'catamaran', 'yacht', 'sailing', 'blue lagoon', 'turtle', 'βαρκ', 'κρουαζιερ', 'σκαφ', 'καταμαραν', 'ιστιοπλο', 'μπλε λιμνοθαλασσα', 'barca', 'croazier', 'catamaran', 'iaht', 'vapor', 'boot', 'kreuzfahrt', 'katamaran', 'segel', 'yacht', 'lodz', 'lodzi', 'rejs', 'jacht', 'zaglow', 'лодк', 'катер', 'круиз', 'катамаран', 'яхт', 'морская прогулка', 'голубая лагуна', 'قارب', 'رحلة بحرية', 'يخت', 'كاتاماران', 'البحيرة الزرقاء'] },
  { key: 'transfer', icon: ic.car,
    label: { en: 'Transfers', el: 'Μεταφορές', ro: 'Transferuri', ar: 'التنقلات', de: 'Transfers', pl: 'Transfery', ru: 'Трансферы' },
    rx: /^(private |shared )?(airport |hotel )?(transfer|shuttle)|airport transfer|private driver|chauffeur/i,
    words: ['airport transfer', 'transfer', 'shuttle', 'μεταφορα απο αεροδρομιο', 'transfer aeroport', 'flughafentransfer', 'transfer z lotniska', 'трансфер', 'نقل من المطار'] },
  { key: 'food', icon: ic.wine,
    label: { en: 'Food, wine & tastings', el: 'Γεύσεις, κρασί & γευσιγνωσίες', ro: 'Mâncare, vin & degustări', ar: 'الطعام والنبيذ والتذوق', de: 'Essen, Wein & Verkostungen', pl: 'Jedzenie, wino i degustacje', ru: 'Еда, вино и дегустации' },
    rx: /\bwine|winery|vineyard|tasting|\bfood|culinary|cook|halloumi|meze|dinner|brunch|cheese|zivania|olive oil|cocktail|brewery|commandaria/i,
    words: ['wine', 'winery', 'tasting', 'food tour', 'cooking', 'halloumi', 'meze', 'gastronom', 'κρασι', 'οινοποι', 'γευσιγνωσ', 'μαγειρ', 'χαλλουμ', 'μεζε', 'vin', 'crama', 'degustare', 'gatit', 'mancare', 'wein', 'weingut', 'weinprobe', 'kochkurs', 'kulinar', 'wino', 'winnic', 'degustac', 'gotowan', 'kulinarn', 'вино', 'винодел', 'дегустац', 'кулинар', 'халлуми', 'نبيذ', 'تذوق', 'طعام', 'طبخ'] },
  { key: 'classes', icon: ic.cap,
    label: { en: 'Classes & wellness', el: 'Μαθήματα & ευεξία', ro: 'Cursuri & wellness', ar: 'الدروس والعافية', de: 'Kurse & Wellness', pl: 'Zajęcia i wellness', ru: 'Мастер-классы и велнес' },
    rx: /\bclass|workshop|lesson|yoga|\bspa\b|massage|photo ?shoot|pottery|course|retreat|wellness|hammam/i,
    words: ['class', 'workshop', 'lesson', 'yoga', 'spa', 'massage', 'photoshoot', 'pottery', 'μαθημα', 'εργαστηρι', 'γιογκα', 'μασαζ', 'curs', 'atelier', 'masaj', 'kurs', 'workshop', 'massage', 'fotoshooting', 'zajecia', 'warsztat', 'masaz', 'sesja zdjeciowa', 'мастер-класс', 'урок', 'йога', 'массаж', 'фотосесси', 'درس', 'ورشة', 'يوغا', 'تدليك'] },
  { key: 'tickets', icon: ic.ticket,
    label: { en: 'Tickets & attractions', el: 'Εισιτήρια & αξιοθέατα', ro: 'Bilete & atracții', ar: 'التذاكر والمعالم', de: 'Tickets & Attraktionen', pl: 'Bilety i atrakcje', ru: 'Билеты и достопримечательности' },
    rx: /ticket|entry|admission|aquarium|\bzoo\b|theme park|amusement/i,
    words: ['ticket', 'tickets', 'entry', 'admission', 'aquarium', 'zoo', 'εισιτηρι', 'ενυδρει', 'ζωολογικ', 'bilet', 'intrare', 'acvariu', 'eintritt', 'aquarium', 'bilety', 'wstep', 'akwarium', 'билет', 'вход', 'аквариум', 'зоопарк', 'تذاكر', 'حوض أسماك', 'حديقة حيوان'] },
  { key: 'culture', icon: ic.landmark,
    label: { en: 'Culture & history', el: 'Πολιτισμός & ιστορία', ro: 'Cultură & istorie', ar: 'الثقافة والتاريخ', de: 'Kultur & Geschichte', pl: 'Kultura i historia', ru: 'Культура и история' },
    rx: /museum|archaeolog|ancient|kourion|tombs|monaster|church|mosaic|unesco|choirokoitia|castle|heritage|byzantine|medieval|old town|walking tour|histor|kolossi|kykkos|lefkara|aphrodite|painted churches/i,
    words: ['museum', 'history', 'histor', 'ancient', 'archaeolog', 'monastery', 'church', 'castle', 'unesco', 'mosaic', 'old town', 'heritage', 'kourion', 'μουσει', 'αρχαι', 'μοναστηρ', 'εκκλησ', 'καστρο', 'ιστορ', 'ψηφιδωτ', 'muzeu', 'istor', 'antic', 'manastir', 'biseric', 'castel', 'museum', 'geschichte', 'antik', 'kloster', 'kirche', 'burg', 'altstadt', 'muzeum', 'starozytn', 'klasztor', 'kosciol', 'zamek', 'музей', 'истори', 'древн', 'монастыр', 'церк', 'замок', 'متحف', 'تاريخ', 'أثري', 'دير', 'كنيسة', 'قلعة'] },
  { key: 'nature', icon: ic.mountain,
    label: { en: 'Nature, hiking & riding', el: 'Φύση, πεζοπορία & ιππασία', ro: 'Natură, drumeții & călărie', ar: 'الطبيعة والمشي وركوب الخيل', de: 'Natur, Wandern & Reiten', pl: 'Przyroda, wędrówki i jazda konna', ru: 'Природа, походы и верховая езда' },
    rx: /\bhik(e|es|ing)\b|trail|trek|waterfall|gorge|avakas|nature|botanic|horse|riding|cycling|\bbike|mountain|troodos|akamas|forest|camel|donkey|\bfarm|bird|turtle watch/i,
    words: ['hiking', 'hike', 'trail', 'nature', 'waterfall', 'gorge', 'mountain', 'horse', 'riding', 'cycling', 'troodos', 'akamas', 'πεζοπορ', 'μονοπατι', 'φυση', 'καταρρακτ', 'φαραγγ', 'βουνο', 'τροοδο', 'ακαμα', 'ιππασι', 'ποδηλατ', 'drumet', 'natur', 'cascad', 'munte', 'calari', 'bicicl', 'wander', 'natur', 'wasserfall', 'schlucht', 'berg', 'reiten', 'radtour', 'wedrow', 'szlak', 'przyrod', 'wodospad', 'gory', 'jazda konna', 'rower', 'поход', 'тропа', 'природ', 'водопад', 'ущель', 'горы', 'троодос', 'верхов', 'велосипед', 'مشي', 'طبيعة', 'شلال', 'جبال', 'ركوب الخيل'] },
  { key: 'sightseeing', icon: ic.compass,
    label: { en: 'Tours & day trips', el: 'Ξεναγήσεις & ημερήσιες εκδρομές', ro: 'Tururi & excursii de o zi', ar: 'الجولات والرحلات اليومية', de: 'Touren & Tagesausflüge', pl: 'Wycieczki i wypady jednodniowe', ru: 'Экскурсии и однодневные поездки' },
    rx: /./, // fallback — everything else is a tour / day trip
    words: ['tour', 'day trip', 'excursion', 'sightseeing', 'guided', 'private tour', 'εκδρομ', 'ξεναγ', 'περιηγησ', 'excursie', 'tur ', 'ausflug', 'tagesausflug', 'fuhrung', 'rundfahrt', 'wycieczk', 'zwiedzan', 'экскурси', 'тур ', 'поездк', 'جولة', 'رحلة يومية'] },
];

export const ACTIVITY_KIND_KEYS = ACTIVITY_KINDS.map((k) => k.key);
export const kindOf = (key: string | null | undefined) => ACTIVITY_KINDS.find((k) => k.key === key) || ACTIVITY_KINDS[ACTIVITY_KINDS.length - 1];
export const kindLabel = (key: string, locale: string) => kindOf(key).label[locale] || kindOf(key).label.en;

// ── Occupied north (same geography as supabase/migrations/0062) ──────────────────────
/** A point that lies in the occupied north, judged by district + latitude like 0062. */
export function isNorthPoint(district: string | null, lat: number | null): boolean {
  if (lat == null) return false;
  if (district === 'kyrenia') return true;
  if (district === 'famagusta') return lat >= 35.10;
  if (district === 'nicosia') return lat >= 35.185;
  if (district === 'larnaca' || district === 'limassol') return lat >= 35.10;
  if (district === 'paphos') return false;
  return lat >= 35.185; // unknown district: north of the Green Line's latitude
}

/** Operator BASED in the north / outside the Republic → never shown. */
const BASED_NORTH = /from north(ern)? cyprus|north(ern)? cyprus atv|^kyrenia:|^girne\b|\bedirne\b|\bturkey\b|türkiye/i;
export function basedNorth(title: string, locationLabel: string, townPlaceType: string): boolean {
  if (/turkey/i.test(townPlaceType)) return true;
  if (/^(kyrenia|girne|edirne|iskele|famagusta city)$/i.test(locationLabel.trim())) return true;
  return BASED_NORTH.test(title);
}

/** A tour that VISITS northern sites (departing from the south). Hidden by default — editorial switch. */
const NORTH_SITES = /\b(kyrenia|girne|bellapais|hilarion|salamis|varosha|maras|othello|b[uü]y[uü]k han|selimiye|karpas|karpaz|kantara|north(ern)? cyprus|north nicosia|both sides|green line crossing|ghost.?town)\b/i;
export function visitsNorth(title: string, category: string, poi: string, itinerary: string): string | null {
  const m = NORTH_SITES.exec([title, category, poi, itinerary].join(' | '));
  if (m) return m[0];
  if (/famagusta(?! district)/i.test(title) && !/protaras: |cruise|boat|catamaran/i.test(title)) return 'Famagusta';
  return null;
}

// ── Small helpers ─────────────────────────────────────────────────────────────────────
/** '4 hours' → 240, '2.5 hours' → 150, '30 minutes' → 30, '4 - 7 hours' → 240, '2 days' → 2880. */
export function parseDurationMinutes(text: string): number | null {
  const s = String(text || '').toLowerCase().replace(',', '.');
  const m = /(\d+(?:\.\d+)?)\s*(?:-\s*\d+(?:\.\d+)?\s*)?(minute|min|hour|hr|h\b|day)/.exec(s);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2];
  const mins = unit.startsWith('min') ? n : unit.startsWith('day') ? n * 1440 : n * 60;
  return Math.round(mins);
}

/** Append the GetYourGuide partner id (+ campaign) — see lib/gyg.ts. */
export function affiliateUrl(url: string | null | undefined, partnerId: string | null | undefined, campaign?: string): string | null {
  return gygLink(url, { partnerId: partnerId ?? null, campaign });
}

/**
 * GetYourGuide publishes no meeting points, so many activities share one geocoded
 * town/landmark point (57 on central Paphos). Spread each stack on a deterministic
 * golden-angle spiral (~180 m steps) so every activity gets its own pin. Points are
 * an AREA, never presented as an exact meeting point.
 */
export function spreadStacks<T extends { lat: number; lng: number; key: string }>(items: T[], stepDeg = 0.0016): (T & { lat: number; lng: number })[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const g = `${it.lat.toFixed(4)},${it.lng.toFixed(4)}`;
    const list = groups.get(g); if (list) list.push(it); else groups.set(g, [it]);
  }
  const out: (T & { lat: number; lng: number })[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.key.localeCompare(b.key));
    list.forEach((it, i) => {
      if (i === 0) { out.push({ ...it }); return; }
      const r = stepDeg * Math.sqrt(i);
      const a = i * 2.39996323; // golden angle
      const latRad = (it.lat * Math.PI) / 180;
      out.push({ ...it, lat: +(it.lat + r * Math.sin(a)).toFixed(6), lng: +(it.lng + (r * Math.cos(a)) / Math.cos(latRad)).toFixed(6) });
    });
  }
  return out;
}

/**
 * Price basis as shown on cards, translated: ('person') → 'per person',
 * ('group', 6) → 'per group up to 6'. The older 'per group up to 6' text is accepted too.
 */
export function priceBasisLabel(basis: string, locale: string, groupMax?: number | null): string {
  const g = /group up to (\d+)/i.exec(basis || '');
  const n = g ? Number(g[1]) : groupMax ?? null;
  const T: Record<string, [string, string, string]> = {
    en: ['per person', 'per group up to {n}', 'per group'], el: ['ανά άτομο', 'ανά ομάδα έως {n}', 'ανά ομάδα'], ro: ['de persoană', 'de grup până la {n}', 'de grup'],
    ar: ['للشخص', 'للمجموعة حتى {n}', 'للمجموعة'], de: ['pro Person', 'pro Gruppe bis {n}', 'pro Gruppe'], pl: ['za osobę', 'za grupę do {n}', 'za grupę'], ru: ['с человека', 'за группу до {n}', 'за группу'],
  };
  const [pp, pg, pgx] = T[locale] || T.en;
  if (g || /^group$/i.test(basis || '')) return n && n > 1 ? pg.replace('{n}', String(n)) : pgx;
  return pp;
}
