// app/api/admin/moderation/edits/route.ts
// Admin MODERATION — owner-edit queue (public.directory_listing_edits).
//   GET                                   → list pending owner edits (joined to
//                                            their listing's live values).
//   POST { id, action:'approve'|'reject' } → approve (apply the proposed value onto
//                                            the listing) or reject the edit.
//
// AUTH: admin session only — the exact isAdmin() gate used by the other admin write
// routes (app/api/admin/proof, /sponsors, /editorial/repair). directory_listing_edits
// is RLS service-role-only, so ALL access here goes through supabaseAdmin() (inside
// lib/directory/moderation) behind this check — never from the browser, no secret
// exposed to the client.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { listPendingEdits, applyEditDecision, normalizeEditAction } from '@/lib/directory/moderation';
import { auditAdminRequest } from '@/lib/auditRequest';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const edits = await listPendingEdits();
  return NextResponse.json({ ok: true, count: edits.length, edits });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  auditAdminRequest(req, 'moderation.edits');
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = typeof body.id === 'string' ? body.id : '';
  const action = normalizeEditAction(body.action);
  if (!id || !action) {
    return NextResponse.json({ ok: false, error: "Provide { id, action:'approve'|'reject' }." }, { status: 400 });
  }
  const res = await applyEditDecision(id, action);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
