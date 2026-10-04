// lib/activities/curate.ts
// ============================================================================
// Cyprus Lifestyle EXPERIENCES CATALOGUE — the rules that turn the facts about a
// bookable trip (what it is, where it goes, where it leaves from, how long, what's
// included, price level) into OUR catalogue entry: our own title and summary, our
// kind / tags / price band, and a map point from our own gazetteer.
//
// Only facts are kept. Third-party wording, photos, star ratings, review counts and
// marketing badges are never carried over. The booking link (partner id appended at
// render time) is the only thing that points back to the booking platform.
// Pure functions — used by scripts/activities/clean-export.ts and unit-tested.
// ============================================================================
import { basedNorth, visitsNorth, isNorthPoint, parseDurationMinutes } from './classify';
import { foldText, findTown, findLandmarks, haversineKm, TOWNS, LANDMARKS, type Place } from './places';

export interface CatalogRow {
  gyg_id: string;            // booking-partner product id (the link target)
  slug: string;              // our id
  title: string;             // our wording
  summary: string;           // our wording (grounds the concierge)
  kind: string;              // lib/activities/classify.ts ACTIVITY_KINDS key
  tags: string[];            // our tags: pickup, meal, private, small-group, family, sunset …
  district: string | null; town: string | null; landmark: string | null;
  lat: number | null; lng: number | null; geo_precision: 'landmark' | 'town' | null;
  duration_min: number | null; duration_label: string | null;
  price_band: '€' | '€€' | '€€€' | '€€€€' | null;
  price_basis: 'person' | 'group' | null; group_max: number | null;
  booking_url: string;
  priority: number;          // editorial pick 0–3 (3 = top); set by hand in the catalogue
  visits_north: boolean; north_site: string | null;
  status: 'active' | 'hidden'; hidden_reason: string | null;
}

/** Hand corrections, keyed by the partner product id (applied on top of the rules). */
export interface Override {
  title?: string; kind?: string;
  town?: string;               // TOWNS key — the departure
  landmark?: string | null;    // LANDMARKS key for the pin; null = pin at the departure town
  hide?: string;               // editorial reason → not in the catalogue
  north?: boolean;             // correct the "visits the north" flag
  duration_min?: number | null; tags?: string[];
}

// ── small text helpers ─────────────────────────────────────────────────────────────
export const listJoin = (xs: string[], and = '&') => xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const slugify = (s: string) => foldText(s).replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v: unknown) => { const n = Number(String(v ?? '').replace(',', '.')); return String(v ?? '') !== '' && Number.isFinite(n) ? n : null; };

// Northern sites — used only to NAME them in titles of tours that visit the north
// (those rows are flagged visits_north and stay hidden unless the editorial switch is on).
const NORTH_NAMES: [RegExp, string][] = [
  [/\bkyrenia|girne\b/, 'Kyrenia'], [/\bbellapais\b/, 'Bellapais Abbey'], [/\bhilarion\b/, 'St Hilarion Castle'],
  [/\bsalamis\b/, 'Salamis'], [/\bvarosha|ghost.?town\b/, 'Varosha'], [/\bfamagusta\b/, 'Famagusta old town'],
  [/\bkarpa(s|z)\b/, 'the Karpas Peninsula'], [/\bnorth nicosia\b|both sides|green line crossing/, 'both sides of Nicosia'],
];

// Harbours and marinas are where boats LEAVE from — never a boat trip's destination.
const HARBOURS = new Set(['paphos-harbour', 'limassol-marina', 'larnaca-marina']);

// ── kind ───────────────────────────────────────────────────────────────────────────
const RX = {
  vehicle: /\bjeep|4x4|4wd|land ?rover|\bquad|\batv\b|buggy|off.?road|segway|ezraider/,
  geo: /geolog|geoheritage|geophotograph|volcanic|geopark|asbestos mine/,
  scuba: /scuba|\bdiv(e|es|ing|ers?)\b|\bpadi\b|\bssi\b|bubblemaker|underwater helmet|sea ?scooter|undersea scooter|open water/,
  water: /jet ?ski|kayak|\bsup\b|paddle|wakeboard|parasail|flyboard|e-?foil|water ?park|watersports?/,
  boat: /cruise|\bboat|catamaran|yacht|\bsail|pirate|glass.?bottom|speedboat|submarine|\bfishing|charter|\bvessel|blue lagoon/,
  air: /\bclay\b|shooting|escape room|paraglid|zip.?line|helicopter|skydiv/,
  food: /\bwine|winer(y|ies)|vineyard|tasting|\bfood|culinary|\bcook(ing)?\b|baking|gemista|halloumi|cheese|cocktail|\bbeer|brewery|honey|beekeep|olive oil|baklava|cookies|picnic|commandaria|gourmet|flavou?rs|brunch|sip and paint/,
  classes: /\bclass|workshop|lesson|yoga|photo ?shoot|photograph|retreat|\bcourse|wellness/,
  tickets: /\bticket|\bentry\b|admission|\bpass\b/,
  culture: /museum|archaeolog|ancient|kourion|tombs|monaster|church|mosaic|unesco|castle|heritage|old ?town|byzantine|kolossi|kykkos|lefkara|nicosia|nikosia|famagusta|kyrenia|varosha|salamis|walking tour|city tour|histor|ghost|legend|myth|village tour|villages|folklore|green line|buffer zone/,
  nature: /\bhik(e|es|ing)\b|trail|trek|waterfall|gorge|nature|botanic|horse|riding|cycling|\bbike|mountain|troodos|akamas|forest|donkey|camel|\bfarm|\blake/,
};

