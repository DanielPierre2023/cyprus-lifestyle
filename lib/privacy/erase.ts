// lib/privacy/erase.ts — roadmap item 15. The server-side wrapper around the
// erase_personal_data() SQL function (migration 0098). The heavy lifting (the
// multi-table purge, the accounting anonymisation, the suppression reinforcement and
// the audit row) is all done in one atomic DB call; this module just validates the
// email and relays the call. The pure validators/masker are exported for unit tests.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface EraseSummary { email_masked: string; total: number; counts: Record<string, number>; }

// Pure helpers (unit-tested, no I/O).
export function normalizeEmail(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}
export function isErasableEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  const at = e.indexOf('@');
  return e.length >= 3 && at > 0 && at < e.length - 1 && !/\s/.test(e);
}
export function maskEmail(raw: string): string {
  const e = normalizeEmail(raw);
  const at = e.indexOf('@');
  if (at <= 0) return '***';
  return e[0] + '***@' + e.slice(at + 1);
}

// Execute an erasure. `actor` is recorded in the audit log (who ran it); `requestId`
// links the erasure to the originating DSAR request when there is one.
export async function erasePersonalData(
  email: string, actor: string, requestId?: string | null,
): Promise<{ ok: boolean; summary?: EraseSummary; error?: string }> {
  if (!isErasableEmail(email)) return { ok: false, error: 'A valid email is required.' };
  try {
    const { data, error } = await supabaseAdmin().rpc('erase_personal_data', {
      p_email: normalizeEmail(email),
      p_actor: (actor || 'admin').slice(0, 200),
      p_request_id: requestId || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, summary: data as EraseSummary };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
