// POST /api/concierge/chat  { messages:[{role,content}], locale }
// Streaming, multi-turn concierge. Server-Sent Events: the concierge's prose
// streams token-by-token, then a final `meta` event carries the grounded picks
// and guide links. The model key stays server-side. Grounded strictly by the
// brain — it can only name real listings from our directory + knowledge base.
import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { streamConcierge, type ChatMessage } from '@/lib/concierge/brain';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'concierge-chat', 30, 60))) {
    return new Response(JSON.stringify({ error: 'busy' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }
  const body = await req.json().catch(() => ({}));
  const rawMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const locale = String(body.locale || 'en');
  if (!rawMessages.some((m) => m && m.role === 'user' && typeof m.content === 'string' && m.content.trim().length >= 2)) {
    return new Response(JSON.stringify({ error: 'empty' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for await (const evt of streamConcierge(rawMessages, locale)) send(evt);
      } catch (e) {
        send({ type: 'error', error: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
