// The short fields (title, excerpt, summary, SEO) under the same standard as the body, and the editor's work order built from findings.
import { fieldTells, fieldScore, FIELD_LIMITS } from '@/lib/journalism/fields';
import { editorialFixes, fixKeyForFlag, editorialSystem, fieldsEditorSystem, FIELDS_SCHEMA } from '@/lib/journalism/editorial';
import type { PhraseLang } from '@/lib/journalism/phrases';
import { eq, ok, report } from './_harness';

const L: PhraseLang[] = ['en', 'de', 'pl', 'ro', 'ru', 'el', 'ar'];
const cta: Record<PhraseLang, string> = {
  en: 'Discover the best marinas in Cyprus and unlock their secrets',
  de: 'Entdecken Sie die schönsten Marinas Zyperns',
  pl: 'Odkryj najpiękniejsze mariny Cypru',
  ro: 'Descoperă cele mai frumoase marine din Cipru',
  ru: 'Откройте для себя лучшие марины Кипра',
  el: 'Ανακαλύψτε τις ομορφότερες μαρίνες της Κύπρου',
  ar: 'اكتشف أجمل المراسي في قبرص',
};
const clean: Record<PhraseLang, string> = {
  en: 'Limassol marina raises berth fees to 90 euros from 1 March',
  de: 'Marina Limassol erhöht die Liegegebühr ab 1. März auf 90 Euro',
  pl: 'Marina w Limassol podnosi opłatę za miejsce do 90 euro od 1 marca',
  ro: 'Marina din Limassol majorează taxa de acostare la 90 de euro din 1 martie',
  ru: 'Марина в Лимасоле повышает сбор за место до 90 евро с 1 марта',
  el: 'Η μαρίνα της Λεμεσού αυξάνει το τέλος στα 90 ευρώ από 1η Μαρτίου',
  ar: 'مرسى ليماسول يرفع رسوم الرسو إلى 90 يورو اعتبارا من الأول من مارس',
};
for (const l of L) {
  ok(`${l}: a brochure opener in the title is found`, fieldTells({ title: cta[l] }, l).some((t) => t.key === 'f_cta'));
  ok(`${l}: ... also in the SEO description`, fieldTells({ seoDescription: cta[l] }, l).some((t) => t.key === 'f_cta'));
  eq(`${l}: a plain news title is clean`, fieldTells({ title: clean[l], seoTitle: clean[l].slice(0, 58) }, l), []);
}
eq('en: a formula headline', fieldTells({ title: 'What you need to know about the new marina fees' }, 'en').map((t) => t.key), ['j_en_headline']);
eq('de: a formula headline', fieldTells({ title: 'Alles, was Sie über die neuen Gebühren wissen müssen' }, 'de').some((t) => t.key === 'j_de_headline' || t.key === 'f_cta'), true);
eq('a source in the excerpt is a high finding', fieldTells({ excerpt: 'According to the Cyprus Mail, fees rise on 1 March.' }, 'en').find((t) => t.key === 'source_attribution')?.severity, 'high');
eq('a dash in the SEO description', fieldTells({ seoDescription: 'Fees rise — owners object' }, 'en').map((t) => t.key), ['em_dash']);
eq('ru: a dash in a field is Russian punctuation, not a finding', [fieldTells({ title: 'Лимасол — новый тариф на стоянку' }, 'ru').map((x) => x.key), fieldTells({ title: 'Limassol — new fee' }, 'de').map((x) => x.key)], [[], ['em_dash']]);
eq('an emoji in the excerpt', fieldTells({ excerpt: 'Fees rise ⚓ on 1 March' }, 'en').map((t) => t.key), ['emoji']);
eq('a question teaser as title', fieldTells({ title: 'Are berth fees too high?' }, 'en').map((t) => t.key), ['f_question']);
eq('an ellipsis teaser in the excerpt', fieldTells({ excerpt: 'Fees rise on 1 March and then…' }, 'en').map((t) => t.key), ['f_ellipsis']);
eq('a title in capitals is high', fieldTells({ title: 'FEES RISE ON 1 MARCH' }, 'en').find((t) => t.key === 'title_caps')?.severity, 'high');
eq('a stock phrase in the excerpt is found with the field named', fieldTells({ excerpt: 'In today’s fast-paced world, fees matter.' }, 'en').some((t) => /^excerpt:/.test(t.label)), true);
eq('a too-long SEO title', fieldTells({ seoTitle: 'x'.repeat(FIELD_LIMITS.seoTitle + 5) }, 'en').map((t) => t.key), ['f_too_long']);
eq('empty fields are ignored', fieldTells({ title: '', excerpt: undefined }, 'en'), []);
eq('the score is 0 for clean fields and grows with findings', [fieldScore([]), fieldScore(fieldTells({ title: cta.en }, 'en')) > 0, fieldScore(fieldTells({ excerpt: 'According to Reuters, fees rise.' }, 'en')) >= 40], [0, true, true]);

