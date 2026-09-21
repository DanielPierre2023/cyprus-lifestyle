// WhatsApp Cloud API webhook for the Cyprus Lifestyle concierge.
//   GET  — Meta webhook verification (hub.challenge).
//   POST — incoming messages → the concierge brain → reply via the WhatsApp API.
// The same grounded brain as the web concierge; per-user memory in Postgres.
//
// Env (add in Vercel): WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
// Optional: WHATSAPP_API_VERSION (default v21.0), NEXT_PUBLIC_SITE_URL.
import { NextRequest, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runConcierge, detectLocale, type ChatMessage } from '@/lib/concierge/brain';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GRAPH = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0'}`;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');

// ── Meta webhook verification ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get('hub.mode');
  const token = p.get('hub.verify_token');
  const challenge = p.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('forbidden', { status: 403 });
}

// ── Incoming messages ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  // Always ack fast so Meta doesn't retry; do the work afterwards.
  if (body) after(() => handleWebhook(body).catch((e) => console.error('[whatsapp]', (e as Error).message)));
  return new Response('EVENT_RECEIVED', { status: 200 });
}

interface WaMessage { from: string; id: string; type: string; text?: { body: string } }

async function handleWebhook(body: Record<string, unknown>) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) { console.warn('[whatsapp] not configured'); return; }

  const entries = (body.entry as Record<string, unknown>[]) || [];
  for (const entry of entries) {
    for (const change of ((entry.changes as Record<string, unknown>[]) || [])) {
      const value = (change.value as Record<string, unknown>) || {};
      const messages = (value.messages as WaMessage[]) || [];
      for (const msg of messages) {
        if (msg.type !== 'text' || !msg.text?.body) {
          if (msg.from) await sendText(phoneId, token, msg.from, unsupportedNote());
          continue;
        }
        await handleTextMessage(phoneId, token, msg);
      }
    }
  }
}

async function handleTextMessage(phoneId: string, token: string, msg: WaMessage) {
  const wa = msg.from;
  const text = msg.text!.body.trim().slice(0, 1000);
  const sb = supabaseAdmin();

  // Load memory + dedupe Meta's retries by message id.
  let history: ChatMessage[] = [];
  let turns = 0;
  try {
    const { data } = await sb.from('concierge_wa_threads').select('messages,last_msg_id,turns').eq('wa_id', wa).maybeSingle();
    if (data) {
      if (data.last_msg_id === msg.id) return; // already handled this exact message
      if (Array.isArray(data.messages)) history = data.messages as ChatMessage[];
      turns = Number(data.turns) || 0;
    }
  } catch { /* no memory available — answer statelessly */ }

  const locale = detectLocale(text);
  const convo: ChatMessage[] = [...history, { role: 'user', content: text }];

  let reply = '';
  try {
    const { ctx, text: answer } = await runConcierge(convo, locale, { matchLanguage: true });
    reply = answer || fallbackNote(locale);
    reply = appendLink(reply, ctx, locale);
  } catch (e) {
    console.error('[whatsapp] brain', (e as Error).message);
    reply = fallbackNote(locale);
  }

  await sendText(phoneId, token, wa, reply);

  // Persist trimmed memory.
  const nextMessages = [...convo, { role: 'assistant' as const, content: reply }].slice(-12);
  try {
    await sb.from('concierge_wa_threads').upsert({
      wa_id: wa, locale, messages: nextMessages, last_msg_id: msg.id, turns: turns + 1, updated_at: new Date().toISOString(),
    });
  } catch { /* memory write is best-effort */ }
}

// Append the single most relevant on-site link (the connector), tastefully.
function appendLink(reply: string, ctx: { guides: { label: string; path: string }[]; picks: { type: string; slug: string; name: string }[] }, locale: string): string {
  const prefix = locale && locale !== 'en' ? `/${locale}` : '';
  if (ctx.guides && ctx.guides.length) {
    const g = ctx.guides[0];
    return `${reply}\n\n${g.label}: ${SITE}${prefix}${g.path}`;
  }
  if (ctx.picks && ctx.picks.length) {
    const p = ctx.picks[0];
    return `${reply}\n\n${p.name}: ${SITE}${prefix}/directory/${p.type}/${p.slug}`;
  }
  return reply;
}

function fallbackNote(locale: string): string {
  const m: Record<string, string> = {
    en: "I'm just catching my breath — please try again in a moment.",
    el: 'Μια στιγμή, δοκιμάστε ξανά σε λίγο.',
    ro: 'O clipă — încearcă din nou în câteva momente.',
    ar: 'لحظة من فضلك — حاول مرة أخرى بعد قليل.',
    de: 'Einen Moment bitte — versuchen Sie es gleich noch einmal.',
    pl: 'Chwileczkę — spróbuj ponownie za moment.',
    ru: 'Одну минуту — попробуйте ещё раз чуть позже.',
  };
  return m[locale] || m.en;
}
function unsupportedNote(): string {
  return "I can help by text for now — tell me what you're after in Cyprus and I'll take it from there.";
}

async function sendText(phoneId: string, token: string, to: string, bodyText: string) {
  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', recipient_type: 'individual', to,
        type: 'text', text: { preview_url: true, body: bodyText.slice(0, 4000) },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) console.error('[whatsapp] send', res.status, (await res.text()).slice(0, 200));
  } catch (e) {
    console.error('[whatsapp] send err', (e as Error).message);
  }
}
