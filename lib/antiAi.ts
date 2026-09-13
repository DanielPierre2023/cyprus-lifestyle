// Cyprus Lifestyle — deterministic anti-AI humanizer + AI-tell scorer.
// Ported from Transilvania Times _shared/tt-anti-ai.ts, extended EN·EL·RO·AR and
// re-anchored to a Cyprus gazetteer. Strips em/en dashes, scrubs AI-lexicon and
// filler openers, calms ALL-CAPS headings, and scores how "AI" a draft still reads.
// Language-neutral rules (dashes, emoji) apply to all four; lexicon/filler lists
// are per-language (EL/AR are lighter — no public stemmer, so we target the
// obvious tells).

export type Lang = 'en' | 'el' | 'ro' | 'ar';

// Acronyms/caps tokens that must STAY uppercase when a title is de-shouted.
const KEEP_UPPER = new Set<string>([
  // Cyprus / regional institutions & bodies
  'RIK', 'CYBC', 'CSE', 'CBC', 'CIPA', 'EAC', 'CYTA', 'CIM', 'ETEK', 'RCB',
  'DISY', 'AKEL', 'DIKO', 'EDEK', 'DIPA', 'ELAM',
  // global bodies / countries
  'EU', 'UN', 'NATO', 'IMF', 'ECB', 'WHO', 'OECD', 'UNDP', 'UNHCR', 'GDP',
  'USA', 'US', 'UK', 'UAE', 'MENA', 'FBI', 'CIA', 'NASA', 'OPEC', 'BRICS',
  // finance / tech / general
  'VAT', 'IPO', 'ETF', 'CEO', 'CFO', 'COO', 'AI', 'GPS', 'USB', 'PC', 'TV',
  'SUV', 'PDF', 'URL', 'SMS', 'PIN', 'ATM', 'VIP', 'PR', 'HR', 'FC',
  // Romanian institutions kept for the RO edition
  'UE', 'ONU', 'OMS', 'FMI', 'BCE', 'TVA', 'PIB', 'PSD', 'PNL', 'USR', 'AUR',
  // roman numerals
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
]);

// Proper-noun gazetteer (lowercased → canonical) for restoring casing after a
// shouted word is calmed. Cyprus + Greece + the capitals in the Cyprus news cycle.
const PROPER = new Map<string, string>(([
  'cyprus', 'Cyprus', 'nicosia', 'Nicosia', 'lefkosia', 'Lefkosia',
  'limassol', 'Limassol', 'lemesos', 'Lemesos', 'larnaca', 'Larnaca',
  'larnaka', 'Larnaka', 'paphos', 'Paphos', 'pafos', 'Pafos',
  'famagusta', 'Famagusta', 'kyrenia', 'Kyrenia', 'ayia', 'Ayia',
  'napa', 'Napa', 'protaras', 'Protaras', 'troodos', 'Troodos',
  'akamas', 'Akamas', 'kakopetria', 'Kakopetria', 'nissi', 'Nissi',
  'greece', 'Greece', 'grecia', 'Grecia', 'athens', 'Athens', 'atena', 'Atena',
  'turkey', 'Turkey', 'turcia', 'Turcia', 'ankara', 'Ankara',
  'israel', 'Israel', 'lebanon', 'Lebanon', 'egypt', 'Egypt',
  'europe', 'Europe', 'europa', 'Europa', 'brussels', 'Brussels',
  'london', 'London', 'londra', 'Londra', 'paris', 'Paris', 'dubai', 'Dubai',
  'moscow', 'Moscow', 'washington', 'Washington', 'romania', 'Romania',
  'românia', 'România', 'bucharest', 'Bucharest', 'mediterranean', 'Mediterranean',
] as string[]).reduce<[string, string][]>((acc, cur, i, arr) => {
  if (i % 2 === 0) acc.push([cur, arr[i + 1]]);
  return acc;
}, []));

function isAllCaps(w: string): boolean {
  const letters = w.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2) return false;
  if (letters === letters.toLowerCase()) return false;
  return letters === letters.toUpperCase();
}
function restoreProper(lw: string): string {
  return PROPER.get(lw.toLowerCase()) ?? lw;
}

