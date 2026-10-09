// POST /api/desk/assess — the style check of the article desk as a service.
//
// The article desk runs in a Supabase edge function, which may use two seconds of computing per call. The voice engine needs more than that
// for one article in seven languages, so the edge function sends each edition here and gets the verdict back. Same judge as the voice worker
// and the admin tools (lib/journalism/assess.ts). Nothing is stored and no model is called: it is plain computing, so it costs no AI spend.
//
// Auth: the shared maintenance secret (ENRICH_SECRET in the x-enrich-key header, as for the other job routes) or a signed-in admin.
//   body { html, lang, title?, category?, articleType? }  →  { score, ok, high, words, tells[] }
import type { NextRequest } from 'next/server';
import { keyGateDeny } from '@/lib/auth/keyGate';
import { runAssess } from '@/lib/journalism/assessService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const deny = await keyGateDeny(req);
  if (deny) return Response.json({ ok: false, error: deny }, { status: 401 });
  const body = await req.json().catch(() => null);
  const r = runAssess(body);
  return Response.json(r.json, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
}
