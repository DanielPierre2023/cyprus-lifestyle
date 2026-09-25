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
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  // Live-webcam embeds: YouTube Live (privacy-enhanced host) + Windy. Venue cams
  // that aren't on these hosts are linked out (opened on the source), not framed.
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://*.windy.com",
  // The concierge plays its neural-voice reply from a blob: URL, so media-src must
  // allow blob: (without this, default-src 'self' blocks the audio entirely).
  "media-src 'self' blob: data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com https://basemaps.cartocdn.com https://api.open-meteo.com https://marine-api.open-meteo.com",
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
    // COVERS ARE SERVED UNOPTIMISED — deliberately. Routing every cover through the
    // Vercel image optimiser (/_next/image) exhausted the plan's optimisation quota,
    // after which the optimiser returns HTTP 402 for uncached images and covers
    // vanish site-wide (the source files are fine — they 200 from Supabase/Unsplash).
    // The sources are already web-optimised (Supabase serves WebP; Unsplash urls.regular
    // is ~1080px; picsum is sized), so we skip the optimiser entirely: images load
    // straight from the source CDN. Free, reliable, and no recurring optimisation bill.
    // To re-enable optimisation later, remove `unoptimized` and raise the Vercel plan's
    // image quota.
    unoptimized: true,
    // Kept for when optimisation is re-enabled: the ONLY hosts next/image may load.
    // Every cover/listing photo is a Supabase Storage object, images.unsplash.com,
    // or picsum.photos. Advertiser banners + the directory map use plain <img>/CSS.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
    // Cost discipline: serve AVIF/WebP and keep optimised variants cached a month so
    // the same image isn't re-optimised on every request.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // 31 days
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
