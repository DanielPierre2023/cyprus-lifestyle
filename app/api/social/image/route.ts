// GET /api/social/image?slug=<article slug>&l=<edition>
// The picture Instagram posts for an article, in the only shape Instagram accepts through the API:
// JPEG, sRGB, within 4:5 … 1.91:1, ≤ 8 MB. Instagram downloads it from this URL when the post is created.
//   • the article's OWN cover (our storage only — scraped third-party pictures are never re-published), smart-cropped to
//     4:5 (1080×1350) and set into an editorial look of lib/og/igCard.tsx: the Masthead cover, or the ivory Arch for food, travel
//     and lifestyle (see pickVariant in lib/og/igText.ts);
//   • otherwise the obsidian Noir Gold card of the same file (monumental monogram, double gold frame, centred headline).
// The slug is looked up in the database — the caller never supplies an image URL, so this cannot be pointed at other hosts.
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/ratelimit';
import { isOwnedImage } from '@/lib/images';
import { isLocale, type Locale } from '@/lib/locales';
import { igCardImage } from '@/lib/og/igCard';
import { photoBox, pickVariant, sectionLabel } from '@/lib/og/igText';
import en from '@/messages/en.json';
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

  // The look: no photograph of ours -> Noir Gold; a photograph -> the Masthead cover, or the ivory Arch for food, travel and lifestyle.
  // The photograph is our own (our storage only), cropped around its most interesting part to the size that look needs.
  const raw = row.cover_image && isOwnedImage(row.cover_image) ? await fetchBuffer(row.cover_image) : null;
  const variant = pickVariant({ hasPhoto: !!raw, category: row.category });
  const box = photoBox(variant, 'portrait');
  let photo: Buffer | null = null;
  if (raw && box) {
    try { photo = await sharp(raw, { failOn: 'none' }).rotate().resize(box.width, box.height, { fit: 'cover', position: sharp.strategy.attention }).toColourspace('srgb').jpeg({ quality: 88, mozjpeg: true }).toBuffer(); }
    catch { photo = null; }
  }
  try {
    const names = ((en as unknown as { nav?: Record<string, string> }).nav) || {};
    const card = await igCardImage({ variant: photo ? variant : 'noir', title: String(row[`title_${locale}`] || row.title_en || 'Cyprus Lifestyle'), kicker: sectionLabel(row.category, names) || undefined, locale, photo });
    const out = await sharp(Buffer.from(await card.arrayBuffer())).resize(IG_SIZE.width, IG_SIZE.height, { fit: 'cover' }).flatten({ background: '#0B0E11' }).toColourspace('srgb').jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    return new NextResponse(new Uint8Array(out), { headers: JPEG });
  } catch {
    return new NextResponse('Image could not be prepared', { status: 502 });
  }
}
