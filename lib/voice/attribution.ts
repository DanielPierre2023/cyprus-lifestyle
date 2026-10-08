// lib/voice/attribution.ts — the magazine stands on its own reporting.
//
// A published piece never points at where its facts came from: no outlet, agency, consultancy, reviewer or encyclopaedia is
// named ("Cyprus Mail reported", "according to PwC", "Time Out singles out"), no "according to", and the writer never talks
// about the research ("I found no confirmation", "the sources differ"). The research is done and the verified result is
// written as the magazine's own sentences. People and institutions still appear as ACTORS in the story (the minister said,
// the council approved, the gallery shows): that is reporting, not citation.
//
// This file is data only; lib/voice/tells.ts compiles it with the same rules as the per-language voice data.
import type { Lang } from '@/lib/antiAi';
import type { TellSpec } from '@/lib/voice/types';

// Media, reference works and consultancies that must never be named as the origin of a fact. Latin spellings are shared.
const OUTLETS_LATIN = [
  'cyprus mail', 'in-cyprus', 'philenews', 'stockwatch', 'financial mirror', 'cyprus times', 'reuters', 'associated press', 'the ap',
  'bloomberg', 'financial times', 'the guardian', 'the telegraph', 'new york times', 'washington post', 'wall street journal',
  'bbc', 'cnn', 'al jazeera', 'euronews', 'forbes', 'time out', 'harden\'?s', 'decanter', 'wine spectator', 'vogue', 'artforum',
  'wikipedia', 'skyscraper center', 'pwc', 'deloitte', 'kpmg', 'kpler', 'breakingviews', 'lonely planet', 'tripadvisor',
  'welcome magazine', 'cbn',
];

const OUTLETS_LOCAL: Partial<Record<Lang, string[]>> = {
  el: ['ρόιτερς', 'γκάρντιαν', 'βικιπαίδεια', 'μπλούμπεργκ', 'φόρμπς', 'δημοσίευμα\\p{L}*'],
  ru: ['рейтер\\p{L}*', 'гардиан', 'википеди\\p{L}*', 'блумберг', 'форбс', 'ассошиэйтед пресс'],
  ar: ['رويترز', 'الغارديان', 'غارديان', 'ويكيبيديا', 'بلومبرغ', 'فوربس', 'بي بي سي'],
};

const ATTRIBUTION: Record<Lang, string[]> = {
  en: ['according to', 'as (?:reported|stated|cited) (?:by|in)', 'reported (?:by|in)', '(?:was|were|has been|have been|had been) reported', 'media reports?', 'press reports?', 'press release', 'newspaper reports?'],
  de: ['laut (?:dem|der|den|des|einer|einem|angaben|berichten|medien|presse)', 'nach angaben', 'angaben zufolge', 'zufolge', 'wie (?:[\\p{L}\\p{M}-]+ ){1,4}berichtet', 'medienberichten', 'presseberichten', 'pressemitteilung'],
  pl: ['według(?! (?:stanu|wzrostu|wieku|kolejności))', 'wedle', 'jak (?:podaje|podają|informuje|informują|pisze|piszą|donosi|donoszą)', 'media (?:donoszą|podają)', 'komunikat prasowy', 'doniesień'],
  ro: ['potrivit', 'conform(?! (?:legii|cu|prevederilor|regulilor))', 'după cum (?:relatează|notează|scrie|informează)', 'a relatat', 'relatează', 'comunicat de presă'],
  ru: ['по данным', 'по информации', 'согласно(?! (?:закон|правил|договор|постановлен))', 'как (?:сообщает|пишет|сообщили|пишут|отмечает|сообщила)', 'со ссылкой на', 'пресс-релиз', 'по сообщению'],
  el: ['σύμφωνα με', 'όπως (?:αναφέρει|ανέφερε|γράφει|μεταδίδει|μετέδωσε)', 'μεταδίδει', 'δελτίο τύπου'],
  ar: ['وفقا ل', 'وفقا لما', 'بحسب (?:ما )?(?:ذكر|نقل|أفاد|جاء|ورد|تقرير|صحيفة|موقع|بيانات|بيان|مصادر|وكالة|مجلة|تصريح)', 'نقلا عن', 'كما ذكرت', 'كما أفادت', 'أفادت', 'ذكرت صحيفة', 'ذكر موقع', 'بيان صحفي'],
};

