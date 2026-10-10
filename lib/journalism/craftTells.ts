// lib/journalism/craftTells.ts — the craft rules that used to live only in a prompt, as detectors, in all seven languages.
// Pure (imports ./rhythm and ./phrases only), so the app's voice engine and the edge function run the SAME checks.
//
// Each detector exists because the audit of October 2026 showed that the rule was written into a prompt but nothing checked it:
//   rhythm        spread of sentence lengths (SD), a stretch of near-equal sentences, a short-long-short metronome, too few short/long sentences
//   paragraphs    consecutive paragraphs opening with the same word, no short or no long paragraph in a long piece
//   speech verbs  the same verb of speech back to back or all the way through; ornamental verbs ("stressed", "betonte", "подчеркнул")
//   nominal style "made the decision to" instead of "decided" (light-verb constructions)
//   lead          an opening sentence that starts with a date, or runs past 35 words
//   first person  "I / we / our readers" in a news text (outside quotations)
//   vague words   many / several / various … without a number or a name
//   gerund tails  Romanian ", subliniind …" (the English-style participial tail)
//   specificity   paragraphs that carry no name, figure or quotation
// The thresholds are deliberately tolerant: every detector here is "low" or "medium" and none is "high". They are tests for the
// finished text and the reason an editor is asked to look again; they are never quotas in the writer's prompt.
import { splitSentences, wordCount, rhythmOfParagraphs, paragraphsOf, SHORT_BELOW, LONG_ABOVE, type RLang } from './rhythm';
import { foldFor } from './phrases';

export interface CraftTell { key: string; label: string; severity: 'high' | 'medium' | 'low'; count: number; sample: string }
export interface CraftInput {
  /** Plain paragraphs of the body (no headings, no list items). */
  paragraphs: string[];
  lang: RLang;
  /** Commentary, opinion and interviews may use "I"; everything else is our own reporting and may not. */
  allowFirstPerson?: boolean;
  /** Event listings: the date often IS the news, so opening with it is only a small remark there. */
  dateLeadLow?: boolean;
}

const NOTL = String.raw`\p{L}\p{M}\p{N}`;
function rx(lang: RLang, alts: string, flags = 'giu'): RegExp {
  const a = foldFor(lang, alts);
  return lang === 'ar'
    ? new RegExp(String.raw`(?<![${NOTL}])[وفبلك]{0,2}(?:ال)?(?:${a})(?![${NOTL}])`, flags)
    : new RegExp(String.raw`(?<![${NOTL}])(?:${a})(?![${NOTL}])`, flags);
}
const count = (re: RegExp, s: string) => (s.match(new RegExp(re.source, re.flags)) || []).length;
const first = (re: RegExp, s: string) => { const m = new RegExp(re.source, re.flags.replace('g', '')).exec(s); return m ? m[0] : ''; };
const clip = (s: string, n = 80) => s.replace(/\s+/g, ' ').trim().slice(0, n);

