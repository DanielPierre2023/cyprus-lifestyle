// lib/auth/keyGate.ts
// ============================================================================
// ONE gate for every maintenance/job route that used to repeat its own copy of
// "?key=<ENRICH_SECRET>" (concierge embed/publish/normalize/geocode/selftest and the
// /api/editorial/* pipeline routes).
//
// A request is authorised if ANY of these is true:
//   1. it presents ENRICH_SECRET via the `x-enrich-key` header or `Authorization: Bearer`;
//   2. it presents it via the legacy `?key=` query parameter — accepted for backwards
//      compatibility (existing pg_cron jobs and bookmarks) UNLESS the server sets
//      ENRICH_DISABLE_QUERY_KEY=1. Turn that on once your callers use a header;
//   3. the caller is a signed-in admin (cookie session) — so the owner can simply open
//      these URLs in the browser while logged in to /admin, with no secret in the URL.
//
// Fails CLOSED: with no ENRICH_SECRET configured, only a signed-in admin gets through.
// Comparison is constant-time (see secretMatch.ts).
// ============================================================================
import 'server-only';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { extractKeys, matchesSecret, queryKeyAllowed } from '@/lib/auth/secretMatch';

/** Returns null when authorised, otherwise a human-readable reason (for a 401 body). */
export async function keyGateDeny(req: NextRequest): Promise<string | null> {
  const secret = (process.env.ENRICH_SECRET || '').trim();

  if (secret) {
    const keys = extractKeys(
      {
        header: req.headers.get('x-enrich-key'),
        authorization: req.headers.get('authorization'),
        query: req.nextUrl.searchParams.get('key'),
      },
      queryKeyAllowed(process.env),
    );
    if (matchesSecret(secret, keys)) return null;
  }

  // Signed-in admin (browser session). Never throws: any failure means "not admin".
  try { if (await isAdmin()) return null; } catch { /* fall through */ }

  if (!secret) {
    return 'Unauthorized — ENRICH_SECRET is not set on the server. Sign in to /admin first, or set ENRICH_SECRET in the environment and send it in the x-enrich-key header.';
  }
  return 'Unauthorized — sign in to /admin, or send the secret in the x-enrich-key header (or Authorization: Bearer).';
}
