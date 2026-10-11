// lib/auditRequest.ts
// One line in an admin API route — `auditAdminRequest(req, 'scrape.run')` placed right after the admin check — records
// "this administrator called this endpoint" in the audit trail (public.admin_audit_log). It covers the actions that
// write with the service key and therefore bypass the database triggers (AI generation, scraping, translation, mail
// replies, moderation, privacy erasure, …). It records WHO, WHAT endpoint and WHEN — deliberately not the request
// body, which can hold personal data or whole articles; the row changes themselves are traced by the triggers.
//
// Runs after the response is sent (Next.js `after`), so it adds no latency and can never break the action.
import 'server-only';
import { after } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditLog } from '@/lib/audit';
import { requestAuditEntry } from '@/lib/auditRequestEntry';

export function auditAdminRequest(req: Request, name: string): void {
  try {
    // Resolve the signed-in administrator NOW (cookies are only readable while the request is being handled).
    const who = supabaseServer()
      .then((sb) => sb.auth.getUser())
      .then((r) => (r.data.user ? { id: r.data.user.id, email: r.data.user.email ?? null } : null))
      .catch(() => null);
    after(async () => {
      await auditLog(supabaseAdmin(), requestAuditEntry(req.method, req.url, name, await who));
    });
  } catch { /* auditing must never break the request */ }
}
