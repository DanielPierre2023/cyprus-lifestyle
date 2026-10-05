// lib/socialPlan.ts
// Pure (no I/O) rules for the Facebook + Instagram auto-posting: hashtags, captions, limits, retry timing.
// Everything here is unit-tested (scripts/tests/social.plan.test.ts); lib/socialAuto.ts plugs in the network.
//
// What "SEO for social" can honestly mean (the words below are the levers that exist):
//   • the first line is the hook — Facebook cuts after ~125 characters, Instagram shows ~125 before "more";
//   • a keyword-rich, natural caption (Instagram search reads captions + alt text);
//   • a few relevant hashtags (Instagram recommends 3–5, hard limit 30; Facebook gains little from more than 3);
//   • alt text on the Instagram image (accessibility + search);
//   • a correct link preview on Facebook (the page's Open Graph tags — headline, description, 1200×630 image);
//   • a trackable link (UTM) so the visits show up in the analytics.
import type { Locale } from '@/lib/locales';

export type SocialPlatform = 'facebook' | 'instagram';

export const LIMITS = {
  instagramCaption: 2200,
  instagramHashtags: 30,
  hook: 125,
  facebookMessage: 600,
  hashtagLength: 40,
  altText: 1000,
} as const;

/** How many hashtags each platform gets (a deliberate choice, see the header). */
export const HASHTAG_COUNT: Record<SocialPlatform, number> = { facebook: 3, instagram: 5 };

export interface SocialSettings {
  enabled: boolean;
  facebook: boolean;
  instagram: boolean;
  maxPerDay: Record<SocialPlatform, number>;
  minGapMinutes: number;
  maxAgeHours: number;
}
export const DEFAULT_SETTINGS: SocialSettings = {
  enabled: true, facebook: true, instagram: true, maxPerDay: { facebook: 8, instagram: 4 }, minGapMinutes: 30, maxAgeHours: 36,
};

const num = (v: unknown, d: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};
/** Read the site_settings value defensively: anything missing or odd falls back to the default. */
export function parseSettings(raw: unknown): SocialSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const per = (v.max_per_day && typeof v.max_per_day === 'object' ? v.max_per_day : {}) as Record<string, unknown>;
  return {
    enabled: v.enabled === undefined ? DEFAULT_SETTINGS.enabled : v.enabled === true,
    facebook: v.facebook === undefined ? true : v.facebook === true,
    instagram: v.instagram === undefined ? true : v.instagram === true,
    maxPerDay: { facebook: num(per.facebook, 8, 0, 50), instagram: num(per.instagram, 4, 0, 25) },
    minGapMinutes: num(v.min_gap_minutes, 30, 0, 720),
    maxAgeHours: num(v.max_age_hours, 36, 1, 24 * 30),
  };
}

// ── hashtags ─────────────────────────────────────────────────────────────────

/** "Limassol Marina" → "LimassolMarina"; keeps letters/digits of any script (Greek, Arabic, Cyrillic …). */
export function toHashtag(raw: string): string | null {
  const words = String(raw || '').normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (words.length === 0 || words.length > 4) return null;                       // a sentence is not a hashtag
  const tag = words.map((w) => (/^[\p{Ll}]/u.test(w) ? w.charAt(0).toLocaleUpperCase() + w.slice(1) : w)).join('');
  if (tag.length < 3 || tag.length > LIMITS.hashtagLength || /^\p{N}+$/u.test(tag)) return null;   // too short/long, or only digits
  return `#${tag}`;
}

const GENERIC = new Set(['cyprus', 'news', 'article', 'lifestyle', 'blog', 'island', 'κύπρος', 'кипр', 'cipru', 'zypern', 'cypr', 'قبرص']);

