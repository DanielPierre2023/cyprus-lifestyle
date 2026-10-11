// Telegram Bot API webhook for the Cyprus Lifestyle concierge.
//   GET  — a plain liveness check ("ok"); Telegram needs no GET verification.
//   POST — incoming updates → the concierge brain → reply via the Telegram API.
// The same grounded brain as the web + WhatsApp concierge; per-chat memory in Postgres.
//
// Env (add in Vercel): TELEGRAM_BOT_TOKEN, TELEGRAM_SECRET_TOKEN (REQUIRED — pass the same
// value as `secret_token` when calling setWebhook; without it every POST is refused).
// Optional: NEXT_PUBLIC_SITE_URL.
import { NextRequest, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runConcierge, type ChatMessage } from '@/lib/concierge/brain';
import { resolveChannelLocale, settleLocale } from '@/lib/concierge/localeMemory';
import { composeChannelReply } from '@/lib/concierge/channelLinks';
import { safeEqual } from '@/lib/auth/secretMatch';
import { rateLimitKey } from '@/lib/ratelimit';
import { publicAiCeilingDeny } from '@/lib/spendGuard';

export const runtime = 'nodejs';
export const maxDuration = 60;

const API = 'https://api.telegram.org';
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');
const TG_LIMIT = 4000; // Telegram's hard limit is 4096 chars/message; we chunk well under it.

// Resolve the user's Telegram app language to one of our seven editions (else English).
const UI_LANGS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
function tgLocale(code?: string): string {
  const c = (code || '').slice(0, 2).toLowerCase();
  return UI_LANGS.includes(c) ? c : 'en';
}

// /start & /help welcome, per edition (the name is never translated).
const WELCOME: Record<string, string> = {
  en: 'Welcome to Cyprus Lifestyle — your personal concierge for the island. Ask me where to dine, stay, swim or go out; about property, relocation, residency or business; or the practical, from a late-night pharmacy to an emergency number. Tell me what you need, in any language.',
  el: 'Καλώς ήρθατε στο Cyprus Lifestyle — ο προσωπικός σας κονσιέρζ για το νησί. Ρωτήστε με πού να δειπνήσετε, να μείνετε, να κολυμπήσετε ή να βγείτε· για ακίνητα, μετεγκατάσταση, διαμονή ή επιχειρήσεις· ή τα πρακτικά, από ένα διανυκτερεύον φαρμακείο έως έναν αριθμό έκτακτης ανάγκης. Πείτε μου τι χρειάζεστε, σε οποιαδήποτε γλώσσα.',
  ro: 'Bine ați venit la Cyprus Lifestyle — concierge-ul dumneavoastră personal pentru insulă. Întrebați-mă unde să luați masa, să vă cazați, să înotați sau să ieșiți; despre proprietăți, relocare, rezidență sau afaceri; ori despre lucruri practice, de la o farmacie non-stop la un număr de urgență. Spuneți-mi de ce aveți nevoie, în orice limbă.',
  ar: 'مرحبًا بكم في Cyprus Lifestyle — الكونسيرج الشخصي لكم في الجزيرة. اسألوني أين تتناولون العشاء أو تقيمون أو تسبحون أو تخرجون؛ عن العقارات والانتقال والإقامة والأعمال؛ أو الأمور العملية، من صيدلية مناوبة إلى رقم للطوارئ. أخبروني بما تحتاجون، بأي لغة.',
  de: 'Willkommen bei Cyprus Lifestyle — Ihr persönlicher Concierge für die Insel. Fragen Sie mich, wo Sie essen, übernachten, schwimmen oder ausgehen können; nach Immobilien, Umzug, Aufenthalt oder Business; oder nach Praktischem, von der Nachtapotheke bis zur Notrufnummer. Sagen Sie mir, was Sie brauchen — in jeder Sprache.',
  pl: 'Witamy w Cyprus Lifestyle — Twój osobisty concierge na wyspie. Zapytaj mnie, gdzie zjeść, się zatrzymać, popływać czy wyjść; o nieruchomości, przeprowadzkę, rezydencję lub biznes; albo o sprawy praktyczne, od nocnej apteki po numer alarmowy. Powiedz, czego potrzebujesz — w dowolnym języku.',
  ru: 'Добро пожаловать в Cyprus Lifestyle — ваш личный консьерж на острове. Спросите, где поужинать, остановиться, искупаться или провести вечер; о недвижимости, переезде, ВНЖ или бизнесе; или о практичном — от круглосуточной аптеки до номера экстренной службы. Скажите, что вам нужно, на любом языке.',
};

// Topic shortcuts (the /setcommands menu). Each maps to a natural query, localized so
// the concierge answers in the user's language.
const SHORTCUTS: Record<string, Record<string, string>> = {
  '/dine': { en: 'Where should I dine in Cyprus tonight?', el: 'Πού να δειπνήσω στην Κύπρο απόψε;', ro: 'Unde să iau cina în Cipru diseară?', ar: 'أين أتناول العشاء في قبرص الليلة؟', de: 'Wo soll ich heute Abend in Zypern essen?', pl: 'Gdzie zjeść dziś wieczorem na Cyprze?', ru: 'Где поужинать на Кипре сегодня вечером?' },
  '/stay': { en: 'Where should I stay in Cyprus?', el: 'Πού να μείνω στην Κύπρο;', ro: 'Unde să mă cazez în Cipru?', ar: 'أين أقيم في قبرص؟', de: 'Wo soll ich in Zypern übernachten?', pl: 'Gdzie się zatrzymać na Cyprze?', ru: 'Где остановиться на Кипре?' },
  '/relocate': { en: 'How do I move to Cyprus — property, residency and tax?', el: 'Πώς να μετεγκατασταθώ στην Κύπρο — ακίνητα, διαμονή και φορολογία;', ro: 'Cum mă mut în Cipru — proprietăți, rezidență și taxe?', ar: 'كيف أنتقل للعيش في قبرص — العقارات والإقامة والضرائب؟', de: 'Wie ziehe ich nach Zypern um — Immobilien, Aufenthalt und Steuern?', pl: 'Jak przeprowadzić się na Cypr — nieruchomości, rezydencja i podatki?', ru: 'Как переехать на Кипр — недвижимость, ВНЖ и налоги?' },
  '/events': { en: "What's on in Cyprus this week?", el: 'Τι εκδηλώσεις έχει η Κύπρος αυτή την εβδομάδα;', ro: 'Ce evenimente sunt în Cipru săptămâna aceasta?', ar: 'ما الفعاليات في قبرص هذا الأسبوع؟', de: 'Was ist diese Woche in Zypern los?', pl: 'Co dzieje się na Cyprze w tym tygodniu?', ru: 'Какие события на Кипре на этой неделе?' },
};

