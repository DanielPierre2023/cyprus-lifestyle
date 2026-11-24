import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

// ─────────────────────────────────────────────────────────────────────────────
// robots.ts — REPLACES app/robots.ts
//
// Why: in the 2 days before the Oct 27 pause the site served ~37,000 function
// invocations and ~12,000 ISR page regenerations with almost no human
// visitors. The bulk of that is crawler traffic over the ~125,000
// multilingual URLs (18k listings × 7 locales). Every crawl of a stale page
// spins a serverless function and burns Fluid Active CPU — the exact metric
// that got the project paused on the Hobby plan.
//
// What changed vs the previous version of this file:
//   • KEPT everything it already did: SITE_URL from lib/seo, the per-locale
//     /account disallows, /admin and /api off-limits, sitemap + host.
//   • ADDED a block list of AI-training and SEO-tool crawlers that bring no
//     readers but hammer large sites around the clock.
//
// Note: robots.txt is honoured by well-behaved bots only. For the rude ones,
// enable Vercel → Firewall → "Challenge AI bots" once the project is live
// again (available on all plans), or Bot Fight Mode on Cloudflare.
// ─────────────────────────────────────────────────────────────────────────────

// Account pages are private per locale — same construction as before.
const ACCOUNT = [
  '/account',
  ...LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => `/${l}/account`),
];

// Crawlers that consume server CPU without ever sending a reader.
const BLOCKED_BOTS = [
  // AI / LLM training & retrieval crawlers
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'PerplexityBot',
  'Perplexity-User',
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'FacebookBot',
  'Google-Extended', // opts out of Gemini training; normal Google Search is NOT affected
  'Applebot-Extended',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'Timpibot',
  'YouBot',
  'PetalBot',
  // SEO-tool crawlers (useful to SEO agencies, not to your readers)
  'SemrushBot',
  'AhrefsBot',
  'MJ12bot',
  'DotBot',
  'DataForSeoBot',
  'BLEXBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Everyone who is allowed at all: stay out of the private and
      // function-backed routes (same list as before).
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', ...ACCOUNT],
      },
      // The blocked list: no access at all.
      ...BLOCKED_BOTS.map((bot) => ({ userAgent: bot, disallow: '/' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
