// lib/socialAuto.ts
// ============================================================================
// Facebook + Instagram auto-posting.
//
//   publish (any way) ──► DB trigger ──► social_outbox ──► processOutbox() ──► Meta Graph API
//                                             ▲                  │
//        Admin → Social: "Post now" / "Post earlier articles"    └─► social_posts (the history the admin page shows)
//
// processOutbox is called every ~3 minutes by the existing worker job (app/api/cron/worker) and by the admin buttons.
// It is safe to run twice at once: a row is CLAIMED (pending → processing) with a conditional update before any work.
// Rules (see lib/socialPlan.ts): daily limits per platform, minimum gap between posts, freshness window, retries with
// back-off, and a stop on "token/permission" errors that need a person.
// ============================================================================
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai';
import { humanizeText, type Lang } from '@/lib/antiAi';
import { LOCALES, LOCALE_NAME, type Locale } from '@/lib/locales';
import { isOwnedImage } from '@/lib/images';
import { logServerError } from '@/lib/monitor.server';
import {
  MAX_ATTEMPTS, backoffMs, buildFacebookPost, buildInstagramPost, classifyMetaError, cleanText, isStale, parseGenerated, parseSettings,
  postingGate, withUtm, type ArticleFacts, type BuiltPost, type Generated, type SocialPlatform, type SocialSettings,
} from '@/lib/socialPlan';

const GRAPH = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v26.0'}`;
const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/+$/, '');
const articleUrl = (slug: string, locale: Locale) => `${site()}${locale === 'en' ? '' : `/${locale}`}/article/${slug}`;

export const SETTINGS_KEY = 'social_autopost';

