// lib/booking/inbound.ts — the wiring point between the mail intake and the booking history.
// Called from POST /api/email/inbound (inside after(), once the message is safely stored in inbound_emails):
//   attachInboundToBooking(supabaseAdmin(), { emailId, fromEmail, ..., subject, body })
// A reply from a guest or a partner that carries its booking reference CL-XXXXXX is attached to that booking's history
// (see lib/booking/correspondence.ts for the matching rules). NEVER throws; a mail that does not match stays in Admin → Mail only.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { attachInboundMail, type AttachResult, type InboundMail } from '@/lib/booking/correspondence';
import { bookingDeps } from '@/lib/booking/runtime';
import { logServerError } from '@/lib/monitor.server';

/** Our own mail domain(s): a mail from there is classified "desk", not "unknown". */
export function ownMailDomains(env: Record<string, string | undefined> = process.env): string[] {
  const out = new Set<string>(['cypruslifestyle.eu']);
  const from = (env.EMAIL_FROM || '').match(/@([A-Za-z0-9.-]+)>?\s*$/)?.[1];
  if (from) out.add(from.toLowerCase());
  return [...out];
}

export async function attachInboundToBooking(sb: SupabaseClient, mail: InboundMail): Promise<AttachResult | null> {
  try {
    return await attachInboundMail(bookingDeps(sb), mail, ownMailDomains());
  } catch (e) {
    await logServerError('booking-inbound-attach', e, { emailId: mail.emailId }).catch(() => undefined);
    return null;
  }
}
