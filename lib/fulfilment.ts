import 'server-only';
import { brandedEmail } from '@/lib/email';

// What we need from the buyer to get each product live. Drives the automatic
// onboarding email sent from the Stripe webhook right after payment.
const NEEDS: Record<string, string[]> = {
  'tier-listed': ['Your logo and one good landscape photo', 'A one-line description of your business', 'Website, phone and address'],
  'premium-listing': ['Your logo and one good landscape photo', 'A one-line description of your business', 'Website, phone and address'],
  'tier-featured': ['Your logo and a few photos', 'A one-line description, website, phone and address', 'A banner image (or your brand colours + logo)', 'A topic for your first sponsored feature'],
  'sidebar-leaderboard': ['Your banner image (or brand colours + logo)', 'A headline, one line of copy, and the link it should point to'],
  'section-sponsorship': ['Your logo for the “presented by” lockup', 'A banner image or your brand colours', 'Which section you would like to sponsor'],
  'sponsored-feature': ['A short brief or the angle you would like', 'Photos we may use', 'A contact for a 20-minute interview, or written answers to our questions'],
  'newsletter-sole': ['Your headline and a short message', 'An image and a link', 'Your preferred Saturday send date'],
  'directory-exclusive': ['Your business category', 'Confirmation of your listing details'],
  'agenda-event': ['Event name, date, time and venue', 'An image and a ticket/info link', 'A one-line description'],
  'tier-partner': ['A good time for a short call to plan your annual programme'],
};

export interface OrderLike {
  slot?: string | null; label?: string | null;
  company?: string | null; customer_name?: string | null; customer_email?: string | null;
}

/** Branded onboarding email: confirms the purchase and asks for exactly what we
 *  need to fulfil it. Best-effort; the webhook ignores failures. */
export function onboardingEmail(o: OrderLike): { subject: string; html: string } {
  const label = o.label || 'your placement';
  const name = o.company || o.customer_name || 'there';
  const needs = NEEDS[o.slot || ''] || ['A few details so we can set this up for you'];
  const list = needs.map((n) => `<li style="margin:0 0 6px">${n}</li>`).join('');
  const bodyHtml =
    `<p>Dear ${name},</p>` +
    `<p>Thank you — your <strong>${label}</strong> with Cyprus Lifestyle is confirmed. To get it live across all seven editions, could you reply to this email with:</p>` +
    `<ul style="padding-left:18px;margin:0 0 12px">${list}</ul>` +
    `<p>Send whatever you have and we will take it from there. Welcome aboard.</p>` +
    `<p>— Cyprus Lifestyle · Partnerships</p>`;
  const html = brandedEmail({
    locale: 'en',
    heading: 'Welcome aboard — a couple of things to get you live',
    bodyHtml,
    preheader: `Next steps for ${label}`,
  });
  return { subject: `Cyprus Lifestyle — next steps for ${label}`, html };
}