export async function loadSettings(sb: SupabaseClient): Promise<SocialSettings> {
  const { data } = await sb.from('site_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  return parseSettings(data?.value);
}
export async function saveSettings(sb: SupabaseClient, patch: Record<string, unknown>): Promise<SocialSettings> {
  const { data } = await sb.from('site_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  const cur = (data?.value && typeof data.value === 'object' ? data.value : {}) as Record<string, unknown>;
  const merged = { ...cur, ...patch };
  // validate through the same parser, then store in the stored (snake_case) shape
  const s = parseSettings(merged);
  const value = { enabled: s.enabled, facebook: s.facebook, instagram: s.instagram, max_per_day: s.maxPerDay, min_gap_minutes: s.minGapMinutes, max_age_hours: s.maxAgeHours };
  await sb.from('site_settings').upsert({ key: SETTINGS_KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  return s;
}

// ── configuration / connection ───────────────────────────────────────────────

export function configured(): Record<SocialPlatform, boolean> {
  const t = !!process.env.META_PAGE_ACCESS_TOKEN;
  return { facebook: t && !!process.env.META_PAGE_ID, instagram: t && !!process.env.META_IG_USER_ID };
}

interface GraphErr { error?: { message?: string; code?: number } }
async function graph(path: string, init?: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; query?: Record<string, string> }): Promise<{ ok: boolean; data: Record<string, unknown> & GraphErr; status: number }> {
  const token = process.env.META_PAGE_ACCESS_TOKEN || '';
  const q = new URLSearchParams({ ...(init?.query || {}), access_token: token });
  const method = init?.method || 'GET';
  const res = await fetch(`${GRAPH()}/${path}${method === 'GET' ? `?${q}` : ''}`, {
    method,
    ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(init?.body || {}), access_token: token }) } : {}),
    signal: AbortSignal.timeout(25_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & GraphErr;
  return { ok: res.ok, data, status: res.status };
}

export async function testConnection(): Promise<Record<SocialPlatform, { ok: boolean; detail: string }>> {
  const cfg = configured();
  const out: Record<SocialPlatform, { ok: boolean; detail: string }> = {
    facebook: { ok: false, detail: 'Not configured (META_PAGE_ACCESS_TOKEN, META_PAGE_ID).' },
    instagram: { ok: false, detail: 'Not configured (META_PAGE_ACCESS_TOKEN, META_IG_USER_ID).' },
  };
  try {
    if (cfg.facebook) {
      const r = await graph(process.env.META_PAGE_ID!, { query: { fields: 'name' } });
      out.facebook = r.ok ? { ok: true, detail: `Connected to the page “${String(r.data.name || '')}”.` } : { ok: false, detail: r.data.error?.message || `Error ${r.status}` };
    }
    if (cfg.instagram) {
      const r = await graph(process.env.META_IG_USER_ID!, { query: { fields: 'username' } });
      out.instagram = r.ok ? { ok: true, detail: `Connected to @${String(r.data.username || '')}.` } : { ok: false, detail: r.data.error?.message || `Error ${r.status}` };
    }
  } catch (e) {
    const msg = (e as Error).message;
    if (cfg.facebook && !out.facebook.ok) out.facebook.detail = msg;
    if (cfg.instagram && !out.instagram.ok) out.instagram.detail = msg;
  }
  return out;
}

// ── the article ──────────────────────────────────────────────────────────────

interface ArticleRow {
  id: string; slug: string; status: string; published_at: string | null; skip_facebook: boolean | null; cover_image: string | null;
  category: string | null; county: string | null; sponsored: boolean | null; sponsor_name: string | null; source_lang: string | null;
}
export interface LoadedArticle { row: ArticleRow; locale: Locale; facts: ArticleFacts }

export async function loadArticle(sb: SupabaseClient, id: string): Promise<LoadedArticle | null> {
  const { data: base } = await sb.from('blog_posts')
    .select('id, slug, status, published_at, skip_facebook, cover_image, category, county, sponsored, sponsor_name, source_lang').eq('id', id).maybeSingle();
  if (!base) return null;
  const row = base as unknown as ArticleRow;
  const src = (LOCALES as readonly string[]).includes(String(row.source_lang)) ? (row.source_lang as Locale) : 'en';
  const cols = (l: string) => `title_${l}, excerpt_${l}, summary_${l}, seo_description_${l}, tags_${l}`;
  const { data: txt } = await sb.from('blog_posts').select(`${cols(src)}${src === 'en' ? '' : `, ${cols('en')}`}`).eq('id', id).maybeSingle();
  const t = (txt || {}) as unknown as Record<string, unknown>;
  // Post in the language the article was written in; if that edition has no headline, fall back to English.
  const locale: Locale = src !== 'en' && !t[`title_${src}`] ? 'en' : src;
  const pick = (k: string) => String(t[`${k}_${locale}`] || t[`${k}_en`] || '');
  const tagsRaw = (t[`tags_${locale}`] as string[] | null) || (t.tags_en as string[] | null) || [];
  const facts: ArticleFacts = {
    title: cleanText(pick('title')),
    description: cleanText(pick('seo_description') || pick('summary') || pick('excerpt')),
    tags: Array.isArray(tagsRaw) ? tagsRaw : [],
    county: row.county, category: row.category, sponsored: !!row.sponsored, sponsorName: row.sponsor_name, locale,
  };
  return { row, locale, facts };
}

// ── the words ────────────────────────────────────────────────────────────────

async function generate(platform: SocialPlatform, facts: ArticleFacts): Promise<Generated | null> {
  const where = [facts.county, 'Cyprus'].filter(Boolean).join(', ');
  const rules = platform === 'instagram'
    ? 'hook: ONE line, max 110 characters, concrete and curiosity-building, with the main keyword near the start. body: 2 short sentences (max 380 characters) that give a reason to read the story, using natural keywords a reader would search for. altText: one plain sentence (max 160 characters) describing what a photo for this story would show.'
    : 'hook: ONE line, max 110 characters, concrete and inviting. body: 1 or 2 short sentences (max 240 characters) that tell the reader what they will learn. altText: leave an empty string.';
  const system = [
    `You write social copy for Cyprus Lifestyle, a luxury magazine about Cyprus, in ${LOCALE_NAME[facts.locale]}.`,
    `Platform: ${platform}. Place: ${where}.`,
    'Assured, worldly, warm. No clickbait, no invented facts: use ONLY what the headline and description say. No hashtags, no emojis, no links, no em or en dashes.',
    `Return ONLY a JSON object: {"hook": string, "body": string, "altText": string}. ${rules}`,
  ].join('\n');
  const user = `HEADLINE: ${facts.title}\nDESCRIPTION: ${facts.description}\nSECTION: ${facts.category || ''}`;
  const { text, error } = await callClaude({ systemInstruction: system, userMessage: user, model: CLAUDE_HAIKU, maxTokens: 500, jsonMode: true, fn: 'social-copy', timeoutMs: 40_000 });
  if (error || !text) return null;
  const g = parseGenerated(text);
  if (!g) return null;
  const lang = facts.locale as Lang;
  return { hook: g.hook ? humanizeText(g.hook, lang) : '', body: g.body ? humanizeText(g.body, lang) : '', altText: g.altText };
}

export async function composePost(platform: SocialPlatform, facts: ArticleFacts): Promise<BuiltPost> {
  let g: Generated | null = null;
  try { g = await generate(platform, facts); } catch { g = null; }       // AI budget off / outage → the plain fallback still posts
  return platform === 'instagram' ? buildInstagramPost(facts, g) : buildFacebookPost(facts, g);
}

// ── the platforms ────────────────────────────────────────────────────────────

interface PublishOk { ok: true; externalId?: string; permalink?: string }
interface PublishPending { ok: false; pending: true; containerId: string }
interface PublishFail { ok: false; pending?: false; error: string; code?: number }
type PublishResult = PublishOk | PublishPending | PublishFail;

async function publishFacebook(post: BuiltPost, link: string): Promise<PublishResult> {
  const r = await graph(`${process.env.META_PAGE_ID}/feed`, { method: 'POST', body: { message: post.text, link } });
  if (!r.ok) return { ok: false, error: r.data.error?.message || `Facebook error ${r.status}`, code: r.data.error?.code };
  const id = String(r.data.id || '');
  return { ok: true, externalId: id, permalink: id ? `https://www.facebook.com/${id}` : undefined };
}

export const igImageUrl = (slug: string, locale: Locale) => `${site()}/api/social/image?slug=${encodeURIComponent(slug)}&l=${locale}`;

async function publishInstagram(post: BuiltPost, imageUrl: string, resumeContainer?: string): Promise<PublishResult> {
  const ig = process.env.META_IG_USER_ID!;
  let container = resumeContainer;
  if (!container) {
    const c = await graph(`${ig}/media`, { method: 'POST', body: { image_url: imageUrl, caption: post.text, ...(post.altText ? { alt_text: post.altText } : {}) } });
    if (!c.ok || !c.data.id) return { ok: false, error: c.data.error?.message || `Instagram container error ${c.status}`, code: c.data.error?.code };
    container = String(c.data.id);
  }
  // Wait (briefly) until Instagram has fetched and processed the image.
  for (let i = 0; i < 6; i++) {
    const s = await graph(container, { query: { fields: 'status_code' } });
    const code = String(s.data.status_code || '');
    if (code === 'FINISHED') break;
    if (code === 'ERROR' || code === 'EXPIRED') return { ok: false, error: `Instagram could not process the image (${code}).`, code: 0 };
    if (i === 5) return { ok: false, pending: true, containerId: container };
    await new Promise((r) => setTimeout(r, 2000));
  }
  const p = await graph(`${ig}/media_publish`, { method: 'POST', body: { creation_id: container } });
  if (!p.ok) return { ok: false, error: p.data.error?.message || `Instagram publish error ${p.status}`, code: p.data.error?.code };
  const id = String(p.data.id || '');
  let permalink: string | undefined;
  try { const m = await graph(id, { query: { fields: 'permalink' } }); permalink = m.ok ? String(m.data.permalink || '') || undefined : undefined; } catch { /* optional */ }
  return { ok: true, externalId: id, permalink };
}

// ── the worker ───────────────────────────────────────────────────────────────

export interface ProcessSummary { posted: number; failed: number; skipped: number; deferred: number; notes: string[] }
interface OutboxRow {
  id: string; article_id: string; platform: SocialPlatform; status: string; backlog: boolean; attempts: number; copy: BuiltPost | null; meta: Record<string, unknown> | null;
}

async function recentStats(sb: SupabaseClient, platform: SocialPlatform, now: Date) {
  const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const { data, count } = await sb.from('social_outbox').select('posted_at', { count: 'exact' })
    .eq('platform', platform).eq('status', 'posted').gte('posted_at', since).order('posted_at', { ascending: false }).limit(1);
  const last = data && data[0] && (data[0] as { posted_at: string | null }).posted_at;
  return { countLast24h: count ?? 0, lastPostedAt: last ? new Date(last) : null };
}

async function release(sb: SupabaseClient, id: string, patch: Record<string, unknown>) {
  await sb.from('social_outbox').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
}

/**
 * Work the queue. `ids` = process exactly these rows now (admin "Post now"), ignoring the daily limit / gap / age rules.
 * Otherwise: due rows only, new articles before older ones, within the rules.
 */
export async function processOutbox(sb: SupabaseClient, opts: { deadlineMs?: number; ids?: string[]; maxItems?: number } = {}): Promise<ProcessSummary> {
  const t0 = Date.now();
  const deadline = t0 + (opts.deadlineMs ?? 40_000);
  const now = () => new Date();
  const sum: ProcessSummary = { posted: 0, failed: 0, skipped: 0, deferred: 0, notes: [] };
  const manual = !!opts.ids?.length;
  const settings = await loadSettings(sb);
  if (!manual && !settings.enabled) return sum;
  const cfg = configured();
  const blocked = new Set<SocialPlatform>();                // platforms that hit a limit/auth problem this pass

  let q = sb.from('social_outbox').select('id, article_id, platform, status, backlog, attempts, copy, meta');
  q = manual ? q.in('id', opts.ids!).in('status', ['pending', 'failed']) : q.eq('status', 'pending').lte('next_attempt_at', now().toISOString());
  const { data: rows } = await q.order('backlog', { ascending: true }).order('next_attempt_at', { ascending: true }).limit(manual ? opts.ids!.length : 25);
  const queue = (rows || []) as unknown as OutboxRow[];

  let handled = 0;
  for (const item of queue) {
    if (Date.now() >= deadline || handled >= (opts.maxItems ?? 4)) break;
    const platform = item.platform;
    if (blocked.has(platform)) { sum.deferred++; continue; }

    // claim
    const { data: claimed } = await sb.from('social_outbox').update({ status: 'processing', updated_at: now().toISOString() })
      .eq('id', item.id).in('status', manual ? ['pending', 'failed'] : ['pending']).select('id').maybeSingle();
    if (!claimed) continue;

    const art = await loadArticle(sb, item.article_id);
    if (!art || art.row.status !== 'published' || art.row.skip_facebook || !art.facts.title) {
      await release(sb, item.id, { status: 'skipped', error: !art ? 'article no longer exists' : art.row.skip_facebook ? 'article is marked "do not post to social"' : art.row.status !== 'published' ? 'article is no longer published' : 'article has no headline' });
      sum.skipped++; continue;
    }
    if (!manual && isStale(art.row.published_at, settings.maxAgeHours, now(), item.backlog)) {
      await release(sb, item.id, { status: 'skipped', error: `older than ${settings.maxAgeHours} hours when its turn came` });
      sum.skipped++; continue;
    }
    if (!cfg[platform]) {
      await release(sb, item.id, { status: 'pending', next_attempt_at: new Date(Date.now() + 3600_000).toISOString(), error: `${platform} is not connected yet (see docs/SOCIAL-SETUP.md)` });
      blocked.add(platform); sum.deferred++; continue;
    }
    if (!manual) {
      const gate = postingGate(settings, platform, await recentStats(sb, platform, now()), now());
      if (!gate.ok) {
        await release(sb, item.id, { status: 'pending', next_attempt_at: (gate.retryAt || new Date(Date.now() + 30 * 60_000)).toISOString() });
        blocked.add(platform); sum.deferred++; continue;
      }
    }

    handled++;
    const post: BuiltPost = item.copy && item.copy.text ? item.copy : await composePost(platform, art.facts);
    const link = withUtm(articleUrl(art.row.slug, art.locale), platform);
    let res: PublishResult;
    try {
      res = platform === 'facebook'
        ? await publishFacebook(post, link)
        : await publishInstagram(post, igImageUrl(art.row.slug, art.locale), typeof item.meta?.container_id === 'string' ? (item.meta.container_id as string) : undefined);
    } catch (e) {
      res = { ok: false, error: (e as Error).message };
    }

    if (res.ok) {
      await release(sb, item.id, { status: 'posted', error: null, copy: post, external_id: res.externalId ?? null, permalink: res.permalink ?? null, posted_at: new Date().toISOString(), attempts: item.attempts + 1, meta: {} });
      await sb.from('social_posts').insert({
        article_id: item.article_id, platform, lang: art.locale, format: 'autopost', status: 'published',
        external_id: res.externalId ?? null, permalink: res.permalink ?? null, image_url: art.row.cover_image, error: null, payload: { copy: post.text, hashtags: post.hashtags, ai: post.usedAi },
      });
      sum.posted++;
      continue;
    }
    if ('pending' in res && res.pending) {            // Instagram is still processing the image: come back soon, reuse the container
      await release(sb, item.id, { status: 'pending', copy: post, meta: { container_id: res.containerId }, next_attempt_at: new Date(Date.now() + 2 * 60_000).toISOString() });
      sum.deferred++; continue;
    }
    const fail = res as PublishFail;
    const kind = classifyMetaError(fail.code, fail.error);
    const attempts = item.attempts + 1;
    await logServerError('social-autopost', new Error(`${platform}: ${fail.error}`), { article: item.article_id, kind, attempts }, kind === 'transient' ? 'warn' : 'error');
    if (kind === 'transient' && attempts < MAX_ATTEMPTS) {
      await release(sb, item.id, { status: 'pending', attempts, copy: post, error: fail.error, next_attempt_at: new Date(Date.now() + backoffMs(attempts)).toISOString() });
      sum.deferred++;
    } else {
      await release(sb, item.id, { status: 'failed', attempts, copy: post, error: kind === 'auth' ? `Meta token or permission problem: ${fail.error}` : fail.error });
      sum.failed++;
      if (kind === 'auth') { blocked.add(platform); sum.notes.push(`${platform}: the Meta token or its permissions need attention`); }
    }
  }
  return sum;
}

// ── admin helpers ────────────────────────────────────────────────────────────

/** Queue (or re-queue) specific articles for immediate posting from the admin. Returns the queue row ids. */
export async function enqueueNow(sb: SupabaseClient, articleId: string, platforms: SocialPlatform[], repost: boolean): Promise<{ ids: string[]; alreadyPosted: SocialPlatform[] }> {
  const ids: string[] = [];
  const alreadyPosted: SocialPlatform[] = [];
  for (const platform of platforms) {
    const { data: ex } = await sb.from('social_outbox').select('id, status').eq('article_id', articleId).eq('platform', platform).maybeSingle();
    if (ex && ex.status === 'posted' && !repost) { alreadyPosted.push(platform); continue; }
    if (ex && ex.status === 'processing') continue;
    if (ex) {
      await sb.from('social_outbox').update({ status: 'pending', backlog: true, attempts: 0, error: null, copy: null, meta: {}, external_id: null, permalink: null, posted_at: null, next_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', ex.id);
      ids.push(String(ex.id));
    } else {
      const { data: ins } = await sb.from('social_outbox').insert({ article_id: articleId, platform, backlog: true }).select('id').single();
      if (ins) ids.push(String(ins.id));
    }
  }
  return { ids, alreadyPosted };
}

export async function enqueueBacklog(sb: SupabaseClient, platforms: SocialPlatform[], limit: number): Promise<number> {
  const { data, error } = await sb.rpc('social_enqueue_backlog', { p_platforms: platforms, p_limit: limit });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export interface OutboxStats { byStatus: Record<string, Record<string, number>>; postedLast24h: Record<SocialPlatform, number> }
export async function outboxStats(sb: SupabaseClient): Promise<OutboxStats> {
  const byStatus: Record<string, Record<string, number>> = {};
  for (const platform of ['facebook', 'instagram'] as const) {
    byStatus[platform] = {};
    for (const status of ['pending', 'processing', 'posted', 'failed', 'skipped']) {
      const { count } = await sb.from('social_outbox').select('id', { count: 'exact', head: true }).eq('platform', platform).eq('status', status);
      byStatus[platform][status] = count ?? 0;
    }
  }
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const last: Record<string, number> = {};
  for (const platform of ['facebook', 'instagram'] as const) {
    const { count } = await sb.from('social_outbox').select('id', { count: 'exact', head: true }).eq('platform', platform).eq('status', 'posted').gte('posted_at', since);
    last[platform] = count ?? 0;
  }
  return { byStatus, postedLast24h: last as Record<SocialPlatform, number> };
}

/** Is a cover image safe to turn into the Instagram picture? (our own storage only — see lib/images.ts) */
export const coverUsable = (cover: string | null | undefined) => isOwnedImage(cover);
