// lib/journalism/cyprusGround.ts — the Cyprus connection of a story comes from the SOURCE (a name, a place, an institution, a figure, a
// rule), never from the model's general knowledge. Pure (imports ./evidence, ./sentences and the types of ./factCore). Shared by the
// Supabase edge function (generated copy) and the app.
//
// Why: the old desk asked every writer to "state why it matters to Cyprus". A model that has no Cyprus fact to state invents one
// ("New York costs more than Cyprus", "for an economy like the Cypriot one, dependent on shipping …"), and the fact check let it pass
// because general knowledge about Cyprus is not a claim about the story. Two rules end that:
//   1  the relevance gate asks for a connection that the source itself carries (it names the island or a place of it often enough, or the
//      model points at a passage of the source that shows it and the source is a Cypriot outlet), and the connection is written into the
//      fact core as the ONLY link to Cyprus the writers may state;
//   2  a finished edition may name no Cypriot place that neither the source nor the core names.
import type { CyprusAnchor, FactCore } from './factCore';
import { foldForMatch, locatePassage, type SourceText } from './evidence';
import { splitSentences } from './sentences';

/** The Cypriot outlets whose stories are about the island unless the text says otherwise. Extended by CYPRUS_OUTLET_HOSTS (comma separated). */
export const CYPRUS_OUTLETS: readonly string[] = [
  'cyprus-mail.com', 'philenews.com', 'in-cyprus.com', 'politis.com.cy', 'sigmalive.com', 'financialmirror.com', 'kathimerini.com.cy', 'reporter.com.cy',
  'stockwatch.com.cy', 'cyprustimes.com', 'offsite.com.cy', 'alphanews.live', 'omegalive.com.cy', 'ant1.com.cy', 'brief.com.cy', 'knews.kathimerini.com.cy', 'cyprusprofile.com',
];
/** true when a URL belongs to a Cypriot outlet: a listed host, any .cy domain, or a host with "cyprus" in it. */
export function isCyprusOutlet(url: string | null | undefined, extra: readonly string[] = []): boolean {
  let host = '';
  try { host = new URL(String(url || '')).hostname.toLowerCase().replace(/^www\./, ''); } catch { return false; }
  if (!host) return false;
  if (host.endsWith('.cy') || host.includes('cyprus')) return true;
  return [...CYPRUS_OUTLETS, ...extra].some((h) => host === h || host.endsWith(`.${h}`));
}

