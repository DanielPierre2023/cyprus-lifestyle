// Auto-acknowledge safety guardrail — decides whether an inbound email may receive
// an automatic branded receipt. This is safety-critical: a false positive would
// auto-reply to bounces, robots, or threads. Default domain is cypruslifestyle.eu.
import { autoAckEligible, type InboundRow } from '@/lib/mail/assist';
import { eq, report } from './_harness';

const base: InboundRow = {
  id: '1', from_email: 'maria.popescu@gmail.com', from_name: 'Maria',
  subject: 'Question about relocating to Larnaca',
  text_body: 'Hello, we are moving to Cyprus next spring and would love some advice.',
  in_reply_to: null,
};

eq('genuine first-contact enquiry → eligible', autoAckEligible(base).ok, true);
eq('invalid sender address → blocked', autoAckEligible({ ...base, from_email: 'not-an-email' }).ok, false);
eq('no-reply sender → blocked', autoAckEligible({ ...base, from_email: 'no-reply@somebrand.com' }).ok, false);
eq('mailer-daemon sender → blocked', autoAckEligible({ ...base, from_email: 'mailer-daemon@x.com' }).ok, false);
eq('reply within a thread → blocked', autoAckEligible({ ...base, in_reply_to: '<abc@x>' }).ok, false);
eq('out-of-office subject → blocked', autoAckEligible({ ...base, subject: 'Out of Office: Re: hello' }).ok, false);
eq('empty body → blocked', autoAckEligible({ ...base, text_body: 'hi' }).ok, false);
// The blocking reason is surfaced (used for the mailroom log).
eq('reason is reported for a bounce', autoAckEligible({ ...base, from_email: 'bounce@x.com' }).reason, 'automated/role sender');

report('mail.autoAckEligible');
