// lib/business/hubCopy.ts — the short "your Business Hub is here" pointers that make the hub reachable from the claim and
// owner-management e-mails, the listing page and /partner. Seven editions, typed module (not messages/*.json).
// el/ro/ar/de/pl/ru: machine-written in increment 4.2 -> NEEDS NATIVE REVIEW before launch.
import { isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';

export interface HubCopy {
  /** Link text / name of the area. */
  link: string;
  /** One sentence for a page next to the verified-owner badge. */
  hint: string;
  /** Paragraph in the claim-verification e-mail (sign-in becomes possible after the claim is confirmed). */
  mailClaim: string;
  /** Paragraph in the owner-management e-mail. */
  mailManage: string;
}

const COPY: Record<Locale, HubCopy> = {
  en: {
    link: 'Business Hub',
    hint: 'Verified owners can sign in to the Business Hub: enquiries, figures and proposals to our editorial desk.',
    mailClaim: 'Once your claim is confirmed, you can sign in to the Business Hub with this e-mail address: your enquiries, your figures and your proposals to our editorial desk.',
    mailManage: 'You can also use the Business Hub: your enquiries, your figures and your proposals to our editorial desk.',
  },
  el: {
    link: 'Business Hub',
    hint: 'Οι επαληθευμένοι ιδιοκτήτες μπορούν να συνδεθούν στο Business Hub: αιτήματα επικοινωνίας, στατιστικά και προτάσεις προς τη συντακτική μας ομάδα.',
    mailClaim: 'Μόλις επιβεβαιωθεί η διεκδίκηση, μπορείτε να συνδεθείτε στο Business Hub με αυτή τη διεύθυνση email: τα αιτήματα επικοινωνίας, τα στατιστικά σας και οι προτάσεις σας προς τη συντακτική μας ομάδα.',
    mailManage: 'Μπορείτε επίσης να χρησιμοποιήσετε το Business Hub: τα αιτήματα επικοινωνίας, τα στατιστικά σας και τις προτάσεις σας προς τη συντακτική μας ομάδα.',
  },
  ro: {
    link: 'Business Hub',
    hint: 'Proprietarii verificați se pot autentifica în Business Hub: solicitări, cifre și propuneri către redacția noastră.',
    mailClaim: 'După confirmarea revendicării, vă puteți autentifica în Business Hub cu această adresă de e-mail: solicitările primite, cifrele dumneavoastră și propunerile către redacția noastră.',
    mailManage: 'Puteți folosi și Business Hub: solicitările primite, cifrele dumneavoastră și propunerile către redacția noastră.',
  },
  ar: {
    link: 'Business Hub',
    hint: 'يمكن للمالكين الموثّقين تسجيل الدخول إلى Business Hub: الاستفسارات والأرقام والاقتراحات المرسلة إلى فريق التحرير.',
    mailClaim: 'بعد تأكيد مطالبتك يمكنك تسجيل الدخول إلى Business Hub بهذا البريد الإلكتروني: استفساراتك وأرقامك واقتراحاتك إلى فريق التحرير لدينا.',
    mailManage: 'يمكنك أيضًا استخدام Business Hub: استفساراتك وأرقامك واقتراحاتك إلى فريق التحرير لدينا.',
  },
  de: {
    link: 'Business Hub',
    hint: 'Verifizierte Inhaber können sich im Business Hub anmelden: Anfragen, Kennzahlen und Vorschläge an unsere Redaktion.',
    mailClaim: 'Sobald Ihr Anspruch bestätigt ist, können Sie sich mit dieser E-Mail-Adresse im Business Hub anmelden: Ihre Anfragen, Ihre Kennzahlen und Ihre Vorschläge an unsere Redaktion.',
    mailManage: 'Sie können auch den Business Hub nutzen: Ihre Anfragen, Ihre Kennzahlen und Ihre Vorschläge an unsere Redaktion.',
  },
  pl: {
    link: 'Business Hub',
    hint: 'Zweryfikowani właściciele mogą zalogować się do Business Hub: zapytania, statystyki i propozycje dla naszej redakcji.',
    mailClaim: 'Po potwierdzeniu przejęcia wizytówki możesz zalogować się do Business Hub tym adresem e-mail: zapytania, statystyki i propozycje dla naszej redakcji.',
    mailManage: 'Możesz też korzystać z Business Hub: zapytania, statystyki i propozycje dla naszej redakcji.',
  },
  ru: {
    link: 'Business Hub',
    hint: 'Проверенные владельцы могут войти в Business Hub: обращения, показатели и предложения для нашей редакции.',
    mailClaim: 'После подтверждения заявки вы сможете войти в Business Hub с этим адресом e-mail: обращения, показатели и ваши предложения нашей редакции.',
    mailManage: 'Вы также можете пользоваться Business Hub: обращения, показатели и ваши предложения нашей редакции.',
  },
};

export const hubCopy = (locale?: string | null): HubCopy => COPY[locale && isLocale(locale) ? locale : DEFAULT_LOCALE];

/** Path of the hub in an edition (English has no prefix). */
export const hubPath = (locale?: string | null): string => `${locale && isLocale(locale) && locale !== DEFAULT_LOCALE ? `/${locale}` : ''}/account/business`;

/** Absolute link to the hub for an e-mail. */
export const hubUrl = (site: string, locale?: string | null): string => `${site.replace(/\/$/, '')}${hubPath(locale)}`;

const escText = (s: string): string => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));

/** The e-mail paragraph, as HTML: the sentence followed by the hub link. */
export function hubMailParagraph(locale: string | null | undefined, kind: 'claim' | 'manage', url: string): string {
  const c = hubCopy(locale);
  return `<p>${escText(kind === 'claim' ? c.mailClaim : c.mailManage)} <a href="${escText(url)}">${escText(c.link)}</a></p>`;
}
