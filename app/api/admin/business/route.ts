// Admin → Business Hub (English).
//   GET  ?status=submitted|changes_requested|approved|rejected|all   the proposals from businesses, oldest first for 'submitted'
//   POST { id, action:'approve'|'reject'|'request_changes', note }   decide one proposal (reject / request_changes need a note)
// Approving a description or photo proposal writes it to the listing (the same effect as Admin → Moderation → owner edits);
// approving a news proposal publishes nothing: the desk follows up with the business.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditLog } from '@/lib/audit';
import { hasTextStatusColumn } from '@/lib/directory/enrich';
import { decideSubmission, listQueue } from '@/lib/business/data';
import { SUBMISSION_STATUSES, normalizeDeskAction, type SubmissionStatus } from '@/lib/business/rules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  const q = req.nextUrl.searchParams.get('status') || 'submitted';
  const statuses: SubmissionStatus[] = q === 'all' ? [...SUBMISSION_STATUSES] : (SUBMISSION_STATUSES as readonly string[]).includes(q) ? [q as SubmissionStatus] : ['submitted'];
  const sb = supabaseAdmin();
  const rows = await listQueue(sb, statuses);
  const [{ count: accounts }, { count: waiting }] = await Promise.all([
    sb.from('business_accounts').select('id', { count: 'exact', head: true }),
    sb.from('business_submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
  ]);
  return NextResponse.json({ ok: true, rows, accounts: accounts ?? 0, waiting: waiting ?? 0 });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = normalizeDeskAction(body.action);
  if (!action) return NextResponse.json({ ok: false, error: "Provide { id, action:'approve'|'reject'|'request_changes', note }." }, { status: 400 });
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const sb = supabaseAdmin();
  const res = await decideSubmission(sb, body.id, action, body.note, user?.email ?? null, { textStatusColumn: await hasTextStatusColumn() });
  if (res.ok) {
    await auditLog(sb, {
      actor: user?.id ?? null, actorEmail: user?.email ?? null, action: `business.submission.${action}`, table: 'business_submissions', rowId: String(body.id),
      summary: `${action} business proposal${res.applied ? ` (applied: ${res.applied})` : ''}`,
    });
  }
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
