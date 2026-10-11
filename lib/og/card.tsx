import sharp from 'sharp';
import type { Locale } from '@/lib/locales';
import { editorialImage } from '@/lib/og/igCard';
import { photoBox, pickVariant } from '@/lib/og/igText';
import en from '@/messages/en.json';
import de from '@/messages/de.json';
import el from '@/messages/el.json';
import pl from '@/messages/pl.json';
import ro from '@/messages/ro.json';
import ru from '@/messages/ru.json';
import ar from '@/messages/ar.json';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

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

type Nav = { nav?: Record<string, string> };
/** The localized names of the food / travel sections, so a translated kicker still selects the ivory Arch look. */
const ARCH_LABELS: string[] = [en, de, el, pl, ro, ru, ar].flatMap((m) => {
  const nav = (m as unknown as Nav).nav || {};
  return [nav.table, nav.escapes].filter(Boolean) as string[];
});

/**
 * The link-preview card (Facebook, WhatsApp, LinkedIn, Telegram ...), 1200 x 630, in the editorial looks of lib/og/igCard.tsx:
 * Masthead (article with a photo), Arch (food, travel, lifestyle with a photo) or Noir Gold (no photo).
 */
export async function ogImage(opts: { title: string; kicker?: string; locale: Locale; coverUrl?: string | null }) {
  const { title, kicker, locale, coverUrl } = opts;

  let raw: Buffer | null = null;
  // Only fetch a vetted public https image; disallow redirects (a public URL could 302
  // to an internal one), cap the time and the size so a hostile URL can't hang or flood.
  if (coverUrl && isPublicHttpsUrl(coverUrl)) {
    try {
      const res = await fetch(coverUrl, { redirect: 'error', signal: AbortSignal.timeout(4000) });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.startsWith('image/')) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength <= 8_000_000) raw = buf;
      }
    } catch { raw = null; }
  }

  const variant = pickVariant({ hasPhoto: !!raw, kicker, labels: ARCH_LABELS });
  const box = photoBox(variant, 'landscape');
  let photo: Buffer | null = null;
  if (raw && box) {
    try { photo = await sharp(raw, { failOn: 'none' }).rotate().resize(box.width, box.height, { fit: 'cover', position: sharp.strategy.attention }).toColourspace('srgb').jpeg({ quality: 86 }).toBuffer(); }
    catch { photo = null; }
  }
  return editorialImage({ variant: photo ? variant : 'noir', format: 'landscape', title, kicker, locale, photo });
}
