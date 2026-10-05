// GET /api/social/image?slug=<article slug>&l=<edition>
// The picture Instagram posts for an article, in the only shape Instagram accepts through the API:
// JPEG, sRGB, within 4:5 … 1.91:1, ≤ 8 MB. Instagram downloads it from this URL when the post is created.
//   • the article's OWN cover (our storage only — scraped third-party pictures are never re-published), smart-cropped to
//     4:5 (1080×1350) around the most interesting part of the photo;
//   • otherwise the branded text card the site already uses for link previews (/api/og), converted to JPEG.
// The slug is looked up in the database — the caller never supplies an image URL, so this cannot be pointed at other hosts.
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/ratelimit';
import { isOwnedImage } from '@/lib/images';
import { isLocale, type Locale } from '@/lib/locales';
import { ogImage } from '@/lib/og/card';
import { IG_SIZE } from '@/lib/socialPlan';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SLUG = /^[a-z0-9][a-z0-9-_]{0,160}$/i;
const JPEG = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable' };

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const abs = url.startsWith('/') ? `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/+$/, '')}${url}` : url;
    if (!abs.startsWith('https://')) return null;
    const res = await fetch(abs, { redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > 0 && buf.byteLength <= 20_000_000 ? buf : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  if (!(await rateLimit(req, 'social-image', 30, 60))) return new NextResponse('Too many requests', { status: 429 });
  const p = req.nextUrl.searchParams;
  const slug = (p.get('slug') || '').trim();
  const locale: Locale = isLocale(p.get('l') || '') ? (p.get('l') as Locale) : 'en';
  if (!SLUG.test(slug)) return new NextResponse('Not found', { status: 404 });

  const { data: a } = await supabaseAdmin().from('blog_posts')
    .select(`cover_image, category, title_${locale}, title_en`).eq('status', 'published').eq('slug', slug).maybeSingle();
  if (!a) return new NextResponse('Not found', { status: 404 });
  const row = a as unknown as Record<string, string | null>;

  let source: Buffer | null = null;
  let cropped = false;
  if (row.cover_image && isOwnedImage(row.cover_image)) {
    source = await fetchBuffer(row.cover_image);
    cropped = !!source;
  }
  if (!source) {                                         // text card (1200×630 = 1.91:1, inside Instagram's range)
    const card = await ogImage({ title: String(row[`title_${locale}`] || row.title_en || 'Cyprus Lifestyle'), kicker: row.category || undefined, locale, coverUrl: null });
    source = Buffer.from(await card.arrayBuffer());
  }
  try {
    const img = sharp(source, { failOn: 'none' }).rotate();
    const out = cropped
      ? await img.resize(IG_SIZE.width, IG_SIZE.height, { fit: 'cover', position: sharp.strategy.attention }).toColourspace('srgb').jpeg({ quality: 86, mozjpeg: true }).toBuffer()
      : await img.resize(1200, 630, { fit: 'cover' }).flatten({ background: '#0B0E11' }).toColourspace('srgb').jpeg({ quality: 90 }).toBuffer();
    return new NextResponse(new Uint8Array(out), { headers: JPEG });
  } catch {
    return new NextResponse('Image could not be prepared', { status: 502 });
  }
}
