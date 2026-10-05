// lib/auth/secretMatch.ts
// ============================================================================
// Pure helpers for shared-secret checks (no server-only import, so they are unit
// testable). Used by lib/auth/keyGate.ts and mirrored by the Supabase edge functions.
//
//   • safeEqual   — constant-time comparison. Both sides are hashed first, so the
//                   comparison time depends neither on where the strings differ nor
//                   on their lengths.
//   • extractKey  — where a caller may present the secret: the `x-enrich-key` header,
//                   `Authorization: Bearer …`, or (legacy, switchable off) `?key=`.
// ============================================================================
import { createHash, timingSafeEqual } from 'node:crypto';

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

export interface KeySources {
  header?: string | null;        // x-enrich-key
  authorization?: string | null; // Authorization
  query?: string | null;         // ?key=
}

/**
 * Return the candidate secrets a request presents, most-preferred first.
 * `allowQuery=false` ignores `?key=` entirely (secrets in URLs end up in access logs,
 * browser history and referrers).
 */
export function extractKeys(src: KeySources, allowQuery: boolean): string[] {
  const out: string[] = [];
  const h = (src.header || '').trim();
  if (h) out.push(h);
  const bearer = /^Bearer\s+(.+)$/i.exec((src.authorization || '').trim());
  if (bearer && bearer[1].trim()) out.push(bearer[1].trim());
  const q = (src.query || '').trim();
  if (allowQuery && q) out.push(q);
  return out;
}

/** True when ANY presented candidate equals the configured secret. */
export function matchesSecret(secret: string, candidates: string[]): boolean {
  if (!secret) return false; // a missing secret never authorises anything
  let ok = false;
  for (const c of candidates) if (safeEqual(c, secret)) ok = true; // no early exit
  return ok;
}

/** Legacy `?key=` is accepted unless ENRICH_DISABLE_QUERY_KEY=1 (or "true"). */
export function queryKeyAllowed(env: Record<string, string | undefined>): boolean {
  const v = (env.ENRICH_DISABLE_QUERY_KEY || '').trim().toLowerCase();
  return !(v === '1' || v === 'true' || v === 'yes');
}
