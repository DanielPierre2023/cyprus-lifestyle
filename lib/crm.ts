import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

// Free/personal mailbox domains — an inbound from one of these is an individual,
// not a business, so we never attach it to (or create) a CRM account.
const GENERIC = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com', 'hotmail.co.uk',
  'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'gmx.de', 'gmx.net', 'web.de',
  'mail.ru', 'yandex.com', 'yandex.ru', 'wp.pl', 'o2.pl',
]);

// Attach an inbound signal (contact form, newsletter signup) to an EXISTING business
// account matched by its email domain, and log it on that account's timeline. It
// never creates an account — a personal inbox should not spawn CRM junk. Best-effort:
// a miss or an error never blocks the inbound flow.
export async function logInboundToAccount(
  sb: SupabaseClient,
  opts: { email: string; name?: string; subject: string; body?: string; type?: string },
): Promise<string | null> {
  try {
    const domain = (opts.email.split('@')[1] || '').toLowerCase().trim();
    if (!domain || domain.length < 3 || GENERIC.has(domain)) return null;
    const { data } = await sb.from('crm_orgs').select('id').ilike('website', `%${domain}%`).limit(1);
    const orgId = (data as { id: string }[] | null)?.[0]?.id || null;
    if (!orgId) return null;
    await sb.from('crm_activities').insert({
      org_id: orgId,
      type: opts.type || 'note',
      subject: opts.subject,
      body: [opts.name ? `${opts.name} <${opts.email}>` : opts.email, opts.body || ''].filter(Boolean).join('\n'),
    });
    return orgId;
  } catch {
    return null;
  }
}
