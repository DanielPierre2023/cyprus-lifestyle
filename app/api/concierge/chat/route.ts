// POST /api/concierge/chat  { messages:[{role,content}], locale, cid? }
// Streaming, multi-turn concierge. Server-Sent Events: the concierge's prose
// streams token-by-token, then a final `meta` event carries the grounded picks
// and guide links. The model key stays server-side. Grounded strictly by the
// brain. If a `cid` (anonymous guest id) is sent, the concierge is personalised
// with cross-session memory, and the memory is updated after the turn.
import { NextRequest, after } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { streamConcierge, latestUserText, type ChatMessage } from '@/lib/concierge/brain';
import { loadMemory, renderMemory, updateMemory, isValidCid, type MemoryProfile } from '@/lib/concierge/memory';
import { isMemberCid, MEMBER_BLOCK } from '@/lib/concierge/membership';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'concierge-chat', 30, 60))) {
    return new Response(JSON.stringify({ error: 'busy' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }
  const body = await req.json().catch(() => ({}));
  const rawMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const locale = String(body.locale || 'en');
  const cid = isValidCid(String(body.cid || '')) ? String(body.cid) : '';
  if (!rawMessages.some((m) => m && m.role === 'user' && typeof m.content === 'string' && m.content.trim().length >= 2)) {
    return new Response(JSON.stringify({ error: 'empty' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const [memory, member] = await Promise.all([
    cid ? loadMemory(cid) : Promise.resolve({} as MemoryProfile),
    cid ? isMemberCid(cid) : Promise.resolve(false),
  ]);
  const memoryBlock = renderMemory(memory);
  const memberBlock = member ? MEMBER_BLOCK : '';
  const lastUser = latestUserText(rawMessages);

  const encoder = new TextEncoder();
  let collected = '';
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for await (const evt of streamConcierge(rawMessages, locale, memoryBlock, memberBlock)) {
          if (evt.type === 'delta') collected += evt.text;
          send(evt);
        }
      } catch (e) {
        send({ type: 'error', error: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  // After the reply is sent, quietly update what we remember about this guest.
  if (cid) after(async () => { if (collected.trim()) await updateMemory(cid, lastUser, collected, memory); });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
