// lib/concierge/localeMemory.ts
// ============================================================================
// Language MEMORY for the chat channels that give no locale (WhatsApp, Telegram). Pure, no I/O.
//
// Problem: detectLocaleFull() answers 'en' for every Latin-script message it cannot positively
// identify, so a German guest who writes "ja bitte" was answered in English. Detecting each
// message on its own cannot fix that — there is nothing in two words to detect.
//
// Fix: remember the last CONFIDENTLY detected language per sender/chat (the existing `locale`
// column of concierge_wa_threads / concierge_tg_threads — no migration) and use it when the
// current message is too short or ambiguous.
//
//   confident message  → use it, and store it
//   otherwise          → the remembered language (if valid and not stale)
//   otherwise          → a channel hint (Telegram's UI language), then 'en'
//   an unconfident message NEVER overwrites the stored language.
//
// Confident = a non-Latin script with ≥ 2 letters, a Latin message the guesser assigns to de/pl/ro,
// or an English message with ≥ 2 points of English function words ("what is there to do").
// ============================================================================
import { LOCALES, isLocale, type Locale } from '@/lib/locales';
import { detectLocaleFull } from '@/lib/concierge/localeGuess';

/** A remembered language older than this is no longer trusted (people change phones, hotels, guests). */
export const MEMORY_TTL_MS = 30 * 24 * 3600 * 1000;

const STRONG_EN = new Set(['the', 'what', 'where', 'how', 'thanks', 'thank', 'please', 'there', 'would', 'could', 'which', 'with', 'about', 'any', 'near', 'looking', 'recommend']);
const WEAK_EN = new Set(['is', 'are', 'can', 'you', 'we', 'do', 'for', 'and', 'to', 'of', 'in', 'on', 'at', 'my', 'me', 'your', 'have', 'has', 'want', 'need', 'good', 'best', 'some', 'this', 'that', 'it', 'a', 'i', 'yes', 'no', 'tomorrow', 'today']);

/** Points of English evidence in a message (strong function words 2, weak 1). */
export function englishScore(text: string): number {
  let n = 0;
  for (const w of String(text || '').toLowerCase().split(/[^\p{L}']+/u).filter(Boolean)) n += STRONG_EN.has(w) ? 2 : WEAK_EN.has(w) ? 1 : 0;
  return n;
}

const countRe = (text: string, re: RegExp) => (text.match(re) || []).length;

export interface Detection { locale: Locale; confident: boolean; }

/** The message's language and whether that answer can be trusted (and therefore remembered). */
export function detectWithConfidence(text: string): Detection {
  const t = String(text || '');
  const ar = countRe(t, /[؀-ۿ]/g); const el = countRe(t, /[Ͱ-Ͽ]/g); const ru = countRe(t, /[Ѐ-ӿ]/g);
  const best = Math.max(ar, el, ru);
  if (best > 0) {
    const locale: Locale = best === ar ? 'ar' : best === el ? 'el' : 'ru';
    return { locale, confident: best >= 2 };
  }
  const guess = detectLocaleFull(t); // Latin script: de / pl / ro only when the evidence is clear, else 'en'
  if (guess !== 'en') return { locale: guess, confident: true };
  return { locale: 'en', confident: englishScore(t) >= 2 };
}

export interface ResolveInput {
  text: string;
  /** The locale stored for this sender/chat (the thread row's `locale`), if any. */
  remembered?: string | null;
  /** When that row was last written (thread `updated_at`); older than MEMORY_TTL_MS → ignored. Unknown → trusted. */
  rememberedAt?: string | number | Date | null;
  /** Weak channel hint, used only when nothing was remembered (Telegram `language_code`). */
  hint?: string | null;
  now?: number;
}
export interface ResolveResult {
  locale: Locale;
  confident: boolean;
  source: 'message' | 'memory' | 'hint' | 'default';
  /** What to write into the thread's `locale` column: the new confident language, else the unchanged remembered one, else null. */
  persist: Locale | null;
}

const validLocale = (v: unknown): Locale | null => (typeof v === 'string' && isLocale(v) ? v : null);

export function resolveChannelLocale(i: ResolveInput): ResolveResult {
  const d = detectWithConfidence(i.text);
  const rememberedLocale = validLocale(i.remembered);
  const at = i.rememberedAt == null ? null : new Date(i.rememberedAt as string).getTime();
  const now = i.now ?? Date.now();
  const fresh = !!rememberedLocale && (at == null || !Number.isFinite(at) || now - at <= MEMORY_TTL_MS);
  if (d.confident) return { locale: d.locale, confident: true, source: 'message', persist: d.locale };
  if (fresh && rememberedLocale) return { locale: rememberedLocale, confident: false, source: 'memory', persist: rememberedLocale };
  const hint = validLocale(i.hint);
  if (hint) return { locale: hint, confident: false, source: 'hint', persist: null };
  return { locale: 'en', confident: false, source: 'default', persist: null };
}

export const SUPPORTED_LOCALES = LOCALES;