// ── the island and its places, in the languages the desk writes ───────────────────────────────────────────────────
// Folded forms (see foldForMatch: no accents, no case). A form matches from the start of a word.
const ENTITIES: ReadonlyArray<{ id: string; label: string; forms: string[] }> = [
  { id: 'island', label: 'Cyprus', forms: ['cyprus', 'cypriot', 'cipru', 'cipriot', 'chypre', 'chypriote', 'zypern', 'zyprisch', 'zyprer', 'zypriot', 'kibris', 'cypr(?:em|u|ze|y)\\b', 'cypr\\b', 'кипр', 'κυπρ', 'قبرص'] },
  { id: 'nicosia', label: 'Nicosia', forms: ['nicosia', 'lefkosia', 'nikosia', 'nikozj', 'λευκωσ', 'никоси', 'نيقوسيا'] },
  { id: 'limassol', label: 'Limassol', forms: ['limassol', 'lemesos', 'limasol', 'λεμεσ', 'лимасс?ол', 'ليماسول'] },
  { id: 'larnaca', label: 'Larnaca', forms: ['larnaca', 'larnaka', 'larnak', 'λαρνακ', 'ларнак', 'لارنكا'] },
  { id: 'paphos', label: 'Paphos', forms: ['paphos', 'pafos', 'παφο', 'بافوس'] },
  { id: 'famagusta', label: 'Famagusta', forms: ['famagusta', 'ammochostos', 'αμμοχωστ', 'фамагуст', 'فاماغوستا'] },
  { id: 'kyrenia', label: 'Kyrenia', forms: ['kyrenia', 'keryneia', 'girne', 'κερυνει', 'кирени', 'كيرينيا'] },
  { id: 'ayia-napa', label: 'Ayia Napa', forms: ['ayia napa', 'agia napa', 'ajia napa', 'αγια ναπα', 'айя-?напа'] },
  { id: 'protaras', label: 'Protaras', forms: ['protaras', 'προταρα', 'протарас'] },
  { id: 'troodos', label: 'Troodos', forms: ['troodos', 'τροοδ', 'троод'] },
  { id: 'akamas', label: 'Akamas', forms: ['akamas', 'ακαμασ', 'ακαμα(?=\\s|$)', 'акамас'] },
  { id: 'akrotiri', label: 'Akrotiri', forms: ['akrotiri', 'dhekelia', 'ακρωτηρι βασεισ'] },
  // villages, resorts and regions that Cypriot outlets name without naming the island. Only forms that are not also ordinary words: a form that
// begins an ordinary word (Greek ζυγίζει "weighs", κολοσσιαίο "colossal", Polish pomost "jetty") must end the word: (?=\\s|$).
  ...[
    ['Latchi', 'latchi', 'lachi', 'λατσι'], ['Polis Chrysochous', 'polis chrysochou', 'πολη χρυσοχου', 'πολισ χρυσοχου'], ['Pissouri', 'pissouri', 'πισσουρι'], ['Kakopetria', 'kakopetria', 'κακοπετρια'],
    ['Platres', 'platres', 'πλατρεσ'], ['Lefkara', 'lefkara', 'λευκαρα'], ['Omodos', 'omodos', 'ομοδοσ'], ['Pomos', 'pomos(?=\\s|$)'], ['Peyia', 'peyia', 'pegeia', 'πεγεια'], ['Coral Bay', 'coral bay'],
    ['Germasogeia', 'germasogeia', 'yermasoyia', 'γερμασογεια'], ['Engomi', 'engomi', 'egkomi', 'εγκωμη'], ['Aglantzia', 'aglantzia', 'αγλαντζια'], ['Lakatamia', 'lakatamia', 'λακαταμια'],
    ['Deryneia', 'deryneia', 'derynia', 'δερυνεια'], ['Sotira', 'sotira(?=\\s|$)'], ['Zygi', 'zygi(?=\\s|$)', 'ζυγι(?=\\s|$)'], ['Kolossi', 'kolossi(?=\\s|$)', 'κολοσσι(?=\\s|$)'], ['Geroskipou', 'geroskipou', 'γεροσκηπου'], ['Kouklia', 'kouklia(?=\\s|$)', 'κουκλια(?=\\s|$)'],
    ['Droushia', 'droushia', 'δρουσια'], ['Kalopanayiotis', 'kalopanayiotis', 'kalopanagiotis', 'καλοπαναγιωτη'], ['Pedoulas', 'pedoulas', 'πεδουλασ'], ['Anogyra', 'anogyra', 'ανωγυρα'], ['Avdimou', 'avdimou', 'αυδημου'],
    ['Tochni', 'tochni', 'τοχνη'], ['Xylophagou', 'xylophagou', 'ξυλοφαγου'], ['Liopetri', 'liopetri', 'λιοπετρι'], ['Frenaros', 'frenaros', 'φρεναροσ'], ['Agios Tychonas', 'agios tychonas', 'ayios tychonas'],
    ['Mesa Geitonia', 'mesa geitonia', 'mesa yitonia'], ['Ypsonas', 'ypsonas'], ['Erimi', 'erimi(?=\\s|$)'], ['Pareklisia', 'pareklisia'], ['Monagroulli', 'monagroulli'], ['Kalavasos', 'kalavasos'], ['Vasiliko', 'vasiliko'],
    ['Polemidia', 'polemidia'], ['Pitsilia', 'pitsilia'], ['Marathasa', 'marathasa'], ['Tylliria', 'tylliria'],
  ].map(([label, ...forms]) => ({ id: `place-${label.toLowerCase().replace(/\s+/g, '-')}`, label, forms })),
];
const ENTITY_RE = ENTITIES.map((e) => ({ id: e.id, label: e.label, re: new RegExp(`(?:^|\\s)(?:${e.forms.join('|')})`, 'u') }));

