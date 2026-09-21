// Cyprus Lifestyle — social publishing (port of TT publish-social + tt-social-copy).
// Generates on-brand copy per platform/language, publishes where tokens are set,
// and records every attempt in social_posts. Channels with no tokens are skipped.
import 'server-only';
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai';
import { humanizeText, type Lang } from '@/lib/antiAi';
import { LOCALE_NAME, type Locale } from '@/lib/locales';

export type Platform = 'facebook' | 'instagram' | 'x' | 'linkedin';

export interface PostForSocial {
  id: string; slug: string; title: string; excerpt: string; cover_image: string | null; locale: Locale;
}
interface PublishResult { ok: boolean; external_id?: string; permalink?: string; error?: string }

function articleUrl(slug: string, locale: Locale): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu';
  const path = locale === 'en' ? '' : `/${locale}`;
  return `${base}${path}/article/${slug}`;
}

export async function generateCopy(post: PostForSocial, platform: Platform): Promise<string> {
  const limits: Record<Platform, string> = {
    x: 'Under 260 characters. At most 2 relevant hashtags.',
    facebook: '2-3 sentences, inviting, no hashtag spam.',
    instagram: '2-3 sentences with a strong first line; 3-5 tasteful hashtags at the end.',
    linkedin: 'A professional, insightful 2-3 sentence hook for a business audience; no hashtag spam.',
  };
  const system = [
    `You write social copy for Cyprus Lifestyle, a luxury Cyprus magazine, in ${LOCALE_NAME[post.locale]}.`,
    `Platform: ${platform}. ${limits[platform]}`,
    `Assured, worldly, warm; no AI filler, no em/en dashes. Do not include the URL (it is added separately). Return ONLY the caption text.`,
  ].join('\n');
  const user = `HEADLINE: ${post.title}\nSTANDFIRST: ${post.excerpt}`;
  const { text } = await callClaude({ systemInstruction: system, userMessage: user, model: CLAUDE_HAIKU, temperature: 0.7, maxTokens: 300, fn: 'social-copy' });
  return humanizeText((text || post.title).trim(), post.locale as Lang);
}

// ── platform publishers ─────────────────────────────────────────────────────
async function publishFacebook(message: string, link: string): Promise<PublishResult> {
  const token = process.env.META_PAGE_ACCESS_TOKEN, pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) return { ok: false, error: 'facebook not configured' };
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `${message}\n\n${link}`, link, access_token: token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error?.message || 'facebook error' };
  return { ok: true, external_id: data.id, permalink: data.id ? `https://facebook.com/${data.id}` : undefined };
}

async function publishInstagram(caption: string, imageUrl: string | null): Promise<PublishResult> {
  const token = process.env.META_PAGE_ACCESS_TOKEN, ig = process.env.META_IG_USER_ID;
  if (!token || !ig) return { ok: false, error: 'instagram not configured' };
  if (!imageUrl) return { ok: false, error: 'instagram needs a cover image' };
  const create = await fetch(`https://graph.facebook.com/v21.0/${ig}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  const c = await create.json().catch(() => ({}));
  if (!create.ok || !c.id) return { ok: false, error: c.error?.message || 'instagram container error' };
  const pub = await fetch(`https://graph.facebook.com/v21.0/${ig}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: c.id, access_token: token }),
  });
  const p = await pub.json().catch(() => ({}));
  if (!pub.ok) return { ok: false, error: p.error?.message || 'instagram publish error' };
  return { ok: true, external_id: p.id };
}

async function publishLinkedIn(text: string, link: string): Promise<PublishResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN, org = process.env.LINKEDIN_ORG_URN;
  if (!token || !org) return { ok: false, error: 'linkedin not configured' };
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify({
      author: org, lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: `${text}\n\n${link}` }, shareMediaCategory: 'ARTICLE',
        media: [{ status: 'READY', originalUrl: link }],
      } },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); return { ok: false, error: d.message || 'linkedin error' }; }
  const id = res.headers.get('x-restli-id') || undefined;
  return { ok: true, external_id: id };
}

// X (Twitter) API v2 with OAuth 1.0a user-context signing.
function oauth1Header(url: string, method: string): string {
  const ck = process.env.X_API_KEY!, cs = process.env.X_API_SECRET!, at = process.env.X_ACCESS_TOKEN!, as = process.env.X_ACCESS_SECRET!;
  const enc = (s: string) => encodeURIComponent(s).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const oauth: Record<string, string> = {
    oauth_consumer_key: ck, oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: at, oauth_version: '1.0',
  };
  const params = Object.keys(oauth).sort().map((k) => `${enc(k)}=${enc(oauth[k])}`).join('&');
  const base = `${method.toUpperCase()}&${enc(url)}&${enc(params)}`;
  const signingKey = `${enc(cs)}&${enc(as)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');
  const header: Record<string, string> = { ...oauth, oauth_signature: signature };
  return 'OAuth ' + Object.keys(header).sort().map((k) => `${enc(k)}="${enc(header[k])}"`).join(', ');
}
async function publishX(text: string, link: string): Promise<PublishResult> {
  if (!process.env.X_API_KEY || !process.env.X_ACCESS_TOKEN) return { ok: false, error: 'x not configured' };
  const url = 'https://api.twitter.com/2/tweets';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: oauth1Header(url, 'POST') },
    body: JSON.stringify({ text: `${text}\n\n${link}` }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.detail || data.title || 'x error' };
  const id = data.data?.id;
  return { ok: true, external_id: id, permalink: id ? `https://x.com/i/web/status/${id}` : undefined };
}

async function dispatch(platform: Platform, copy: string, post: PostForSocial): Promise<PublishResult> {
  const link = articleUrl(post.slug, post.locale);
  switch (platform) {
    case 'facebook': return publishFacebook(copy, link);
    case 'instagram': return publishInstagram(copy, post.cover_image);
    case 'linkedin': return publishLinkedIn(copy, link);
    case 'x': return publishX(copy, link);
  }
}

export async function publishToPlatforms(sb: SupabaseClient, post: PostForSocial, platforms: Platform[]): Promise<Record<string, PublishResult>> {
  const out: Record<string, PublishResult> = {};
  for (const platform of platforms) {
    const copy = await generateCopy(post, platform);
    const r = await dispatch(platform, copy, post);
    out[platform] = r;
    await sb.from('social_posts').insert({
      article_id: post.id, platform, lang: post.locale, format: 'link',
      status: r.ok ? 'published' : 'failed', external_id: r.external_id || null,
      permalink: r.permalink || null, image_url: post.cover_image, error: r.ok ? null : r.error,
      payload: { copy },
    });
  }
  return out;
}