// ── the editor's work order ─────────────────────────────────────────────────────────────────────────────────────────
eq('craft findings map to their remedy', ['c_rhythm_sd', 'c_flat_run', 'c_pulse', 'c_tails', 'c_para_opener', 'c_para_variety', 'c_speech_repeat', 'c_speech_mono', 'c_speech_ornament', 'c_nominal', 'c_date_lead', 'c_lead_long', 'c_first_person', 'c_vague', 'c_specificity', 'c_ro_gerund'].map(fixKeyForFlag),
  ['RHYTHM', 'RHYTHM', 'RHYTHM', 'RHYTHM', 'PARA_OPENERS', 'PARAGRAPHS', 'SPEECH_VERBS', 'SPEECH_VERBS', 'SPEECH_VERBS', 'NOMINAL', 'DATE_LEAD', 'LEAD_LENGTH', 'FIRST_PERSON', 'VAGUE', 'SPECIFICITY', 'PARTICIPIAL_CLOSERS']);
eq('voice-engine keys map too', ['summary_closer', 'em_dash', 'source_outlet', 'throat_clearing_opener', 'de_worth', 'contrast_frame', 'en_not_only', 'staccato_fragments', 'uniform_paragraphs', 'repeated_openers', 'rule_of_three', 'j_el_enum', 'j_en_headline', 'f_cta'].map(fixKeyForFlag),
  ['SUMMARY_CLOSER', 'EM_DASH', 'SOURCE_TALK', 'THROAT_CLEARING', 'THROAT_CLEARING', 'CONTRAST', 'CONTRAST', 'RHYTHM', 'PARAGRAPHS', 'SENTENCE_OPENERS', 'RULE_OF_THREE', 'ENUMERATION', 'HEADLINE', null]);
{
  const w = editorialFixes([
    { key: 'c_rhythm_sd', label: 'Sentence lengths vary too little: standard deviation 4.4 words (the target is 7 or more)', severity: 'low', sample: 'mean 11.5, SD 4.4' },
    { key: 'c_speech_ornament', label: 'Ornamental verb of speech (“betonte”): use the plain verb', severity: 'medium', count: 3, sample: 'betonte' },
    { key: 'source_outlet', label: 'Names a publication', severity: 'high', sample: 'Cyprus Mail' },
  ]);
  ok('the work order lists each finding with its measured value or passage', w.includes('standard deviation 4.4') && w.includes('“betonte”') && w.includes('×3') && w.includes('“Cyprus Mail”'));
  ok('the strongest finding comes first', w.indexOf('Names a publication') < w.indexOf('Ornamental verb') && w.indexOf('Ornamental verb') < w.indexOf('Sentence lengths vary'));
  ok('every family contributes its remedy once', (w.match(/RHYTHM:/g) || []).length === 1 && w.includes('SPEECH VERBS:') && w.includes('SOURCE TALK:'));
  ok('the remedy never asks for a quota, a fragment or detector tricks', !/under 8|over 25|verbless|detector|aggressively|at least three/i.test(editorialFixes(['c_rhythm_sd', 'c_flat_run', 'c_pulse', 'c_tails', 'c_para_opener', 'c_speech_mono', 'c_nominal'])));
  eq('unknown keys still get a remedy', editorialFixes([{ key: 'zz_unknown', label: 'Something odd', sample: 'abc' }]).includes('FLAGGED PASSAGES'), true);
  ok('the list is capped', editorialFixes(Array.from({ length: 40 }, (_, i) => ({ key: 'c_vague', label: `finding ${i}` })), 16).split('\n').filter((x) => x.startsWith('• ')).length === 16);
}
for (const l of ['en', 'de', 'pl', 'ro', 'ru', 'el', 'ar'] as const) {
  const s = editorialSystem(l, 'FIX');
  ok(`${l}: the editor listens as a native speaker and knows the typography`, s.includes('NATIVE EAR') && s.includes('Typography:') && !/pass AI detectors/i.test(s));
}
{
  const s = fieldsEditorSystem('de', 'X');
  ok('the fields editor rewrites only flagged fields and keeps the limits', s.includes('ONLY the fields') && s.includes('under 90') && s.includes('under 155'));
  eq('the fields schema has the five fields', Object.keys(FIELDS_SCHEMA.properties), ['title', 'excerpt', 'summary', 'seo_title', 'seo_description']);
}
report('journalism-fields');