// ── data: speech verbs ──────────────────────────────────────────────────────────
// Every verb of speech we expect in reporting, so repetition can be measured; and the ornamental ones the house style bans
// ("never the ornamental stressed / emphasised / highlighted / noted").
const SPEECH: Record<RLang, string> = {
  en: String.raw`said|says|told|tells|added|explained|announced|confirmed|warned|stated|noted|stressed|emphasi[sz]ed|highlighted|underscored|argued|insisted|claimed|replied|answered|commented|remarked|observed|pointed out|declared|asserted|acknowledged|admitted|conceded|suggested`,
  de: String.raw`sagte|sagten|sagt|erklärte|erklärten|erklärt|teilte mit|teilten mit|bestätigte|bestätigten|kündigte an|kündigten an|ergänzte|fügte hinzu|fügten hinzu|warnte|warnten|betonte|betonten|hob hervor|hoben hervor|unterstrich|meinte|erwiderte|antwortete|merkte an|verwies darauf|wies darauf hin`,
  pl: String.raw`powiedział\p{L}*|powiedzieli|oświadczył\p{L}*|przekazał\p{L}*|potwierdził\p{L}*|zapowiedział\p{L}*|dodał\p{L}*|wyjaśnił\p{L}*|ostrzegł\p{L}*|podkreślił\p{L}*|zaznaczył\p{L}*|stwierdził\p{L}*|zauważył\p{L}*|odpowiedział\p{L}*|mówi|mówił\p{L}*|zwrócił\p{L}* uwagę`,
  ro: String.raw`a spus|au spus|spune|a declarat|au declarat|a transmis|au transmis|a precizat|au precizat|a adăugat|a explicat|a anunțat|a confirmat|a avertizat|a subliniat|au subliniat|a evidențiat|au evidențiat|a accentuat|a punctat|a menționat|a notat|a afirmat|a răspuns|a comentat|a remarcat`,
  ru: String.raw`сказал\p{L}*|заявил\p{L}*|подтвердил\p{L}*|объявил\p{L}*|добавил\p{L}*|пояснил\p{L}*|объяснил\p{L}*|предупредил\p{L}*|подчеркнул\p{L}*|отметил\p{L}*|указал\p{L}*|ответил\p{L}*|рассказал\p{L}*|сообщил\p{L}*|заметил\p{L}*|акцентировал\p{L}*|обратил\p{L}* внимание`,
  el: String.raw`είπε|είπαν|δήλωσε|δήλωσαν|ανέφερε|ανέφεραν|επιβεβαίωσε|ανακοίνωσε|πρόσθεσε|εξήγησε|προειδοποίησε|τόνισε|υπογράμμισε|επισήμανε|σημείωσε|διευκρίνισε|απάντησε|έδωσε έμφαση`,
  ar: String.raw`قال|قالت|قالوا|صرح|صرحت|أوضح|أوضحت|أضاف|أضافت|أكد|أكدت|شدد|شددت|أشار|أشارت|أعلن|أعلنت|حذر|حذرت|ذكر|ذكرت|نوه|لفت الانتباه`,
};
const ORNAMENT: Record<RLang, string> = {
  en: String.raw`stressed|emphasi[sz]ed|highlighted|underscored|underlined|pointed out|drew attention to|noted(?=\s+that\b|[,:])`,
  de: String.raw`betonte|betonten|hob hervor|hoben hervor|unterstrich|unterstrichen|machte deutlich|stellte heraus|verwies darauf|wies darauf hin|merkte an`,
  pl: String.raw`podkreśli\p{L}*|zaznaczy\p{L}*|zwrócił\p{L}* uwagę|uwypukli\p{L}*|zakcentowa\p{L}*`,
  ro: String.raw`a subliniat|au subliniat|a evidențiat|au evidențiat|a accentuat|a punctat|a remarcat|a scos în evidență`,
  ru: String.raw`подчеркнул\p{L}*|акцентировал\p{L}*|обратил\p{L}* внимание`,
  el: String.raw`τόνισε|υπογράμμισε|επισήμανε|σημείωσε|έδωσε έμφαση`,
  ar: String.raw`أكد|أكدت|شدد|شددت|نوه|لفت الانتباه`,
};
/** Stem for "is it the same verb": English said/says/told → "say"; otherwise the last word, first five letters (three for Greek and Arabic). */
function verbStem(lang: RLang, v: string): string {
  const w = foldFor(lang, v.toLowerCase().trim());
  if (lang === 'en' && /^(said|says|say|told|tells|tell)$/.test(w)) return 'say';
  const last = w.split(/\s+/).pop() || w;
  return last.slice(0, lang === 'el' || lang === 'ar' ? 3 : 5);
}

