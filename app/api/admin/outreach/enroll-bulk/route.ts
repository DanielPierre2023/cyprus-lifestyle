// POST /api/admin/outreach/enroll-bulk  { category?, tier?, stage?, q? }
// Enrols every eligible CRM account matching the current admin filter into the
// first-contact sequence (via enroll_prospects_bulk, migration 0093). Eligibility —
// has an emailable contact, not opted-out/suppressed, not already enrolled — is enforced
// in the DB function. This only QUEUES; sending stays gated by sending_enabled + daily cap.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const arg = (v: unknown) => { const s = String(v ?? '').trim(); return s && s !== 'all' ? s : null; };
  const { data, error } = await supabaseAdmin().rpc('enroll_prospects_bulk', {
    p_category: arg(b.category), p_tier: arg(b.tier), p_stage: arg(b.stage), p_q: arg(b.q),
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, enrolled: Number(data) || 0 });
}
