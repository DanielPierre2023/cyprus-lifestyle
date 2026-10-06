// Per-language AI-tell detectors (lib/antiAiLang.ts, wired through scoreAiTells) and the
// prompt constraints built from the same vocabulary. Pure: no network, no DB, no model.
// Fixtures: scripts/tests/fixtures/antiAi-langs.ts. NATIVE REVIEW: the word lists for
// de/el/pl/ro/ru/ar are not native-edited; these tests pin behaviour, not linguistic truth.
import { scoreAiTells, type Lang } from '@/lib/antiAi';
import {
  extraTellDefs, structuralTells, langProfile, langFromName, promptTellList, nativeRegisterRules,
  normalizeArabic, promptTells, LANG_LIST,
} from '@/lib/antiAiLang';
import { antiAiRules, lintAiTells, transcreateSystem } from '@/lib/editorial/craft';
import { translatePrompt } from '@/lib/editorial/pipeline';
import { scanPosts, stripHtml } from '@/lib/editorial/qualityScan';
import { FIXTURES, HUMAN_EDGE } from './fixtures/antiAi-langs';
import { eq, ok, report } from './_harness';

const has = (r: ReturnType<typeof scoreAiTells>, key: string): boolean => r.tells.some((t) => t.key === key);
const score = (content: string, lang: Lang) => scoreAiTells({ content, lang });

// ── 1. fixtures: AI-sounding vs human-sounding must separate in every language ─────
for (const lang of LANG_LIST) {
  const f = FIXTURES[lang];
  const ai = f.ai.map((t) => score(t, lang));
  const human = f.human.map((t) => score(t, lang));
  ok(`${lang}: both AI paragraphs read medium or high`, ai.every((r) => r.level === 'medium' || r.level === 'high'));
  ok(`${lang}: both AI paragraphs score >= 30`, ai.every((r) => r.score >= 30));
  ok(`${lang}: both human paragraphs read clean or low`, human.every((r) => r.level === 'clean' || r.level === 'low'));
  ok(`${lang}: edge case (one connective + one hype word) stays <= 15`, score(HUMAN_EDGE[lang], lang).score <= 15);
  ok(`${lang}: weakest AI beats strongest human by 25+ points`, Math.min(...ai.map((r) => r.score)) - Math.max(...human.map((r) => r.score)) >= 25);
  ok(`${lang}: AI fixtures trip at least three distinct detectors`, ai.every((r) => r.tells.length >= 3));
}

// The new layer is what makes the difference: each AI fixture must trip a NEW key
// (brochure / engage / underscore / not_just / closing / hype / leak …), not just the old ones.
for (const lang of LANG_LIST) {
  const newKeys = new Set(extraTellDefs(lang).map((d) => d.key));
  ok(`${lang}: AI fixtures trip at least one new per-language detector`, FIXTURES[lang].ai.every((t) => score(t, lang).tells.some((x) => newKeys.has(x.key))));
}

