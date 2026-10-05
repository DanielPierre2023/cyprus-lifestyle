// lib/auditRequestEntry.ts — the pure part of lib/auditRequest.ts (kept apart so it can be unit-tested without Next.js).
import type { AuditEntry } from '@/lib/audit';

/** Pure: the audit entry for one request (unit-tested). */
export function requestAuditEntry(method: string, url: string, name: string, user: { id?: string | null; email?: string | null } | null): AuditEntry {
  let path = url;
  let keys: string[] = [];
  try { const u = new URL(url, 'http://local'); path = u.pathname; keys = [...new Set([...u.searchParams.keys()])].slice(0, 12); } catch { /* keep raw */ }
  return {
    actor: user?.id ?? null,
    actorEmail: user?.email ?? null,
    action: `api.${name}`.slice(0, 80),
    summary: `${method.toUpperCase()} ${path}${user ? '' : ' (by access key, not a signed-in administrator)'}`,
    changes: keys.length ? { query: keys } : undefined,
  };
}
