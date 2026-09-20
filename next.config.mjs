import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

// Content Security Policy. next-intl/Next inject inline bootstrap scripts and
// styles (no nonce pipeline here), so 'unsafe-inline' is required for those;
// everything else is locked down. Supabase (REST + realtime) and Vercel's
// cookieless analytics are explicitly allowed.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  // The concierge plays its neural-voice reply from a blob: URL, so media-src must
  // allow blob: (without this, default-src 'self' blocks the audio entirely).
  "media-src 'self' blob: data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com",
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
    // Cover images come from Unsplash and the sites we cite. Allow remote.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
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