// ── 2. each new lexical detector fires on its own typical sentence ──────────────────
const SINGLE: Array<[Lang, string, string]> = [
  ['en', 'en_brochure', 'A hidden gem at the end of the road.'],
  ['en', 'en_engage', 'Whether you are a diver or a hiker, the coast is yours.'],
  ['en', 'en_contrast', 'The bakery isn’t just a shop, it’s a village institution.'],
  ['en', 'en_closer', 'Only time will tell whether the harbour recovers.'],
  ['en', 'en_leak', 'Certainly! Here is the translation you asked for.'],
  ['de', 'de_brochure', 'Das Dorf ist ein Fest für die Sinne.'],
  ['de', 'de_engage', 'Entdecken Sie die Küste von Paphos.'],
  ['de', 'de_underscore', 'Der Bericht unterstreicht die Lage der Insel.'],
  ['de', 'de_not_just', 'Das Café ist mehr als nur ein Treffpunkt.'],
  ['de', 'de_leak', 'Natürlich! Hier ist die deutsche Übersetzung.'],
  ['de', 'de_closing', 'Das Dorf ist klein.\n\nFazit: Es lohnt sich.'],
  ['el', 'el_brochure', 'Το χωριό είναι μια πανδαισία χρωμάτων.'],
  ['el', 'el_engage', 'Είτε είστε φίλοι της θάλασσας είτε του βουνού, θα βρείτε κάτι.'],
  ['el', 'el_underscore', 'Η μελέτη υπογραμμίζει την ανάγκη αλλαγής.'],
  ['el', 'el_not_just', 'Δεν είναι απλώς ένα καφενείο, είναι ένας θεσμός.'],
  ['el', 'el_leak', 'Φυσικά! Ορίστε η μετάφραση του άρθρου.'],
  ['pl', 'pl_brochure', 'To prawdziwa uczta dla zmysłów.'],
  ['pl', 'pl_engage', 'Odkryj wybrzeże Pafos.'],
  ['pl', 'pl_underscore', 'Raport podkreśla znaczenie portu.'],
  ['pl', 'pl_not_just', 'To coś więcej niż piekarnia.'],
  ['pl', 'pl_leak', 'Oczywiście! Oto przetłumaczony tekst.'],
  ['ro', 'ro_brochure', 'Satul este un festin pentru simțuri.'],
  ['ro', 'ro_engage', 'Descoperă coasta de la Paphos.'],
  ['ro', 'ro_underscore', 'Raportul subliniază importanța portului.'],
  ['ro', 'ro_not_only', 'Brutăria nu este doar un magazin, ci și o instituție.'],
  ['ro', 'ro_leak', 'Desigur! Iată traducerea articolului.'],
  ['ru', 'ru_brochure', 'Деревня это праздник для глаз.'],
  ['ru', 'ru_engage', 'Откройте для себя побережье Пафоса.'],
  ['ru', 'ru_underscore', 'Доклад подчёркивает важность порта.'],
  ['ru', 'ru_not_just', 'Это не просто пекарня, а настоящий институт.'],
  ['ru', 'ru_leak', 'Конечно! Вот перевод статьи.'],
  ['ar', 'ar_brochure', 'القرية جوهرة مخفية على الساحل.'],
  ['ar', 'ar_engage', 'سواء كنت تحب البحر أو الجبل، ستجد ما يناسبك.'],
  ['ar', 'ar_underscore', 'التقرير يؤكد أهمية الميناء.'],
  ['ar', 'ar_not_just', 'المخبز ليس مجرد متجر بل مؤسسة في القرية.'],
  ['ar', 'ar_leak', 'بالتأكيد! إليك الترجمة المطلوبة.'],
];
for (const [lang, key, text] of SINGLE) ok(`${key} fires on its typical sentence`, has(score(text, lang), key));

// Leakage is the one 'high' severity class: it must outrank the other tells on its own.
for (const [lang, key, text] of SINGLE.filter(([, k]) => k.endsWith('_leak'))) {
  const r = score(text, lang);
  ok(`${key} is severity high`, r.tells.find((t) => t.key === key)?.severity === 'high');
}

// ── 3. density-gated detectors stay quiet below their threshold ─────────────────────
ok('hype adjectives: one use is fine', !has(score('The stunning view from the ridge is worth the climb on a clear day in March.', 'en'), 'en_hype'));
ok('hype adjectives: two uses flag', has(score('A vibrant square, a stunning church and long evenings on the terrace.', 'en'), 'en_hype'));
ok('el copula: two uses are fine', !has(score('Το μνημείο αποτελεί σύμβολο. Η πύλη αποτελεί είσοδο.', 'el'), 'el_copula'));
ok('el copula: three uses flag', has(score('Το μνημείο αποτελεί σύμβολο. Η πύλη αποτελεί είσοδο. Ο πύργος αποτελεί φάρο.', 'el'), 'el_copula'));
ok('ru chancellery: needs four hits', !has(score('Данный проект является новым. Он идёт в рамках плана.', 'ru'), 'ru_chancellery'));
ok('ru chancellery: four hits flag', has(score('Данный проект является новым. Он осуществляется в рамках плана, и данный план является общим.', 'ru'), 'ru_chancellery'));

// ── 4. normalisation: accents, diacritics, cedilla and yo ───────────────────────────
ok('el: matches without tonos (upper-case titles)', has(score('ΕΙΤΕ ΕΙΣΤΕ ΝΑΥΤΙΚΟΣ ΕΙΤΕ ΕΠΙΣΚΕΠΤΗΣ, ΘΑ ΒΡΕΙΤΕ ΚΑΤΙ.', 'el'), 'el_engage'));
ok('ar: matches through diacritics and alef variants', has(score('سَوَاءٌ كُنْتَ بَحَّارًا أَوْ زَائِرًا، سَتَجِدُ مَا يُنَاسِبُكَ.', 'ar'), 'ar_engage'));
eq('ar: normalizer folds hamza forms', normalizeArabic('أَوْ إِلَى آمِن'), 'او الي امن');
ok('ro: cedilla spelling still matches', has(score('Satul este un festin pentru simţuri.', 'ro'), 'ro_brochure'));
ok('ru: ё and е are the same', has(score('Доклад подчеркивает важность порта.', 'ru'), 'ru_underscore') && has(score('Доклад подчёркивает важность порта.', 'ru'), 'ru_underscore'));

