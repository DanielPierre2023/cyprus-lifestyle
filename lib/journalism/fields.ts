// lib/journalism/fields.ts — the short fields of an article (title, excerpt, summary, SEO title, SEO description) under the same
// standard as the body. Pure (imports ./phrases and ./craftTells types only).
//
// Until now nothing looked at them. They are the first thing a reader, a search result and a social card show, and they are where a
// model falls back on brochure verbs ("Discover …", "Dive into …"), formula headlines ("What you need to know") and hype.
// The detectors are the phrase packs the body already uses (stock phrases, hype, meta-talk, formula headlines), plus a short list of
// call-to-action openers, source talk, dashes, emoji and the length limits that search engines and cards impose.
import { phraseHits, isFormulaicHeadline, foldFor, type PhraseLang } from './phrases';
import type { CraftTell } from './craftTells';

export type FieldName = 'title' | 'excerpt' | 'summary' | 'seoTitle' | 'seoDescription';
export interface Fields { title?: string; excerpt?: string; summary?: string; seoTitle?: string; seoDescription?: string }
export const FIELD_LIMITS: Record<FieldName, number> = { title: 90, excerpt: 300, summary: 600, seoTitle: 60, seoDescription: 155 };

const CTA: Record<PhraseLang, string> = {
  en: String.raw`discover|explore|dive into|delve into|uncover|unlock|experience|find out|learn (?:why|how|more)|get to know|everything you need to know|your (?:ultimate|complete) guide|step into`,
  de: String.raw`entdecken sie|entdecke|erleben sie|erlebe|tauchen sie ein|tauche ein|erfahren sie|erfahre|alles,? was sie wissen müssen|ihr (?:ultimativer|kompletter) (?:guide|ratgeber)|lassen sie sich`,
  pl: String.raw`odkryj|odkryjmy|poznaj|zanurz się|dowiedz się|wszystko,? co musisz wiedzieć|twój (?:ostateczny|kompletny) przewodnik|przeżyj`,
  ro: String.raw`descoperă|descoperiți|explorează|explorați|află|aflați|scufundă-te|tot ce trebuie să știi|ghidul tău (?:complet|suprem)|trăiește`,
  ru: String.raw`откройте|откройте для себя|узнайте|исследуйте|погрузитесь|всё,? что нужно знать|ваш (?:полный|идеальный) гид|почувствуйте`,
  el: String.raw`ανακαλύψτε|εξερευνήστε|μάθετε|βυθιστείτε|όλα όσα πρέπει να ξέρετε|ο απόλυτος οδηγός|ζήστε`,
  ar: String.raw`اكتشف|استكشف|تعرف على|انغمس|كل ما تحتاج لمعرفته|دليلك الشامل|عش`,
};
const SOURCE_TALK: Record<PhraseLang, string> = {
  en: String.raw`according to|reported by|as reported|press release`,
  de: String.raw`laut (?:dem|der|den|des|einer|einem|angaben|berichten|medien|presse)|nach angaben|zufolge|pressemitteilung`,
  pl: String.raw`według(?! (?:stanu|wzrostu|wieku))|jak (?:podaje|informuje|pisze|donosi)|komunikat prasowy`,
  ro: String.raw`potrivit|conform(?! (?:legii|cu|prevederilor))|relatează|comunicat de presă`,
  ru: String.raw`по данным|по информации|согласно(?! (?:закон|правил|договор))|как (?:сообщает|пишет)|пресс-релиз`,
  el: String.raw`σύμφωνα με|όπως (?:αναφέρει|ανέφερε|γράφει|μεταδίδει)|δελτίο τύπου`,
  ar: String.raw`وفقا ل|بحسب (?:ما )?(?:ذكر|نقل|أفاد|تقرير|صحيفة|موقع)|نقلا عن|بيان صحفي`,
};
const NOTL = String.raw`\p{L}\p{M}\p{N}`;
const ctaRe = (lang: PhraseLang) => new RegExp(String.raw`^\s*["“„«'‘(]*\s*(?:${foldFor(lang, CTA[lang])})(?![${NOTL}])`, 'iu');
const srcRe = (lang: PhraseLang) => new RegExp(String.raw`(?<![${NOTL}])(?:${foldFor(lang, SOURCE_TALK[lang])})(?![${NOTL}])`, 'iu');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const NAME: Record<FieldName, string> = { title: 'title', excerpt: 'excerpt', summary: 'summary', seoTitle: 'SEO title', seoDescription: 'SEO description' };
const clip = (s: string, n = 70) => s.replace(/\s+/g, ' ').trim().slice(0, n);

