// lib/mail/tickets.ts — pure mailroom ticketing logic (roadmap item 06).
// No I/O, so it is trivially testable and safe to import anywhere. Decides thread
// grouping, priority, desk routing, the first-response SLA, and which inbound mail is
// safe enough to auto-answer (a deliberately narrow whitelist).

export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type Desk = 'concierge' | 'partnerships' | 'privacy' | 'editorial' | 'careers';
export type SlaState = 'responded' | 'breached' | 'due_soon' | 'on_track';

// Strip reply/forward prefixes in the seven languages so a conversation groups.
export function normalizeSubject(subject: string): string {
  let s = (subject || '').trim();
  const rx = /^\s*(re|aw|fwd|fw|tr|απ|σχετ|odp|пере|re\s*\[\d+\])\s*:\s*/i;
  while (rx.test(s)) s = s.replace(rx, '');
  return s.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120);
}

// A stable key for a conversation: the sender + the normalised subject.
export function threadKey(fromEmail: string, subject: string): string {
  const from = (fromEmail || '').trim().toLowerCase();
  const subj = normalizeSubject(subject) || '(no subject)';
  return `${from}::${subj}`;
}

const URGENT_RX = /\b(urgent|asap|immediately|emergency|complaint|complain|refund|dispute|lawyer|legal action|gdpr|data breach|breach)\b|κατεπείγον|παράπονο|срочно|жалоба|pilne|reklamacja|urgent|reclamație|dringend|beschwerde|عاجل|شكوى/i;
const HIGH_RX = /\b(advertise|advertising|sponsor|sponsorship|partner|partnership|membership|invoice|payment|booking|reservation|quote)\b|διαφήμιση|χορηγ|συνεργασία|реклам|партнёр|reklama|współpraca|publicitate|parteneriat|werbung|partnerschaft|إعلان|شراكة/i;

export function computePriority(subject: string, body: string): Priority {
  const s = `${subject || ''}\n${body || ''}`;
  if (URGENT_RX.test(s)) return 'urgent';
  if (HIGH_RX.test(s)) return 'high';
  return 'normal';
}

const PRIVACY_RX = /\b(gdpr|data protection|privacy|delete my data|erase|subject access|opt[\s-]?out|unsubscribe)\b|απόρρητο|προσωπικά δεδομένα|конфиденциальн|данны|prywatność|dane osobowe|confidențial|datenschutz|خصوصية|بيانات/i;
const PARTNER_RX = /\b(advertise|advertising|sponsor|sponsorship|partner|partnership|media kit|rate card|list my business|listing)\b|διαφήμιση|χορηγ|συνεργασία|reklam|współprac|publicitate|parteneriat|werbung|إعلان|شراكة/i;
const EDITORIAL_RX = /\b(press|editorial|journalist|article|interview|contribut|pitch|correction)\b|τύπος|δημοσιογράφ|άρθρο|συνέντευξη|press|redacț|prasa|wywiad|presse|artikel|interview|صحافة|مقابلة/i;
const CAREERS_RX = /\b(job|career|vacancy|internship|apply|cv|resume|hiring)\b|εργασία|θέση εργασίας|καριέρα|angajare|carieră|praca|kariera|karriere|bewerbung|وظيفة|توظيف/i;

// Content-based desk routing. `toEmail` is a strong hint (privacy@, partnerships@…);
// otherwise infer from the message, defaulting to the concierge desk.
export function routeDesk(toEmail: string, subject: string, body: string): Desk {
  const to = (toEmail || '').toLowerCase();
  if (/(^|[.@+])(privacy|dpo|data)/.test(to)) return 'privacy';
  if (/(^|[.@+])(partner|sales|advertis|ads)/.test(to)) return 'partnerships';
  if (/(^|[.@+])(press|editor|news)/.test(to)) return 'editorial';
  if (/(^|[.@+])(jobs|careers|hr)/.test(to)) return 'careers';
  const s = `${subject || ''}\n${body || ''}`;
  if (PRIVACY_RX.test(s)) return 'privacy';
  if (PARTNER_RX.test(s)) return 'partnerships';
  if (EDITORIAL_RX.test(s)) return 'editorial';
  if (CAREERS_RX.test(s)) return 'careers';
  return 'concierge';
}

const SLA_HOURS: Record<Priority, number> = { urgent: 4, high: 8, normal: 24, low: 48 };

// First-response deadline from arrival time and priority.
export function slaDue(priority: Priority, from: Date = new Date()): Date {
  return new Date(from.getTime() + SLA_HOURS[priority] * 3600_000);
}

export function slaState(slaDueAt: Date | string | null, firstResponseAt: Date | string | null, now: Date = new Date()): SlaState {
  if (firstResponseAt) return 'responded';
  if (!slaDueAt) return 'on_track';
  const due = new Date(slaDueAt).getTime();
  if (due < now.getTime()) return 'breached';
  if (due < now.getTime() + 4 * 3600_000) return 'due_soon';
  return 'on_track';
}

// A deliberately NARROW whitelist of purely informational questions that are safe to
// answer automatically (no advice, no commitments, no prices to get wrong). Everything
// else — and anything urgent/high — is left for a human. Auto-answer is additionally
// gated by a default-OFF switch and the strict autoAckEligible() guardrails.
const SAFE_FAQ_RX = /\b(unsubscribe|opt[\s-]?out|how (do|can) i (subscribe|sign up|register)|newsletter sign|saturday letter|what is cyprus lifestyle|who are you|opening hours|business hours|how to contact|contact details|do you have an app)\b/i;
const UNSAFE_RX = /\b(price|cost|quote|invoice|refund|book|reserve|reservation|legal|tax|visa|residenc|contract|complaint|urgent|medical|lawyer|buy|purchase)\b/i;

export function isSafeAutoAnswer(subject: string, body: string, priority: Priority): boolean {
  if (priority === 'urgent' || priority === 'high') return false;
  const s = `${subject || ''}\n${body || ''}`;
  if (UNSAFE_RX.test(s)) return false;
  return SAFE_FAQ_RX.test(s);
}
