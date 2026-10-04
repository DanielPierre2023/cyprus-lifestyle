// lib/activities/match.ts
// ============================================================================
// Which catalogue experiences fit a guest's message — pure, multilingual, unit-tested.
// Used by the concierge (lib/concierge/brain.ts) on every turn; ~570 rows are scored
// in memory, so it needs no embeddings and works in all seven languages:
//
//   • experience KIND words in en/el/ro/ar/de/pl/ru  ("boat trip", "κρουαζιέρα",
//     "Bootsfahrt", "морская прогулка", "رحلة بحرية" → boat trips),
//   • landmark / town names from our catalogue ("Blue Lagoon", "Troodos", "Latchi"),
//   • the concierge's own understanding (English keywords + district from the LLM),
//   • generic "things to do / excursion / day trip" wording → a varied set in the district,
//   • our tags (family, romantic/sunset, private) and the editorial priority (0–3).
// ============================================================================
import { ACTIVITY_KINDS } from './classify';

export interface ActivityLite {
  external_id: string; title: string; kind: string; district: string | null; town: string | null;
  landmark: string | null; tags?: string[] | null; priority?: number | null;
}

export const fold = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const GENERIC = [
  'things to do', 'what to do', 'what can we do', 'activities', 'activity', 'experience', 'excursion', 'day out', 'day trip', 'tour', 'attraction', 'sightseeing', 'something fun', 'for kids', 'with kids', 'family day',
  'τι να κανω', 'τι να κανουμε', 'δραστηριοτητ', 'εκδρομ', 'αξιοθεατ', 'βολτα',
  'ce sa fac', 'ce putem face', 'activitat', 'excursi', 'atracti', 'obiectiv',
  'was tun', 'was kann man', 'was konnen wir', 'aktivitat', 'ausflug', 'erlebnis', 'sehenswurdig', 'unternehmen',
  'co robic', 'co mozna', 'atrakcj', 'wycieczk', 'zwiedz',
  'что делать', 'чем заняться', 'куда сходить', 'развлечен', 'экскурси', 'достопримечательн',
  'ماذا افعل', 'ماذا نفعل', 'انشطة', 'نشاطات', 'معالم', 'رحلة', 'جولة',
];
const STOP = new Set(['with', 'from', 'near', 'what', 'this', 'that', 'have', 'want', 'would', 'like', 'some', 'best', 'good', 'should', 'could', 'there', 'where', 'when', 'cyprus', 'please', 'recommend', 'looking', 'need', 'tomorrow', 'today', 'weekend', 'family', 'trip', 'tour', 'tours', 'day', 'days',
  'plan', 'plans', 'idea', 'ideas', 'something', 'anything', 'weather', 'romantic', 'sunset', 'private', 'kids', 'children']);
const FAMILY = /\b(kids?|children|family|families)\b|παιδι|copii|kinder|dzieci|дет|اطفال|عائل/;
const ROMANTIC = /sunset|romantic|honeymoon|anniversary|couple|ηλιοβασιλεμ|ρομαντ|apus|romantic|sonnenuntergang|romantisch|zachod slonca|romantycz|закат|романт|غروب|رومانس/;
const PRIVATE = /\bprivat|prywatn|ιδιωτικ|частн|خاص|exclusive|\bvip\b/;