// ── 5. structural checks (language-neutral) ─────────────────────────────────────────
const FILL = ' The council met in the old town hall on a wet morning and nobody wanted to stay long.';
const OPENERS = 'The harbour opened in May. The harbour closed in June. The harbour reopened in July. The harbour flooded in August.' + FILL + FILL;
ok('structural: repeated sentence openers flag', structuralTells(OPENERS, 'en').some((t) => t.key === 'repeated_openers'));
ok('structural: varied openers do not', !structuralTells(FIXTURES.en.human[0], 'en').some((t) => t.key === 'repeated_openers'));
const PHRASE = ('The mayor said the plan would go ahead. ').repeat(3) + 'Prices rose by 4 percent in the spring and fell again by autumn, the agency said, which surprised almost nobody in the trade this year.';
ok('structural: a phrase repeated three times flags', structuralTells(PHRASE + FILL + FILL, 'en').some((t) => t.key === 'repeated_phrase'));
const TRI = 'The town offers beaches, tavernas and museums. The region has wine, cheese and honey. The coast has rocks, caves and coves. The hills have pines, goats and springs. Visitors love walking, swimming and eating.' + FILL + FILL;
ok('structural: dense rule-of-three flags', structuralTells(TRI, 'en').some((t) => t.key === 'rule_of_three'));
ok('structural: rule-of-three works in Greek', structuralTells('Έχει παραλίες, ταβέρνες και μουσεία. Έχει κρασί, τυρί και μέλι. Έχει βράχους, σπηλιές και κόλπους. Έχει πεύκα, κατσίκες και πηγές. Αγαπούν το περπάτημα, το κολύμπι και το φαγητό. Η πόλη είναι μικρή και ήσυχη και οι άνθρωποι της φιλικοί προς κάθε επισκέπτη.', 'el').some((t) => t.key === 'rule_of_three'));
const FLAT = ['One short paragraph about the harbour and its boats in the early morning light today.', 'Another short paragraph about the market and its stalls in the early morning light today.', 'A third short paragraph about the church and its bells in the early morning light today.', 'A last short paragraph about the school and its pupils in the early morning light today.'].join('\n\n');
ok('structural: equal-sized paragraphs flag', structuralTells(FLAT, 'en').some((t) => t.key === 'uniform_paragraphs'));
const NODIGIT = ('The village sits above the sea and the road bends twice before the church. ').repeat(1) + 'People sit outside in the evening and talk about the weather, the harvest and the neighbours. The bakery opens early and closes when the bread runs out, which is usually before noon. Children walk to school along the same lane their parents used, past the same wall and the same dog. In winter the wind comes down from the hills and the shutters rattle all night long. Nobody seems to mind. In spring the almond trees flower and the whole slope turns white for a week, then it is over and the trees go back to being trees again. By June the road is dusty, the church is locked except on Sundays, and the only sound at noon is the generator behind the café, which nobody has ever bothered to switch off. Strangers are offered coffee, then a chair, then an opinion on the government.';
ok('structural: a long piece with no figures flags', structuralTells(NODIGIT, 'en').some((t) => t.key === 'no_specifics'));
ok('structural: short text is never flagged', structuralTells('One. Two. Three. Four.', 'en').length === 0);
ok('structural: Arabic sentence openers ignore the leading و', structuralTells('وفتح الميناء في مايو بعد عمل طويل. وفتح السوق في يونيو بعد عمل طويل. وفتح المتحف في يوليو بعد عمل طويل. وفتح المطعم في أغسطس بعد عمل طويل. ' + 'قال رئيس البلدية إن الخطة ستمضي قدما رغم الأمطار الغزيرة التي هطلت على المدينة طوال الأسبوع الماضي. ' + 'ولم يرغب أحد في البقاء طويلا في القاعة القديمة في ذلك الصباح الممطر.', 'ar').some((t) => t.key === 'repeated_openers'));

