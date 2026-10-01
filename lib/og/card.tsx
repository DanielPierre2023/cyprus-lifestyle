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

// SSRF guard for the cover fetch. coverUrl arrives from the public ?c= query param,
// so only fetch genuinely public https images — never let it reach loopback, private
// (RFC1918), link-local / cloud-metadata (169.254.x) or *.internal/.local targets, and
// reject IP-literal and credentialed URLs outright. (Follow-up hardening: a strict host
// allowlist + resolving the IP would also close DNS-rebinding; this blocks the common
// vectors and we also disable redirects below so a public URL can't bounce internal.)
function isPublicHttpsUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
  // Reject every IPv6 literal (covers ::1, fe80:: link-local, fc00::/7 ULA).
  if (host.includes(':') || u.hostname.startsWith('[')) return false;
  // Reject private / loopback / link-local / multicast IPv4 literals.
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || a >= 224) return false;
  }
  return true;
}

export async function ogImage(opts: { title: string; kicker?: string; locale: Locale; coverUrl?: string | null }) {
  const { title, kicker, locale, coverUrl } = opts;
  const { serif, arabic } = await fontsPromise;
  // Satori can't shape Arabic contextual forms, so the Arabic edition uses a clean
  // branded photo card (the Arabic headline still travels in og:title text).
  const rtl = locale === 'ar';
  const big = title.length > 58 ? 54 : title.length > 40 ? 64 : 74;

  let cover: string | null = null;
  // Only fetch a vetted public https image; disallow redirects (a public URL could 302
  // to an internal one), cap the time and the size so a hostile URL can't hang or flood.
  if (coverUrl && isPublicHttpsUrl(coverUrl)) {
    try {
      const res = await fetch(coverUrl, { redirect: 'error', signal: AbortSignal.timeout(4000) });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.startsWith('image/')) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength <= 8_000_000) {
          cover = `data:${ct};base64,${buf.toString('base64')}`;
        }
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