export function kindFor(title: string): string {
  const s = foldText(title);
  if (/^(private |shared )?(airport |hotel )?(transfer|shuttle)\b|airport transfer/.test(s) && !/cruise|boat|bbq|slide/.test(s)) return 'transfer';
  if (RX.vehicle.test(s)) return 'safari';
  if (RX.geo.test(s)) return 'nature';
  if (RX.scuba.test(s)) return 'diving';
  if (RX.water.test(s)) return 'water';
  const sn = s.search(/snorkel/), bt = s.search(RX.boat);
  if (sn >= 0 && (bt < 0 || sn < bt)) return 'diving';
  if (bt >= 0) return 'boat';
  if (RX.air.test(s)) return 'air';
  if (RX.food.test(s)) return 'food';
  if (RX.classes.test(s)) return 'classes';
  if (RX.tickets.test(s) && !/\btour\b/.test(s)) return 'tickets';
  if (RX.culture.test(s)) return 'culture';
  if (RX.nature.test(s)) return 'nature';
  return 'sightseeing';
}

// ── duration / price ───────────────────────────────────────────────────────────────
const fmtMinutes = (m: number) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (r === 0) return `${h} h`;
  if (r === 30) return `${h}.5 h`;
  return `${h} h ${r} min`;
};

/** '4 hours' → '4 h', '2 - 6 hours' → '2–6 h', '80 minutes' → '1 h 20 min', '1 day' → 'full day', '3 days' → '3 days'. */
export function durationLabel(text: string, minutes: number | null): string | null {
  if (minutes == null) return null;
  const s = String(text || '').toLowerCase().replace(',', '.');
  const range = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(hour|hr|h\b)/.exec(s);
  if (range) return `${range[1]}–${range[2]} h`;
  if (minutes >= 1440) { const d = Math.round(minutes / 1440); return d === 1 ? 'full day' : `${d} days`; }
  return fmtMinutes(minutes);
}

export function priceBand(price: number | null): CatalogRow['price_band'] {
  if (price == null || price <= 0) return null;
  return price < 30 ? '€' : price < 80 ? '€€' : price < 200 ? '€€€' : '€€€€';
}

export function priceBasis(basis: string): { basis: CatalogRow['price_basis']; groupMax: number | null } {
  const g = /group up to (\d+)/i.exec(basis || '');
  if (g && Number(g[1]) > 1) return { basis: 'group', groupMax: Number(g[1]) };
  return { basis: basis ? 'person' : null, groupMax: null };
}

// ── facts read from the trip's own description line ────────────────────────────────
export interface Facts {
  s: string; kind: string; from: Place | null; mentions: Place[]; north: string[];
  priv: boolean; small: boolean; adults: boolean; family: boolean;
  time: 'sunset' | 'sunrise' | 'morning' | 'night' | null; lang: string | null;
  pickup: boolean; meal: boolean; minutes: number | null; groupMax: number | null;
}

const LANG = /\b(polish|french|romanian|german|russian|greek|italian|spanish)[- ]speaking\b|\bin (polish|french|romanian|german|russian|greek|italian|spanish)\b|\b(polish|romanian)\b/;

function inclusions(f: Facts, max = 2): string[] {
  const s = f.s; const out: string[] = [];
  const add = (x: string) => { if (!out.includes(x)) out.push(x); };
  const evening = f.time === 'night' || f.time === 'sunset';
  if (/bbq|barbecue/.test(s)) add('BBQ');
  else if (/dinner/.test(s)) add('dinner');
  else if (/lunch|buffet|brunch|\bfood\b|gourmet/.test(s) || (f.meal && f.kind === 'boat')) add(evening ? 'dinner' : 'lunch');
  if (/open bar|unlimited (drinks|wine)|all.?incl|all inclusive/.test(s)) add('open bar');
  else if (/\bdrinks?\b|wine|prosecco|aperol|champagne|beers?\b|cocktail/.test(s) && f.kind === 'boat') add('drinks');
  if (/slide/.test(s)) add('water slide');
  if (/turtle/.test(s) && !f.mentions.some((p) => p.key === 'turtle-cove')) add('turtle spotting');
  if (/snorkel/.test(s) && f.kind === 'boat') add('snorkelling');
  if (/fireworks/.test(s)) add('fireworks');
  if (/\bshow\b/.test(s) && f.kind === 'boat') add('a show');
  if (/\bdj\b|\bdisco\b|decades|greatest hits|80s|90s/.test(s)) add('a DJ');
  if (/swim/.test(s) && out.length < max) add('swim stops');
  return out.slice(0, max);
}

