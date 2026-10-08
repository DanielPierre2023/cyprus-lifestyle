// lib/journalism/editorial.ts — the sub-editor's second pass: what to tell the editor model when the quality check found something.
// Pure (imports ./languages only). Shared by the Supabase edge function (generated copy) and the app.
//
// This replaces the old "humanness loop". That loop told the model to vary sentence lengths "aggressively" (several under 8 words
// and several over 25), to add a verbless fragment, to include a one-sentence and a five-sentence paragraph and to "pass AI
// detectors". The standard rules that out (no formula rhythm, no detector tricks, no fake roughness).
//
// The owner's rule is "measure it; rewrite if below": the numbers belong to the MEASUREMENT of the finished text, and the editor is
// handed the concrete findings (the measured value and the passage) with the remedy for each. The writer's prompt carries the
// intention only, because a quota in a writer's prompt makes a model produce the theatre it is meant to avoid.
import { LANG_NAME, TYPOGRAPHY, dashRule, type Lang } from './languages';

const FIX: Record<string, string> = {
  RHYTHM: 'RHYTHM: the sentence lengths are too even or too regular. Re-edit so that length follows the meaning: a short sentence where one hard fact should land, a longer one where context has to be held together. No formula, no mechanical alternation, no fragment added for effect, no filler to make a sentence longer.',
  PARAGRAPHS: 'PARAGRAPHS: the paragraphs are too alike in size. Let paragraph length follow the logic of the story: split where the story turns, keep related facts together. Add no one-sentence paragraph for effect and no padding.',
  PARA_OPENERS: 'PARAGRAPH OPENINGS: begin neighbouring paragraphs differently (a person, a number, a place, the decision, a quotation); no two in a row start with the same word.',
  SENTENCE_OPENERS: 'SENTENCE OPENINGS: never three sentences in a row that start with the same word; change the subject or the construction.',
  SPEECH_VERBS: 'SPEECH VERBS: use the plain verb of the language for people who speak in the story, and never the same verb in two attributions in a row: put the speaker first, put the attribution at the end, join two statements, or drop the attribution where the speaker is obvious. Replace ornamental verbs (stressed, emphasised, highlighted, betonte, hob hervor, podkreślił, a subliniat, подчеркнул, τόνισε, أكد) by the plain one.',
  NOMINAL: 'LIVE VERBS: replace verb + noun phrases (“made the decision to”, “traf die Entscheidung”, “was able to”) by the single live verb (“decided”, “entschied”, “could”). Change only the flagged phrases.',
  DATE_LEAD: 'OPENING: do not start with a date or a weekday. Start with the news itself, who did what and where, and move the date inside the sentence.',
  LEAD_LENGTH: 'OPENING: the first sentence is one clear sentence of at most 35 words: who, what, where, with which number. Move the rest into the second sentence.',
  FIRST_PERSON: 'VOICE: the magazine reports; take “I”, “we”, “our” and addresses to the reader out of the narration (quotations stay as they are). State the fact instead.',
  VAGUE: 'SPECIFICS: replace “many / several / various / numerous” (and their equivalents in this language) by the number or the name that the facts give. Where the facts give none, say less, never more.',
  SPECIFICITY: 'SPECIFICS: every paragraph should carry a name, a figure, a date or a quotation that the article already contains. Fold a paragraph that carries none into its neighbour, or cut the filler sentence.',
  ENUMERATION: 'STRUCTURE: no “firstly / secondly / finally”; let the order of the facts and the logic inside the sentences carry the sequence.',
  CONTRAST: 'FRAMES: replace “not only … but also” and “not X but Y” frames by one direct statement of what is the case.',
  RULE_OF_THREE: 'LISTS: break the habit of three-item lists; give the two or the four that the facts name, or only the one that matters.',
  TONE: 'TONE: remove rhetorical questions, exclamation marks and intensifiers (truly, incredibly, absolutely …); state the fact calmly.',
  LAYOUT: 'LAYOUT: fewer headings, no question headings, no templated headings, no bullet lists carrying the story; remove stray Markdown such as asterisks.',
  REPEATED_PHRASE: 'REPETITION: a phrase is repeated; say it once and use the specific noun the second time.',
  PARTICIPIAL_CLOSERS: 'PARTICIPIAL TAILS: rewrite sentences that end with a trailing participle or gerund clause (“…, highlighting …”, “…, subliniind …”, “…, was unterstreicht …”) as separate sentences with their own subject and finite verb; keep at most one.',
  DEMONSTRATIVE_OVERKILL: 'DEMONSTRATIVES: reduce sentences that begin with “This/These” (or the language\'s equivalent) to at most two; use the specific noun instead.',
  SUMMARY_CLOSER: 'ENDING: delete the closing paragraph that restates the significance; end on a concrete fact, number, date or quotation.',
  SPECULATIVE_ENDING: 'ENDING: cut the speculation or forecast from the ending; close on the last verifiable fact or attributed statement.',
  SOURCE_TALK: 'SOURCE TALK: remove every mention of where the facts came from (newspapers, agencies, websites, consultancies, reviewers, reports, “according to”, “reported by”, “sources say”, any talk about the research). State the fact in the magazine\'s own voice. The magazine contacted no one: never write that someone told or spoke to Cyprus Lifestyle or to “us”. People and institutions may still act and speak inside the story (the minister said).',
  AI_VOCAB: 'VOCABULARY: replace the stock vocabulary of generated text with the concrete, plain word of this language.',
  EM_DASH: 'DASHES: remove every em and en dash; use commas, full stops or parentheses (the Arabic comma for Arabic).',
  GENERIC_PHRASES: 'STOCK PHRASES: rewrite every stock phrase so that the sentence states the plain fact; do not swap in a synonym.',
  CONNECTIVES: 'CONNECTIVES: remove reflex connectives and transition words; keep one only where the logic needs it; let the facts create the connection.',
  HYPE: 'HYPE: replace each hype word by the fact that justifies it, or cut it.',
  WEAK_LEAD: 'OPENING: start with the strongest verified fact, person, event or scene of the story, not with scene-setting about the world or the years.',
  THROAT_CLEARING: 'OPENINGS: delete throat-clearing (“it is worth noting that”, “es ist wichtig zu beachten”); enter on the fact.',
  FORCED_CLOSER: 'ENDING: end on the last concrete fact; no forecast, no “time will tell”.',
  META_TALK: 'META: delete every sentence that talks about the text itself (“this article explores …”, “as we have seen …”).',
  FALSE_BALANCE: 'BALANCE: replace the mechanical “on the one hand … on the other hand” by what the evidence supports, in proportion.',
  HEADLINE: 'HEADLINE: state the news in a concrete headline; no “what you need to know”, no “why it matters”, no question teaser, no shouting.',
  OTHER: 'FLAGGED PASSAGES: rewrite each in the plain, concrete word of this language; change nothing else.',
};

