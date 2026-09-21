// POST /api/partner/edit  { token, fields } — submit proposed edits (roadmap item 09).
// Requires a verified claim token. Edits are sanitized to the whitelist and stored as a
// PENDING moderation request — they never touch the live listing until an admin approves.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeEdit } from '@/lib/partners/claims';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'partner-edit', 12, 60))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || '').trim();
  if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: claim } = await sb.from('listing_claims').select('id, slug, status, token_expires').eq('token', token).maybeSingle();
  const c = claim as { id: string; slug: string; status: string; token_expires: string } | null;
  if (!c || (c.status !== 'verified' && c.status !== 'approved')) return NextResponse.json({ ok: false, error: 'not verified' }, { status: 403 });
  if (new Date(c.token_expires).getTime() < Date.now()) return NextResponse.json({ ok: false, error: 'expired' }, { status: 410 });

  const fields = sanitizeEdit(body.fields);
  if (Object.keys(fields).length === 0) return NextResponse.json({ ok: false, error: 'no valid changes' }, { status: 400 });

  try {
    await sb.from('listing_edit_requests').insert({ slug: c.slug, claim_id: c.id, fields, status: 'pending' });
  } catch { return NextResponse.json({ ok: false, error: 'could not save' }, { status: 500 }); }
  return NextResponse.json({ ok: true, message: 'Thank you — your changes have been submitted for review and will appear once approved.' });
}