// ── data: light-verb constructions instead of a live verb ───────────────────────
const NOMINAL: Record<RLang, string> = {
  en: String.raw`(?:made|make|makes|making|took|take|takes|reached|reach) (?:a|the) (?:decision|choice|determination|assessment|announcement) (?:to|of|on)|(?:gave|give|gives|giving|provided|provides) (?:an|the|a) (?:explanation|answer|response|indication|overview)|(?:carried|carry|carries|carrying) out (?:an?|the) (?:examination|investigation|analysis|review|inspection|assessment)|(?:conducted|conducts|conducting) (?:an?|the) (?:review|analysis|examination|investigation|assessment)|(?:was|were|is|are|been|being) able to|(?:has|have|had) the (?:ability|capacity) to`,
  de: String.raw`traf(?:en)? (?:die|eine|diese) Entscheidung|trifft (?:die|eine) Entscheidung|führte(?:n)? (?:die|eine) (?:Prüfung|Untersuchung|Analyse|Kontrolle|Überprüfung)(?: \p{L}+){0,6} durch|gab(?:en)? (?:die|eine) (?:Erklärung|Stellungnahme|Auskunft)(?: \p{L}+){0,6} ab|nahm(?:en)? (?:die|eine) (?:Prüfung|Bewertung|Untersuchung)(?: \p{L}+){0,6} vor|war(?:en)? in der Lage,? zu`,
  pl: String.raw`podj(?:ął|ęła|ęli|ęło|ęły) decyzj\p{L}*|dokona(?:ł|ła|li|ło) (?:kontroli|analizy|oceny|przeglądu|weryfikacji)|złoży(?:ł|ła|li) (?:wyjaśnienia|oświadczenie)|był(?:a|o|i)? w stanie|udzieli(?:ł|ła|li) (?:odpowiedzi|wyjaśnień)`,
  ro: String.raw`a luat decizia|au luat decizia|a efectuat o (?:verificare|analiză|control|evaluare)|au efectuat o (?:verificare|analiză|control|evaluare)|a dat o explicație|a fost în măsură să|au fost în măsură să|a procedat la`,
  ru: String.raw`принял\p{L}* решение|провёл\p{L}* проверку|провел\p{L}* проверку|дал\p{L}* объяснение|осуществил\p{L}* (?:проверку|анализ|контроль)|произвёл\p{L}*|смог\p{L}* осуществить|был\p{L}* в состоянии`,
  el: String.raw`πήρε την απόφαση|πήραν την απόφαση|πραγματοποίησε έλεγχο|πραγματοποίησαν έλεγχο|έδωσε εξήγηση|προέβη σε|προέβησαν σε|ήταν σε θέση να|κατέστη δυνατόν`,
  ar: String.raw`(?:اتخذ|أجرى|أجرت|قدم|أصدر)(?:ت|وا)?(?: \p{L}+){0,3} (?:قرار|فحص|شرح|تقييم|تحليل|بيان)[اً]?|قام(?:ت|وا)? ب(?:ال)?\p{L}+|كان قادر[اً]? على|تمكن من`,
};

// ── data: dates, first person, vague words, Romanian gerund tails ───────────────
const MONTHS: Record<RLang, string> = {
  en: String.raw`january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec`,
  de: String.raw`januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember`,
  pl: String.raw`stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia|styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień`,
  ro: String.raw`ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie`,
  ru: String.raw`января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|январь|февраль|март|апрель|май|июнь|июль|август|сентябрь|октябрь|ноябрь|декабрь`,
  el: String.raw`ιανουαρίου|φεβρουαρίου|μαρτίου|απριλίου|μαΐου|μαΐ|ιουνίου|ιουλίου|αυγούστου|σεπτεμβρίου|οκτωβρίου|νοεμβρίου|δεκεμβρίου|ιανουάριος|φεβρουάριος|μάρτιος|απρίλιος|μάιος|ιούνιος|ιούλιος|αύγουστος|σεπτέμβριος|οκτώβριος|νοέμβριος|δεκέμβριος`,
  ar: String.raw`يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|كانون الثاني|شباط|آذار|نيسان|أيار|حزيران|تموز|آب|أيلول|تشرين الأول|تشرين الثاني|كانون الأول`,
};
const DAYS: Record<RLang, string> = {
  en: String.raw`monday|tuesday|wednesday|thursday|friday|saturday|sunday`,
  de: String.raw`montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag`,
  pl: String.raw`poniedziałek|wtorek|środa|środę|czwartek|piątek|sobota|sobotę|niedziela|niedzielę`,
  ro: String.raw`luni|marți|miercuri|joi|vineri|sâmbătă|duminică`,
  ru: String.raw`понедельник|вторник|среда|среду|четверг|пятница|пятницу|суббота|субботу|воскресенье`,
  el: String.raw`δευτέρα|τρίτη|τετάρτη|πέμπτη|παρασκευή|σάββατο|κυριακή`,
  ar: String.raw`الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد`,
};
const PREP: Record<RLang, string> = {
  en: String.raw`on|in|since|by|from|as of|at|until|during`,
  de: String.raw`am|im|seit|bis|ab|vom|zum|im Laufe|ende|anfang|mitte`,
  pl: String.raw`w|od|do|na|z|we|po|przed`,
  ro: String.raw`pe|în|din|de la|până la|la|după`,
  ru: String.raw`в|с|на|до|во|от|к|по`,
  el: String.raw`στις|στον|στην|τον|την|από|μέχρι|σε|το|η|ο|οι`,
  ar: String.raw`في|منذ|حتى|بحلول|يوم|خلال|بتاريخ|عام`,
};
/**
 * A first sentence that opens with a day, a date, or "in <year>" (the house rule: open with the news, not the date).
 * A bare four-digit number is not a year here ("1500 homes were sold").
 */
