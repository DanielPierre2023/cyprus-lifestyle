// GET /api/concierge/selftest?key=<ENRICH_SECRET>
// A LIVE check of the concierge's providers. It asks the chat model for one word, the same way the chat does (streamed), and embeds one
// sentence, with your real key, and reports the ACTUAL result — the error class and message, and how long the first word took — instead of the
// generic "busy" the chat shows a visitor. This is how you tell a bad model id apart from a bad key apart from a spend limit apart from a slow model.
// Gated by ENRICH_SECRET; costs a fraction of a cent per run.
import { NextRequest, NextResponse } from 'next/server';
import { CONCIERGE_MODEL } from '@/lib/concierge/brain';
import { embedText, EMBED_MODEL } from '@/lib/concierge/embed';
import { aiRoute, streamAI } from '@/lib/ai';
import { keyGateDeny as denyReason } from '@/lib/auth/keyGate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function testChat(): Promise<Record<string, unknown>> {
  const route = aiRoute('selftest');
  if (!process.env.OPENAI_API_KEY) return { ok: false, model: CONCIERGE_MODEL, error: 'OPENAI_API_KEY is not set on this server (add it in Vercel).' };
  const t0 = Date.now();
  let firstWordMs: number | null = null; let text = '';
  try {
    for await (const ev of streamAI({ systemInstruction: 'You answer with one word and nothing else.', userMessage: 'Reply with the single word: ok', task: 'selftest', expectTokens: 8, timeoutMs: 25_000, fn: 'concierge-selftest' })) {
      if (ev.type === 'delta') { if (firstWordMs === null) firstWordMs = Date.now() - t0; text += ev.text; }
      else if (ev.type === 'error') return { ok: false, model: route.model, effort: route.effort, kind: ev.kind, error: ev.message };
      else return { ok: ev.result.ok, model: route.model, effort: ev.result.effortUsed, first_word_ms: firstWordMs, total_ms: Date.now() - t0, sample: text.trim().slice(0, 40), ...(ev.result.ok ? {} : { error: ev.result.error }) };
    }
    return { ok: false, model: route.model, error: 'the model sent nothing' };
  } catch (e) {
    return { ok: false, model: route.model, error: (e as Error).message };
  }
}

async function testEmbedding(): Promise<Record<string, unknown>> {
  if (!process.env.OPENAI_API_KEY) return { ok: false, model: EMBED_MODEL, error: 'OPENAI_API_KEY is not set on this server (add it in Vercel).' };
  const v = await embedText('cyprus lifestyle concierge self-test');
  return v
    ? { ok: true, model: EMBED_MODEL, dims: v.length }
    : { ok: false, model: EMBED_MODEL, error: 'Embedding call failed — likely an invalid OPENAI_API_KEY, no credit left, or a network block.' };
}

export async function GET(req: NextRequest) {
  const deny = await denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  const [chat, embeddings] = await Promise.all([testChat(), testEmbedding()]);
  const ok = Boolean(chat.ok);
  return NextResponse.json({
    ok,
    concierge_ready: ok,
    chat,
    embeddings,
    hint: ok
      ? 'The chat model answered — the concierge works. first_word_ms is how long the model takes to write its first word (with the routing table\'s "chat" effort; the chat then shows each sentence as soon as it is complete); if it feels slow, set AI_EFFORT_CHAT=minimal in Vercel. If the chat still shows "busy", it is serving a cached deploy: redeploy and hard-refresh.'
      : 'The chat model did NOT answer — read chat.kind and chat.error. "auth": the OPENAI_API_KEY value is invalid. "billing": credit or spend limit reached (OpenAI dashboard), or the app\'s own AI budget (AI_DAILY_BUDGET_USD / AI_MONTHLY_BUDGET_USD / AI_KILL_SWITCH). "not_found": the model id is wrong (OPENAI_MODEL_LUNA). "timeout": the model did not answer in 25 s.',
  });
}
