// Cyprus Lifestyle — newsletter (subscribe / confirm).
// Double opt-in like TT; the sync_subscriber_to_contacts trigger mirrors new
// subscribers into contacts automatically.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { brandedEmail, sendEmail } from '@/lib/email';
import { logInboundToAccount } from '@/lib/crm';
import { isLocale, type Locale } from '@/lib/locales';

function token(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
}
function site(): string { return process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu'; }

const CONFIRM_COPY: Record<Locale, { subject: string; heading: string; body: string; cta: string }> = {
  en: { subject: 'Confirm your Cyprus Lifestyle subscription', heading: 'One tap to confirm', body: 'Confirm your email to start receiving The Dispatch — property, money and culture from the island, every Friday.', cta: 'Confirm subscription' },
  el: { subject: 'Επιβεβαιώστε την εγγραφή σας στο Cyprus Lifestyle', heading: 'Ένα κλικ για επιβεβαίωση', body: 'Επιβεβαιώστε το email σας για να λαμβάνετε το εβδομαδιαίο δελτίο του νησιού κάθε Παρασκευή.', cta: 'Επιβεβαίωση' },
  ro: { subject: 'Confirmă abonarea la Cyprus Lifestyle', heading: 'Un click pentru confirmare', body: 'Confirmă-ți adresa de email pentru a primi buletinul săptămânal al insulei, în fiecare vineri.', cta: 'Confirmă abonarea' },
  ar: { subject: 'أكّد اشتراكك في Cyprus Lifestyle', heading: 'أكّد بنقرة واحدة', body: 'أكّد بريدك الإلكتروني لتصلك النشرة الأسبوعية للجزيرة كل يوم جمعة.', cta: 'تأكيد الاشتراك' },
  de: { subject: 'Bestätigen Sie Ihr Cyprus-Lifestyle-Abonnement', heading: 'Mit einem Klick bestätigen', body: 'Bestätigen Sie Ihre E-Mail-Adresse, um den wöchentlichen Newsletter der Insel jeden Freitag zu erhalten.', cta: 'Abonnement bestätigen' },
  pl: { subject: 'Potwierdź subskrypcję Cyprus Lifestyle', heading: 'Potwierdź jednym kliknięciem', body: 'Potwierdź swój adres e-mail, aby co piątek otrzymywać cotygodniowy przegląd z wyspy.', cta: 'Potwierdź subskrypcję' },
  ru: { subject: 'Подтвердите подписку на Cyprus Lifestyle', heading: 'Подтвердите одним нажатием', body: 'Подтвердите ваш адрес электронной почты, чтобы каждую пятницу получать еженедельную рассылку с острова.', cta: 'Подтвердить подписку' },
};

export async function subscribe(sb: SupabaseClient, email: string, language: string): Promise<{ ok: boolean; error?: string }> {
  const em = (email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, error: 'invalid email' };
  const locale: Locale = isLocale(language) ? language : 'en';
  const tok = token();
  const { error } = await sb.from('newsletter_subscribers').upsert(
    { email: em, language: locale, confirmed: false, is_active: true, confirmation_token: tok, confirmation_sent_at: new Date().toISOString() },
    { onConflict: 'email' },
  );
  if (error) return { ok: false, error: error.message };
  // If the subscriber is from a business we track, note it on that account's timeline.
  await logInboundToAccount(sb, { email: em, subject: 'Newsletter signup' });
  const c = CONFIRM_COPY[locale];
  const url = `${site()}/api/newsletter/confirm?token=${tok}&l=${locale}`;
  await sendEmail({ to: em, subject: c.subject, html: brandedEmail({ locale, heading: c.heading, bodyHtml: `<p>${c.body}</p>`, ctaLabel: c.cta, ctaUrl: url, preheader: c.subject }) });
  return { ok: true };
}

export async function confirm(sb: SupabaseClient, tok: string): Promise<{ ok: boolean; error?: string }> {
  if (!tok) return { ok: false, error: 'missing token' };
  const { data, error } = await sb.from('newsletter_subscribers')
    .update({ confirmed: true, confirmed_at: new Date().toISOString(), confirmation_token: null })
    .eq('confirmation_token', tok).select('id').maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'invalid or expired token' };
  return { ok: true };
}

// The weekly digest (drafts → approval → send) lives in lib/newsletterDigest.ts.