/** Which of the island's names and places a text mentions (ids). */
export function cyprusEntitiesIn(text: string): Set<string> {
  const f = ` ${foldForMatch(text)}`;
  const out = new Set<string>();
  for (const e of ENTITY_RE) if (e.re.test(f)) out.add(e.id);
  return out;
}

/** How many times the text names the island or a place of it (words, not mentions of the same word counted twice in one phrase). */
export function countCyprusMentions(text: string): number {
  const f = ` ${foldForMatch(text)}`;
  let n = 0;
  for (const e of ENTITY_RE) { const g = new RegExp(e.re.source, 'gu'); n += (f.match(g) || []).length; }
  return n;
}

// ── the gate ─────────────────────────────────────────────────────────────────────────────────────────────────────
export interface GroundInput {
  core: FactCore; sources: SourceText[];
  /** The story comes from a Cypriot outlet (see isCyprusOutlet). */
  originCyprus: boolean;
  /** How often the source must name the island or a place of it to count on its own (default 2; a mention in the title counts alone). */
  strongMentions?: number;
}
/**
 * The Cyprus connection the desk may state. grounded when
 *   • the source names the island or one of its places at least twice, or in its title; or
 *   • the research editor says there is an angle AND the passage it points at is in the source AND (that passage names the island or
 *     a place of it, or the source is a Cypriot outlet).
 * Everything else is not Cyprus news for this magazine, however plausible a connection sounds.
 */
export function groundCyprus(i: GroundInput): CyprusAnchor {
  const title = i.sources.map((s) => s.title).join('\n');
  const body = i.sources.map((s) => `${s.title}\n${s.text}`).join('\n');
  const strong = cyprusEntitiesIn(title).size > 0 || countCyprusMentions(body) >= (i.strongMentions ?? 2);
  const ev = i.core.cyprusEvidence ? locatePassage(foldForMatch(body), i.core.cyprusEvidence) : { found: false, pos: -1 };
  const passageNames = !!i.core.cyprusEvidence && cyprusEntitiesIn(i.core.cyprusEvidence).size > 0;
  const evidenced = i.core.cyprusAngle && ev.found && (passageNames || i.originCyprus);
  const basis = i.core.cyprusBasis && i.core.cyprusBasis !== 'none' ? i.core.cyprusBasis : '';
  if (strong) return { grounded: true, kind: basis || 'named', statement: i.core.cyprusHook || 'the source itself places the story in Cyprus', via: 'named' };
  if (evidenced) return { grounded: true, kind: basis || (passageNames ? 'named' : 'institution'), statement: i.core.cyprusHook || 'the source ties the story to Cyprus', via: 'evidenced' };
  return { grounded: false, kind: 'none', statement: '', via: 'none' };
}

// ── the guard for a finished edition ─────────────────────────────────────────────────────────────────────────────
export interface InventedCyprus { id: string; label: string; sentence: string }
/**
 * Cypriot places (and the island) that an edition names although neither the source nor the fact core does. The island itself is allowed
 * when the story is grounded in Cyprus; a town or district never is unless the material names it. Forms in other languages count as the
 * same place (Λεμεσός = Limassol).
 */
export function inventedCyprusMentions(editionText: string, known: string, grounded: boolean): InventedCyprus[] {
  const have = cyprusEntitiesIn(known);
  const out: InventedCyprus[] = [];
  const seen = new Set<string>();
  for (const sentence of splitSentences(editionText)) {
    for (const id of cyprusEntitiesIn(sentence)) {
      if (seen.has(id) || have.has(id)) continue;
      if (id === 'island' && grounded) continue;
      seen.add(id);
      out.push({ id, label: ENTITIES.find((e) => e.id === id)?.label || id, sentence: sentence.slice(0, 160) });
    }
  }
  return out;
}
