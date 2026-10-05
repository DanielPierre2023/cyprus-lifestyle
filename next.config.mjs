import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

// Content Security Policy. next-intl/Next inject inline bootstrap scripts and
// styles (no nonce pipeline here), so 'unsafe-inline' is required for those;
// everything else is locked down. Supabase (REST + realtime) and Vercel's
// cookieless analytics are explicitly allowed.
//
// Map stack (MapLibre GL + CARTO GL vector basemap + Open-Meteo nowcast):
//   • cdn.jsdelivr.net  — the pinned, SRI-verified MapLibre GL script + stylesheet
//     (loaded at runtime; see lib/map/maplibre.ts). SRI means a tampered payload
//     is rejected even though the host is allow-listed.
//   • basemaps.cartocdn.com — the free CARTO GL vector style, tiles, glyphs, sprites.
//   • api.open-meteo.com / marine-api.open-meteo.com — free weather + sea-temperature
//     nowcast for the map/webcams (no API key).
//   • worker-src blob: — MapLibre GL runs its tile worker from a blob: URL.
// GetYourGuide Partner Programme (booking widgets, consent-gated — components/GygWidget.tsx):
//   • widget.getyourguide.com — the partner Analytics script + the widget iframes;
//   • *.getyourguide.com — the widget's own requests / beacons.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  // Live-webcam embeds: YouTube Live (privacy-enhanced host) + Windy. Venue cams
  // that aren't on these hosts are linked out (opened on the source), not framed.
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://*.windy.com https://widget.getyourguide.com https://*.getyourguide.com",
  // The concierge plays its neural-voice reply from a blob: URL, so media-src must
  // allow blob: (without this, default-src 'self' blocks the audio entirely).
  "media-src 'self' blob: data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://cdn.jsdelivr.net https://widget.getyourguide.com",
  "worker-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://api.open-meteo.com https://marine-api.open-meteo.com https://*.getyourguide.com",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // microphone=(self) lets the concierge's speech-to-text work on our own origin;
  // autoplay=(self) lets the neural-voice reply play. camera/geolocation stay off.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), browsing-topics=(), autoplay=(self)' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    // IMAGE STRATEGY (Phase 6.1, Vercel HOBBY + Supabase FREE; owner: no paid plans).
    // The Vercel optimiser stays OFF for good reason: Hobby includes only 5,000 image
    // transformations/month, after which new images return HTTP 402 and covers vanish
    // (this already happened once). Instead a CUSTOM LOADER (lib/imageLoader.ts) serves
    // responsive srcsets from sources that resize for free:
    //   - Supabase Storage originals -> pre-resized WebP variants made once with sharp
    //     (scripts/images/backfill-variants.ts; opt in with NEXT_PUBLIC_IMAGE_VARIANTS=1)
    //   - Unsplash                    -> imgix params on Unsplash's own CDN
    //   - everything else             -> per-image `unoptimized` (see components/CoverImage.tsx)
    // /_next/image is never called, so there is nothing to meter. The srcset widths are the
    // variant ladder (lib/imageVariants.ts), not Next's 8 default device sizes.
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
    deviceSizes: [480, 960, 1440],
    imageSizes: [240],
    // Unused by the custom loader, kept as documentation of the hosts we load images from.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  // The AI desk routes call external model APIs and can run long; give them room.
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
  // Ensure the OG-image fonts are bundled into the serverless function that renders them.
  outputFileTracingIncludes: {
    '/api/og': ['./lib/og/*.ttf'],
  },
};

export default withNextIntl(nextConfig);