/** Findings for the short fields. Keys start with f_ (and the phrase keys), labels name the field. Empty when everything is clean. */
export function fieldTells(fields: Fields, lang: PhraseLang): CraftTell[] {
  const out: CraftTell[] = [];
  const push = (key: string, label: string, severity: CraftTell['severity'], sample = '', count = 1) => out.push({ key, label, severity, count, sample: clip(sample) });
  for (const f of ['title', 'excerpt', 'summary', 'seoTitle', 'seoDescription'] as FieldName[]) {
    const text = String(fields[f] ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const n = NAME[f];
    if (ctaRe(lang).test(foldFor(lang, text))) push('f_cta', `${n} opens like a brochure (“${clip(text, 30)}…”): state the news instead`, 'medium', text);
    if ((f === 'title' || f === 'seoTitle') && isFormulaicHeadline(text, lang)) push(`j_${lang}_headline`, `${n} is a formula headline: state the news`, 'medium', text);
    for (const h of phraseHits(text, lang)) {
      if (h.key.endsWith('_transitions') || h.key.endsWith('_connectives') || h.key.endsWith('_balance') || h.key.endsWith('_enum')) continue;   // only meaningful across several sentences
      push(h.key, `${n}: ${h.label}`, h.severity === 'low' ? 'low' : 'medium', h.sample, h.count);
    }
    if (srcRe(lang).test(foldFor(lang, text))) push('source_attribution', `${n} cites a source (“according to …”): state the fact in the magazine's voice`, 'high', text);
    if (lang !== 'ru' && /[—–]/.test(text)) push('em_dash', `${n} contains a dash used as punctuation`, 'medium', text);
    if (EMOJI.test(text)) push('emoji', `${n} contains an emoji`, 'low', text);
    if (/\.\.\.|…\s*$/.test(text) && (f === 'excerpt' || f === 'seoDescription')) push('f_ellipsis', `${n} ends in an ellipsis teaser`, 'low', text);
    if ((f === 'title' || f === 'seoTitle') && /\?\s*$/.test(text)) push('f_question', `${n} is a question teaser: answer it in the headline`, 'low', text);
    if (f === 'title' && /[:]\s/.test(text) && text.length > 70) push('f_colon_title', `${n} is a long “topic: promise” construction`, 'low', text);
    if (text.length > FIELD_LIMITS[f]) push('f_too_long', `${n} is ${text.length} characters (limit ${FIELD_LIMITS[f]}): it will be cut in results and cards`, 'low', text);
    if ((f === 'title' || f === 'seoTitle') && text.length >= 8 && text !== text.toLowerCase() && text === text.toUpperCase()) push('title_caps', `${n} is in capitals`, 'high', text);
  }
  return out;
}

/** A mild score for the fields so that callers can compare before and after (lower is better; 0 = clean). */
export function fieldScore(tells: ReadonlyArray<{ severity?: string; count?: number }>): number {
  const w: Record<string, number> = { high: 40, medium: 7, low: 3 };
  return Math.min(100, Math.round(tells.reduce((a, t) => { const c = t.count ?? 1; return a + (w[t.severity || 'low'] ?? 3) * Math.min(c, 3) * (c > 1 ? 0.7 : 1); }, 0)));
}
