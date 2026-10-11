// lib/audit.ts
// Records an administrator action that happens in SERVER code (an API route) in the audit trail
// (public.admin_audit_log). Edits made straight from the admin screens to the database are recorded by
// database triggers instead (migration 20261005140000_admin_audit_log.sql) — this is for the actions that
// are not a plain row edit: approving a newsletter, granting a membership, preparing a draft …
//
// Best-effort by design: a failing audit write must never block the action itself, so this never throws.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logServerError } from '@/lib/monitor.server';

export interface AuditEntry {
  actor?: string | null;
  actorEmail?: string | null;
  action: string;                 // a verb, e.g. 'newsletter.approve'
  table?: string;
  rowId?: string;
  summary?: string;
  changes?: Record<string, unknown>;
}

/** Shape of the row we insert — separate and pure so it can be unit-tested. */
export function auditRow(e: AuditEntry): Record<string, unknown> {
  return {
    actor: e.actor ?? null,
    actor_email: e.actorEmail ?? null,
    source: 'api',
    action: e.action.slice(0, 80),
    table_name: e.table ?? null,
    row_id: e.rowId ?? null,
    summary: e.summary ? e.summary.slice(0, 300) : null,
    changes: e.changes ?? null,
  };
}

export async function auditLog(sb: SupabaseClient, e: AuditEntry): Promise<void> {
  try {
    const { error } = await sb.from('admin_audit_log').insert(auditRow(e));
    if (error) await logServerError('audit-log', new Error(error.message), { action: e.action }, 'warn');
  } catch (err) {
    try { await logServerError('audit-log', err, { action: e.action }, 'warn'); } catch { /* never throw */ }
  }
}
