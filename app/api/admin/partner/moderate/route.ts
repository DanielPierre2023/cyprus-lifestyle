// POST /api/admin/partner/moderate  { kind:'claim'|'edit', id, action:'approve'|'reject' }
// Admin-only moderation for the partner portal (roadmap item 09). Approving an edit calls
// apply_listing_edit(), which writes ONLY whitelisted fields to the live listing.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || '');
  const id = String(body.id || '');
  const action = String(body.action || '');
  if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });

  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  try {
    if (kind === 'claim') {
      await sb.from('listing_claims').update({
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_at: action === 'approve' ? now : null, reviewed_by: 'admin',
      }).eq('id', id);
      return NextResponse.json({ ok: true });
    }
    if (kind === 'edit') {
      if (action === 'approve') {
        const { data, error } = await sb.rpc('apply_listing_edit', { p_request_id: id, p_reviewer: 'admin' });
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, applied: data === true });
      }
      await sb.from('listing_edit_requests').update({ status: 'rejected', reviewed_by: 'admin', reviewed_at: now }).eq('id', id);
      return NextResponse.json({ ok: true });
    }
  } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
  return NextResponse.json({ ok: false, error: 'unknown kind' }, { status: 400 });
}
