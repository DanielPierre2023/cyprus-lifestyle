// lib/crm/inbound.ts — closes the acquisition loop (roadmap item 07).
// Outreach → send is already gated by consent + suppression; onboarding after a paid
// checkout is already automated in the advertise webhook. The open end was the middle:
// when a prospect REPLIES, the mail landed in the mailroom but never touched the CRM.
// This links a reply back to its contact/deal: logs the reply on the timeline, pauses
// the automated sequence (a human takes over), and flags the deal for follow-up.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

// Escape LIKE/ILIKE wildcards so an address with '_' (a wildcard!) can't match wrongly.
export function likeEscape(s: string): string {
  return s.replace(/([\\%_])/g, '\\$1');
}

export interface InboundLite {
  fromEmail: string; subject?: string | null; body?: string | null; emailId?: string | null;
}
export interface CrmLinkResult { matched: boolean; contactId?: string; orgId?: string; dealId?: string }

export async function linkInboundToCrm(sb: SupabaseClient, m: InboundLite): Promise<CrmLinkResult> {
  const email = (m.fromEmail || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { matched: false };
  try {
    const { data: contact } = await sb.from('crm_contacts')
      .select('id, org_id').ilike('email', likeEscape(email)).limit(1).maybeSingle();
    if (!contact) return { matched: false };
    const contactId = (contact as { id: string }).id;
    const orgId = (contact as { org_id: string | null }).org_id || null;
    const now = new Date().toISOString();

    // Attach to the org's most recent deal, if any.
    let dealId: string | null = null;
    if (orgId) {
      const { data: deal } = await sb.from('crm_deals')
        .select('id').eq('org_id', orgId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      dealId = (deal as { id: string } | null)?.id || null;
    }

    // 1) log the reply on the CRM timeline
    await sb.from('crm_activities').insert({
      org_id: orgId, deal_id: dealId, contact_id: contactId, type: 'inbound_reply',
      subject: (m.subject || '').slice(0, 200), body: (m.body || '').slice(0, 2000), replied_at: now,
    });
    // 2) a reply means stop the machine — pause any active sequence for this account
    if (orgId) {
      await sb.from('crm_enrollments').update({ status: 'paused', updated_at: now })
        .eq('org_id', orgId).eq('status', 'active');
      // 3) flag the deal for a human follow-up
      if (dealId) await sb.from('crm_deals').update({ next_action_at: now, updated_at: now }).eq('id', dealId);
    }
    return { matched: true, contactId, orgId: orgId || undefined, dealId: dealId || undefined };
  } catch {
    return { matched: false };
  }
}