// The writer talking about the research instead of writing the piece.
const META: Record<Lang, string[]> = {
  en: ['i (?:found|could not|couldn\'?t|read|checked|verified|looked|searched|was unable)', 'we (?:found|could not|couldn\'?t|checked|verified|were unable)', '(?:the|these|several|my|our|various|other) sources (?:say|said|differ|disagree|agree|give|list|describe|note|suggest|indicate|do not|don\'?t|i)', 'sources (?:say|differ|disagree|agree)', '(?:could|can|can\'?t|cannot) (?:not )?be (?:verified|confirmed)', 'no (?:source|record|confirmation) (?:i|we)', 'unverified'],
  de: ['ich (?:fand|konnte|habe)', 'wir (?:fanden|konnten)', '(?:die|diese|mehrere|meine|unsere) quellen (?:sagen|nennen|geben|widersprechen|weichen|beschreiben)', 'quellen (?:nennen|sagen|widersprechen)', 'nicht (?:bestätigt|verifiziert|überprüfbar)', 'ließ sich nicht (?:bestätigen|überprüfen|belegen)', 'konnte nicht (?:bestätigt|überprüft|belegt) werden'],
  pl: ['nie znalazłem', 'nie znalazłam', 'nie udało mi się', 'sprawdziłem', 'sprawdziłam', 'źródła (?:podają|nie|różnią|mówią|wskazują)', 'nie udało się (?:potwierdzić|zweryfikować)', 'nie można (?:potwierdzić|zweryfikować)'],
  ro: ['(?:nu )?am găsit', 'am verificat', 'am citit', 'nu am putut', 'sursele (?:spun|diferă|nu|indică|descriu)', 'nu a putut fi (?:confirmat|verificat)', 'nu poate fi (?:confirmat|verificat)'],
  ru: ['я (?:не )?(?:нашёл|нашел|нашла|проверил|проверила|читал|читала)', 'мне не удалось', 'не удалось (?:подтвердить|проверить|найти|установить)', 'источники (?:говорят|расходятся|не|сообщают|называют|дают)', 'не подтвержд\\p{L}*'],
  el: ['δεν βρήκα', 'βρήκα', 'έλεγξα', 'δεν κατάφερα', 'οι πηγές (?:λένε|διαφωνούν|δεν|αναφέρουν|δίνουν)', 'δεν επιβεβαιώνεται'],
  ar: ['لم أجد', 'وجدت', 'تحققت', 'لم أتمكن', 'تختلف المصادر', 'المصادر (?:تقول|تختلف|لا|تذكر)', 'لم يتسن (?:التأكد|التحقق)', 'لا يمكن التأكد'],
};

/** Detectors for "the piece names its sources" in one language. All three are high: a published piece must never carry them. */
export function attributionSpecs(lang: Lang): TellSpec[] {
  return [
    { key: 'source_outlet', label: 'Names a publication, agency or reference work as the origin of a fact (the piece must stand as the magazine\'s own reporting)', severity: 'high', kind: 'word', alts: [...OUTLETS_LATIN, ...(OUTLETS_LOCAL[lang] || [])] },
    { key: 'source_attribution', label: 'Cites its source ("according to…", "reported by…"): state the fact in the magazine\'s own voice', severity: 'high', kind: 'word', alts: ATTRIBUTION[lang] },
    { key: 'source_meta', label: 'The writer talks about the research ("I found", "the sources differ"): write the verified result, leave the rest out', severity: 'high', kind: 'word', alts: META[lang] },
  ];
}
