// lib/editorial/cover.ts
// ============================================================================
// Article imagery — give every piece a cover image that matches what it's about.
//
// Two sources, exactly the two chosen for the desk:
//   • STOCK  — a real, relevance-ranked Unsplash photo, via the existing
//              `search-cover-photos` edge function. That function builds a
//              Cyprus-grounded visual brief (so "parliament" resolves to the
//              CYPRIOT House of Representatives, never a foreign one), returns
//              ranked candidates, and hot-links the chosen photo from Unsplash's
//              CDN with automatic credit. Free, fast, authentic — the default.
//   • AI     — a photorealistic editorial illustration (OpenAI gpt-image-1),
//              grounded on that same Cyprus brief, uploaded to the public
//              `blog-images` Storage bucket. Slower and per-image cost, so it is
//              an on-demand choice (or the fallback when no real photo fits) —
//              never on the time-critical auto-draft path.
//
// The 17k directory rows carry only company LOGOS (not usable as article covers),
// so imagery is never sourced from there.
//
// Server-only. Every function here is BEST-EFFORT: on any failure it returns null
// and never throws, so attaching a cover can never break the draft it rides on.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type ImageSource = 'off' | 'stock' | 'ai' | 'stock-then-ai';

export interface CoverInput {
  title: string;
  summary?: string | null;
  category?: string | null;
  county?: string | null; // Cyprus district (nicosia | limassol | ...)
}
export interface CoverResult {
  url: string;
  credit: string;
  alt: string;
  source: 'stock' | 'ai';
}

// ── pure helpers (unit-tested; no I/O) ───────────────────────────────────────

// Build the cover brief input from a blog_posts row + its source language.
export function coverInputFromPiece(p: Record<string, unknown>, sourceLang = 'en'): CoverInput {
  const s = (k: string) => (typeof p[k] === 'string' ? (p[k] as string).trim() : '');
  const title = s(`title_${sourceLang}`) || s('title_en') || s('slug') || '';
  const summary =
    s(`excerpt_${sourceLang}`) || s('excerpt_en') ||
    s(`summary_${sourceLang}`) || s('summary_en') ||
    s('angle') || '';
  const category = s('category') || s('subcategory') || '';
  const county = s('county') || '';
  return { title, summary: summary || null, category: category || null, county: county || null };
}

export function stockCredit(author?: string | null): string {
  const a = (author || '').trim();
  return a ? `Photo: ${a} / Unsplash` : 'Photo: Unsplash';
}

interface StockCandidate {
  id?: string; url?: string; full?: string;
  author?: string; download_location?: string; alt?: string;
}
// Unsplash returns most-relevant first; take the first candidate that has a URL.
export function pickStockResult(results: unknown): StockCandidate | null {
  if (!Array.isArray(results)) return null;
  for (const r of results as StockCandidate[]) {
    if (r && typeof r.url === 'string' && r.url) return r;
  }
  return null;
}

