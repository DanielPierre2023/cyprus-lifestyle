// lib/concierge/membership.ts
// Concierge members' tier — server-side entitlement checks. A member is a row in
// concierge_members with status='active'. Recognised by the anonymous cid used at
// checkout, or linked by email across devices. All best-effort: any failure means
// "not a member", so the concierge simply serves the free tier.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidCid } from '@/lib/concierge/memory';

export interface MemberStatus { member: boolean; tier: string | null; }

export async function memberStatus(cid: string): Promise<MemberStatus> {
  if (!isValidCid(cid)) return { member: false, tier: null };
  try {
    const { data } = await supabaseAdmin()
      .from('concierge_members')
      .select('tier, status')
      .eq('cid', cid).eq('status', 'active')
      .limit(1).maybeSingle();
    return data ? { member: true, tier: String(data.tier || 'concierge') } : { member: false, tier: null };
  } catch { return { member: false, tier: null }; }
}

export async function isMemberCid(cid: string): Promise<boolean> {
  return (await memberStatus(cid)).member;
}

// Link this browser (cid) to an existing active membership by email — so a member
// who subscribed on another device is recognised here after entering their email.
export async function linkEmailToCid(cid: string, email: string): Promise<boolean> {
  const e = (email || '').trim().toLowerCase();
  if (!isValidCid(cid) || !e || !e.includes('@')) return false;
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from('concierge_members')
      .select('id, cid').ilike('email', e).eq('status', 'active').limit(1).maybeSingle();
    if (!data) return false;
    await sb.from('concierge_members').update({ cid, updated_at: new Date().toISOString() }).eq('id', data.id as string);
    return true;
  } catch { return false; }
}

// The system-prompt note that upgrades the concierge for a member.
export const MEMBER_BLOCK =
  '\n\nThis guest is a Cyprus Lifestyle MEMBER. Give them your very best: be especially thorough, anticipatory and generous with detail and time; go a step beyond what was asked. For anything bespoke or high-stakes, warmly offer to hand them to their dedicated human concierge.';