function dateLeadRe(lang: RLang): RegExp {
  const m = MONTHS[lang]; const d = DAYS[lang]; const p = PREP[lang];
  const dated = String.raw`(?:(?:${d})[\s,]*)?(?:\d{1,2}(?:st|nd|rd|th|\.|º)?\s*(?:of\s+|de\s+)?(?:${m})(?:\s+\d{4})?|(?:${m})\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|(?:${m})\s+\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})`;
  const re = String.raw`^\s*["“„«'‘(]*\s*(?:(?:${p})\s+)?(?:the\s+)?(?:${dated}|(?:${d})|(?:${p})\s+\d{4}\b)`;
  return new RegExp(foldFor(lang, re), 'iu');
}

// First person outside quotations. "uns/ne/nas" are included; ambiguous short words (Romanian "noi" = we OR new) are left out.
const FIRST_PERSON: Record<RLang, string> = {
  en: String.raw`I|I['’](?:m|ve|d|ll)|[Mm]y|[Mm]ine|[Mm]yself|[Ww]e|[Ww]e['’](?:re|ve|ll|d)|[Oo]urs?|[Oo]urselves`,
  de: String.raw`ich|mir|mich|mein(?:e|en|er|em|es)?|wir|uns|unser(?:e|en|er|em|es)?`,
  pl: String.raw`ja|mnie|mi|mój|moja|moje|moją|moim|moich|moimi|mojego|mojej|mojemu|my|nas|nam|nami|nasi|nasz(?:a|e|ą|ych|ym|ymi|ego|ej|emu)?`,
  ro: String.raw`eu|mie|mă|meu|mea|mei|mele|ne|nostru|noastră|noștri|noastre`,
  ru: String.raw`я|меня|мне|мной|мой|моя|мои|моё|моего|моей|моему|моим|моих|моими|мы|нас|нам|нами|наш(?:а|е|и|у|его|ей|их|ем|им|ему|ими)?`,
  el: String.raw`εγώ|εμένα|μου|μας|εμείς|εμάς|δικός μας|δική μας`,
  ar: String.raw`أنا|نحن|لدينا|عندنا|قراؤنا|قرّاؤنا|بنا|لنا`,
};
const VAGUE: Record<RLang, string> = {
  en: String.raw`many|several|various|numerous|a number of|a variety of|a range of|a host of|multiple|countless|a lot of|plenty of|some of the`,
  de: String.raw`viele|mehrere|verschiedene|zahlreiche|diverse|unzählige|eine Reihe von|eine Vielzahl|eine Vielzahl von|etliche`,
  pl: String.raw`wiel[eu]\p{L}*|kilk\p{L}*|różn\p{L}*|liczn\p{L}*|szereg|mnóstwo|sporo`,
  ro: String.raw`mul[țt]i|multe|mulți|câțiva|câteva|diver[sș]\p{L}*|numeroas\p{L}*|numero[șs]\p{L}*|o serie de|o varietate de`,
  ru: String.raw`многие|многих|многим|несколько|различн\p{L}*|многочисленн\p{L}*|ряд|множество|разные|разных|целый ряд`,
  el: String.raw`πολλοί|πολλών|πολλές|πολλά|αρκετοί|αρκετές|αρκετά|διάφορες|διάφοροι|διάφορα|πληθώρα|σειρά`,
  ar: String.raw`كثير|كثيرون|الكثير|عدة|متعددة|عديدة|مختلفة|مجموعة من|عدد من|العديد من`,
};
const GERUND_RO = String.raw`,\s+(?:subliniind|evidențiind|reflectând|demonstrând|marcând|confirmând|arătând|ilustrând|consolidând|asigurând|reprezentând|indicând|sugerând|semnalând|dovedind|accentuând|contribuind|punând în evidență|oferind|permițând)`;