/** Which remedy a finding asks for. Accepts the edge function's flag strings ("SOURCE_TALK:2"), the voice engine's tell keys and the craft/phrase keys. */
export function fixKeyForFlag(flag: string): string | null {
  const f = String(flag || '').trim();
  if (!f) return null;
  if (/^(LOW_BURSTINESS|MODERATE_BURSTINESS|UNIFORM_LENGTHS)/.test(f) || /^(c_rhythm_sd|c_flat_run|c_pulse|c_tails|low_burstiness|staccato_fragments)$/.test(f)) return 'RHYTHM';
  if (/^UNIFORM_PARAGRAPHS/.test(f) || f === 'uniform_paragraphs' || f === 'c_para_variety') return 'PARAGRAPHS';
  if (f === 'c_para_opener' || f === 'c_para_opener_many') return 'PARA_OPENERS';
  if (f === 'repeated_openers') return 'SENTENCE_OPENERS';
  if (/^c_speech_/.test(f)) return 'SPEECH_VERBS';
  if (f === 'c_nominal') return 'NOMINAL';
  if (f === 'c_date_lead') return 'DATE_LEAD';
  if (f === 'c_lead_long') return 'LEAD_LENGTH';
  if (f === 'c_first_person') return 'FIRST_PERSON';
  if (f === 'c_vague') return 'VAGUE';
  if (f === 'c_specificity' || f === 'no_specifics') return 'SPECIFICITY';
  if (f === 'c_ro_gerund') return 'PARTICIPIAL_CLOSERS';
  for (const k of ['PARTICIPIAL_CLOSERS', 'DEMONSTRATIVE_OVERKILL', 'SUMMARY_CLOSER', 'SPECULATIVE_ENDING', 'SOURCE_TALK', 'AI_VOCAB', 'EM_DASH']) if (f.startsWith(k)) return k;
  const j = /^j_[a-z]{2}_([a-z]+)/.exec(f);
  if (j) return ({ generic: 'GENERIC_PHRASES', connectives: 'CONNECTIVES', transitions: 'CONNECTIVES', hype: 'HYPE', lead: 'WEAK_LEAD', closer: 'FORCED_CLOSER', meta: 'META_TALK', balance: 'FALSE_BALANCE', enum: 'ENUMERATION', headline: 'HEADLINE' } as Record<string, string>)[j[1]] || null;
  if (/^source_/.test(f)) return 'SOURCE_TALK';
  if (f === 'em_dash' || f === 'double_hyphen') return 'EM_DASH';
  if (f === 'summary_closer' || f === 'conclusion_in_body' || /_(conclusion|closer_summary|closing_alt)$/.test(f)) return 'SUMMARY_CLOSER';
  if (/^throat_clearing/.test(f) || /_worth$/.test(f)) return 'THROAT_CLEARING';
  if (f === 'contrast_frame' || /_not_only$/.test(f)) return 'CONTRAST';
  if (/(^|_)(enum|enumeration|erstens_zweitens|vo_vtoryh_list|enum_scaffold|enum_inline)/.test(f)) return 'ENUMERATION';
  if (f === 'rule_of_three') return 'RULE_OF_THREE';
  if (/^(question_density|exclaim_density|intensifier_density)$/.test(f)) return 'TONE';
  if (/^(over_sectioned|question_headings|templated_headings|listicle|markdown_artifact)$/.test(f)) return 'LAYOUT';
  if (f === 'repeated_phrase') return 'REPEATED_PHRASE';
  if (/(participial|participle|gerund|mimma_tail)/.test(f)) return 'PARTICIPIAL_CLOSERS';
  if (/(lexicon|brochure|hype|vibrant|gem_noun|sensory|signif|_role$|_range$|filler|calque|leak)/.test(f)) return 'GENERIC_PHRASES';
  if (f === 'title_caps') return 'HEADLINE';
  return null;
}

