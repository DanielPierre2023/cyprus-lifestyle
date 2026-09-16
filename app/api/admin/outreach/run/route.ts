// Admin: run the outreach cadence on demand.
//   POST { commit?: boolean, max?: number }
//   commit=false (default) → preview only: renders the next email for every
//     business that's due, returns them, sends nothing and changes nothing.
//   commit=true → actually send + advance (requires sending switched on).
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runOutreach } from '@/lib/outreach';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const commit = body.commit === true;
  const max = Number.isFinite(body.max) ? Number(body.max) : undefined;
  const result = await runOutreach(supabaseAdmin(), { commit, max });
  return NextResponse.json({ ok: true, ...result });
}
