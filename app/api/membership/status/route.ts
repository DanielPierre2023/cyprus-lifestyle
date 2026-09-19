// GET  /api/membership/status?cid=...     → { member, tier }
// POST /api/membership/status  { cid, email }  → link this browser to an existing
//   membership by email (cross-device), returns { ok, member }.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { memberStatus, linkEmailToCid } from '@/lib/concierge/membership';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cid = String(req.nextUrl.searchParams.get('cid') || '');
  return NextResponse.json(await memberStatus(cid));
}

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'membership-link', 10, 60))) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const cid = String(body.cid || '');
  const email = String(body.email || '');
  const linked = await linkEmailToCid(cid, email);
  return NextResponse.json({ ok: linked, member: linked });
}