const bare = (p: Place) => p.name.replace(/ \((akamas|cape greco)\)$/i, '');
const placeNames = (ps: Place[]) => ps.map(bare);
const placePhrases = (ps: Place[]) => ps.map((p) => p.phrase || bare(p));

function where(f: Facts, max = 3): string[] {
  return [...placeNames(f.mentions), ...f.north].slice(0, max);
}

// ── titles ─────────────────────────────────────────────────────────────────────────
function boatTitle(f: Facts): string {
  const s = f.s;
  const dests = f.mentions.filter((p) => !HARBOURS.has(p.key));
  // A boat trip to somewhere far from the departure town is a coach + boat day (Paphos →
  // Latchi for the Blue Lagoon); over ~45 km it can only be that.
  const dist = f.from ? Math.max(0, ...dests.map((p) => haversineKm(p, f.from!))) : 0;
  const far = dist > 45 || (dist > 25 && /\b(bus|coach|transfers?|minibus|pickup|transport)\b/.test(s));
  const skipper = /captain|skipper/.test(s);
  let v =
    !skipper && /self.?drive|boat (rental|hire)|no licen[cs]e|choose a boat|\bboat hire/.test(s) ? 'self-drive boat hire' :
    /pirate/.test(s) ? 'pirate-ship cruise' :
    /glass.?bottom/.test(s) ? 'glass-bottom boat trip' :
    /submarine/.test(s) ? 'semi-submarine cruise' :
    /catamaran/.test(s) ? 'catamaran cruise' :
    /\bsail/.test(s) ? (f.minutes && f.minutes >= 2880 ? 'sailing voyage' : 'sailing trip') :
    /yacht/.test(s) ? (f.priv ? 'yacht charter' : 'yacht cruise') :
    /speedboat|\brib\b/.test(s) ? 'speedboat trip' :
    /tuna/.test(s) ? 'tuna-fishing trip' :
    /fishing/.test(s) ? 'fishing trip' :
    /party|\bdj\b|\bdisco\b|decades|greatest hits|80s|90s|fancy dress|\bclub\b/.test(s) ? 'boat party' :
    far ? 'day trip by coach & boat' :
    /cruise/.test(s) ? 'cruise' : 'boat trip';
  const priv = f.priv && !/self-drive|charter/.test(v) ? 'private ' : '';
  const time = f.time && v !== 'boat party' ? `${f.time} ` : '';
  const who = f.adults ? 'adults-only ' : f.family ? 'family ' : '';
  const dest = placePhrases(dests).slice(0, 3);
  const off = f.mentions.find((p) => p.type === 'town') || f.from || null;
  const route =
    /fishing/.test(v) ? (off ? ` off ${off.name}` : '') :
    dest.length ? ` to ${listJoin(dest)}` :
    off && !/party|self-drive/.test(v) ? ` along the ${off.name} coast` : '';
  const incl = /fishing/.test(v) ? [] : inclusions(f, dest.length >= 2 ? 1 : 2);
  return `${who}${priv}${time}${v}${route}${incl.length ? ` with ${listJoin(incl)}` : ''}`;
}

function divingTitle(f: Facts): string {
  const s = f.s;
  const spot = f.mentions.filter((p) => !HARBOURS.has(p.key));
  const at = !spot.length ? '' : spot[0].key === 'zenobia' ? ' on the Zenobia wreck'
    : spot[0].type === 'town' ? ` off ${spot[0].name}` : ` at ${listJoin(placePhrases(spot.slice(0, 2)))}`;
  const twoDives = /\b2 dives\b|two dives/.test(s) ? ' (2 dives)' : '';
  let what =
    /bubblemaker/.test(s) ? "kids' Bubblemaker dive" :
    /night dive/.test(s) ? 'night-dive certification' :
    /open water|\bcourse\b|certification/.test(s) ? 'Open Water diver course' :
    /discover|beginner|\btry\b|introduction|intro\b|first dive/.test(s) ? 'try-dive for beginners' :
    /underwater helmet|helmet/.test(s) ? 'underwater helmet walk' :
    /(sea|undersea) scooter/.test(s) ? 'sea-scooter snorkel trip' :
    /wreck/.test(s) && /scuba|\bdiv/.test(s) && !/zenobia/.test(s) ? 'guided wreck dive' :
    /scuba|\bdiv(e|es|ing|ers?)\b/.test(s) ? (/certified|qualified|for divers|single dive|wreck|safari dive|equipment|gear|tunnels/.test(s) ? 'guided dive for certified divers' : 'guided scuba dive') :
    /cruise|boat/.test(s) ? 'snorkelling cruise' :
    /turtle/.test(s) ? 'turtle-spotting snorkel trip' : 'snorkelling trip';
  if (f.priv && !/private/.test(what)) what = `private ${what}`;
  return `${what}${at}${twoDives}`;
}

