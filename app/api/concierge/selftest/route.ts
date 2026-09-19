// GET /api/concierge/selftest?key=<ENRICH_SECRET>
// A LIVE check of the concierge's providers. It calls Claude (and OpenAI) with
// your real keys and reports the ACTUAL result — status code and any error
// message — instead of the generic "busy" the chat shows a visitor. This is how
// you tell a bad model id apart from a bad key apart from a quota problem.
// Gated by ENRICH_SECRET; costs a few tokens per run.
import { NextRequest, NextResponse } from 'next/server';
import { CONCIERGE_MODEL } from '@/lib/concierge/brain';
import { embedText, EMBED_MODEL } from '@/lib/concierge/embed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function testClaude(): Promise<Record<string, unknown>> {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) return { ok: false, model: CONCIERGE_MODEL, error: 'CLAUDE_API_KEY is not set on this server (add it in Vercel).' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': key },
      body: JSON.stringify({ model: CONCIERGE_MODEL, max_tokens: 8, messages: [{ role: 'user', content: 'Reply with the single word: ok' }] }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, model: CONCIERGE_MODEL, status: res.status, error: (data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}` };
    }
    const text = (data as { content?: { text?: string }[] })?.content?.[0]?.text || '';
    return { ok: true, model: CONCIERGE_MODEL, status: res.status, sample: text.trim().slice(0, 40) };
  } catch (e) {
    return { ok: false, model: CONCIERGE_MODEL, error: (e as Error).message };
  }
}

async function testOpenAI(): Promise<Record<string, unknown>> {
  if (!process.env.OPENAI_API_KEY) return { ok: false, model: EMBED_MODEL, error: 'OPENAI_API_KEY is not set on this server (add it in Vercel).' };
  const v = await embedText('cyprus lifestyle concierge self-test');
  return v
    ? { ok: true, model: EMBED_MODEL, dims: v.length }
    : { ok: false, model: EMBED_MODEL, error: 'Embedding call failed — likely an invalid OPENAI_API_KEY, no quota, or a network block.' };
}

function denyReason(req: NextRequest): string | null {
  if (!process.env.ENRICH_SECRET) return 'ENRICH_SECRET is not set on the server. Add it in Vercel, redeploy, then call with ?key=<that value>.';
  if ((req.nextUrl.searchParams.get('key') || '') !== process.env.ENRICH_SECRET) return 'Unauthorized — the ?key= value does not match ENRICH_SECRET.';
  return null;
}

export async function GET(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  const [claude, openai] = await Promise.all([testClaude(), testOpenAI()]);
  const ok = Boolean(claude.ok);
  return NextResponse.json({
    ok,
    concierge_ready: ok,
    claude,
    openai,
    hint: ok
      ? 'Claude answered — the concierge works. If the chat still shows "busy", it is serving a cached deploy: redeploy and hard-refresh.'
      : 'Claude did NOT answer — read claude.error. "model: ... not found" means the model id is wrong (set SONNET_MODEL to a current model); a 401/authentication error means the CLAUDE_API_KEY value is invalid.',
  });
}
