// lib/booking/runtime.ts — wires the engine to the real world (Supabase, Resend, the clock, a server secret).
import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { hashRestoreToken } from '@/lib/concierge/restoreToken';
import { makeRef } from '@/lib/booking/engine';
import { supabaseStore } from '@/lib/booking/store';
import type { Deps } from '@/lib/booking/types';

/** Secret behind the booking links. BOOKING_LINK_SECRET if set, else the service-role key (server-only and already secret).
 *  Changing it invalidates every outstanding guest and partner link. */
export function linkSecret(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.BOOKING_LINK_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || '';
  return s.length >= 16 ? s : null;
}

/** 32-byte HMAC → 43 base64url characters: the same shape as every other bearer link on the site. */
export function deriveToken(secret: string, kind: 'guest' | 'partner', id: string): string {
  return createHmac('sha256', secret).update(`booking:${kind}:${id}`).digest('base64url');
}

export function deskInbox(env: Record<string, string | undefined> = process.env): string | null {
  return env.CONCIERGE_INBOX_LUXURY || env.CONCIERGE_INBOX || env.DIRECTORY_INBOX || env.ADVERTISE_INBOX || null;
}

export function bookingDeps(sb: SupabaseClient): Deps {
  const secret = linkSecret();
  return {
    store: supabaseStore(sb),
    now: () => new Date(),
    newId: () => randomUUID(),
    newRef: () => makeRef(),
    token: (kind, id) => { if (!secret) throw new Error('No booking link secret configured (BOOKING_LINK_SECRET or SUPABASE_SERVICE_ROLE_KEY).'); return deriveToken(secret, kind, id); },
    hash: hashRestoreToken,
    send: (m) => sendEmail({ to: m.to, subject: m.subject, html: m.html, replyTo: m.replyTo }),
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, ''),
    deskEmail: deskInbox(),
  };
}