export interface Finding { key: string; label?: string; sample?: string; count?: number; severity?: string }

/**
 * The editor's work order: every finding with its measured value or passage, then the remedy for each family once.
 * Accepts bare flag strings as well as findings (tells from the voice engine carry a label and a sample).
 */
export function editorialFixes(input: Array<string | Finding>, max = 16): string {
  const findings: Finding[] = input.map((x) => (typeof x === 'string' ? { key: x } : x)).filter((x) => x && x.key);
  const lines: string[] = []; const remedies: string[] = [];
  const order = (s?: string) => (s === 'high' ? 0 : s === 'medium' ? 1 : 2);
  for (const t of [...findings].sort((a, b) => order(a.severity) - order(b.severity))) {
    const fam = fixKeyForFlag(t.key);
    if (lines.length < max) lines.push(`• ${t.label || (fam ? FIX[fam].split(':')[0] : t.key)}${t.count && t.count > 1 ? ` ×${t.count}` : ''}${t.sample ? `: “${String(t.sample).replace(/\s+/g, ' ').slice(0, 90)}”` : ''}`);
    const fix = fam ? FIX[fam] : FIX.OTHER;
    if (!remedies.includes(fix)) remedies.push(fix);
  }
  if (!lines.length) return 'GENERAL: tighten any sentence that carries no information; keep the rhythm natural and the vocabulary plain.';
  return `FOUND IN THIS TEXT (each of these must be gone from your version):\n${lines.join('\n')}\n\nHOW TO FIX:\n${remedies.join('\n')}`;
}

