// lib/member/truth.ts — what the chatbot may say about membership. ONE source for the two prompts (the house facts in
// lib/concierge/brain.ts and MEMBER_BLOCK in lib/concierge/membership.ts), written from what the code actually does:
//
//   more thorough answers .......... MEMBER_BLOCK is added to the prompt for an entitled member (the only difference in the chat)
//   remembered preferences ......... durable profile on concierge_members (lib/concierge/subscriber.ts), restored on any device
//   priority lane .................. bookings.lane = 'member' ONLY if the request is sent while signed in at /account (session cookie)
//                                    and entitled(); the queue sorts members first (lib/booking/queue.ts)
//   first-reply TARGET ............. SLA_TARGET_MIN.member working minutes (Cyprus working hours, public holidays excluded) —
//                                    a target stamped and timed, never a guarantee: a person still has to reply
//   member card .................... /account QR card (lib/member/card.ts); identifies the member; offers exist only if the owner added them
// NOT included, and never to be implied: a named or dedicated human concierge, any guaranteed response time, any discount.
import { SLA_TARGET_MIN } from '@/lib/booking/sla';

const hours = SLA_TARGET_MIN.member / 60;

/** Sentence for the "what we offer" facts in the concierge's system prompt. */
export const MEMBERSHIP_FACTS =
  `(2) Concierge Membership — a paid subscription for residents and frequent visitors. What it really includes: you, the website concierge, answer members more thoroughly; the preferences a member shares are remembered across their devices; ` +
  `a request a member sends while signed in to their account goes into a priority lane in the request queue, with a first-reply TARGET of ${hours} working hours in Cyprus time (a target, not a guarantee); ` +
  `and a digital member card (QR code) that identifies them as a member — partner offers on it are added over time, so never promise a discount or any specific offer. ` +
  `It does NOT include a named or dedicated human concierge, and no response time is guaranteed — never imply it does. `;

/** Appended to the system prompt for a recognised member. */
export const MEMBER_PROMPT =
  '\n\nThis guest is a Cyprus Lifestyle MEMBER. Give them your very best: be especially thorough, anticipatory and generous with detail; go a step beyond what was asked and use what you remember of their preferences. ' +
  `For anything bespoke, offer to take their details through the concierge request form, and tell them that a request sent while they are signed in to their account goes into the member priority lane with a first-reply target of ${hours} working hours (a target, not a guarantee). ` +
  'Do not promise a named or dedicated human concierge, a guaranteed response time, or any discount or partner offer.';
