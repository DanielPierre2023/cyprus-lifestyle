// GET /api/partner/verify?token=… — confirm a claim token (roadmap item 09). Marks the
// claim verified and returns the listing so the portal can show the edit form. The token
// stays valid (so the partner can submit an edit in the same session) until it expires.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!(await rateLimit(req, 'partner-verify', 30, 60))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const token = String(req.nextUrl.searchParams.get('token') || '').trim();
  if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: claim } = await sb.from('listing_claims').select('id, slug, status, token_expires').eq('token', token).maybeSingle();
  const c = claim as { id: string; slug: string; status: string; token_expires: string } | null;
  if (!c) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 404 });
  if (new Date(c.token_expires).getTime() < Date.now()) return NextResponse.json({ ok: false, error: 'expired' }, { status: 410 });

  if (c.status === 'pending') {
    await sb.from('listing_claims').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', c.id);
  }
  // Return the current listing values so the form is pre-filled with what's live.
  const { data: listing } = await sb.from('directory_listings')
    .select('slug, name_en, phone, email, url, partner_pitch, summary_en').eq('slug', c.slug).maybeSingle();
  return NextResponse.json({ ok: true, slug: c.slug, listing: listing || null });
}
