// WhatsApp Cloud API webhook for the Cyprus Lifestyle concierge.
//   GET  — Meta webhook verification (hub.challenge).
//   POST — incoming messages → the concierge brain → reply via the WhatsApp API.
// The same grounded brain as the web concierge; per-user memory in Postgres.
//
// Env (add in Vercel): WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
// REQUIRED for incoming messages: WHATSAPP_APP_SECRET (Meta → App settings → Basic → App secret).
//   Every POST must carry a valid X-Hub-Signature-256 over the raw body; without the secret
//   the endpoint refuses all POSTs (fail-closed) so nobody can forge messages or burn tokens.
// Optional: WHATSAPP_API_VERSION (default v21.0), NEXT_PUBLIC_SITE_URL.
import { NextRequest, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runConcierge, type ChatMessage } from '@/lib/concierge/brain';
import { detectLocaleFull } from '@/lib/concierge/localeGuess';
import { appendChannelLinks } from '@/lib/concierge/channelLinks';
import { verifyMetaSignature } from '@/lib/auth/webhookSignature';
import { rateLimitKey } from '@/lib/ratelimit';
import { publicAiCeilingDeny } from '@/lib/spendGuard';

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
  const appSecret = process.env.WHATSAPP_APP_SECRET || '';
  if (!appSecret) {
    console.error('[whatsapp] WHATSAPP_APP_SECRET is not set — refusing unsigned webhook traffic');
    return new Response('not configured', { status: 503 });
  }
  // Verify against the RAW body (re-serialised JSON would not match Meta's signature).
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), appSecret)) {
    return new Response('invalid signature', { status: 401 });
  }
  let body: Record<string, unknown> | null = null;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { body = null; }
  // Always ack fast so Meta doesn't retry; do the work afterwards.
  if (body) after(() => handleWebhook(body as Record<string, unknown>).catch((e) => console.error('[whatsapp]', (e as Error).message)));
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
  // Per-sender throttle (a verified sender can still flood the model): 12 messages / minute.
  if (!(await rateLimitKey(wa, 'wa-msg', 12, 60))) return;
  if (await publicAiCeilingDeny('chat')) return;
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

  const locale = detectLocaleFull(text); // script first, then a Latin-script guess (de/pl/ro), else en
  const convo: ChatMessage[] = [...history, { role: 'user', content: text }];

  let reply = '';
  try {
    const { ctx, text: answer } = await runConcierge(convo, locale, { matchLanguage: true });
    reply = answer || fallbackNote(locale);
    reply = appendChannelLinks(reply, ctx, locale, SITE);
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
