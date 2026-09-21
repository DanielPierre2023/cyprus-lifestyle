// Cyprus Lifestyle — newsletter (subscribe / confirm / weekly digest).
// Double opt-in like TT; the sync_subscriber_to_contacts trigger mirrors new
// subscribers into contacts automatically.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { brandedEmail, sendEmail } from '@/lib/email';
import { logInboundToAccount } from '@/lib/crm';
import { LOCALES, isLocale, type Locale } from '@/lib/locales';

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
  const url = `${site()}/api/newsletter/confirm?token=${tok}`;
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

interface PostCard { slug: string; title: string; excerpt: string; cover_image: string | null }

async function latestFor(sb: SupabaseClient, locale: Locale, limit = 6): Promise<PostCard[]> {
  const { data } = await sb.from('blog_posts')
    .select(`slug, cover_image, title_${locale}, excerpt_${locale}, title_en, excerpt_en`)
    .eq('status', 'published').order('published_at', { ascending: false }).limit(limit);
  return ((data || []) as Record<string, string | null>[]).map((r) => ({
    slug: String(r.slug),
    title: String(r[`title_${locale}`] || r.title_en || ''),
    excerpt: String(r[`excerpt_${locale}`] || r.excerpt_en || ''),
    cover_image: r.cover_image ?? null,
  })).filter((c) => c.title);
}

function digestHtml(locale: Locale, cards: PostCard[]): string {
  const base = site();
  const path = locale === 'en' ? '' : `/${locale}`;
  return cards.map((c) => `
    <table role="presentation" width="100%" style="margin:0 0 22px"><tr>
      ${c.cover_image ? `<td width="120" style="padding-inline-end:14px;vertical-align:top"><img src="${c.cover_image}" width="120" style="width:120px;border-radius:2px" alt=""></td>` : ''}
      <td style="vertical-align:top">
        <a href="${base}${path}/article/${c.slug}" style="color:#16181C;text-decoration:none;font-weight:700;font-size:17px">${c.title}</a>
        <p style="margin:6px 0 0;color:#4a463d;font-size:14px;line-height:1.5">${c.excerpt}</p>
      </td>
    </tr></table>`).join('');
}

// A single tasteful sponsor block for the "sole sponsor" newsletter product.
function sponsorBlockHtml(s: Record<string, unknown>): string {
  const name = String(s.advertiser_name || '');
  const headline = String(s.headline || name);
  const body = String(s.body || '');
  const url = String(s.url || '');
  const image = String(s.image || '');
  if (!headline && !body) return '';
  const cta = url ? `<a href="${url}" style="color:#8a5b12;text-decoration:none;font-weight:700">${name || 'Learn more'} →</a>` : '';
  return `
    <table role="presentation" width="100%" style="margin:0 0 26px;background:#FBF7EE;border:1px solid #e7d3a8;border-radius:4px">
      <tr><td style="padding:14px 16px">
        <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a9832f;font-weight:700;margin-bottom:6px">In partnership with${name ? ` ${name}` : ''}</div>
        ${image ? `<img src="${image}" width="140" style="width:140px;border-radius:2px;margin:0 0 8px" alt="">` : ''}
        <div style="font-weight:700;color:#16181C;font-size:16px">${headline}</div>
        ${body ? `<p style="margin:6px 0 8px;color:#4a463d;font-size:14px;line-height:1.5">${body}</p>` : ''}
        ${cta}
      </td></tr>
    </table>`;
}

const DIGEST_SUBJECT: Record<Locale, string> = {
  en: 'The Dispatch — this week from Cyprus',
  el: 'Το εβδομαδιαίο δελτίο από την Κύπρο',
  ro: 'Buletinul săptămânal din Cipru',
  ar: 'نشرة الأسبوع من قبرص',
  de: 'Der wöchentliche Newsletter aus Zypern',
  pl: 'Cotygodniowy przegląd z Cypru',
  ru: 'Еженедельная рассылка с Кипра',
};

// Compose + send the weekly digest for one locale (or all). Records a campaign row.
export async function weeklyDigest(sb: SupabaseClient, only?: Locale): Promise<{ sent: number; byLocale: Record<string, number> }> {
  const locales = only ? [only] : [...LOCALES];
  const byLocale: Record<string, number> = {};
  let total = 0;
  // Due sole-sponsors for this run (status 'scheduled', dated today-or-earlier or undated).
  const today = new Date().toISOString().slice(0, 10);
  const { data: sponsorRows } = await sb.from('newsletter_sponsors')
    .select('*').eq('status', 'scheduled').or(`send_date.is.null,send_date.lte.${today}`);
  const sponsors = (sponsorRows || []) as Record<string, unknown>[];
  const sponsorFor = (loc: string) =>
    sponsors.find((s) => s.target_language === loc) || sponsors.find((s) => s.target_language === 'all') || null;
  const usedSponsorIds = new Set<string>();
  for (const locale of locales) {
    const cards = await latestFor(sb, locale);
    if (cards.length === 0) { byLocale[locale] = 0; continue; }
    const { data: subs } = await sb.from('newsletter_subscribers')
      .select('email').eq('confirmed', true).eq('is_active', true).eq('language', locale);
    const recipients = ((subs || []) as { email: string }[]).map((s) => s.email);
    const subject = DIGEST_SUBJECT[locale];
    const sp = sponsorFor(locale);
    const sponsorHtml = sp ? sponsorBlockHtml(sp) : '';
    if (sp && sponsorHtml) usedSponsorIds.add(String(sp.id));
    const html = brandedEmail({ locale, heading: subject, bodyHtml: sponsorHtml + digestHtml(locale, cards), preheader: cards[0]?.title, unsubscribe: true });
    let sent = 0;
    for (const to of recipients) {
      const r = await sendEmail({ to, subject, html });
      if (r.ok) sent++;
    }
    byLocale[locale] = sent; total += sent;
    await sb.from('newsletter_campaigns').insert({
      subject, content: html, status: 'sent', target_language: locale, sent_at: new Date().toISOString(), recipient_count: sent,
    });
  }
  // Retire the sponsors we just ran so they don't repeat next week.
  if (usedSponsorIds.size) {
    await sb.from('newsletter_sponsors').update({ status: 'sent' }).in('id', [...usedSponsorIds]);
  }
  return { sent: total, byLocale };
}