function safariTitle(f: Facts): string {
  const s = f.s;
  let v =
    /segway/.test(s) ? 'Segway tour' :
    /ezraider/.test(s) ? 'EZRaider off-road ride' :
    (/quad|atv/.test(s) && /buggy/.test(s)) ? 'quad & buggy safari' :
    /buggy|off road x2|off.?road/.test(s) ? 'buggy safari' :
    /quad|atv/.test(s) ? 'quad-bike safari' :
    /land ?rover/.test(s) ? 'Land Rover safari' : 'jeep safari';
  const len = /jeep|land rover/i.test(v) && f.minutes ? (f.minutes >= 420 ? 'full-day ' : f.minutes >= 210 ? 'half-day ' : '') : '';
  v = `${f.priv ? 'private ' : ''}${len}${v}`;
  const boat = /boat|cruise/.test(s);
  const land = f.mentions.filter((p) => !(boat && p.key.startsWith('blue-lagoon')));
  const area = land[0] && (land[0].key === 'troodos-mountains' || land[0].key === 'akamas');
  const dest = !land.length ? '' : area
    ? ` in ${placePhrases(land.slice(0, 1))[0]}${land.length > 1 ? ` & ${listJoin(placeNames(land.slice(1, 3)))}` : ''}`
    : ` to ${listJoin(placePhrases(land.slice(0, 3)))}`;
  const extra = boat ? ' + boat trip to the Blue Lagoon' : /wine/.test(s) ? ' with wine tasting' : /picnic/.test(s) ? ' with picnic' : /lunch/.test(s) ? ' with lunch' : '';
  return `${v}${dest}${extra}`;
}

function geoTitle(f: Facts): string {
  const s = f.s;
  const places = where(f);
  const at = places.length ? `: ${listJoin(places)}` : f.from ? `: ${f.from.name}` : '';
  if (/asbestos|mine/.test(s)) return `${f.from ? `${f.from.name} ` : ''}mine walk with a geologist`;
  if (/photograph/.test(s)) return `golden-hour photography hike${at}`;
  if (/geopark/.test(s)) return `Troodos Geopark hiking day trip`;
  if (/volcanic/.test(s)) return `volcanic geology hike with a geologist${at}`;
  return `geoheritage walk${at}`;
}

function cultureTitle(f: Facts): string {
  const s = f.s;
  const places = where(f);
  const lang = f.lang ? ` (${cap(f.lang)}-speaking guide)` : '';
  const priv = f.priv ? 'private ' : '';
  if (/green line|buffer zone/.test(s) && !/crossing|both sides/.test(s)) return 'Green Line & buffer-zone walk';
  if (/mine|mining|lost places/.test(s)) return `${priv}lost places & mining-heritage tour`;
  if (/walk|stroll/.test(s) && !/(bus|coach|minibus)/.test(s) && (!f.minutes || f.minutes <= 300)) {
    const of = places.length ? places : f.from ? [`${f.from.name} old town`] : [];
    return `${priv}walking tour: ${listJoin(of)}${lang}`;
  }
  if (/\bbike\b|cycling/.test(s)) return `bike tour: ${listJoin(places.length ? places : f.from ? [f.from.name] : [])}`;
  const label = /shore excursion/.test(s) ? 'shore excursion' : f.minutes && f.minutes >= 360 ? 'day trip' : 'half-day tour';
  const time = f.time === 'sunset' ? 'sunset ' : '';
  const generic = f.kind === 'culture' ? 'heritage & highlights' : 'highlights';
  if (!places.length) return `${priv}${time}${label}: ${f.from ? `${f.from.name} ${generic}` : `Cyprus ${generic}`}${lang}`;
  return `${priv}${time}${label}: ${listJoin(places)}${lang}`;
}

