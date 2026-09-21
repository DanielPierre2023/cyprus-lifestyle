// GET /api/health — a plain-language readiness check for Cyprus Lifestyle.
// It reports ONLY whether each integration is configured (true/false) — it never
// exposes a key or any secret value. Open it in a browser to see, at a glance,
// which environment variables still need to be added in Vercel and what each one
// switches on. Safe to leave public; it reveals capability, not credentials.
//
// Monitor modes (for an external uptime monitor — UptimeRobot, Better Stack, etc.):
//   /api/health?ping   → instant liveness: 200 {ok:true}. No DB, no work. Cheapest.
//   /api/health?deep   → real readiness: a live Supabase round-trip. 200 if the
//                         database answers AND core env is present; 503 otherwise.
//                         Point your uptime monitor here and alert on non-200.
//   /api/health        → the full human-readable report (200, or 503 if the core
//                         website integration isn't configured).
//   HEAD /api/health   → 200, body-less liveness (lightest possible check).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const has = (v: string | undefined) => !!(v && v.trim());

// A cheap, real round-trip to Supabase: does the database actually answer? Uses a
// HEAD-style select on the tiny single-row settings table, with a hard timeout so a
// hung database can't hang the monitor. Returns null on success, or a short reason.
async function dbDown(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const { error } = await supabaseAdmin()
        .from('automation_settings')
        .select('id', { head: true })
        .limit(1)
        .abortSignal(ctrl.signal);
      return error ? (error.message || 'database error') : null;
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    return (e as Error)?.message || 'database unreachable';
  }
}

// HEAD — lightest liveness (the serverless function is up). No body.
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: Request) {
  const env = process.env;
  const url = new URL(req.url);

  // ?ping — instant liveness, no work at all.
  if (url.searchParams.has('ping')) {
    return NextResponse.json({ ok: true, service: 'cyprus-lifestyle', time: new Date().toISOString() });
  }

  const coreEnvReady = has(env.NEXT_PUBLIC_SUPABASE_URL) && has(env.SUPABASE_SERVICE_ROLE_KEY) && has(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // ?deep — the monitor endpoint: verify the database actually answers.
  if (url.searchParams.has('deep')) {
    const reason = coreEnvReady ? await dbDown() : 'core env not configured';
    const up = coreEnvReady && reason === null;
    return NextResponse.json(
      { ok: up, service: 'cyprus-lifestyle', check: 'deep', database: up ? 'reachable' : 'unreachable', reason: up ? undefined : reason, time: new Date().toISOString() },
      { status: up ? 200 : 503 },
    );
  }

  const features = [
    {
      key: 'website',
      label: 'Website core (Supabase)',
      ready: coreEnvReady,
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
      unlocks: 'Correct checkout return links, sitemap and share URLs. Set it to https://cypruslifestyle.eu (or your domain).',
    },
    {
      key: 'email',
      label: 'Email notifications',
      ready: has(env.RESEND_API_KEY) && has(env.EMAIL_FROM),
      needs: ['RESEND_API_KEY', 'EMAIL_FROM'],
      unlocks: 'Quote-request and onboarding emails. The site works without it; you just won’t get email alerts.',
    },
    {
      key: 'email_inbound',
      label: 'Inbound email (backend mailroom)',
      ready: has(env.RESEND_INBOUND_SECRET) || has(env.RESEND_WEBHOOK_SECRET),
      needs: ['RESEND_INBOUND_SECRET'],
      unlocks: 'Receiving @cypruslifestyle.eu mail into the admin panel (Resend inbound → /api/email/inbound → Admin → Mail). Set the signing secret from the Resend webhook.',
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
  // Only the website integration being absent means the site itself can't serve —
  // that's what flips the HTTP status to 503. A missing optional (concierge, email,
  // payments) is "degraded", still 200, so a status-only monitor won't false-alarm
  // during pre-launch while those are still being wired.
  const siteUp = coreEnvReady;

  return NextResponse.json({
    ok: siteUp,
    service: 'cyprus-lifestyle',
    time: new Date().toISOString(),
    summary: {
      ready: features.filter((f) => f.ready).length,
      total: features.length,
      core_ready: core.every((f) => f.ready),
      degraded: !core.every((f) => f.ready),
      missing_env_vars: missing,
    },
    features,
    how_to_fix: 'Add any missing variable in Vercel → your project → Settings → Environment Variables (Production), then Redeploy. Values are never shown here for security.',
  }, { status: siteUp ? 200 : 503 });
}
