// lib/journalism/relevance.ts — does a text name Cyprus, its places or unmistakable local institutions? Pure.
// The backstop behind the model's own "Cyprus angle" judgement in the relevance gate: a story is kept when the model sees an island
// angle, a Cyprus district was found, OR the SOURCE itself names the island. Terms match from the start of a word (so inflected forms
// count) and never inside another word: "Cypress" and the German "Zypresse" are trees, not the island.
const TERMS = [
  // the island, in the languages the sources come in
  'cyprus', 'cypriot', 'cipru', 'cipriot', 'chypre', 'chypriote', 'zypern', 'zyprisch', 'zyprer', 'zypriot', 'kıbrıs', 'kibris',
  'cypr(?:em|u|ze|y|(?![\\p{L}]))', 'кипр', 'κύπρ', 'κυπρι', 'قبرص',
  // districts and towns
  'nicosia', 'lefkosia', 'λευκωσ', 'никоси', 'limassol', 'lemesos', 'λεμεσ', 'лимасс?ол', 'larnaca', 'larnaka', 'λάρνακ', 'ларнак', 'paphos', 'pafos', 'πάφο',
  'famagusta', 'ammochostos', 'αμμόχωστ', 'фамагуст', 'kyrenia', 'keryneia', 'κερύνει', 'кирени', 'ayia napa', 'agia napa', 'protaras', 'протарас', 'paralimni', 'aradippou', 'strovolos',
  // landscape and institutions
  'troodos', 'τρόοδ', 'akamas', 'ακάμα', 'akrotiri', 'dhekelia', 'commandaria', 'halloumi', 'haloumi', 'xynisteri', 'maratheftiko',
  'bank of cyprus', 'hellenic bank', 'cyprus mail', 'cyprus stock exchange', 'akel', 'disy',
];
const RE = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${TERMS.join('|')})`, 'iu');

export const CYPRUS_TERMS: readonly string[] = TERMS;
export function hasCyprusTerms(text: string): boolean {
  return RE.test(String(text || ''));
}