// Guest words are word STARTS ("καταδυσ" matches "καταδύσεις"), never the middle of a
// word — so Romanian "vin" (wine) does not fire on "diving", nor "antic" on "romantic".
// Arabic words attach prefixes ("ال", "ب"), so they are matched anywhere.
const escapeRx = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRx = new Map<string, RegExp>();
const hasWord = (s: string, w: string) => {
  const fw = fold(w);
  if (/[\u0600-\u06FF]/.test(fw)) return s.includes(fw);
  let rx = wordRx.get(w);
  if (!rx) { rx = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRx(fw)}`, 'u'); wordRx.set(w, rx); }
  return rx.test(s);
};

export function activityIntent(q: string, keywords: string[] = []): { kinds: string[]; generic: boolean } {
  const s = fold(`${q} ${keywords.join(' ')}`);
  const kinds = ACTIVITY_KINDS.filter((k) => k.key !== 'sightseeing' && k.words.some((w) => hasWord(s, w))).map((k) => k.key);
  const tourish = ACTIVITY_KINDS.find((k) => k.key === 'sightseeing')!.words.some((w) => hasWord(s, w));
  const generic = tourish || GENERIC.some((w) => s.includes(fold(w)));
  return { kinds, generic };
}

/** Our editorial priority first, then how complete the entry is (pickup, a meal, a precise area). */
const quality = (a: ActivityLite) => {
  const t = a.tags || [];
  return 3 + (a.priority || 0) * 1.5 + (t.includes('pickup') ? 0.4 : 0) + (t.includes('meal') ? 0.2 : 0) + (a.landmark ? 0.3 : 0);
};
const landmarkName = (l: string | null) => fold(String(l || '').replace(/\s*\(.*\)$/, ''));

export function rankActivities<T extends ActivityLite>(
  list: T[], q: string,
  opts: { district?: string | null; keywords?: string[]; luxury?: boolean; limit?: number } = {},
): T[] {
  const limit = opts.limit ?? 5;
  const s = fold(`${q} ${(opts.keywords || []).join(' ')}`);
  const tokens = Array.from(new Set(s.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 4 && !STOP.has(t))));
  const { kinds, generic } = activityIntent(q, opts.keywords);
  const raw = `${q} ${(opts.keywords || []).join(' ')}`.toLowerCase();
  const either = (rx: RegExp) => rx.test(s) || rx.test(raw);
  const family = either(FAMILY); const romantic = either(ROMANTIC); const priv = either(PRIVATE) || !!opts.luxury;

  const scored = list.map((a) => {
    const tags = a.tags || [];
    const town = fold(a.town || '');
    const lm = landmarkName(a.landmark);
    // What makes an experience relevant: its kind, its landmark, the guest's words in its
    // title, a generic "things to do" ask, or what they're after (read from our tags).
    let want = 0;
    if (kinds.includes(a.kind)) want += 40;
    if (lm.length >= 4 && s.includes(lm)) want += 45 + (fold(a.title).includes(lm) ? 10 : 0); // named in our title: about that place
    // Query words count when a title / landmark word STARTS with them; a word that only
    // names the town or landmark is a place, not an interest.
    const words = fold(`${a.title} ${a.landmark || ''}`).split(/[^\p{L}\p{N}]+/u);
    let hits = 0;
    for (const t of tokens) if (!town.includes(t) && !lm.includes(t) && words.some((w) => w.startsWith(t))) hits++;
    want += Math.min(3, hits) * 10;
    if (generic) want += 12;
    if (priv && tags.includes('private')) want += 15;
    if (family && tags.includes('family')) want += 15;
    if (romantic && (tags.includes('romantic') || tags.includes('sunset'))) want += 25;
    // Where: helps rank what is already relevant, never makes it relevant on its own.
    let rel = want;
    if (want > 0 && town.length >= 4 && s.includes(town)) rel += 25;
    if (want > 0 && opts.district) rel += a.district === opts.district ? 20 : -30;
    return { a, rel, score: rel + quality(a) * 1.5 };
  }).filter((x) => x.rel >= 20).sort((x, y) => y.score - x.score);

  // Variety: a specific ask ("diving") may fill the list with that kind; a generic ask
  // ("things to do in Paphos") gets at most two per kind. Never two near-identical titles.
  const perKind = new Map<string, number>(); const seenTitle = new Set<string>(); const out: T[] = [];
  const cap = kinds.length ? limit : 2;
  for (const { a } of scored) {
    const tk = fold(a.title).replace(/[^a-z0-9Ͱ-ϿЀ-ӿ]+/g, '').slice(0, 28);
    if (seenTitle.has(tk)) continue;
    if ((perKind.get(a.kind) || 0) >= cap) continue;
    seenTitle.add(tk); perKind.set(a.kind, (perKind.get(a.kind) || 0) + 1);
    out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}
