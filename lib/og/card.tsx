import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import type { Locale } from '@/lib/locales';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Latin+Greek serif (static instance) + a Naskh Arabic face, read from disk once.
// Bundled into the function via outputFileTracingIncludes (next.config).
const fontsPromise = (async () => {
  const dir = join(process.cwd(), 'lib', 'og');
  const [serif, arabic] = await Promise.all([
    readFile(join(dir, 'NotoSerif-static.ttf')),
    readFile(join(dir, 'NotoNaskhArabic-og.ttf')),
  ]);
  return { serif, arabic };
})();

export async function ogImage(opts: { title: string; kicker?: string; locale: Locale; coverUrl?: string | null }) {
  const { title, kicker, locale, coverUrl } = opts;
  const { serif, arabic } = await fontsPromise;
  // Satori can't shape Arabic contextual forms, so the Arabic edition uses a clean
  // branded photo card (the Arabic headline still travels in og:title text).
  const rtl = locale === 'ar';
  const big = title.length > 58 ? 54 : title.length > 40 ? 64 : 74;

  let cover: string | null = null;
  if (coverUrl) {
    try {
      const res = await fetch(coverUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get('content-type') || 'image/jpeg';
        cover = `data:${ct};base64,${buf.toString('base64')}`;
      }
    } catch { cover = null; }
  }

  const wordmark = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 42, height: 42, borderRadius: 42, border: '2px solid #C9A24C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F4EFE6', fontSize: 18, fontFamily: 'Noto Serif' }}>CL</div>
      <div style={{ color: '#F4EFE6', fontSize: 22, letterSpacing: 8, fontFamily: 'Noto Serif' }}>CYPRUS LIFESTYLE</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: '#0B0E11' }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }} />
        ) : null}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', backgroundImage: 'linear-gradient(180deg, rgba(11,14,17,0.25) 0%, rgba(11,14,17,0.45) 45%, rgba(11,14,17,0.94) 100%)' }} />
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64 }}>
          {wordmark}
          {rtl ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#E6D6AE', fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'Noto Serif', marginBottom: 16 }}>The Arabic Edition</div>
              <div style={{ color: '#F6F1E7', fontSize: 60, letterSpacing: 10, fontFamily: 'Noto Serif' }}>CYPRUS LIFESTYLE</div>
              <div style={{ marginTop: 24, width: 92, height: 3, backgroundColor: '#C9A24C', display: 'flex' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {kicker ? <div style={{ color: '#E6D6AE', fontSize: 22, letterSpacing: 5, textTransform: 'uppercase', fontFamily: 'Noto Serif', marginBottom: 20 }}>{kicker}</div> : null}
              <div style={{ color: '#F6F1E7', fontSize: big, lineHeight: 1.06, fontFamily: 'Noto Serif', maxWidth: 1040, display: 'flex' }}>{title}</div>
              <div style={{ marginTop: 26, width: 92, height: 3, backgroundColor: '#C9A24C', display: 'flex' }} />
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Noto Serif', data: serif, style: 'normal', weight: 600 },
        { name: 'Arabic', data: arabic, style: 'normal', weight: 400 },
      ],
    },
  );
}