function foodTitle(f: Facts): string {
  const s = f.s;
  const places = where(f);
  const inPlaces = places.length ? `: ${listJoin(places)}` : '';
  const priv = f.priv ? 'private ' : '';
  const meal = /lunch|dinner/.test(s) || f.meal;
  if (/baklava|cookies/.test(s)) return 'baklava & Cypriot sweets workshop';
  if (/honey|beekeep|bee sanctuary/.test(s)) return `beekeeping visit & honey tasting${/cooking/.test(s) ? ' with a cooking class' : ''}`;
  if (/baking/.test(s)) return `Cypriot baking class${/family/.test(s) ? ' with a local family' : ''}`;
  if (/\bcook(ing)?\b|gemista/.test(s)) return `${priv}Cypriot cooking class${/village home|local family|village/.test(s) ? ' in a village home' : ''}${meal ? ' with a meal' : ''}`;
  if (/cocktail/.test(s)) return 'cocktail-making class';
  if (/brewery/.test(s)) return 'brewery visit & Cypriot food';
  if (/\bbeer/.test(s)) return 'craft-beer tasting';
  if (/sip and paint|painting/.test(s)) return `${/sunset|beach/.test(s) ? 'sunset ' : ''}painting session with wine${/couple|date/.test(s) ? ' for two' : ''}`;
  if (/picnic/.test(s)) return /luxury/.test(s) ? `${priv}luxury picnic` : `${/romantic|couple/.test(s) ? 'romantic ' : ''}sunset picnic with wine`;
  if (/olive oil/.test(s)) return `olive-oil & mountain-village tour${inPlaces}`;
  if (/elixir/.test(s)) return 'herbal-elixir workshop at a boutique winery';
  if (/halloumi/.test(s) && /wine/.test(s)) return `wine & halloumi tasting${/monaster/.test(s) ? ' with a monastery visit' : ''}`;
  if (/commandaria/.test(s)) return `wine tour: Commandaria wine villages${meal ? ' with lunch' : ''}`;
  if (/wine|winer|vineyard/.test(s)) {
    if (/at your place/.test(s)) return 'private wine tasting at your villa';
    if (!places.length && /winery tour|wine tastings/.test(s)) return 'winery tour & wine tasting';
    const what = /gourmet|flavou?rs|food/.test(s) ? 'food & wine tour' : 'wine tour';
    const fallback = f.from ? `: ${f.from.name} ${/village/.test(s) ? 'villages & wineries' : 'area wineries'}` : '';
    return `${priv}${what}${inPlaces || fallback}`;
  }
  if (/cheese/.test(s)) return `${priv}cheese-making & mountain-villages day trip`;
  if (/food tour/.test(s) && /old town/.test(s)) return `old-town food tour${f.from ? `: ${f.from.name}` : ''}`;
  return `${priv}food & tasting tour${inPlaces || (f.from ? `: ${f.from.name}` : '')}`;
}

function classesTitle(f: Facts): string {
  const s = f.s;
  const priv = f.priv ? 'private ' : '';
  if (/wedding/.test(s)) return 'wedding & event photographer';
  if (/photography tour|photography workshop|photo tour/.test(s)) return 'photography tour & workshop';
  if (/photo ?shoot|photograph/.test(s)) return `${priv}holiday photoshoot with a pro photographer${f.from ? ` in ${f.from.name}` : ''}`;
  if (/yoga/.test(s)) return /hike/.test(s) ? `sunset hike & yoga${f.mentions.length ? ` at ${placeNames(f.mentions)[0]}` : ''}` : /pupp|dog/.test(s) ? 'mindful yoga with rescue puppies' : 'yoga session';
  if (/retreat/.test(s)) return `${f.minutes && f.minutes >= 2880 ? `${Math.round(f.minutes / 1440)}-day ` : ''}wellness retreat`;
  if (/candle/.test(s)) return 'candle-making workshop';
  if (/kombucha/.test(s)) return 'kombucha-making workshop';
  if (/cigar/.test(s)) return 'cigar-pairing workshop';
  if (/herbal|botanical/.test(s)) return 'herbal & botanical workshops';
  if (/wellness/.test(s)) return `${priv}wellness workshop with sea views`;
  if (/picnic/.test(s)) return `${priv}luxury picnic`;
  return `${priv}workshop${f.from ? ` in ${f.from.name}` : ''}`;
}