const QUOTES = /[“„«"]([^”“»"\n]{1,400})[”“»"]/gu;
const stripQuotes = (s: string) => s.replace(QUOTES, ' ');

const T = (key: string, label: string, severity: CraftTell['severity'], n: number, sample = ''): CraftTell => ({ key, label, severity, count: n, sample: clip(sample) });

/** Run every craft detector over the body paragraphs. Returns the tells that fired, strongest first. */
export function craftTells(input: CraftInput): CraftTell[] {
  const lang = input.lang;
  const paras = input.paragraphs.map((p) => String(p || '').replace(/\s+/g, ' ').trim()).filter((p) => wordCount(p) >= 4);
  const text = paras.join(' ');
  const words = wordCount(text);
  const out: CraftTell[] = [];
  if (words < 40 || !paras.length) return out;

  // ── rhythm ──────────────────────────────────────────────────────────────────
  const R = rhythmOfParagraphs(paras, lang);
  if (words >= 250 && R.n >= 10 && R.cv >= 0.35 && R.sd < 7) out.push(T('c_rhythm_sd', `Sentence lengths vary too little: standard deviation ${R.sd.toFixed(1)} words (the target is 7 or more)`, 'low', 1, `mean ${R.mean.toFixed(1)}, SD ${R.sd.toFixed(1)}`));
  if (R.n >= 8 && R.flatRun >= 7) out.push(T('c_flat_run', `A stretch of ${R.flatRun} sentences of almost equal length (neighbours within 5 words)`, 'low', 1, `${R.flatRun} sentences in a row`));
  if (R.pulse) out.push(T('c_pulse', 'Sentence lengths alternate like a metronome (short, long, short, long): the regular pulse is itself a machine signature', 'low', 1, `alternation ${(R.alternation * 100).toFixed(0)}%`));
  if (words >= 300 && R.n >= 14 && (R.short < 2 || R.long < 2)) {
    out.push(T('c_tails', `Too few ${R.short < 2 ? `short sentences (${R.short} under ${SHORT_BELOW[lang]} words)` : `long sentences (${R.long} over ${LONG_ABOVE[lang]} words)`}: a piece of this length needs both`, 'low', 1, `${R.short} short, ${R.long} long`));
  }

  // ── paragraphs ──────────────────────────────────────────────────────────────
  const P = paragraphsOf(paras, lang);
  if (P.consecutiveSame.length) out.push(T('c_para_opener', `Consecutive paragraphs open with the same word (“${P.consecutiveSame[0].word}”)`, P.consecutiveSame.length >= 3 ? 'medium' : 'low', P.consecutiveSame.length, P.consecutiveSame[0].word));
  if (P.overused) out.push(T('c_para_opener_many', `${P.overused.count} paragraphs open with “${P.overused.word}”`, 'low', P.overused.count, P.overused.word));
  if (words >= 400 && P.count >= 6 && (P.shortParas === 0 || P.longParas === 0)) {
    out.push(T('c_para_variety', `Paragraphs are all of one size: no ${P.shortParas === 0 ? 'short paragraph (1-2 sentences)' : 'long paragraph (5 or more sentences)'} in a piece of ${words} words`, 'low', 1, `sentences per paragraph: ${P.sentencesPer.slice(0, 16).join('·')}${P.sentencesPer.length > 16 ? '…' : ''}`));
  }

  // ── speech verbs ────────────────────────────────────────────────────────────
  const sentences = paras.flatMap((p) => splitSentences(p, lang));
  const speechRe = rx(lang, SPEECH[lang]);
  const att: { i: number; stem: string; verb: string }[] = [];
  sentences.forEach((s, i) => { const v = first(speechRe, foldFor(lang, stripQuotes(s))); if (v) att.push({ i, stem: verbStem(lang, v), verb: v }); });
  let backToBack = 0; let backVerb = '';
  for (let k = 1; k < att.length; k++) if (att[k].stem === att[k - 1].stem && att[k].i - att[k - 1].i <= 3) { backToBack++; backVerb = att[k].verb; }
  if (backToBack >= 1) out.push(T('c_speech_repeat', `The same verb of speech back to back (“${backVerb}” ×${backToBack + 1}): rotate the attribution`, backToBack >= 3 ? 'medium' : 'low', backToBack, backVerb));
  else if (att.length >= 4) {
    const top = new Map<string, number>(); for (const a of att) top.set(a.stem, (top.get(a.stem) || 0) + 1);
    const [stem, n] = [...top.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n / att.length >= 0.8) out.push(T('c_speech_mono', `One verb of speech does all the attributions (${n} of ${att.length})`, 'low', n, att.find((a) => a.stem === stem)?.verb || ''));
  }
  const ornRe = rx(lang, ORNAMENT[lang]);
  const orn = count(ornRe, foldFor(lang, stripQuotes(text)));
  if (orn >= 1) out.push(T('c_speech_ornament', `Ornamental verb of speech (“${first(ornRe, foldFor(lang, stripQuotes(text)))}”): use the plain verb`, orn >= 3 ? 'medium' : 'low', orn, first(ornRe, foldFor(lang, stripQuotes(text)))));

  // ── nominal style ───────────────────────────────────────────────────────────
  const nomRe = rx(lang, NOMINAL[lang]);
  const nom = count(nomRe, foldFor(lang, stripQuotes(text)));
  if (nom >= 2) out.push(T('c_nominal', `Verb + noun instead of a live verb (“${first(nomRe, foldFor(lang, stripQuotes(text)))}”): “decided”, not “made the decision to”`, nom >= 4 ? 'medium' : 'low', nom, first(nomRe, foldFor(lang, stripQuotes(text)))));

  // ── lead ────────────────────────────────────────────────────────────────────
  const lead = sentences[0] || '';
  if (lead) {
    const dRe = dateLeadRe(lang);
    if (dRe.test(foldFor(lang, lead.slice(0, 90)))) out.push(T('c_date_lead', 'The piece opens with a date: open with the news', input.dateLeadLow ? 'low' : 'medium', 1, lead.slice(0, 60)));
    const lw = wordCount(lead);
    if (lw > 35) out.push(T('c_lead_long', `The opening sentence has ${lw} words (the house maximum is 35)`, lw > 50 ? 'medium' : 'low', 1, lead.slice(0, 60)));
  }

  // ── first person in our own reporting ───────────────────────────────────────
  if (!input.allowFirstPerson) {
    const fpRe = rx(lang, FIRST_PERSON[lang], lang === 'en' ? 'gu' : 'giu');
    const fpText = stripQuotes(text);
    const fp = count(fpRe, lang === 'en' ? fpText : foldFor(lang, fpText));
    if (fp >= 1) out.push(T('c_first_person', `First person in a news text (“${first(fpRe, lang === 'en' ? fpText : foldFor(lang, fpText))}”): the magazine reports, it does not speak as “I” or “we”`, 'medium', fp, first(fpRe, lang === 'en' ? fpText : foldFor(lang, fpText))));
  }

  // ── vague quantities ────────────────────────────────────────────────────────
  const vRe = rx(lang, VAGUE[lang]);
  const vague = count(vRe, foldFor(lang, stripQuotes(text)));
  if (vague >= 3 && (vague / words) * 100 >= 0.8) out.push(T('c_vague', `Vague quantity words (“${first(vRe, foldFor(lang, stripQuotes(text)))}” …) ×${vague}: give the number or the name`, vague >= 6 ? 'medium' : 'low', vague, first(vRe, foldFor(lang, stripQuotes(text)))));

  // ── Romanian gerund tails ───────────────────────────────────────────────────
  if (lang === 'ro') {
    const gre = new RegExp(foldFor(lang, GERUND_RO), 'giu');
    const n = count(gre, foldFor(lang, text));
    if (n >= 2) out.push(T('c_ro_gerund', `Trailing gerund clauses (“, subliniind …”) ×${n}: write a second sentence with its own subject and verb`, n >= 4 ? 'medium' : 'low', n, first(gre, foldFor(lang, text))));
  }

  // ── specificity: every paragraph should carry a name, a figure or a quotation ─
  if (lang !== 'de' && P.count >= 5) {
    const hasQuote = (p: string) => /[“„«"][^”“»"\n]{3,}[”“»"]/u.test(p);
    // A name is a capitalised word that is not the first word of its sentence (Arabic has no case: a Latin-script word stands in).
    const hasName = (p: string) => splitSentences(p, lang).some((sn) => (lang === 'ar' ? /[A-Za-z]{2,}/ : /\p{Lu}[\p{Ll}\p{M}]{2,}/u).test(sn.replace(/^\s*\S+\s*/, ' ')));
    const bare = paras.filter((p) => wordCount(p) >= 25 && !/\p{N}/u.test(p) && !hasQuote(p) && !hasName(p));
    if (bare.length / paras.length >= 0.5) out.push(T('c_specificity', `${bare.length} of ${paras.length} paragraphs carry no name, figure or quotation`, 'low', bare.length, bare[0]));
  }
  return out;
}
