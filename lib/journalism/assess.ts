// lib/journalism/assess.ts — the judge of a finished edition: the app's voice engine and its publish bar, behind one function.
// The Supabase edge function embeds this module (with the whole scorer) when it is built, so the desk that writes an article and the
// worker that later checks it use the SAME judge: an article cannot pass in one place and fail in the other.
//
// Not "pure" in the sense of the rest of lib/journalism (it imports the voice engine), which is why the pipeline receives it as a
// dependency instead of importing it.
import { scoreVoice } from '@/lib/voice/score';
import { MAX_SCORE } from '@/lib/voice/gate';
import type { Desk } from '@/lib/voice/desks';
import type { Assessment, AssessCtx } from './pipeline';

/** The magazine's categories → the voice engine's desks. */
const DESK: Record<string, Desk> = {
  cyprus: 'news', world: 'news', business: 'business', property: 'property_legal', relocation: 'relocation_guide',
  culture: 'culture', escapes: 'travel', table: 'food', agenda: 'events', people: 'people',
};
export const deskFor = (category: string, articleType?: string): Desk => (articleType === 'interview' ? 'interview' : DESK[String(category || '').toLowerCase()] || 'news');

/** First person is the writer's right in commentary and interviews only. */
export const firstPersonAllowed = (articleType?: string) => articleType === 'commentary' || articleType === 'interview';

export function assessEdition(html: string, lang: string, ctx: AssessCtx): Assessment {
  const rep = scoreVoice({ title: ctx.title, body: html, lang, desk: deskFor(ctx.category, ctx.articleType), allowFirstPerson: firstPersonAllowed(ctx.articleType) });
  const high = rep.tells.filter((t) => t.severity === 'high').length;
  return {
    score: rep.score,
    ok: rep.score <= MAX_SCORE && high === 0,
    high,
    words: rep.metrics.words,
    tells: rep.tells.map((t) => ({ key: t.key, label: t.label, severity: t.severity, count: t.count, sample: t.sample })),
  };
}
