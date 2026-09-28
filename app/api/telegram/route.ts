// Telegram Bot API webhook for the Cyprus Lifestyle concierge.
//   GET  — a plain liveness check ("ok"); Telegram needs no GET verification.
//   POST — incoming updates → the concierge brain → reply via the Telegram API.
// The same grounded brain as the web + WhatsApp concierge; per-chat memory in Postgres.
//
// Env (add in Vercel): TELEGRAM_BOT_TOKEN, TELEGRAM_SECRET_TOKEN.
// Optional: NEXT_PUBLIC_SITE_URL.
import { NextRequest, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runConcierge, detectLocale, type ChatMessage } from '@/lib/concierge/brain';

export const runtime = 'nodejs';
export const maxDuration = 60;

const API = 'https://api.telegram.org';
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');
const TG_LIMIT = 4000; // Telegram's hard limit is 4096 chars/message; we chunk well under it.

// ── Liveness check (Telegram doesn't verify GET; handy for a quick curl) ─────────
export async function GET() {
  return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

// ── Incoming updates ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Validate Telegram's secret header when configured; reject a mismatch.
  const secret = process.env.TELEGRAM_SECRET_TOKEN;
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('unauthorized', { status: 401 });
  }
  const body = await req.json().catch(() => null);
  // Always ack fast so Telegram doesn't retry; do the work afterwards.
  if (body) after(() => handleUpdate(body).catch((e) => console.error('[telegram]', (e as Error).message)));
  return new Response('OK', { status: 200 });
}

interface TgMessage { message_id: number; chat?: { id: number | string }; text?: string }
interface TgUpdate { message?: TgMessage }

async function handleUpdate(body: TgUpdate) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.warn('[telegram] not configured'); return; }

  // Only plain text messages from update.message — ignore edited/callback/non-text updates.
  const msg = body.message;
  const chatId = msg?.chat?.id;
  const text = typeof msg?.text === 'string' ? msg.text : '';
  if (chatId == null || !text.trim()) return;

  await handleTextMessage(token, String(chatId), text);
}

async function handleTextMessage(token: string, chatId: string, raw: string) {
  const text = raw.trim().slice(0, 1000);
  const sb = supabaseAdmin();

  // Load memory.
  let history: ChatMessage[] = [];
  try {
    const { data } = await sb.from('concierge_tg_threads').select('messages').eq('chat_id', chatId).maybeSingle();
    if (data && Array.isArray(data.messages)) history = data.messages as ChatMessage[];
  } catch { /* no memory available — answer statelessly */ }

  const locale = detectLocale(text);
  const convo: ChatMessage[] = [...history, { role: 'user', content: text }];

  let reply = '';
  try {
    const { ctx, text: answer } = await runConcierge(convo, locale, { matchLanguage: true });
    reply = answer || fallbackNote(locale);
    reply = appendLink(reply, ctx, locale);
  } catch (e) {
    console.error('[telegram] brain', (e as Error).message);
    reply = fallbackNote(locale);
  }

  await sendText(token, chatId, reply);

  // Persist trimmed memory (last ~10 messages).
  const nextMessages = [...convo, { role: 'assistant' as const, content: reply }].slice(-10);
  try {
    await sb.from('concierge_tg_threads').upsert({
      chat_id: chatId, locale, messages: nextMessages, updated_at: new Date().toISOString(),
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

// Send a reply, splitting anything over the limit into <=TG_LIMIT-char chunks sent
// in order (Telegram rejects a single message longer than 4096 chars).
async function sendText(token: string, chatId: string, bodyText: string) {
  for (const part of chunkText(bodyText, TG_LIMIT)) {
    try {
      const res = await fetch(`${API}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: part, disable_web_page_preview: false }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) console.error('[telegram] send', res.status, (await res.text()).slice(0, 200));
    } catch (e) {
      console.error('[telegram] send err', (e as Error).message);
    }
  }
}

// Break text into pieces no longer than `max`, preferring a paragraph, then line, then
// space boundary so a word or link is never cut in half. Always makes progress.
function chunkText(text: string, max: number): string[] {
  const s = (text || '').trim();
  if (s.length <= max) return s ? [s] : [];
  const out: string[] = [];
  let rest = s;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}
