// GET /api/health — a plain-language readiness check for Cyprus Lifestyle.
// It reports ONLY whether each integration is configured (true/false) — it never
// exposes a key or any secret value. Open it in a browser to see, at a glance,
// which environment variables still need to be added in Vercel and what each one
// switches on. Safe to leave public; it reveals capability, not credentials.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const has = (v: string | undefined) => !!(v && v.trim());

export async function GET() {
  const env = process.env;

  const features = [
    {
      key: 'website',
      label: 'Website core (Supabase)',
      ready: has(env.NEXT_PUBLIC_SUPABASE_URL) && has(env.SUPABASE_SERVICE_ROLE_KEY) && has(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      needs: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      unlocks: 'The directory, guides, content and every database-backed page.',
    },
    {
      key: 'concierge',
      label: 'Concierge chatbot',
      ready: has(env.CLAUDE_API_KEY),
      needs: ['CLAUDE_API_KEY'],
      unlocks: 'The AI concierge can actually answer. Without this it shows an error.',
    },
    {
      key: 'semantic_search',
      label: 'Semantic search & embeddings',
      ready: has(env.OPENAI_API_KEY),
      needs: ['OPENAI_API_KEY'],
      unlocks: 'Meaning-based recall over the knowledge base and the whole directory. Falls back to keyword search when off.',
    },
    {
      key: 'embed_jobs',
      label: 'Embedding backfill jobs',
      ready: has(env.ENRICH_SECRET),
      needs: ['ENRICH_SECRET'],
      unlocks: 'Lets you run /api/concierge/embed and /api/concierge/embed-directory with ?key=<ENRICH_SECRET>.',
    },
    {
      key: 'payments',
      label: 'Checkout (advertisers & membership)',
      ready: has(env.STRIPE_SECRET_KEY),
      needs: ['STRIPE_SECRET_KEY'],
      unlocks: 'The "Get started" buttons open Stripe checkout. Without this every buy button falls back to the quote form.',
    },
    {
      key: 'payments_webhook',
      label: 'Checkout confirmation (Stripe webhook)',
      ready: has(env.STRIPE_WEBHOOK_SECRET),
      needs: ['STRIPE_WEBHOOK_SECRET'],
      unlocks: 'Confirms paid orders and memberships automatically after payment. Set the endpoint to /api/advertise/webhook in Stripe.',
    },
    {
      key: 'site_url',
      label: 'Canonical site URL',
      ready: has(env.NEXT_PUBLIC_SITE_URL),
      needs: ['NEXT_PUBLIC_SITE_URL'],
      unlocks: 'Correct checkout return links, sitemap and share URLs. Set it to https://cyprus-lifestyle.vercel.app (or your domain).',
    },
    {
      key: 'email',
      label: 'Email notifications',
      ready: has(env.RESEND_API_KEY) && has(env.EMAIL_FROM),
      needs: ['RESEND_API_KEY', 'EMAIL_FROM'],
      unlocks: 'Quote-request and onboarding emails. The site works without it; you just won’t get email alerts.',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp concierge (optional)',
      ready: has(env.WHATSAPP_TOKEN) && has(env.WHATSAPP_PHONE_NUMBER_ID),
      needs: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'],
      unlocks: 'The concierge answering on WhatsApp. Entirely optional.',
    },
  ];

  const missing = Array.from(new Set(features.filter((f) => !f.ready).flatMap((f) => f.needs)));
  const core = features.filter((f) => ['website', 'concierge', 'payments'].includes(f.key));

  return NextResponse.json({
    ok: true,
    service: 'cyprus-lifestyle',
    time: new Date().toISOString(),
    summary: {
      ready: features.filter((f) => f.ready).length,
      total: features.length,
      core_ready: core.every((f) => f.ready),
      missing_env_vars: missing,
    },
    features,
    how_to_fix: 'Add any missing variable in Vercel → your project → Settings → Environment Variables (Production), then Redeploy. Values are never shown here for security.',
  });
}
