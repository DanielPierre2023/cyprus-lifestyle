// GET    /api/concierge/memory?cid=...   → { profile }        (for the memory drawer + welcome-back)
// DELETE /api/concierge/memory?cid=...   → { ok:true }         ("Forget me")
// The guest's cross-session memory is anonymous (browser-generated cid) and
// fully clearable by the guest — the privacy control for the concierge memory.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { loadMemory, clearMemory, isValidCid, isProfileEmpty } from '@/lib/concierge/memory';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cid = String(req.nextUrl.searchParams.get('cid') || '');
  if (!isValidCid(cid)) return NextResponse.json({ profile: {}, has: false });
  const profile = await loadMemory(cid);
  return NextResponse.json({ profile, has: !isProfileEmpty(profile) });
}

export async function DELETE(req: NextRequest) {
  if (!(await rateLimit(req, 'concierge-memory', 20, 60))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const cid = String(req.nextUrl.searchParams.get('cid') || '');
  if (!isValidCid(cid)) return NextResponse.json({ ok: false }, { status: 400 });
  await clearMemory(cid);
  return NextResponse.json({ ok: true });
}