/** The article's own tags first (most specific), then place and section, then the brand; de-duplicated, capped. */
export function buildHashtags(input: { tags?: string[]; county?: string | null; category?: string | null; brand?: string[]; count: number }): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string | null | undefined, allowGeneric = false) => {
    if (!raw) return;
    const h = toHashtag(raw);
    if (!h) return;
    const key = h.toLocaleLowerCase();
    if (seen.has(key)) return;
    if (!allowGeneric && GENERIC.has(key.slice(1))) return;
    seen.add(key); out.push(h);
  };
  const brand = (input.brand && input.brand.length ? input.brand : ['Cyprus', 'CyprusLifestyle']);
  // reserve room for the brand tag(s) at the end: specific tags must not crowd it out
  const reserve = Math.min(brand.length, input.count >= 5 ? 2 : 1);
  const room = Math.max(0, input.count - reserve);
  const specific: string[] = [];
  for (const t of input.tags || []) specific.push(t);
  if (input.county) specific.push(input.county);
  if (input.category) specific.push(input.category);
  for (const s of specific) { if (out.length >= room) break; add(s); }
  for (const b of brand) { if (out.length >= input.count) break; add(b, true); }
  return out.slice(0, Math.min(input.count, LIMITS.instagramHashtags));
}

// ── localized fixed phrases ──────────────────────────────────────────────────

export const CTA_IG: Record<Locale, string> = {
  en: 'Read the full story: link in bio.', de: 'Die ganze Geschichte: Link in der Bio.', el: 'Διαβάστε ολόκληρη την ιστορία: σύνδεσμος στο βιογραφικό.',
  pl: 'Cała historia: link w bio.', ro: 'Povestea completă: link în bio.', ru: 'Читайте полностью: ссылка в профиле.', ar: 'اقرأ القصة كاملة: الرابط في السيرة الذاتية.',
};
export const SPONSORED_LABEL: Record<Locale, string> = {
  en: 'Sponsored', de: 'Anzeige', el: 'Χορηγούμενο', pl: 'Materiał sponsorowany', ro: 'Conținut sponsorizat', ru: 'Реклама', ar: 'محتوى برعاية',
};

// ── text helpers ─────────────────────────────────────────────────────────────

/** Collapse whitespace, strip HTML and the characters that make AI text look like AI text (em/en dashes). */
export function cleanText(s: string): string {
  return String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[–—]/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .trim();
}

