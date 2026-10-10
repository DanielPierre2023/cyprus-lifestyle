// lib/voice/prompt.ts — builds the editor's brief for the rewrite model. Pure (no I/O), unit-tested.
//
// The brief has five layers, from most to least universal, and the order matters because models weight what comes first and
// last: (1) integrity, (2) the craft laws that hold in every language, (3) the desk, (4) the language's own sheet and banned
// phrases, (5) the exact tells found in THIS text. Facts are frozen; only wording and architecture may change.
import type { Lang } from '@/lib/antiAi';
import { LOCALE_NAME, type Locale } from '@/lib/locales';
import { voiceData } from '@/lib/voice/data';
import { DESK_SPEC, type Desk } from '@/lib/voice/desks';
import type { AiTell } from '@/lib/antiAi';
import type { Issue } from '@/lib/voice/structure';
import { reportageBlock } from '@/lib/voice/reportage';
import { remediesFor, SAMPLE_CHARS } from '@/lib/journalism/editorial';

export const INTEGRITY: string[] = [
  'Keep EVERY fact, name, figure, date, price and quotation exactly as in the text you are given. Change wording and architecture, never substance.',
  'Add no figure, name, date, quotation, source or claim that is not in the text. If you need a transition, make it from what the text already says.',
  'Quotations stay verbatim and in the same language; never invent or "improve" a quote. Do not add quotation marks around anything that was not quoted.',
  'Keep the language of the text: write in the edition\'s own language, not a translation-sounding version of another.',
  'Keep the format you receive: if it is HTML keep every tag, link, heading level and list; if it is markdown keep the markdown. Do not add or remove links or images.',
  'The article states nothing about how it was produced: no disclaimer, no "translated by", no editor\'s note, no mention of AI.',
];

export const CRAFT_LAWS: string[] = [
  'Write like a human reporter, not a summariser: enter on the fact, say it plainly, move on. No throat-clearing opener ("it is worth noting", "here is what you need to know").',
  'NO enumerations as architecture: no "firstly / secondly / finally", no stacked lists of three, no "key takeaways" or "in summary" sections. Reasons and steps live inside sentences and paragraphs, not on a ladder.',
  'NO conclusion. Never end by restating the piece, drawing a moral or telling the reader what to feel. End on the hardest concrete fact, a number, a date, a quotation or an image.',
  'Let sentence length follow the meaning: a short sentence where one hard fact should land, a longer one where context has to be held together. No formula, no mechanical alternation, no fragment added for effect, no filler to lengthen a sentence. (The measured rhythm of this text, if it is a problem, is listed below with the passages.)',
  'Let paragraph length follow the logic of the story, not a pattern; neighbouring paragraphs open differently (a person, a figure, the place, the decision, a quotation), never with the same word or the same grammatical shape.',
  'Alternate dense paragraphs (names, numbers, quotes) with interpretive ones (context, consequence); never stack two of the same kind.',
  'Use live verbs, not nominalisations or "was able to"; prefer "is" to "serves as / stands as / boasts / features"; no participial tails ("..., highlighting / ensuring / reflecting ...").',
  'No predictable connective pairs ("not only X but also Y", "on the one hand / on the other"), no "Moreover / Furthermore / Additionally" stitched through the piece; transitions stay invisible.',
  'People and institutions may act and speak in the piece (name, role, date; never "experts say"), but never cite where the facts came from: no outlet, agency, consultancy, reviewer or encyclopaedia, no "according to", no "reported by". Rotate the speech verbs.',
  'Replace every hype adjective (stunning, vibrant, breathtaking, world-class, hidden gem, iconic, seamless, curated) with the specific thing it stands in for, or cut it.',
  'Specifics beat generalities: where the text contains a figure, date, place or name, use it where it is strongest; do not add any that the text lacks.',
  'No em or en dash as a pause mark (Russian keeps the dash its punctuation requires); use commas, full stops, colons or parentheses. No emoji. No rhetorical questions as filler. At most one exclamation mark in a whole piece, usually none.',
  'In the neutral news register a flat, precise lead is the standard: no theatrics, no shock fragment.',
];

