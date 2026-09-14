import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
