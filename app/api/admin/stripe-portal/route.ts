// Admin — create (once) the Customer Portal configuration that carries Cyprus Lifestyle's own Terms / Privacy links.
// The Stripe account is shared with other businesses, so this cannot be done with the account-wide settings
// (docs/STRIPE-SHARED-ACCOUNT.md). Uses the STRIPE_SECRET_KEY already on the server: no key is ever typed or pasted.
//
//   Open while signed in to /admin:
//     /api/admin/stripe-portal            → shows whether the configuration exists (changes nothing)
//     /api/admin/stripe-portal?create=1   → creates it if missing (re-opening never creates a second one)
//   Then set STRIPE_PORTAL_CONFIGURATION_ID in Vercel to the returned id and redeploy.
//
// Admin session only, and only requests typed into / opened from the browser's own address bar or this site
// (Sec-Fetch-Site none|same-origin) may create: a link on another website cannot trigger it.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { findOrCreatePortalConfiguration, stripeConfigured } from '@/lib/stripe';
import { auditAdminRequest } from '@/lib/auditRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Sign in to /admin first.' }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ ok: false, error: 'STRIPE_SECRET_KEY is not set on the server.' }, { status: 503 });
  const create = req.nextUrl.searchParams.get('create') === '1';
  const fetchSite = req.headers.get('sec-fetch-site');
  if (create && fetchSite && fetchSite !== 'none' && fetchSite !== 'same-origin') {
    return NextResponse.json({ ok: false, error: 'Open this address directly in your browser.' }, { status: 403 });
  }
  auditAdminRequest(req, create ? 'stripe-portal-create' : 'stripe-portal-check');
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, '');
  try {
    const r = await findOrCreatePortalConfiguration(site, create);
    if (!r.id) return NextResponse.json({ ok: true, exists: false, next: `${site}/api/admin/stripe-portal?create=1` });
    return NextResponse.json({
      ok: true, exists: true, created: r.created, id: r.id,
      next: 'Set STRIPE_PORTAL_CONFIGURATION_ID to this id in Vercel (Settings → Environment Variables), then redeploy.',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