// ── Liveness check (Telegram doesn't verify GET; handy for a quick curl) ─────────
export async function GET() {
  return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

// ── Incoming updates ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // The secret header is mandatory (fail-closed): without it anyone could POST forged
  // updates and spend model tokens or impersonate a chat. Constant-time comparison.
  const secret = process.env.TELEGRAM_SECRET_TOKEN || '';
  if (!secret) {
    console.error('[telegram] TELEGRAM_SECRET_TOKEN is not set — refusing unsigned webhook traffic');
    return new Response('not configured', { status: 503 });
  }
  if (!safeEqual(req.headers.get('x-telegram-bot-api-secret-token') || '', secret)) {
    return new Response('unauthorized', { status: 401 });
  }
  const body = await req.json().catch(() => null);
  // Always ack fast so Telegram doesn't retry; do the work afterwards.
  if (body) after(() => handleUpdate(body).catch((e) => console.error('[telegram]', (e as Error).message)));
  return new Response('OK', { status: 200 });
}

interface TgMessage { message_id: number; chat?: { id: number | string }; text?: string; from?: { language_code?: string } }
interface TgUpdate { message?: TgMessage }

async function handleUpdate(body: TgUpdate) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.warn('[telegram] not configured'); return; }

  // Only plain text messages from update.message — ignore edited/callback/non-text updates.
  const msg = body.message;
  const chatId = msg?.chat?.id;
  const text = typeof msg?.text === 'string' ? msg.text : '';
  if (chatId == null || !text.trim()) return;

  // Per-chat throttle: 12 messages / minute.
  if (!(await rateLimitKey(String(chatId), 'tg-msg', 12, 60))) return;
  if (await publicAiCeilingDeny('chat')) return;

  await handleTextMessage(token, String(chatId), text, tgLocale(msg?.from?.language_code));
}

async function handleTextMessage(token: string, chatId: string, raw: string, uiLocale: string) {
  const text = raw.trim().slice(0, 1000);

  // Slash commands. /start & /help send a fixed, localized welcome (in the user's
  // Telegram language). Topic shortcuts map to a natural, localized query so the
  // concierge answers in that language. Anything else flows to the brain unchanged.
  const cmd = text.toLowerCase().split(/[\s@]/)[0];
  if (cmd === '/start' || cmd === '/help') {
    await sendText(token, chatId, `${WELCOME[uiLocale] || WELCOME.en}\n\n${SITE}`);
    return;
  }
  const query = SHORTCUTS[cmd] ? (SHORTCUTS[cmd][uiLocale] || SHORTCUTS[cmd].en) : text;

  const sb = supabaseAdmin();

  // Load memory.
  let history: ChatMessage[] = [];
  let rememberedLocale: string | null = null; let rememberedAt: string | null = null;
  try {
    const { data } = await sb.from('concierge_tg_threads').select('messages,locale,updated_at').eq('chat_id', chatId).maybeSingle();
    if (data && Array.isArray(data.messages)) history = data.messages as ChatMessage[];
    if (data) { rememberedLocale = typeof data.locale === 'string' ? data.locale : null; rememberedAt = typeof data.updated_at === 'string' ? data.updated_at : null; }
  } catch { /* no memory available — answer statelessly */ }

  // Language: this message when clearly identifiable; a short / ambiguous one keeps the chat's last confident language;
  // a brand-new chat falls back to the Telegram UI language, then English.
  const lang = resolveChannelLocale({ text: query, remembered: rememberedLocale, rememberedAt, hint: uiLocale });
  let locale: string = lang.locale;
  let persistLocale: string | null = lang.persist;
  const convo: ChatMessage[] = [...history, { role: 'user', content: query }];

  let reply = '';
  try {
    const { ctx, text: answer } = await runConcierge(convo, locale, { matchLanguage: true });
    // The reply is long enough to tell its language reliably; when we only guessed, links and memory follow the reply.
    const settled = settleLocale(lang, answer);
    locale = settled.locale; persistLocale = settled.persist;
    reply = composeChannelReply(answer || fallbackNote(locale), ctx, locale, SITE);
  } catch (e) {
    console.error('[telegram] brain', (e as Error).message);
    reply = fallbackNote(locale);
  }

  await sendText(token, chatId, reply);

  // Persist trimmed memory (last ~10 messages).
  const nextMessages = [...convo, { role: 'assistant' as const, content: reply }].slice(-10);
  try {
    await sb.from('concierge_tg_threads').upsert({
      chat_id: chatId, locale: persistLocale, messages: nextMessages, updated_at: new Date().toISOString(),
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