function cap(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

// A Cyprus-grounded, guard-railed prompt for the AI illustrator. Deterministic
// (no model call) so it is testable; aiCover prefers the edge function's grounded
// Gemini brief when available and falls back to this.
export function aiPrompt(input: CoverInput): string {
  const place = input.county && input.county.toLowerCase() !== 'national'
    ? `${cap(input.county)}, Cyprus`
    : 'Cyprus';
  const about = [input.title, input.summary].filter(Boolean).join(' — ').slice(0, 400);
  return [
    'Photorealistic editorial magazine cover photograph for a Cyprus Lifestyle article.',
    `Subject: ${about || 'life in Cyprus'}.`,
    `Setting grounded in ${place}: Mediterranean light, natural colour, documentary composition, premium lifestyle-magazine aesthetic, sharp focus.`,
    "Absolutely no text, no lettering, no logos, no watermarks, no signage, and no recognisable real individuals' faces.",
  ].join(' ');
}

// ── edge-function I/O (best-effort) ──────────────────────────────────────────

function edgeConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

interface EdgeSearch {
  ok?: boolean; error?: string; query?: string;
  brief?: { photo_prompt?: string; prefer_real?: boolean; alt_text?: string; place?: string };
  results?: unknown;
}

// The service-role key authorises the admin-gated edge function (server-to-server,
// exactly like /api/admin/editorial → ai-editorial). The key never leaves the server.
async function edgePost(body: Record<string, unknown>, timeoutMs: number): Promise<Record<string, unknown> | null> {
  const cfg = edgeConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/functions/v1/search-cover-photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const d = await res.json().catch(() => null);
    return d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ── STOCK ────────────────────────────────────────────────────────────────────

export async function stockCover(input: CoverInput): Promise<CoverResult | null> {
  if (!input.title) return null;
  const search = (await edgePost(
    { action: 'search', title: input.title, summary: input.summary || '', category: input.category || '', county: input.county || '' },
    20000,
  )) as EdgeSearch | null;
  const top = pickStockResult(search?.results);
  if (!top?.url) return null;

  const credit = stockCredit(top.author);
  const alt = (top.alt || search?.brief?.alt_text || input.title || '').slice(0, 200);

  // Ping Unsplash's download endpoint (their API rule) and take back the hot-link URL.
  const dl = (await edgePost(
    { action: 'download', image_url: top.url, download_location: top.download_location || '', credit },
    15000,
  )) as { publicUrl?: string; credit?: string } | null;

  return {
    url: dl?.publicUrl || top.url,
    credit: dl?.credit || credit,
    alt,
    source: 'stock',
  };
}

// ── AI ───────────────────────────────────────────────────────────────────────

export async function aiCover(input: CoverInput): Promise<CoverResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !input.title) return null;

  // Prefer the edge function's Cyprus-grounded photo prompt; fall back to ours.
  const search = (await edgePost(
    { action: 'search', title: input.title, summary: input.summary || '', category: input.category || '', county: input.county || '' },
    15000,
  )) as EdgeSearch | null;
  const grounded = search?.brief?.photo_prompt;
  const prompt = grounded && grounded.length > 25 ? grounded : aiPrompt(input);
  const alt = (search?.brief?.alt_text || input.title || '').slice(0, 200);

  let bytes: Buffer | null = null;
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', n: 1 }),
      signal: AbortSignal.timeout(60000),
    });
    const d = (await res.json().catch(() => null)) as
      | { data?: Array<{ b64_json?: string; url?: string }>; error?: { message?: string } }
      | null;
    if (!d || d.error) return null;
    const b64 = d.data?.[0]?.b64_json;
    const remote = d.data?.[0]?.url;
    if (b64) bytes = Buffer.from(b64, 'base64');
    else if (remote) {
      const r = await fetch(remote, { signal: AbortSignal.timeout(20000) });
      bytes = Buffer.from(await r.arrayBuffer());
    }
  } catch {
    return null;
  }
  if (!bytes || !bytes.length) return null;

  try {
    const sb = supabaseAdmin();
    const path = `ai-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error } = await sb.storage.from('blog-images').upload(path, bytes, { contentType: 'image/png', upsert: false });
    if (error) return null;
    const { data } = sb.storage.from('blog-images').getPublicUrl(path);
    if (!data?.publicUrl) return null;
    return { url: data.publicUrl, credit: 'Illustration: Cyprus Lifestyle (AI)', alt, source: 'ai' };
  } catch {
    return null;
  }
}

// ── orchestration ─────────────────────────────────────────────────────────────

export async function makeCover(input: CoverInput, mode: ImageSource = 'stock'): Promise<CoverResult | null> {
  if (mode === 'off') return null;
  if (mode === 'stock') return stockCover(input);
  if (mode === 'ai') return (await aiCover(input)) || (await stockCover(input));
  // 'stock-then-ai': a real photo if one fits, else an AI illustration.
  return (await stockCover(input)) || (await aiCover(input));
}

// Attach a cover to a piece (best-effort). Skips silently when one already exists
// (unless force). Returns the result, or null if nothing was set.
export async function attachCover(
  pieceId: string,
  input: CoverInput,
  mode: ImageSource = 'stock',
  opts?: { force?: boolean; existing?: string | null },
): Promise<CoverResult | null> {
  if (mode === 'off' || !pieceId) return null;
  try {
    if (!opts?.force && opts?.existing) return null;
    const cover = await makeCover(input, mode);
    if (!cover?.url) return null;
    await supabaseAdmin()
      .from('blog_posts')
      .update({ cover_image: cover.url, cover_image_credit: cover.credit })
      .eq('id', pieceId);
    return cover;
  } catch {
    return null;
  }
}
