// lib/voice/score.ts — ONE judge for every path.
//
// Until now the scraped pipeline judged with its own measure (measureHumanness, 100 = human), the admin Quality page with
// scoreAiTells (0 = clean), and the AI editor with a third. An article could pass one and fail another, which is why "medium"
// pieces were live. scoreVoice is the single scorer: it takes the existing per-language scorer (lib/antiAi.ts, unchanged),
// adds the data-driven language tells (lib/voice/data), the shape checks (lib/voice/structure.ts), and returns one report.
// Lower is better: 0 = clean. Weights match scoreAiTells (high 40, medium 7, low 3; diminishing after the first hit).
import { scoreAiTells, burstiness, type AiTell, type AiTellReport, type Lang } from '@/lib/antiAi';
import { stripHtml } from '@/lib/editorial/craft';
import { dataTells, titleTells } from '@/lib/voice/tells';
import { shapeTells, layoutTells, qualityIssues, paragraphsOf, wordCountOf, type Issue } from '@/lib/voice/structure';
import { type Desk } from '@/lib/voice/desks';
import { craftTells } from '@/lib/journalism/craftTells';

const WEIGHT = { high: 40, medium: 7, low: 3 } as const;
const LANGS: Lang[] = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
export const asLang = (l: string | null | undefined): Lang => (LANGS.includes(l as Lang) ? (l as Lang) : 'en');

/** Desks whose writer may speak as "I" or "we" (columns, reviews, interviews). Everywhere else the magazine reports and does not appear in the text. */
const FIRST_PERSON_DESKS: ReadonlySet<Desk> = new Set<Desk>(['review', 'interview', 'people', 'food', 'culture', 'travel', 'fashion_lifestyle']);

/**
 * Titles of works, events and venues in quotation marks ("Glacier Kaleidoscope", „Tides in the Body") are names, not prose:
 * the vocabulary detectors (English leaking into another language, "kaleidoscope" as a metaphor) must not fire on them.
 * Quoted spans of up to seven words are replaced by a neutral token for the lexical detectors only.
 */
export function maskTitles(text: string): string {
  return String(text || '').replace(/[“"„«]([^”"“»\n]{1,80})[”"“»]/g, (m, inner: string) => (inner.trim().split(/\s+/).length <= 7 ? '§' : m));
}

export interface VoiceReport {
  score: number;
  level: AiTellReport['level'];
  tells: AiTell[];
  issues: Issue[];
  metrics: { words: number; paragraphs: number; sentenceCV: number; paraCV: number };
  /** The scorer that has existed since the first version, kept for before/after comparison. */
  legacyScore: number;
}

export function scoreVoice(input: { title?: string; body: string; lang: string; desk: Desk; allowFirstPerson?: boolean }): VoiceReport {
  const lang = asLang(input.lang);
  const raw = String(input.body || '');
  const plain = stripHtml(raw);
  const lexical = maskTitles(plain);
  const base = scoreAiTells({ title: input.title, content: lexical, lang });

  // Additive detectors. A key already reported by the base scorer is never counted twice.
  const seen = new Set(base.tells.map((t) => t.key));
  const extra: AiTell[] = [];
  const craft = craftTells({ paragraphs: paragraphsOf(raw), lang, allowFirstPerson: input.allowFirstPerson ?? FIRST_PERSON_DESKS.has(input.desk), dateLeadLow: input.desk === 'events' });
  for (const t of [...dataTells(lexical, lang), ...titleTells(input.title || '', lang), ...shapeTells(raw, lang), ...layoutTells(raw, lang, wordCountOf(plain)), ...craft]) {
    if (seen.has(t.key)) continue;
    seen.add(t.key);
    extra.push(t);
  }
  let score = base.score;
  for (const t of extra) score += WEIGHT[t.severity] * Math.min(t.count, 5) * (t.count > 1 ? 0.7 : 1);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tells = [...base.tells, ...extra].sort((a, b) => WEIGHT[b.severity] - WEIGHT[a.severity] || b.count - a.count);
  const level: VoiceReport['level'] = score === 0 ? 'clean' : score <= 15 ? 'low' : score <= 40 ? 'medium' : 'high';
  const b = base.burstiness ?? burstiness(plain);
  const paragraphs = plain.split(/\n\s*\n+/).filter((p) => p.trim()).length;
  return {
    score, level, tells, issues: qualityIssues(raw, lang, input.desk),
    metrics: { words: wordCountOf(plain), paragraphs, sentenceCV: b.sentenceCV, paraCV: b.paraCV },
    legacyScore: base.score,
  };
}