// ── 6. prompts: negative constraints per language ───────────────────────────────────
ok('every language has a phrase list of at least 15 entries', LANG_LIST.every((l) => promptTells(l).length >= 15));
ok('promptTellList joins the entries', promptTellList('de').includes('spielt eine entscheidende Rolle') && promptTellList('ru').includes('играет ключевую роль'));
ok('antiAiRules(German) quotes German tells, not just English', antiAiRules('German').includes('im Herzen von') && !antiAiRules('German').includes('delve into'));
ok('antiAiRules(Russian (Русский)) resolves the language name', antiAiRules('Russian (Русский)').includes('играет ключевую роль'));
ok('antiAiRules(English) is unchanged: English list present', antiAiRules('English').includes('delve into') && antiAiRules('English').includes('British English'));
ok('antiAiRules(Arabic) carries native register rules', /NATIVE REGISTER \(Arabic\)/.test(antiAiRules('Arabic')) && antiAiRules('Arabic').includes('يتم'));
ok('antiAiRules forbids any production statement on the article', /no statement about how it was produced/.test(antiAiRules('Polish')));
ok('antiAiRules keeps the burstiness block', antiAiRules('Greek').includes('burstiness'));
for (const [code, name] of [['de', 'German'], ['el', 'Greek'], ['pl', 'Polish'], ['ro', 'Romanian'], ['ru', 'Russian'], ['ar', 'Arabic']] as const) {
  const tp = translatePrompt(code);
  ok(`translatePrompt(${code}) demands native register and lists the stock phrases`, tp.includes('NATIVE REGISTER') && tp.includes(promptTells(code)[0]) && tp.includes(name));
  ok(`translatePrompt(${code}) bans calques and mirrored word order`, /calque/i.test(tp) && /English sentence order/i.test(tp));
  ok(`transcreateSystem(${name}) carries the same constraints`, transcreateSystem(name).includes(promptTells(code)[1]));
}
ok('nativeRegisterRules demands varied rhythm', /Vary rhythm/.test(nativeRegisterRules('de')));
ok('nativeRegisterRules forbids translator preambles', /preamble/.test(nativeRegisterRules('pl')));
eq('langFromName: code', langFromName('ru'), 'ru');
eq('langFromName: locale label', langFromName('Greek (Ελληνικά)'), 'el');
eq('langFromName: unknown', langFromName('Klingon'), null);
ok('lintAiTells(de) reports German tells, not only English ones', lintAiTells('Das Café spielt eine entscheidende Rolle im Ort.', 'de').some((t) => /Rolle/.test(t)));
ok('lintAiTells without a language is unchanged', lintAiTells('Das Café spielt eine entscheidende Rolle im Ort.').length === 0);

// ── 7. profile / review metadata ───────────────────────────────────────────────────
ok('all six non-English profiles are flagged for native review', LANG_LIST.filter((l) => l !== 'en').every((l) => langProfile(l).nativeReview));
ok('every language has lexical detectors and structural checks', LANG_LIST.every((l) => langProfile(l).lexicalDefs >= 7 && langProfile(l).structural >= 7));

// ── 8. quality scan surfaces the tells and keeps paragraphs ─────────────────────────
{
  const html = (t: string) => '<p>' + t.split('\n\n').join('</p><p>') + '</p>';
  const post = {
    id: '1', slug: 'marina', source_lang: 'en', status: 'published',
    content_en: html(FIXTURES.en.human[0]), title_en: 'Latchi',
    content_de: html(FIXTURES.de.ai[0]), title_de: 'Die Marina',
    content_el: html(FIXTURES.el.human[0]), title_el: 'Λατσί',
    content_ro: '', content_pl: '', content_ru: '', content_ar: '',
  };
  const r = scanPosts([post]);
  const de = r.editions.find((e) => e.lang === 'de')!;
  const el = r.editions.find((e) => e.lang === 'el')!;
  ok('scan: German AI edition is flagged high', de.level === 'high' && !de.untranslated);
  ok('scan: finding carries the strongest tells', de.tells.length > 0 && de.tells.length <= 4 && de.tells.every((t) => t.label && t.count >= 1));
  ok('scan: German summary counts it as flagged', r.perLang.de.flagged === 1 && r.perLang.de.high === 1);
  ok('scan: clean Greek edition has no tells', el.score === 0 && el.tells.length === 0 && r.perLang.el.flagged === 0);
  ok('scan: empty editions are untranslated, not scored', r.perLang.ro.untranslated === 1 && r.perLang.ro.scored === 0);
  ok('scan: stripHtml keeps paragraph breaks', stripHtml('<p>One two.</p><p>Three four.</p>').includes('\n\n'));
  ok('scan: summary-opener tells now fire on stripped HTML', has(score(stripHtml(html('Der Ort ist klein.\n\nFazit: Es lohnt sich.')), 'de'), 'de_closing'));
}

report('antiAi-langs.pure');