function natureTitle(f: Facts): string {
  const s = f.s;
  if (RX.geo.test(s)) return geoTitle(f);
  const places = where(f);
  const at = places.length ? `: ${listJoin(places)}` : '';
  const priv = f.priv ? 'private ' : '';
  const time = f.time === 'sunset' ? 'sunset ' : '';
  if (/photograph|photo session/.test(s)) return /wedding/.test(s) ? 'wedding & event photographer' : `${priv}photography session with a pro photographer`;
  if (/e-?(mountain )?bike|e-mtb/.test(s)) return `e-mountain-bike ${/forest/.test(s) ? 'forest ' : ''}tour${at}${/lunch/.test(s) ? ' with lunch' : ''}`;
  if (/\bbike|cycling/.test(s)) return `guided bike tour${at}`;
  if (/hik(e|ing)|trail|walk/.test(s)) return `${priv}guided ${time}${/waterfall/.test(s) ? 'waterfall ' : ''}hike${at}`;
  if (/herb gardens|botanic/.test(s)) return 'herb gardens & maze visit';
  if (/donkey|cats|farm/.test(s)) return `${/family/.test(s) ? 'family ' : ''}farm & village day out${at}`;
  if (/waterfall/.test(s)) return `${priv}${/romantic/.test(s) ? 'romantic ' : ''}${places.length ? 'tour' : 'waterfall & villages tour'}${at}`;
  const label = f.minutes && f.minutes >= 360 ? 'day trip' : 'half-day trip';
  return `${priv}${label}${at || (/mountain/.test(s) ? ': mountain villages' : f.from ? `: around ${f.from.name}` : '')}`;
}

function waterTitle(f: Facts): string {
  const s = f.s;
  const dest = f.mentions.length ? ` to ${listJoin(placePhrases(f.mentions.slice(0, 2)))}` : '';
  const priv = f.priv ? 'private ' : '';
  if (/water ?park/.test(s)) return `Aphrodite Waterpark ${/2.day/.test(s) ? '2-day pass' : 'ticket'}${/transport|transfer/.test(s) ? ' with transport' : ''}`;
  if (/kayak/.test(s) && /\bsup\b/.test(s)) return `SUP & kayak tour${dest}`;
  if (/kayak/.test(s)) return `${priv}guided sea-kayak tour${dest}${/snorkel/.test(s) ? ' with snorkelling' : ''}`;
  if (/jet ?ski/.test(s)) return /package|towable|pedal/.test(s) ? 'jet ski & water-toys package' : `guided jet-ski safari${dest}`;
  if (/wakeboard/.test(s)) return 'private wakeboard session with coaching';
  if (/e-?foil/.test(s)) return 'eFoil session & board rental';
  if (/speedboat/.test(s)) return 'private speedboat with watersports';
  return `watersports session${dest}`;
}

function genericTitle(f: Facts): string {
  const s = f.s;
  if (/\bclay\b|shooting/.test(s)) return `clay-pigeon shooting${/cave/.test(s) ? ' & sea-caves visit' : ''}`;
  if (/escape room/.test(s)) return 'escape room';
  if (f.kind === 'tickets') {
    const p = f.mentions[0];
    return `${p ? p.name : 'attraction'} ${/full animal/.test(s) ? 'ticket with animal experience' : 'entry ticket'}${/transfer/.test(s) ? ' with transfer' : ''}`;
  }
  if (/pub crawl/.test(s)) return 'guided pub crawl';
  if (/bar crawl/.test(s)) return 'bar crawl';
  if (/pupp|rescue dog/.test(s)) return /walk/.test(s) ? 'beach walk with rescue dogs' : 'coffee & cake with rescue puppies';
  if (/stargaz/.test(s)) return 'stargazing evening with drinks';
  if (/breakfast/.test(s)) return 'romantic beach breakfast for two';
  if (/picnic/.test(s)) return 'luxury beach picnic';
  if (/photograph/.test(s)) return 'photography session with a pro photographer';
  return cultureTitle(f);
}

export function buildTitle(f: Facts): string {
  const t =
    f.kind === 'boat' ? boatTitle(f) :
    f.kind === 'diving' ? divingTitle(f) :
    f.kind === 'safari' ? safariTitle(f) :
    f.kind === 'culture' ? cultureTitle(f) :
    f.kind === 'food' ? foodTitle(f) :
    f.kind === 'classes' ? classesTitle(f) :
    f.kind === 'nature' ? natureTitle(f) :
    f.kind === 'water' ? waterTitle(f) : genericTitle(f);
  return cap(t.replace(/\s+/g, ' ').replace(/: $/, '').trim());
}

// ── tags & summary ─────────────────────────────────────────────────────────────────
export function tagsFor(f: Facts): string[] {
  const t: string[] = [];
  if (f.pickup) t.push('pickup');
  if (f.meal || /bbq|lunch|dinner|buffet|brunch/.test(f.s)) t.push('meal');
  if (f.priv) t.push('private'); else if (f.small) t.push('small-group');
  if (f.family || /\bkids?\b|children|bubblemaker|pirate|water ?park|camel|zoo|donkey/.test(f.s)) t.push('family');
  if (f.adults) t.push('adults-only');
  if (/romantic|couples?|for two|honeymoon/.test(f.s)) t.push('romantic');
  if (f.time) t.push(f.time === 'night' ? 'evening' : f.time);
  if (/beginner|discover scuba|try (scuba|dive)|no licen[cs]e|introduction|bubblemaker/.test(f.s)) t.push('beginners');
  if (/certified|qualified|for divers/.test(f.s)) t.push('certified-divers');
  if (f.minutes != null) t.push(f.minutes >= 2880 ? 'multi-day' : f.minutes >= 360 ? 'full-day' : f.minutes >= 180 ? 'half-day' : 'short');
  if (f.lang) t.push(`guide-${f.lang}`);
  return t;
}