export function deShoutTitle(title: string): string {
  if (!title) return title || '';
  let saw = false;
  const out = title.replace(/[\p{L}][\p{L}\p{M}'''\-]*/gu, (word) => {
    const bare = word.replace(/[.\-']/g, '');
    if (KEEP_UPPER.has(bare.toUpperCase()) && isAllCaps(word)) return word;
    if (!isAllCaps(word)) return word;
    saw = true;
    const lowered = word.toLowerCase();
    if (lowered.includes('-')) {
      const whole = PROPER.get(lowered);
      if (whole) return whole;
      return lowered.split('-').map(restoreProper).join('-');
    }
    return restoreProper(lowered);
  });
  if (!saw) return title.trim();
  const recased = out.replace(/(^\s*|[.!?:]\s+)([\p{Ll}])/gu, (_m, b, ch) => b + ch.toUpperCase());
  return recased.replace(/\s{2,}/g, ' ').trim();
}

// Dash normalization — language-neutral, idempotent (verbatim from TT).
export function stripDashes(s: string): string {
  if (!s) return s;
  let r = s
    .replace(/&mdash;|&#8212;|&#x2014;/gi, '—')
    .replace(/&ndash;|&#8211;|&#x2013;/gi, '–')
    .replace(/&#8213;|&#x2015;/gi, '—');
  r = r.replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2');
  r = r.replace(/\s+[–—]\s+/g, ', ');
  r = r.replace(/\s+--\s+/g, ', ');
  r = r.replace(/—/g, ', ').replace(/–/g, '-');
  r = r.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/[ \t]{2,}/g, ' ');
  return r;
}

function caseRep(to: string) {
  return (m: string): string => {
    if (!to) return '';
    const fa = m.match(/[\p{L}]/u);
    if (fa && fa[0] === fa[0].toUpperCase() && fa[0] !== fa[0].toLowerCase()) {
      return to.charAt(0).toUpperCase() + to.slice(1);
    }
    return to;
  };
}

const LEX_EN: Array<[RegExp, string]> = [
  [/\bdelve into\b/gi, 'examine'], [/\bdelving into\b/gi, 'examining'],
  [/\ba testament to\b/gi, 'proof of'], [/\btestament to\b/gi, 'proof of'],
  [/\bstands as a\b/gi, 'is a'], [/\bboasts\b/gi, 'has'], [/\bboasting\b/gi, 'with'],
  [/\bnestled\b/gi, 'set'], [/\bin the heart of\b/gi, 'in'],
  [/\brich tapestry of\b/gi, 'mix of'], [/\btapestry of\b/gi, 'mix of'],
  [/\bwhen it comes to\b/gi, 'for'], [/\bin the realm of\b/gi, 'in'],
  [/\bplays? an? (?:crucial|vital|key|pivotal|central|important|significant) role in\b/gi, 'is central to'],
  [/\bunderscores\b/gi, 'highlights'], [/\bunderscoring\b/gi, 'highlighting'],
  [/\bshowcasing\b/gi, 'showing'], [/\bshowcases\b/gi, 'shows'], [/\bshowcase\b/gi, 'show'],
  [/\butilizes\b/gi, 'uses'], [/\butilizing\b/gi, 'using'], [/\butilize\b/gi, 'use'],
  [/\bleveraging\b/gi, 'using'], [/\ba myriad of\b/gi, 'many'], [/\bmyriad of\b/gi, 'many'],
  [/\ba plethora of\b/gi, 'many'], [/\bplethora of\b/gi, 'many'],
  [/\bseamlessly\b/gi, 'smoothly'], [/\bseamless\b/gi, 'smooth'], [/\bbustling\b/gi, 'busy'],
  [/\bmeticulously\b/gi, 'carefully'], [/\bmeticulous\b/gi, 'careful'],
  [/\bcutting-edge\b/gi, 'advanced'], [/\bstate-of-the-art\b/gi, 'advanced'],
  [/\bgame-?chang(?:er|ing)\b/gi, 'major shift'], [/\bever-(?:evolving|changing)\b/gi, 'changing'],
  [/\bsheds light on\b/gi, 'explains'], [/\bgarnered\b/gi, 'drew'],
  [/\bspearheaded\b/gi, 'led'], [/\bpivotal\b/gi, 'key'],
  [/\bat the forefront of\b/gi, 'leading'], [/\bpaved the way for\b/gi, 'enabled'],
  [/\btreasure trove of\b/gi, 'wealth of'], [/\ba beacon of\b/gi, 'a symbol of'],
];
const LEX_RO: Array<[RegExp, string]> = [
  [/\bjoacă un rol (?:crucial|esențial|cheie|vital|decisiv|central|important) (?:în|pentru)\b/gi, 'este esențial pentru'],
  [/\bo gamă largă de\b/gi, 'multe'], [/\bo gamă variată de\b/gi, 'multe'],
  [/\bo multitudine de\b/gi, 'multe'], [/\bo mulțime de\b/gi, 'multe'],
  [/\bpune în lumină\b/gi, 'arată'], [/\bscoate în evidență\b/gi, 'arată'],
  [/\bsubliniază faptul că\b/gi, 'arată că'], [/\bevidențiază faptul că\b/gi, 'arată că'],
  [/\bîn era digitală\b/gi, 'astăzi'],
];
// EL / AR: no public stemmer ships for these, so we match distinctive multi-word
// calques (the real AI tells) with Unicode letter-boundaries — ASCII \b does not
// form a boundary around Greek/Arabic letters. Replacements are chosen to stay
// grammatical; gendered single-word swaps are deliberately avoided.
// Greek — Greek governs the case of the following word, so each replacement is
// chosen to preserve that government (e.g. "φάσμα"→"ποικιλία", both take the
// genitive) and to be gender-neutral, so the auto-cleaned text stays grammatical.
const LEX_EL: Array<[RegExp, string]> = [
  [/(?<!\p{L})αποτελεί (?:μια )?απόδειξη/giu, 'είναι απόδειξη'],
  [/(?<!\p{L})αποτελεί (?:τρανή )?μαρτυρία/giu, 'είναι μαρτυρία'],
  [/(?<!\p{L})(?:διαδραματίζει|παίζει) (?:καθοριστικό|κρίσιμο|καίριο|ζωτικό|κεντρικό|σημαντικό) ρόλο/giu, 'είναι καθοριστικής σημασίας'],
  [/(?<!\p{L})ένα (?:ευρύ|μεγάλο) φάσμα/giu, 'μεγάλη ποικιλία'],
  [/(?<!\p{L})μια πληθώρα/giu, 'μεγάλη ποικιλία'],
  [/(?<!\p{L})ένα πλήθος/giu, 'μεγάλη ποικιλία'],
  [/(?<!\p{L})μια ευρεία γκάμα/giu, 'μεγάλη ποικιλία'],
  [/(?<!\p{L})στην καρδιά της/giu, 'στο κέντρο της'],
  [/(?<!\p{L})στην καρδιά του/giu, 'στο κέντρο του'],
  [/(?<!\p{L})στον κόσμο της/giu, 'στον χώρο της'],
  [/(?<!\p{L})στον κόσμο του/giu, 'στον χώρο του'],
  [/(?<!\p{L})ρίχνει (?:άπλετο )?φως σε/giu, 'εξηγεί'],
  [/(?<!\p{L})ανοίγει τον δρόμο (?:για|προς)/giu, 'επιτρέπει'],
  [/(?<!\p{L})απρόσκοπτα(?!\p{L})/giu, 'ομαλά'],
  [/(?<!\p{L})στη (?:σύγχρονη|σημερινή|ψηφιακή) εποχή/giu, 'σήμερα'],
  [/(?<!\p{L})σε έναν κόσμο που διαρκώς (?:εξελίσσεται|αλλάζει)/giu, 'σήμερα'],
];
// Arabic — tolerant of an optional leading و (and) and optional tanwīn (ً) on the
// accusative endings; matched undiacritized (how model output usually arrives).
const LEX_AR: Array<[RegExp, string]> = [
  [/(?:و)?تجدر الإشارة إلى أن(?:ه)?/g, ''],
  [/(?:و)?من الجدير بالذكر أن(?:ه)?/g, ''],
  [/(?:و)?يلعب دور[ًا]{1,2}\s+(?:حاسم|محوري|رئيسي|جوهري|حيوي|مركزي)[ًا]{0,2}/g, 'مهم'],
  [/(?:و)?يشكل دليل[ًا]{0,2} على/g, 'يُظهر'],
  [/(?:و)?يسلط الضوء على/g, 'يوضح'],
  [/(?:و)?تسليط الضوء على/g, 'توضيح'],
  [/(?:و)?يمهد الطريق (?:أمام|ل)/g, 'يتيح'],
  [/مجموعة واسعة من/g, 'العديد من'],
  [/طيف واسع من/g, 'العديد من'],
  [/عدد كبير من/g, 'كثير من'],
  [/في قلب/g, 'في وسط'],
  [/بسلاسة(?!\p{L})/gu, 'بسهولة'],
  [/في (?:عصرنا الحالي|عالم اليوم|وقتنا الحالي)/g, 'اليوم'],
  [/مما لا شك فيه/g, 'بالتأكيد'],
  [/لا يمكن إنكار أن/g, 'من الواضح أن'],
];

const FILLERS_EN =
  'Moreover|Furthermore|Additionally|In addition|Notably|Importantly|Crucially|' +
  'Indeed|Ultimately|In conclusion|In summary|To summarize|To sum up|All in all|' +
  'That said|Of course|Needless to say|It goes without saying|' +
  'It’s worth noting that|It is worth noting that|' +
  'It’s important to note that|It is important to note that|At the end of the day';
const FILLERS_RO =
  'Mai mult decât atât|Mai mult|Totodată|În plus|De asemenea|Pe de altă parte|' +
  'Nu în ultimul rând|În esență|Practic|De altfel|În concluzie|În cele din urmă|' +
  'Merită menționat că|Merită subliniat că|Este important de menționat că';
const FILLERS_EL =
  'Επιπλέον|Επιπροσθέτως|Ακόμη|Εξάλλου|Παράλληλα|Αναμφίβολα|Αναμφισβήτητα|Πράγματι|' +
  'Εν κατακλείδι|Συμπερασματικά|Εν ολίγοις|Συνοψίζοντας|Σε γενικές γραμμές|Τελικά|' +
  'Αξίζει να σημειωθεί ότι|Αξίζει να σημειωθεί|Θα πρέπει να (?:τονιστεί|σημειωθεί) ότι|' +
  'Είναι σημαντικό να (?:τονιστεί|σημειωθεί) ότι';
const FILLERS_AR =
  'علاوة على ذلك|وعلاوة على ذلك|بالإضافة إلى ذلك|إضافة إلى ذلك|فضلا عن ذلك|علاوة على ما سبق|' +
  'من ناحية أخرى|في الختام|وفي الختام|وختاما|ختاما|في نهاية المطاف|باختصار|إجمالا|بشكل عام|' +
  'وبطبيعة الحال|وفي هذا السياق|ومن الجدير بالذكر';

// Drop a sentence-initial filler and re-capitalise the next word. Uses Unicode
// letter/mark boundaries (not ASCII \b) so it works for Greek and Arabic too, and
// recognises Arabic sentence punctuation (؟ ،).
function dropFillers(s: string, alternation: string): string {
  const re = new RegExp('(^|[.!?؟]\\s+|\\n+)\\s*(?:' + alternation + ')(?![\\p{L}\\p{M}])[,،:]?\\s+([\\p{L}])', 'gu');
  return s.replace(re, (_m, b, ch) => b + ch.toUpperCase());
}

function lexFor(lang: Lang): Array<[RegExp, string]> {
  return lang === 'ro' ? LEX_RO : lang === 'el' ? LEX_EL : lang === 'ar' ? LEX_AR : LEX_EN;
}
function fillersFor(lang: Lang): string {
  return lang === 'ro' ? FILLERS_RO : lang === 'el' ? FILLERS_EL : lang === 'ar' ? FILLERS_AR : FILLERS_EN;
}

export function scrubLexicon(s: string, lang: Lang): string {
  if (!s) return s;
  let r = s;
  for (const [re, to] of lexFor(lang)) r = r.replace(re, caseRep(to));
  r = dropFillers(r, fillersFor(lang));
  r = r.replace(/[ \t]{2,}/g, ' ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',');
  return r;
}

export function humanizeText(s: string, lang: Lang): string {
  if (!s) return s;
  return scrubLexicon(stripDashes(s), lang).trim();
}

// HTML-preserving humanizer — transforms only text nodes, never tags (from TT).
export function humanizeHtml(html: string, lang: Lang): string {
  if (!html) return html;
  return html.split(/(<[^>]*>)/g).map((seg) => {
    if (!seg || seg[0] === '<') return seg;
    const lead = (seg.match(/^\s*/) || [''])[0];
    const trail = (seg.match(/\s*$/) || [''])[0];
    let core = seg.slice(lead.length, seg.length - trail.length);
    if (!core) return seg;
    if (/[\p{Lu}]{4,}/u.test(core)) core = deShoutTitle(core);
    core = stripDashes(core);
    core = scrubLexicon(core, lang);
    return lead + core + trail;
  }).join('');
}

// ── AI-tell detector (0 clean → 100 very AI) ────────────────────────────────────
export interface AiTell { key: string; label: string; severity: 'high' | 'medium' | 'low'; count: number; sample: string }
export interface AiTellReport { score: number; level: 'clean' | 'low' | 'medium' | 'high'; tells: AiTell[] }
const WEIGHT = { high: 40, medium: 7, low: 3 } as const;

function bodyDefs(lang: Lang): Array<{ key: string; label: string; severity: 'high' | 'medium' | 'low'; re: RegExp }> {
  const common = [
    { key: 'em_dash', label: 'Em/en dash (—, –)', severity: 'medium' as const, re: /[–—]|&mdash;|&ndash;/g },
    { key: 'double_hyphen', label: 'Double hyphen as a dash ( -- )', severity: 'medium' as const, re: /\s--\s/g },
    { key: 'emoji', label: 'Emoji in body text', severity: 'low' as const, re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu },
  ];
  if (lang === 'ro') return [...common,
    { key: 'ro_worth', label: '„Merită menționat"', severity: 'medium', re: /\b(?:merită menționat|este important de (?:menționat|subliniat))\b/gi },
    { key: 'ro_role', label: '„joacă un rol crucial"', severity: 'medium', re: /\bjoacă un rol (?:crucial|esențial|cheie|vital|decisiv|central|important)\b/gi },
    { key: 'ro_conclusion', label: 'Paragraf de concluzie', severity: 'medium', re: /(^|\n)\s*(?:În concluzie|În cele din urmă|Pe scurt)\b/gi }];
  if (lang === 'el') return [...common,
    { key: 'el_worth', label: '«Αξίζει να σημειωθεί / πρέπει να τονιστεί»', severity: 'medium', re: /αξίζει να σημειωθεί|(?:θα )?πρέπει να τονιστεί|είναι σημαντικό να τονιστεί/giu },
    { key: 'el_role', label: '«διαδραματίζει/παίζει κρίσιμο ρόλο»', severity: 'medium', re: /(?:διαδραματίζει|παίζει) (?:καθοριστικό|κρίσιμο|καίριο|ζωτικό|κεντρικό|σημαντικό) ρόλο/giu },
    { key: 'el_range', label: '«ευρύ φάσμα / πληθώρα»', severity: 'low', re: /(?:ευρύ|μεγάλο) φάσμα|πληθώρα|ευρεία γκάμα/giu },
    { key: 'el_not_only', label: 'Δομή «όχι μόνο … αλλά και»', severity: 'medium', re: /όχι μόνο[^.?!]{0,80}αλλά και/giu },
    { key: 'el_conclusion', label: 'Παράγραφος συμπεράσματος', severity: 'medium', re: /(^|\n)\s*(?:Εν κατακλείδι|Συμπερασματικά|Εν ολίγοις|Συνοψίζοντας)/giu },
    { key: 'el_filler', label: 'Συνδετικά «Επιπλέον / Επιπροσθέτως»', severity: 'low', re: /(^|\n|[.!?]\s+)(?:Επιπλέον|Επιπροσθέτως|Παράλληλα)/gu }];
  if (lang === 'ar') return [...common,
    { key: 'ar_worth', label: '«تجدر الإشارة / من الجدير بالذكر»', severity: 'medium', re: /(?:و)?تجدر الإشارة إلى أن|(?:و)?من الجدير بالذكر أن/g },
    { key: 'ar_role', label: '«يلعب دورا حاسما/محوريا»', severity: 'medium', re: /يلعب دور[ًا]{1,2}\s+(?:حاسم|محوري|رئيسي|جوهري|حيوي|مركزي)/g },
    { key: 'ar_range', label: '«مجموعة واسعة / طيف واسع»', severity: 'low', re: /مجموعة واسعة من|طيف واسع من|عدد كبير من/g },
    { key: 'ar_not_only', label: 'بنية «ليس فقط … بل أيضا»', severity: 'medium', re: /ليس فقط[^.?!؟]{0,80}بل أيضا/g },
    { key: 'ar_conclusion', label: 'فقرة ختامية', severity: 'medium', re: /(^|\n)\s*(?:في الختام|وفي الختام|وختاما|في نهاية المطاف|باختصار)/g },
    { key: 'ar_filler', label: 'روابط «علاوة على ذلك / بالإضافة»', severity: 'low', re: /(^|\n|[.!?؟]\s+)(?:علاوة على ذلك|بالإضافة إلى ذلك|فضلا عن ذلك)/g }];
  return [...common,
    { key: 'en_worth', label: '“It’s worth noting / important to note”', severity: 'medium', re: /\bit(?:'|’)?s (?:worth noting|important to note)\b|\bit is (?:worth noting|important to note)\b/gi },
    { key: 'en_lexicon', label: 'AI lexicon (delve, boasts, nestled, tapestry…)', severity: 'medium', re: /\b(?:delve|delving|boasts?|nestled|tapestry|testament to|underscore[sd]?|showcas(?:e|es|ing)|myriad|plethora|seamless(?:ly)?|meticulous(?:ly)?|cutting-edge|state-of-the-art)\b/gi },
    { key: 'en_role', label: '“plays a crucial role”', severity: 'medium', re: /\bplays? an? (?:crucial|vital|key|pivotal|central|important|significant) role\b/gi },
    { key: 'en_not_only', label: '“not only … but also”', severity: 'medium', re: /\bnot only\b[^.?!]{0,80}\bbut also\b/gi },
    { key: 'en_conclusion', label: 'Summary paragraph', severity: 'medium', re: /(^|\n)\s*(?:In conclusion|In summary|To sum up|All in all|Ultimately)\b/gi }];
}

function sampleAround(text: string, re: RegExp): string {
  const m = re.exec(text);
  if (!m) return '';
  const i = Math.max(0, m.index - 24);
  const j = Math.min(text.length, m.index + m[0].length + 24);
  return (i > 0 ? '…' : '') + text.slice(i, j).replace(/\s+/g, ' ').trim() + (j < text.length ? '…' : '');
}

export function scoreAiTells(input: { title?: string; content?: string; lang?: Lang }): AiTellReport {
  const lang: Lang = (['en', 'el', 'ro', 'ar'] as string[]).includes(input.lang as string) ? (input.lang as Lang) : 'en';
  const title = (input.title || '').trim();
  const content = (input.content || '').trim();
  const tells: AiTell[] = [];
  let score = 0;
  if (title) {
    const words = title.match(/[\p{L}][\p{L}\p{M}'''\-]*/gu) || [];
    const shouted = words.filter((w) => isAllCaps(w) && !KEEP_UPPER.has(w.replace(/[.\-']/g, '').toUpperCase()));
    if (shouted.length >= 1) {
      const whole = words.length > 0 && shouted.length >= Math.max(2, Math.ceil(words.length * 0.6));
      tells.push({ key: 'title_caps', label: whole ? 'ALL-CAPS title' : 'Shouted word(s) in the title', severity: whole ? 'high' : 'medium', count: shouted.length, sample: shouted.slice(0, 4).join(', ') });
      score += whole ? WEIGHT.high : WEIGHT.medium * Math.min(shouted.length, 3);
    }
  }
  if (content) {
    for (const def of bodyDefs(lang)) {
      const re = new RegExp(def.re.source, def.re.flags);
      const matches = content.match(re);
      const count = matches ? matches.length : 0;
      if (count > 0) {
        tells.push({ key: def.key, label: def.label, severity: def.severity, count, sample: sampleAround(content, new RegExp(def.re.source, def.re.flags)) });
        score += WEIGHT[def.severity] * Math.min(count, 5) * (count > 1 ? 0.7 : 1);
      }
    }
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: AiTellReport['level'] = score === 0 ? 'clean' : score <= 15 ? 'low' : score <= 40 ? 'medium' : 'high';
  tells.sort((a, b) => WEIGHT[b.severity] - WEIGHT[a.severity] || b.count - a.count);
  return { score, level, tells };
}