/** Cut at a sentence/word boundary, never mid-word; adds an ellipsis only when it cut. */
export function clip(s: string, max: number): string {
  const t = cleanText(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentence > max * 0.35) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:·-]+$/u, '')}…`;
}

export function withUtm(url: string, platform: SocialPlatform, campaign = 'autopost'): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', platform);
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}

// ── the posts ────────────────────────────────────────────────────────────────

export interface ArticleFacts {
  title: string; description: string; tags: string[]; county?: string | null; category?: string | null; sponsored?: boolean; sponsorName?: string | null; locale: Locale;
}
export interface Generated { hook?: string; body?: string; altText?: string }

export interface BuiltPost { text: string; hashtags: string[]; altText?: string; usedAi: boolean }

const sponsoredPrefix = (a: ArticleFacts) => (a.sponsored ? `${SPONSORED_LABEL[a.locale] || SPONSORED_LABEL.en}${a.sponsorName ? ` · ${cleanText(a.sponsorName)}` : ''}\n\n` : '');

/** Facebook: hook + short body, then 3 hashtags. The link goes in the link field (Facebook builds the preview card from it). */
export function buildFacebookPost(a: ArticleFacts, g: Generated | null): BuiltPost {
  const hashtags = buildHashtags({ tags: a.tags, county: a.county, category: a.category, count: HASHTAG_COUNT.facebook });
  const hook = clip(g?.hook || a.title, LIMITS.hook);
  const body = clip(g?.body || a.description, 300);
  const parts = [hook, body && body !== hook ? body : ''].filter(Boolean).join('\n\n');
  const prefix = sponsoredPrefix(a);
  const text = clip(`${prefix}${parts}`, LIMITS.facebookMessage - hashtags.join(' ').length - 2).trimEnd();
  return { text: `${text}\n\n${hashtags.join(' ')}`.trim(), hashtags, usedAi: !!g };
}

/** Instagram: hook line (≤125), body, localized "link in bio", hashtags; always within 2,200 characters and 30 hashtags. */
export function buildInstagramPost(a: ArticleFacts, g: Generated | null): BuiltPost {
  const hashtags = buildHashtags({ tags: a.tags, county: a.county, category: a.category, count: HASHTAG_COUNT.instagram });
  const hook = clip(g?.hook || a.title, LIMITS.hook);
  const body = clip(g?.body || a.description, 600);
  const cta = CTA_IG[a.locale] || CTA_IG.en;
  const tagLine = hashtags.join(' ');
  const prefix = sponsoredPrefix(a);
  let text = [`${prefix}${hook}`, body && body !== hook ? body : '', cta, tagLine].filter(Boolean).join('\n\n');
  if (text.length > LIMITS.instagramCaption) text = [`${prefix}${hook}`, cta, tagLine].filter(Boolean).join('\n\n');
  const altText = clip(g?.altText || `${a.title}${a.county ? ` · ${a.county}` : ''}`, LIMITS.altText);
  return { text: text.slice(0, LIMITS.instagramCaption), hashtags, altText, usedAi: !!g };
}

/** Pull {hook, body, altText} out of the model's reply; anything unusable → null (the plain fallback is used). */
export function parseGenerated(raw: string): Generated | null {
  const s = String(raw || '');
  const start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(s.slice(start, end + 1)) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? cleanText(v) : '');
    const g: Generated = { hook: str(o.hook), body: str(o.body), altText: str(o.altText ?? o.alt_text) };
    return g.hook || g.body ? g : null;
  } catch { return null; }
}

// ── scheduling / retries ─────────────────────────────────────────────────────

export interface RecentPosts { countLast24h: number; lastPostedAt: Date | null }

/** May this platform post right now? Returns the reason it may not (and, when known, when to look again). */
export function postingGate(s: SocialSettings, platform: SocialPlatform, recent: RecentPosts, now: Date): { ok: true } | { ok: false; reason: 'off' | 'daily_limit' | 'gap'; retryAt?: Date } {
  if (!s.enabled || !s[platform]) return { ok: false, reason: 'off' };
  if (recent.countLast24h >= s.maxPerDay[platform]) return { ok: false, reason: 'daily_limit' };
  if (recent.lastPostedAt && s.minGapMinutes > 0) {
    const next = new Date(recent.lastPostedAt.getTime() + s.minGapMinutes * 60_000);
    if (next > now) return { ok: false, reason: 'gap', retryAt: next };
  }
  return { ok: true };
}

export const MAX_ATTEMPTS = 5;
/** 10 min, 20, 40, 80 … capped at 6 h. */
export const backoffMs = (attempt: number) => Math.min(6 * 3600_000, 10 * 60_000 * 2 ** Math.max(0, attempt - 1));

/** Meta error codes/messages that say "try later" vs "this will never work until a person fixes it". */
export function classifyMetaError(code: number | undefined, message: string | undefined): 'transient' | 'auth' | 'permanent' {
  const m = String(message || '');
  if (code === 190 || code === 102 || /access token|session has expired|token.*(invalid|expired)|OAuthException.*190/i.test(m)) return 'auth';
  if (code === 10 || code === 200 || code === 283 || /permission|not authorized|requires/i.test(m)) return 'auth';
  if ([1, 2, 4, 17, 32, 341, 368, 613].includes(code ?? -1) || /rate limit|too many|try again|retry|temporar|timeout|timed out|unavailable|fetch failed|ECONN|5\d\d\b|not (yet )?(ready|available)|processing/i.test(m)) return 'transient';
  return 'permanent';
}

/** Posts older than the freshness window are not worth posting (unless queued on purpose from the admin page). */
export function isStale(publishedAt: string | null | undefined, maxAgeHours: number, now: Date, backlog: boolean): boolean {
  if (backlog || !publishedAt) return false;
  return now.getTime() - new Date(publishedAt).getTime() > maxAgeHours * 3600_000;
}

/** Instagram wants JPEG within 4:5 … 1.91:1. Our own card is 4:5, 1080×1350. */
export const IG_SIZE = { width: 1080, height: 1350 } as const;
export function igAspectOk(w: number, h: number): boolean {
  if (!w || !h) return false;
  const r = w / h;
  return r >= 0.8 - 1e-9 && r <= 1.91 + 1e-9;
}