const BASIS_TXT = (b: CatalogRow['price_basis'], g: number | null) => b === 'group' ? `per group${g ? ` (up to ${g} guests)` : ''}` : 'per person';

export function buildSummary(r: Pick<CatalogRow, 'kind' | 'duration_label' | 'town' | 'landmark' | 'tags' | 'price_band' | 'price_basis' | 'group_max'>, f: Facts): string {
  const bits: string[] = [];
  const dur = !r.duration_label ? null : r.duration_label === 'full day' ? 'A full day' : /days$/.test(r.duration_label) ? cap(r.duration_label) : `About ${r.duration_label}`;
  const lead = [dur, r.town ? `from ${r.town}` : null].filter(Boolean).join(', ');
  if (lead) bits.push(`${cap(lead)}.`);
  const visits = [...placePhrases(f.mentions), ...f.north].slice(0, 4).filter((x) => x !== r.town);
  if (visits.length) bits.push(`Takes in ${listJoin(visits, 'and')}.`);
  const inc: string[] = [];
  if (r.tags.includes('pickup')) inc.push('hotel pickup');
  if (r.tags.includes('meal')) inc.push('a meal');
  const extra = f.kind === 'boat' ? inclusions(f, 4).filter((x) => !['BBQ', 'lunch', 'dinner'].includes(x)) : [];
  inc.push(...extra);
  if (inc.length) bits.push(`Includes ${listJoin(inc, 'and')}.`);
  const who: string[] = [];
  if (r.tags.includes('private')) who.push(`private${r.group_max ? ` for up to ${r.group_max} guests` : ''}`);
  else if (r.tags.includes('small-group')) who.push('small group');
  if (r.tags.includes('family')) who.push('good for families');
  if (r.tags.includes('adults-only')) who.push('adults only');
  if (r.tags.includes('beginners')) who.push('no experience needed');
  if (r.tags.includes('certified-divers')) who.push('certified divers only');
  if (f.lang) who.push(`${cap(f.lang)}-speaking guide`);
  if (who.length) bits.push(`${cap(who.join(', '))}.`);
  if (r.price_band) bits.push(`Price level ${r.price_band} ${BASIS_TXT(r.price_basis, r.group_max)}.`);
  return bits.join(' ');
}

// ── one export row → one catalogue row ─────────────────────────────────────────────
export function cleanBookingUrl(u: string): string | null {
  try {
    const url = new URL(String(u || '').trim());
    if (url.protocol !== 'https:' || !/(^|\.)getyourguide\.com$/i.test(url.hostname)) return null;
    return `https://www.getyourguide.com${url.pathname.replace(/\/?$/, '/')}`;
  } catch { return null; }
}

/**
 * Where the trip leaves from: "From X …" in the title, else a "Town: …" prefix (only
 * when the prefix is a place to start from, not a landmark), else the listing's own
 * departure label / city. `seg` is the text naming the departure(s) — towns in it are
 * alternative pick-up towns, not destinations ("Ayia Napa/Protaras: …").
 */
