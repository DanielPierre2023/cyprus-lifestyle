// lib/business/cleanup.ts — the nightly tidy-up of the Business Hub's short-lived credentials (called from /api/cron/tick).
//   * business_sessions: deleted once expired (an expired session is already refused by resolveBusinessSession).
//   * business_login_tokens: deleted one day AFTER they expired. The extra day keeps the sign-in throttle intact: the throttle
//     counts links created in the last hour, and a link lives only 30 minutes.
// Only credentials are deleted: accounts, listing links, proposals and enquiries are never touched here.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BusinessPurgeSummary { sessions: number; loginTokens: number; errors: number }
export const LOGIN_TOKEN_GRACE_MS = 86_400_000;

export async function purgeExpiredBusinessCredentials(sb: SupabaseClient, now: Date = new Date()): Promise<BusinessPurgeSummary> {
  const out: BusinessPurgeSummary = { sessions: 0, loginTokens: 0, errors: 0 };
  const s = await sb.from('business_sessions').delete().lt('expires_at', now.toISOString()).select('id');
  if (s.error) out.errors++; else out.sessions = s.data?.length ?? 0;
  const t = await sb.from('business_login_tokens').delete().lt('expires_at', new Date(now.getTime() - LOGIN_TOKEN_GRACE_MS).toISOString()).select('id');
  if (t.error) out.errors++; else out.loginTokens = t.data?.length ?? 0;
  return out;
}
