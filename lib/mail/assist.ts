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
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai';
import { conciergeSystem, assembleContext, groundingBlock, detectLocale, CONCIERGE_MODEL, type ConciergeContext } from '@/lib/concierge/brain';
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

// The reply is a private, admin-reviewed 1:1 email — unlike the public chat (which
// captures the guest and routes to the human desk), here the concierge MAY hand the
// guest the businesses' own published contact details. We pull them for the matched
// listings and give them to the model so it can pass on real phone/email/website —
// still strictly grounded: only what's listed here, never invented.
async function contactsBlock(ctx: ConciergeContext | null, locale: string): Promise<string> {
  const slugs = Array.from(new Set((ctx?.candidates || []).map((c) => c.slug).filter(Boolean))).slice(0, 8);
  if (!slugs.length) return '';
  try {
    const { data } = await supabaseAdmin()
      .from('directory_listings')
      .select(`slug, name_${locale}, name_en, url, phone, email, address, contact_person, contact_role, district`)
      .in('slug', slugs);
    const rows = (data as Record<string, unknown>[] | null) || [];
    const lines: string[] = [];
    for (const r of rows) {
      const name = String(r[`name_${locale}`] || r.name_en || '').trim();
      if (!name) continue;
      const bits: string[] = [];
      if (r.phone) bits.push(`phone ${String(r.phone).trim()}`);
      if (r.email) bits.push(`email ${String(r.email).trim()}`);
      if (r.url) bits.push(`website ${String(r.url).trim()}`);
      if (r.address) bits.push(String(r.address).trim());
      const who = [r.contact_person, r.contact_role].filter(Boolean).map(String).join(', ');
      if (!bits.length && !who) continue;
      lines.push(`• ${name}${who ? ` (${who})` : ''}${bits.length ? ` — ${bits.join('; ')}` : ''}`);
    }
    if (!lines.length) return '';
    return '\n\nPUBLISHED CONTACT DETAILS for the listings above (you MAY share these with the guest in this email so they can reach the business directly — but ONLY exactly what appears here; never invent or guess a phone, email or website):\n' + lines.join('\n');
  } catch { return ''; }
}

// ── AI reply drafting (grounded, localised, per-desk voice) ────────────────────
// Returns { body } on success, or { error } on failure (never a bare null) so the
// caller can surface the real reason instead of a generic "no draft produced".
export async function composeReply(
  row: InboundRow,
  opts: { mode: 'compose' | 'polish'; instruction?: string; locale?: string },
): Promise<{ body?: string; locale: string; desk: string; grounded: { picks: number; guides: number; articles: number } | null; error?: string }> {
  const guestText = (row.text_body || (row.html_body ? stripHtml(String(row.html_body)) : '') || '').slice(0, 4000);
  const subject = String(row.subject || '').slice(0, 200);
  const instruction = String(opts.instruction || '').slice(0, 4000);
  const locale = opts.locale && isLocale(opts.locale) ? opts.locale : detectLocale(`${subject}\n${guestText}`);
  const language = LANG[locale] || 'English';
  const desk = deskFor(String(row.to_email || process.env.EMAIL_FROM || `hello@${ourDomain()}`));
  const guestName = row.from_name ? String(row.from_name) : '';
  const grounded = (ctx: ConciergeContext | null) => (ctx ? { picks: ctx.picks.length, guides: ctx.guides.length, articles: ctx.articles.length } : null);

  const ctx = await assembleContext(locale, `${subject}\n${guestText}\n${instruction}`.slice(0, 2000)).catch(() => null);
  const contacts = await contactsBlock(ctx, locale);

  const rules = [
    `\n\nYou are now drafting a personal EMAIL REPLY on behalf of ${desk.name} at Cyprus Lifestyle, answering a guest who wrote to us.`,
    `Write a complete, warm, elegant reply in ${language} (the guest's language) that actually answers what they asked — do not merely acknowledge it or promise a later follow-up when the context lets you help now.`,
    `- Use ONLY the places, prices and facts in the context above; never invent a business, price, address or figure. If a specific fact isn't available, offer to find it out rather than guess.`,
    `- When the context lists relevant specialists, RECOMMEND a considered few BY NAME with a reason, and — where the contact details are provided above — give the guest those details so they can reach them directly.`,
    `- For property, relocation, residency, tax or other regulated matters, weave in the relevant guidance from the knowledge base and be explicit about the EU vs non-EU (local vs foreign / "Inländer vs Ausländer") differences where they apply — e.g. non-EU buyers needing Council of Ministers permission — and always advise using an independent lawyer and confirming clean, transferable title deeds before paying.`,
    guestName ? `- Address the guest naturally by name (${guestName}).` : `- Open with a natural, courteous greeting.`,
    `- Refined and genuinely helpful — the Cyprus Lifestyle voice. Substantial where the guest needs substance, never padded.`,
    `- Do NOT write a subject line. Do NOT add a signature, your name, a "Regards, X" block, or our own contact details — the system appends the official ${desk.name} signature automatically.`,
    `- Return PLAIN TEXT only: paragraphs separated by a blank line. No markdown, no headings; you may put each named recommendation on its own line.`,
  ].join('\n');
  const system = conciergeSystem(locale) + (ctx ? groundingBlock(ctx, locale) : '') + contacts + rules;

  const userMessage = opts.mode === 'polish'
    ? `The guest wrote:\n"""${guestText || '(no readable body)'}"""\n\nThe concierge's rough draft. Improve wording, grammar, flow and tone, keep the meaning and any specific facts/commitments:\n"""${instruction}"""\n\nReturn the polished final reply.`
    : `The guest wrote:\n"""${guestText || '(no readable body — reply to the subject: ' + subject + ')'}"""\n\nThe concierge's intent / notes for the reply:\n"""${instruction || 'Reply helpfully, accurately and warmly, fully addressing what the guest asked, using the specialists and guidance in the context.'}"""\n\nWrite the full reply now.`;

  // Use the SAME model the live chat uses (CONCIERGE_MODEL honours the SONNET_MODEL
  // override); fall back to Haiku so a model-id or transient issue can't leave the
  // desk with nothing. The real error is returned, never swallowed.
  let lastError = '';
  for (const model of [CONCIERGE_MODEL, CLAUDE_HAIKU]) {
    const { text, error } = await callClaude({ systemInstruction: system, userMessage, model, maxTokens: 1400, fn: 'mail-compose' });
    if (!error && text.trim()) return { body: text.trim(), locale, desk: desk.name, grounded: grounded(ctx) };
    lastError = error || 'the model returned an empty reply';
  }
  return { locale, desk: desk.name, grounded: grounded(ctx), error: lastError };
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
  const draft = await composeReply(row, { mode: 'compose' }).catch((e) => ({ error: (e as Error).message } as Awaited<ReturnType<typeof composeReply>>));
  if (draft?.body) {
    try { await sb.from('inbound_emails').update({ suggested_reply: draft.body, suggested_at: new Date().toISOString() }).eq('id', row.id); }
    catch { /* the mail is safely stored; a missing suggestion just means the admin drafts by hand */ }
  } else if (draft?.error) {
    // Surfaced in the Vercel function logs so a drafting failure is never silent.
    console.error('[mail-assist] draft-on-arrival failed:', draft.error);
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