// What a native sub-editor listens for, per language: the signs of another language showing through.
const NATIVE_CHECK: Record<Lang, string> = {
  en: 'English: plain, direct, active; no nominal chains; no stacked prepositional tails.',
  de: 'German: the verb frame and verb position as a German sub-editor would set them; cases and compound nouns right; no English word order; „deutsche Anführungszeichen“.',
  pl: 'Polish: natural Polish word order and aspect; no calques from English; the right case after every preposition; „polskie cudzysłowy”.',
  ro: 'Romanian: no English calques; diacritics (ă â î ș ț) everywhere; no chains of gerunds; „ghilimele românești”.',
  ru: 'Russian: no chains of verbal nouns; natural case and aspect; «ёлочки»; the letter ё where the house style uses it.',
  el: 'Greek: monotonic accents correct everywhere; natural article use; no English clause order; «εισαγωγικά».',
  ar: 'Arabic: modern standard journalistic Arabic with natural verb-first or noun-first order as the sentence needs; correct hamza and taa marbuta; the Arabic comma ، and question mark ؟.',
};

export function editorialSystem(lang: Lang, fixes: string): string {
  const name = LANG_NAME[lang];
  return `You are a senior sub-editor at Cyprus Lifestyle editing a ${name} article (HTML) so that it reads as carefully edited professional journalism. You edit for quality, never to defeat detectors: no tricks, no synonyms for their own sake, no deliberate roughness, no invented personality.
UNTOUCHABLE: change no fact, name, number, date, quotation or institution; add no information; keep the HTML tags and roughly the same length and paragraph count; ${dashRule(lang)}; keep it in ${name}; never name a source.
NATIVE EAR: read it as a native ${name} journalist would. If the word order, the use of articles, prepositions or cases, or the idiom shows another language underneath, say it the way ${name} says it. ${NATIVE_CHECK[lang]} Typography: ${TYPOGRAPHY[lang]}
FIX THESE PROBLEMS, and only these:
${fixes}
OUTPUT: JSON only, no preamble: {"content_html":"..."}`;
}

export function editorialUser(lang: Lang, html: string): string {
  return `ARTICLE (${LANG_NAME[lang]}; keep the HTML and every fact):\n\n${html}\n\nEdited article (JSON):`;
}

export function deOverlapSystem(lang: Lang): string {
  const name = LANG_NAME[lang];
  return `You are a senior editor at Cyprus Lifestyle. The ${name} article below still echoes wording from its source and must be rewritten to share NO phrasing with it.
KEEP EXACTLY: every fact, name, number, date, quotation and the meaning. KEEP the HTML tags and roughly the same length. ${dashRule(lang)[0].toUpperCase()}${dashRule(lang).slice(1)}.
REWRITE: re-express every sentence in different words and a different order, so that NO run of 5 or more consecutive words matches the source anywhere.
OUTPUT: JSON only, no preamble: {"content_html":"..."}`;
}

export const EDITORIAL_SCHEMA = {
  type: 'object',
  properties: { content_html: { type: 'string' } },
  required: ['content_html'],
  additionalProperties: false,
} as const;

// ── the short fields: title, excerpt, summary, SEO title and description ──────────────────────────
export const FIELDS_SCHEMA = {
  type: 'object',
  properties: { title: { type: 'string' }, excerpt: { type: 'string' }, summary: { type: 'string' }, seo_title: { type: 'string' }, seo_description: { type: 'string' } },
  required: ['title', 'excerpt', 'summary', 'seo_title', 'seo_description'],
  additionalProperties: false,
} as const;

export function fieldsEditorSystem(lang: Lang, fixes: string): string {
  const name = LANG_NAME[lang];
  return `You are the headline and metadata editor of Cyprus Lifestyle. The short fields of this ${name} article (title, excerpt, summary, SEO title, SEO description) carry the same problems as machine text: formula headlines, brochure verbs (“Discover”, “Explore”, “Dive into”), hype, stock phrases, a date or a number stuffed into a teaser. Rewrite ONLY the fields that carry a listed problem.
UNTOUCHABLE: the facts, names, numbers and dates of the article; no new claim; keep ${name}; ${dashRule(lang)}; never name a source; the title stays under 90 characters in sentence case, the SEO title under 60 and the SEO description under 155.
FIX THESE PROBLEMS:
${fixes}
OUTPUT: JSON only with all five fields (unchanged ones copied as they are): {"title":"…","excerpt":"…","summary":"…","seo_title":"…","seo_description":"…"}`;
}
