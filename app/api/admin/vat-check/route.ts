// Admin-only: runs the VAT scenarios (lib/vat/scenarios.ts) through Stripe Tax's calculation endpoint and reports
// PASS / FAIL against the rules. Nothing is charged, created or stored in Stripe.
//
// COST (flag): Stripe bills each Calculation API call (US$0.05 on the pay-as-you-go "Tax Basic" price list,
// stripe.com/tax/pricing) — six scenarios ≈ US$0.30 per run. So it runs only when an admin presses the button,
// and not more than once every 15 seconds.
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { stripeConfigured, createTaxCalculation } from '@/lib/stripe';
import { buildScenarios, toCalcInput, resultFrom, resultFromError, summarise } from '@/lib/vat/scenarios';
import { vatConfigStatus } from '@/lib/vat/status';
import { auditAdminRequest } from '@/lib/auditRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let lastRunAt = 0; // best-effort throttle per server instance

async function deny(): Promise<NextResponse | null> {
  try { if (await isAdmin()) return null; } catch { /* fall through */ }
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json({ ok: true, config: vatConfigStatus() });
}

export async function POST(req: Request) {
  const d = await deny();
  if (d) return d;
  auditAdminRequest(req, 'vat-check');
  if (!stripeConfigured()) return NextResponse.json({ ok: false, error: 'STRIPE_SECRET_KEY is not set on the server.' }, { status: 503 });

  const now = Date.now();
  if (now - lastRunAt < 15_000) return NextResponse.json({ ok: false, error: 'Please wait a few seconds between runs (each run is billed by Stripe).' }, { status: 429 });
  lastRunAt = now;

  const scenarios = buildScenarios();
  const results = await Promise.all(
    scenarios.map(async (s) => {
      try { return resultFrom(s, await createTaxCalculation(toCalcInput(s))); }
      catch (e) { return resultFromError(s, (e as Error).message); }
    }),
  );
  return NextResponse.json({ ok: true, config: vatConfigStatus(), results, summary: summarise(results), ranAt: new Date().toISOString() });
}