export function departureOf(title: string, label: string, citySlug: string): { place: Place | null; seg: string } {
  const t = foldText(title);
  const fromM = /\bfrom ([a-z' ./&-]+?)(?=[:,|(]| to | with | in |$)/.exec(t);
  const fromTown = fromM ? findTown(fromM[1]) : null;
  if (fromTown) return { place: fromTown, seg: fromM![1] };
  const prefix = /^([^:]{2,40}):/.exec(t);
  if (prefix && !findLandmarks(prefix[1], null).length) {
    const p = findTown(prefix[1]);
    if (p) return { place: p, seg: prefix[1] };
  }
  const place = findTown(String(label || '').replace(/^from\s+/i, '').replace(/\s+district$/i, '')) || findTown(String(citySlug || '').replace(/-/g, ' '));
  return { place, seg: '' };
}

export function curateRow(raw: Record<string, string>, ov: Override = {}): CatalogRow {
  const title = raw.title || '';
  const s = foldText(title);
  const label = raw.location_label || '';
  const dep = departureOf(title, label, raw.city_slug || '');
  const from = (ov.town ? TOWNS.find((p) => p.key === ov.town) || null : null) || dep.place;
  const fromTitle = findLandmarks(title, from);
  // Towns the trip VISITS (e.g. "Lefkara & Nicosia") — not the departure, not alternative
  // pick-up towns, not a town that is just the name of a landmark already listed.
  const named: Place[] = [];
  for (const p of TOWNS) {
    if (p.key === from?.key || (dep.seg && p.rx.test(dep.seg))) continue;
    if (fromTitle.some((l) => l.name.startsWith(p.name) || (p.key === 'troodos' && l.key === 'troodos-mountains') || (p.key === 'coral-bay-town' && l.key === 'coral-bay'))) continue;
    if (p.rx.test(s)) named.push(p);
  }
  const mentions = [...fromTitle, ...named].sort((a, b) => s.search(a.rx) - s.search(b.rx));
  const north = NORTH_NAMES.filter(([rx]) => rx.test(s)).map(([, n]) => n);

  const minutesRaw = parseDurationMinutes(raw.duration || '');
  const feats = (raw.features || '').toLowerCase();
  const { basis, groupMax } = priceBasis(raw.price_basis || '');
  const kind = ov.kind || kindFor(title);
  let minutes = ov.duration_min !== undefined ? ov.duration_min : minutesRaw;
  // Obvious export errors (a 20-day jeep safari, a 50-day waterpark pass) are dropped.
  if (minutes != null && minutes >= 2880 && !/course|retreat|sailing|voyage|expedition|\b\d+-day\b/.test(s)) minutes = null;

  const f: Facts = {
    s, kind, from, mentions, north,
    priv: /\bprivate\b|charter|individual tour|personal guide/.test(s) || /private group/.test(feats),
    small: /small group/.test(feats) || /small group|max \d+|only \d+ guests/.test(s),
    adults: /adults?.?only/.test(s), family: /\bfamily\b|kids|children/.test(s),
    time: /sunset/.test(s) && !/morning or sunset|sunrise or sunset/.test(s) ? 'sunset' : /sunrise/.test(s) && !/or sunset/.test(s) ? 'sunrise' : /\bnight\b|fireworks/.test(s) ? 'night' : /\bmorning\b/.test(s) && !/or sunset/.test(s) ? 'morning' : null,
    lang: (LANG.exec(s)?.slice(1).find(Boolean)) || null,
    pickup: /pickup available/.test(feats) || /pickup|hotel transfer|with transfers?\b|with transport/.test(s),
    meal: /meal included/.test(feats), minutes, groupMax,
  };

  // Map point: the first landmark the title names near the departure, else the departure
  // town; the listing's own landmark guess is a last resort and must sit close to it.
  const near = (p: Place, km: number) => !from || haversineKm(p, from) <= km;
  let pin: Place | null =
    ov.landmark === null ? null :
    ov.landmark ? LANDMARKS.find((p) => p.key === ov.landmark) || null :
    fromTitle.find((p) => near(p, 60)) || null;
  if (!pin && ov.landmark === undefined) {
    const guess = findLandmarks(`${raw.poi_name || ''} ${raw.category || ''}`, from).find((p) => near(p, 25));
    if (guess) pin = guess;
  }
  const point = pin || from;
  const district = point ? point.district : null;

  const northSite = ov.north === false ? null : visitsNorth(title, raw.category || '', raw.poi_name || '', raw.itinerary_stops || '') || (ov.north ? 'north' : null);
  const url = cleanBookingUrl(raw.activity_url);
  let hidden: string | null = ov.hide || null;
  if (!hidden && basedNorth(title, label, raw.town_place_type || '')) hidden = 'operator based in the occupied north or outside Cyprus';
  if (!hidden && point && isNorthPoint(district, point.lat)) hidden = 'departs from the occupied north';
  if (!hidden && !url) hidden = 'no valid booking link';

  const price = num(raw.price_eur);
  const row: CatalogRow = {
    gyg_id: String(raw.activity_id || '').trim(),
    slug: '', title: '', summary: '', kind, tags: [],
    district, town: from ? from.name : null, landmark: pin ? pin.name : null,
    lat: point ? point.lat : null, lng: point ? point.lng : null, geo_precision: pin ? 'landmark' : from ? 'town' : null,
    duration_min: minutes, duration_label: durationLabel(raw.duration || '', minutes),
    price_band: priceBand(price), price_basis: price != null ? basis : null, group_max: groupMax,
    booking_url: url || '', priority: 0,
    visits_north: !!northSite, north_site: northSite, status: hidden ? 'hidden' : 'active', hidden_reason: hidden,
  };
  row.title = ov.title || buildTitle(f);
  row.tags = ov.tags || tagsFor(f);
  row.summary = buildSummary(row, f);
  const base = slugify(row.title);
  row.slug = `${base.length > 64 ? base.slice(0, 64).replace(/-[^-]*$/, '') : base}-${row.gyg_id}`;
  return row;
}
