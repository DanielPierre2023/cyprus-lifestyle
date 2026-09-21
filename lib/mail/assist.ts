// Mail assist — the intelligence behind the backend mailroom.
//   • composeReply()      — the AI drafts (or polishes) a reply, grounded on the
//                           real directory + KB, in the guest's language, as the
//                           right desk. Shared by /api/admin/mail/draft and by
//                           draft-on-arrival.
//   • runInboundAssist()  — called (via after()) the moment mail lands: it stores
//                           a suggested reply on the row, then, ONLY if the opt-in
//                           auto-acknowledge switch is on AND strict guardrails
//                           pass, sends a narrow branded acknowledgement.
// The acknowledgement is a RECEIPT ("we have your message, a person will reply"),
// never a substantive answer — so even a misclassification can only ever send a
// polite holding note, never a wrong fact or commitment. The thread stays open
// for the human follow-up.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callClaude, CLAUDE_SONNET } from '@/lib/ai';
import { conciergeSystem, assembleContext, groundingBlock, detectLocale } from '@/lib/concierge/brain';
import { deskFor, signatureFor } from '@/lib/signatures';
import { brandedEmail, sendEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';

export interface InboundRow {
  id: string; from_email: string; from_name?: string | null; to_email?: string | null;
  subject?: string | null; text_body?: string | null; html_body?: string | null;
  in_reply_to?: string | null; message_id?: string | null;
}

const LANG: Record<string, string> = { en: 'English', el: 'Greek', ro: 'Romanian', ar: 'Arabic', de: 'German', pl: 'Polish', ru: 'Russian' };
const stripHtml = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const ourDomain = () =>
  ((process.env.EMAIL_FROM || '').split('@')[1] || (process.env.NEXT_PUBLIC_SITE_URL || 'cypruslifestyle.eu').replace(/^https?:\/\//, '')).replace(/[>/]/g, '') || 'cypruslifestyle.eu';

// ── AI reply drafting (grounded, localised, per-desk voice) ────────────────────
export async function composeReply(
  row: InboundRow,
  opts: { mode: 'compose' | 'polish'; instruction?: string; locale?: string },
): Promise<{ body: string; locale: string; desk: string; grounded: { picks: number; guides: number; articles: number } | null } | null> {
  const guestText = (row.text_body || (row.html_body ? stripHtml(String(row.html_body)) : '') || '').slice(0, 4000);
  const subject = String(row.subject || '').slice(0, 200);
  const instruction = String(opts.instruction || '').slice(0, 4000);
  const locale = opts.locale && isLocale(opts.locale) ? opts.locale : detectLocale(`${subject}\n${guestText}`);
  const language = LANG[locale] || 'English';
  const desk = deskFor(String(row.to_email || process.env.EMAIL_FROM || `hello@${ourDomain()}`));
  const guestName = row.from_name ? String(row.from_name) : '';

  const ctx = await assembleContext(locale, `${subject}\n${guestText}\n${instruction}`.slice(0, 2000)).catch(() => null);

  const rules = [
    `\n\nYou are now drafting a personal EMAIL REPLY on behalf of ${desk.name} at Cyprus Lifestyle, answering a guest who wrote to us.`,
    `Write a complete, warm, elegant reply in ${language} (the guest's language).`,
    `- Use ONLY the places, prices and facts in the context above; never invent a business, price, address or figure. If a specific fact isn't available, offer to find it out rather than guess.`,
    guestName ? `- Address the guest naturally by name (${guestName}).` : `- Open with a natural, courteous greeting.`,
    `- Keep it concise, refined and genuinely helpful — the Cyprus Lifestyle voice.`,
    `- Do NOT write a subject line. Do NOT add a signature, your name, a "Regards, X" block, or contact details — the system appends the official ${desk.name} signature automatically.`,
    `- Return PLAIN TEXT only: paragraphs separated by a blank line. No markdown, no headings, no bullet characters.`,
  ].join('\n');
  const system = conciergeSystem(locale) + (ctx ? groundingBlock(ctx, locale) : '') + rules;

  const userMessage = opts.mode === 'polish'
    ? `The guest wrote:\n"""${guestText || '(no readable body)'}"""\n\nThe concierge's rough draft. Improve wording, grammar, flow and tone, keep the meaning and any specific facts/commitments:\n"""${instruction}"""\n\nReturn the polished final reply.`
    : `The guest wrote:\n"""${guestText || '(no readable body — reply to the subject: ' + subject + ')'}"""\n\nThe concierge's intent / notes for the reply:\n"""${instruction || 'Reply helpfully, accurately and warmly, addressing what the guest asked.'}"""\n\nWrite the full reply now.`;

  const { text, error } = await callClaude({ systemInstruction: system, userMessage, model: CLAUDE_SONNET, temperature: 0.4, maxTokens: 1100, fn: 'mail-compose' });
  if (error || !text.trim()) return null;
  return { body: text.trim(), locale, desk: desk.name, grounded: ctx ? { picks: ctx.picks.length, guides: ctx.guides.length, articles: ctx.articles.length } : null };
}

// ── Auto-acknowledgement copy (receipt only), all seven editions ───────────────
interface Ack { subject: string; heading: string; greetingNamed: string; greeting: string; body: string; }
const ACK: Record<Locale, Ack> = {
  en: { subject: 'We have your message — Cyprus Lifestyle', heading: 'Thank you for writing to us', greetingNamed: 'Dear {name},', greeting: 'Hello,', body: 'Thank you for your message. It has reached the right desk and a member of our team will reply to you personally, usually within one business day. This note is simply to let you know it arrived safely.' },
  el: { subject: 'Λάβαμε το μήνυμά σας — Cyprus Lifestyle', heading: 'Σας ευχαριστούμε που επικοινωνήσατε', greetingNamed: 'Αγαπητέ/ή {name},', greeting: 'Γεια σας,', body: 'Σας ευχαριστούμε για το μήνυμά σας. Έφτασε στο σωστό τμήμα και ένα μέλος της ομάδας μας θα σας απαντήσει προσωπικά, συνήθως εντός μίας εργάσιμης ημέρας. Το παρόν μήνυμα επιβεβαιώνει απλώς ότι το λάβαμε.' },
  ro: { subject: 'Am primit mesajul dumneavoastră — Cyprus Lifestyle', heading: 'Vă mulțumim că ne-ați scris', greetingNamed: 'Stimate/ă {name},', greeting: 'Bună ziua,', body: 'Vă mulțumim pentru mesaj. A ajuns la departamentul potrivit, iar un membru al echipei noastre vă va răspunde personal, de obicei în maximum o zi lucrătoare. Acest mesaj confirmă doar că l-am primit.' },
  ar: { subject: 'لقد استلمنا رسالتك — Cyprus Lifestyle', heading: 'شكراً لتواصلك معنا', greetingNamed: 'عزيزي {name}،', greeting: 'مرحباً،', body: 'شكراً لرسالتك. لقد وصلت إلى القسم المختص وسيردّ عليك أحد أعضاء فريقنا شخصياً، عادةً خلال يوم عمل واحد. هذه الرسالة فقط لتأكيد وصولها بأمان.' },
  de: { subject: 'Wir haben Ihre Nachricht erhalten — Cyprus Lifestyle', heading: 'Vielen Dank für Ihre Nachricht', greetingNamed: 'Sehr geehrte(r) {name},', greeting: 'Guten Tag,', body: 'Vielen Dank für Ihre Nachricht. Sie hat das richtige Ressort erreicht, und ein Mitglied unseres Teams wird Ihnen persönlich antworten, in der Regel innerhalb eines Werktages. Diese Nachricht bestätigt lediglich den Eingang.' },
  pl: { subject: 'Otrzymaliśmy Twoją wiadomość — Cyprus Lifestyle', heading: 'Dziękujemy za wiadomość', greetingNamed: 'Szanowny/a {name},', greeting: 'Dzień dobry,', body: 'Dziękujemy za wiadomość. Trafiła do właściwego działu, a członek naszego zespołu odpowie Ci osobiście, zwykle w ciągu jednego dnia roboczego. Ta wiadomość potwierdza jedynie, że dotarła.' },
  ru: { subject: 'Мы получили ваше сообщение — Cyprus Lifestyle', heading: 'Благодарим за ваше сообщение', greetingNamed: 'Уважаемый(ая) {name},', greeting: 'Здравствуйте,', body: 'Благодарим за ваше сообщение. Оно поступило в нужный отдел, и сотрудник нашей команды ответит вам лично, как правило, в течение одного рабочего дня. Это письмо лишь подтверждает, что оно получено.' },
};

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

// Strict guardrails: only a genuine first-contact enquiry from a real person is
// eligible for an automatic acknowledgement.
export function autoAckEligible(row: InboundRow): { ok: boolean; reason?: string } {
  const from = String(row.from_email || '').toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)) return { ok: false, reason: 'invalid sender' };
  if (from.endsWith(`@${ourDomain()}`)) return { ok: false, reason: 'own domain' };
  if (/(^|[.@+])(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster|bounce|bounces|notifications?|newsletter|mailer|automated|auto)/.test(from))
    return { ok: false, reason: 'automated/role sender' };
  if (row.in_reply_to) return { ok: false, reason: 'reply within a thread' }; // acknowledge first contact only
  const subject = String(row.subject || '').toLowerCase();
  if (/(out of office|auto[\s-]?reply|automatic reply|delivery status|undeliverable|read receipt|abwesenheit|réponse automatique)/.test(subject))
    return { ok: false, reason: 'auto-reply/bounce subject' };
  const bodyLen = (row.text_body || (row.html_body ? stripHtml(String(row.html_body)) : '') || '').trim().length;
  if (bodyLen < 12) return { ok: false, reason: 'no real message body' };
  return { ok: true };
}

// ── Orchestrator — run the moment an inbound email is stored ───────────────────
export async function runInboundAssist(row: InboundRow): Promise<void> {
  const sb = supabaseAdmin();

  // 1) Draft-on-arrival: always prepare a suggested reply for the human.
  const draft = await composeReply(row, { mode: 'compose' }).catch(() => null);
  if (draft?.body) {
    try { await sb.from('inbound_emails').update({ suggested_reply: draft.body, suggested_at: new Date().toISOString() }).eq('id', row.id); }
    catch { /* the mail is safely stored; a missing suggestion just means the admin drafts by hand */ }
  }

  // 2) Auto-acknowledge — opt-in and guarded.
  const { data: settings } = await sb.from('automation_settings').select('mail_autoack_enabled').eq('id', 1).maybeSingle();
  if (!settings?.mail_autoack_enabled) return;
  if (!autoAckEligible(row).ok) return;

  const locale = (draft?.locale && isLocale(draft.locale) ? draft.locale : detectLocale(`${row.subject || ''}\n${row.text_body || ''}`)) as Locale;
  const domain = ourDomain();
  const original = String(row.to_email || '').toLowerCase();
  const fromAddr = original.endsWith(`@${domain}`) ? original : `hello@${domain}`;
  const t = ACK[locale] || ACK.en;
  const greeting = row.from_name ? t.greetingNamed.replace('{name}', esc(String(row.from_name))) : t.greeting;
  const html = brandedEmail({
    locale, heading: t.heading,
    bodyHtml: `<p>${greeting}</p><p>${t.body}</p>`,
    signature: signatureFor(fromAddr),
    preheader: t.heading,
  });
  const res = await sendEmail({ to: row.from_email, subject: t.subject, html, from: `Cyprus Lifestyle <${fromAddr}>` });
  if (res.ok) {
    // Mark acknowledged but DON'T close the thread — a human still owes a real reply.
    try { await sb.from('inbound_emails').update({ auto_sent: true }).eq('id', row.id); }
    catch { /* the acknowledgement went out; the flag is best-effort bookkeeping */ }
  }
}
