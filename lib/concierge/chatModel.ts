// lib/concierge/chatModel.ts — the concierge's conversation with the model: one answer in one piece, or an answer streamed as it is written.
//
// The brain (lib/concierge/brain.ts) decides WHAT the model may say (persona, grounding); this module only asks and delivers:
//   • model and reasoning effort come from the routing table (task "chat": gpt-6-luna at "low" — the guest is waiting; tune with
//     AI_EFFORT_CHAT), the spend goes to ai_spend_log, the budget guard and the kill switch apply (lib/ai.ts);
//   • every piece of text passes the link policy (lib/concierge/linkPolicy.ts) before it leaves the server;
//   • WHY a provider call failed goes to the server log, never to the guest.
import 'server-only';
import { callAI, streamAI } from '@/lib/ai';
import { applyLinkPolicy, LinkPolicyStream } from '@/lib/concierge/linkPolicy';
import type { ChatTurn, ErrorKind } from '@/lib/journalism/openai';

export interface Turn { role: 'user' | 'assistant'; content: string }

/** What a whole chat route may take: Vercel stops it at 60 s. The model gets what is left after the search for the answer's ingredients. */
export const ROUTE_BUDGET_MS = 55_000;
/** About how long an answer is (visible tokens): 2-5 sentences, more for a trip plan. The model's thinking is added on top by the client. */
const ANSWER_TOKENS = 900;
/** Another answer in one piece is tried only if at least this much of the route is left. */
export const FALLBACK_MIN_MS = 12_000;

/** The conversation as the model wants it: the question (the last user turn) and the turns before it. Turns after the last user turn are dropped. */
export function splitTurns(history: Turn[]): { question: string; turns: ChatTurn[] } | null {
  let i = history.length - 1;
  while (i >= 0 && history[i].role !== 'user') i--;
  if (i < 0 || !history[i].content.trim()) return null;
  return { question: history[i].content, turns: history.slice(0, i).map((t) => ({ role: t.role, content: t.content })) };
}

export interface AnswerOptions {
  /** Label of the spend log row, e.g. "concierge-chat". */
  fn: string;
  /** The guest's language: the long first part of the prompt is the same for every guest of a language, so OpenAI can reuse it. */
  locale: string;
  timeoutMs?: number;
  /** Absolute time (Date.now() scale) after which no new attempt is started. */
  deadlineAt?: number;
}
export interface Answer { text: string; error?: string; kind?: ErrorKind }

/** One answer in one piece. text is '' when the model could not answer: the reason is in `error` (for the log, not for a guest). */
export async function answerOnce(system: string, history: Turn[], o: AnswerOptions): Promise<Answer> {
  const s = splitTurns(history);
  if (!s) return { text: '', error: 'no question to answer' };
  const r = await callAI({
    systemInstruction: system, userMessage: s.question, history: s.turns, task: 'chat', expectTokens: ANSWER_TOKENS,
    fn: o.fn, cacheKey: `concierge-${o.locale}`, timeoutMs: o.timeoutMs ?? 40_000, deadlineAt: o.deadlineAt,
  });
  const text = applyLinkPolicy(r.text || '', { campaign: 'cl-concierge' }).text;
  if (r.error || !text.trim()) {
    const error = r.error || 'the model returned an empty reply';
    console.error('[concierge]', r.kind || 'error', error.slice(0, 300));
    return { text: '', error, kind: r.kind };
  }
  return { text };
}

export type AnswerEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; gotText: boolean; complete: boolean; error?: string; kind?: ErrorKind };

/**
 * The answer in pieces. Ends with one `done` event: gotText says whether the guest was given anything, complete whether the model finished
 * (false after a cut-off connection), error/kind say why not (for the log). The pieces joined equal the link policy applied to the whole.
 */
export async function* streamAnswer(system: string, history: Turn[], o: AnswerOptions): AsyncGenerator<AnswerEvent, void, undefined> {
  const s = splitTurns(history);
  if (!s) { yield { type: 'done', gotText: false, complete: false, error: 'no question to answer' }; return; }
  const guard = new LinkPolicyStream({ campaign: 'cl-concierge' });
  let gotText = false; let complete = false; let error = ''; let kind: ErrorKind | undefined;
  try {
    for await (const ev of streamAI({
      systemInstruction: system, userMessage: s.question, history: s.turns, task: 'chat', expectTokens: ANSWER_TOKENS,
      fn: o.fn, cacheKey: `concierge-${o.locale}`, timeoutMs: o.timeoutMs ?? 45_000, deadlineAt: o.deadlineAt,
    })) {
      if (ev.type === 'delta') {
        gotText = true;
        const out = guard.push(ev.text);
        if (out) yield { type: 'delta', text: out };
      } else if (ev.type === 'error') {
        error = ev.message; kind = ev.kind;
      } else {
        complete = ev.result.ok;
        if (!ev.result.ok) error = ev.result.error || ev.result.status;
      }
    }
  } catch (e) { error = (e as Error).message; }
  const tail = guard.flush();
  if (tail) { gotText = true; yield { type: 'delta', text: tail }; }
  if (error) console.error('[concierge]', kind || (gotText ? 'cut' : 'error'), error.slice(0, 300));
  yield { type: 'done', gotText, complete, error: error || undefined, kind };
}

/** A failure another try cannot cure: the key, the credit, a refused request, the budget guard. Retrying the answer would only fail again. */
export const isFinalFailure = (kind: ErrorKind | undefined): boolean => kind === 'auth' || kind === 'billing' || kind === 'bad_request' || kind === 'not_found' || kind === 'schema';
