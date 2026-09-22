// POST /api/admin/privacy/erase — roadmap item 15. Fulfils a GDPR erasure request:
// permanently erases a data subject's personal data across every table (and
// anonymises the accounting records we must retain), then marks the linked DSAR
// request resolved. Destructive and irreversible, so it is gated by an admin session
// AND requires an explicit { confirm: true } in the body. Every run is audited
// (dsar_erasure_log) with the acting admin's identity.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { erasePersonalData, isErasableEmail } from '@/lib/privacy/erase';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '');
  if (!isErasableEmail(email)) return NextResponse.json({ ok: false, error: 'A valid email is required.' }, { status: 400 });
  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: 'Confirmation required — this permanently erases the person’s data.' }, { status: 400 });
  }
  const requestId = body.requestId ? String(body.requestId) : null;

  // Who is running this — recorded in the audit trail.
  let actor = 'admin';
  try {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (user?.email) actor = user.email;
  } catch { /* fall back to 'admin' */ }

  const r = await erasePersonalData(email, actor, requestId);
  if (!r.ok) {
    await logServerError('privacy:erase', new Error(r.error || 'failed'), { requestId });
    return NextResponse.json({ ok: false, error: r.error }, { status: 500 });
  }
  // Close the request (proof of handling lives in dsar_requests + dsar_erasure_log).
  if (requestId) {
    try {
      await supabaseAdmin().from('dsar_requests')
        .update({ status: 'resolved', handled_at: new Date().toISOString(), handled_by: actor })
        .eq('id', requestId);
    } catch { /* non-fatal: the erasure itself succeeded */ }
  }
  return NextResponse.json({ ok: true, ...r.summary });
}