const nameOf = (lang: Lang) => LOCALE_NAME[lang as Locale] || lang;

/** The system prompt for a rewrite pass. */
export function voiceSystem(o: { lang: Lang; desk: Desk; pass?: number }): string {
  const data = voiceData(o.lang);
  const desk = DESK_SPEC[o.desk];
  const language = nameOf(o.lang);
  const deskNote = data.desks[o.desk];
  const out: string[] = [
    `You are the chief sub-editor and a senior staff writer of Cyprus Lifestyle, an international luxury magazine about Cyprus. You are rewriting a ${language} piece for the ${desk.label} desk so that it reads as carefully edited professional journalism by an expert native of ${language}: precise, specific, quietly authoritative. You edit for quality, never to defeat detectors: no tricks, no deliberate roughness, no invented personality.`,
    '',
    'INTEGRITY (non-negotiable):',
    ...INTEGRITY.map((x) => `• ${x}`),
    '',
    'CRAFT LAWS (every language):',
    ...CRAFT_LAWS.map((x) => `• ${x}`),
    '',
    reportageBlock(o.desk),
    '',
    'WHEN REWRITING: you may recast a flat list of facts into a narrative with a thread, but only with the facts present in the text you are given; add nothing, and invent no scene, mood or atmosphere.',
    '',
    `THIS DESK, ${desk.label.toUpperCase()}: ${desk.brief}`,
    `ENDING: ${desk.ending}`,
  ];
  if (deskNote) out.push(`IN ${language.toUpperCase()} PRESS: ${deskNote}`);
  if (data.sheet.length) out.push('', `HOW A NATIVE ${language.toUpperCase()} JOURNALIST WRITES (house sheet):`, ...data.sheet.map((x) => `• ${x}`));
  if (data.banned.length) out.push('', `NEVER USE these ${language} words and phrases, or their inflected forms or literal renderings of the English equivalents: ${data.banned.slice(0, 70).join('; ')}.`);
  if (data.pairs.length) {
    out.push('', 'BAD → GOOD (learn the move, do not copy the sentences):');
    for (const p of data.pairs.slice(0, 8)) out.push(`• BAD: ${p.bad}\n  GOOD: ${p.good}\n  (${p.why})`);
  }
  out.push('', 'Return ONLY a JSON object: {"title":"<the headline, same language>","body":"<the full rewritten body in the SAME format you received>"} with no commentary.');
  return out.join('\n');
}

/** The user message: the text, and exactly what the detector found in it. */
export function reviseUser(o: { title: string; body: string; tells: AiTell[]; issues?: Issue[]; pass: number; notes?: string[] }): string {
  const lines: string[] = [];
  for (const n of o.notes || []) lines.push(`• ${n}`);
  if (o.tells.length) {
    lines.push('FOUND IN THIS TEXT (all of it must be gone from your version):');
    const shown = o.tells.slice(0, 18);
    for (const t of shown) lines.push(`• ${t.label}${t.count > 1 ? ` ×${t.count}` : ''}${t.sample ? `  e.g. “${t.sample.slice(0, SAMPLE_CHARS)}”` : ''}`);
    // What each finding asks for, once per family (the same remedies the article desk's sub-editor gets): a list of findings alone
    // leaves the model to guess what "paragraphs are all about the same length" or "cites its source" is supposed to turn into.
    lines.push('', 'HOW TO FIX (what each finding asks for):', ...remediesFor(shown.map((t) => ({ key: t.key, label: t.label, severity: t.severity, count: t.count, sample: t.sample }))).map((f) => `• ${f}`));
  }
  if (o.issues?.some((i) => i.key === 'straight_quotes')) lines.push('• Use the typographic quotation marks of this language, not straight quotes.');
  lines.push(
    o.pass <= 1
      ? '\nThis is the full rewrite: re-report the whole piece in your own sentences, keep the facts and the order of the information, rebuild the architecture and rhythm.'
      : '\nA previous pass left the tells above. Change only the passages that carry them and the paragraph rhythm around them; keep everything else as it is.',
  );
  lines.push('', `TITLE: ${o.title}`, '', 'BODY:', o.body);
  return lines.join('\n');
}
