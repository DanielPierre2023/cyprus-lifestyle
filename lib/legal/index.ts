// lib/legal/index.ts — the four legal documents (Privacy Policy, Terms of Service, Cookie Policy, Legal Notice) in all seven
// locales, the labels the legal pages and the footer need, and the resolver that fills the {tokens} from lib/legal/config.ts.
// The texts live in lib/legal/docs/<kind>.<locale>.ts (typed, NOT in messages/*.json). Bump LEGAL.updated in config.ts when any text changes.
import type { Locale } from '@/lib/locales';
import { LEGAL, legalTokens } from '@/lib/legal/config';
import { LEGAL_KINDS, type LegalDoc, type LegalDocs, type LegalKind } from '@/lib/legal/types';

import { privacyEn } from '@/lib/legal/docs/privacy.en';
import { privacyEl } from '@/lib/legal/docs/privacy.el';
import { privacyRo } from '@/lib/legal/docs/privacy.ro';
import { privacyAr } from '@/lib/legal/docs/privacy.ar';
import { privacyDe } from '@/lib/legal/docs/privacy.de';
import { privacyPl } from '@/lib/legal/docs/privacy.pl';
import { privacyRu } from '@/lib/legal/docs/privacy.ru';
import { termsEn } from '@/lib/legal/docs/terms.en';
import { termsEl } from '@/lib/legal/docs/terms.el';
import { termsRo } from '@/lib/legal/docs/terms.ro';
import { termsAr } from '@/lib/legal/docs/terms.ar';
import { termsDe } from '@/lib/legal/docs/terms.de';
import { termsPl } from '@/lib/legal/docs/terms.pl';
import { termsRu } from '@/lib/legal/docs/terms.ru';
import { cookiesEn } from '@/lib/legal/docs/cookies.en';
import { cookiesEl } from '@/lib/legal/docs/cookies.el';
import { cookiesRo } from '@/lib/legal/docs/cookies.ro';
import { cookiesAr } from '@/lib/legal/docs/cookies.ar';
import { cookiesDe } from '@/lib/legal/docs/cookies.de';
import { cookiesPl } from '@/lib/legal/docs/cookies.pl';
import { cookiesRu } from '@/lib/legal/docs/cookies.ru';
import { noticeEn } from '@/lib/legal/docs/notice.en';
import { noticeEl } from '@/lib/legal/docs/notice.el';
import { noticeRo } from '@/lib/legal/docs/notice.ro';
import { noticeAr } from '@/lib/legal/docs/notice.ar';
import { noticeDe } from '@/lib/legal/docs/notice.de';
import { noticePl } from '@/lib/legal/docs/notice.pl';
import { noticeRu } from '@/lib/legal/docs/notice.ru';

const PRIVACY: LegalDocs = { en: privacyEn, el: privacyEl, ro: privacyRo, ar: privacyAr, de: privacyDe, pl: privacyPl, ru: privacyRu };
const TERMS: LegalDocs = { en: termsEn, el: termsEl, ro: termsRo, ar: termsAr, de: termsDe, pl: termsPl, ru: termsRu };
const COOKIES: LegalDocs = { en: cookiesEn, el: cookiesEl, ro: cookiesRo, ar: cookiesAr, de: cookiesDe, pl: cookiesPl, ru: cookiesRu };
const NOTICE: LegalDocs = { en: noticeEn, el: noticeEl, ro: noticeRo, ar: noticeAr, de: noticeDe, pl: noticePl, ru: noticeRu };

export const LEGAL_DOCS: Record<LegalKind, LegalDocs> = { privacy: PRIVACY, terms: TERMS, cookies: COOKIES, notice: NOTICE };

/** Public paths (under the locale prefix logic of lib/i18n/routing.ts: English unprefixed, others /de, /el, ...). */
export const LEGAL_PATHS: Record<LegalKind, string> = { privacy: '/privacy', terms: '/terms', cookies: '/cookies', notice: '/legal-notice' };

export interface LegalUi { kicker: string; updated: string; address: string; vat: string; terms: string; cookies: string; notice: string; cookieSettings: string; membershipNote: string; }
export const LEGAL_UI: Record<Locale, LegalUi> = {
  en: { kicker: 'Legal', updated: 'Last updated: {date}', address: 'Address', vat: 'VAT number', terms: 'Terms of Service', cookies: 'Cookie Policy', notice: 'Legal Notice', cookieSettings: 'Cookie settings',
    membershipNote: 'By subscribing you ask for the membership to start immediately and you accept the Terms of Service. As a consumer you may withdraw within 14 days (if you do after the start, you pay a proportionate amount for the service already provided); see the Terms and the Privacy Policy.' },
  el: { kicker: 'Νομικά', updated: 'Τελευταία ενημέρωση: {date}', address: 'Διεύθυνση', vat: 'Αριθμός ΦΠΑ', terms: 'Όροι Χρήσης', cookies: 'Πολιτική Cookies', notice: 'Νομική Σημείωση', cookieSettings: 'Ρυθμίσεις cookies',
    membershipNote: 'Με την εγγραφή ζητάτε να ξεκινήσει αμέσως η συνδρομή και αποδέχεστε τους Όρους Χρήσης. Ως καταναλωτής μπορείτε να υπαναχωρήσετε εντός 14 ημερών (αν το κάνετε μετά την έναρξη, πληρώνετε αναλογικό ποσό για την υπηρεσία που ήδη παρασχέθηκε)· δείτε τους Όρους και την Πολιτική Απορρήτου.' },
  ro: { kicker: 'Legal', updated: 'Ultima actualizare: {date}', address: 'Adresa', vat: 'Cod TVA', terms: 'Termeni și condiții', cookies: 'Politica privind cookie-urile', notice: 'Mențiuni legale', cookieSettings: 'Setări cookie-uri',
    membershipNote: 'Abonându-vă, cereți ca abonamentul să înceapă imediat și acceptați Termenii și condițiile. Ca consumator vă puteți retrage în 14 zile (dacă o faceți după începere, plătiți o sumă proporțională pentru serviciul deja furnizat); vedeți Termenii și Politica de confidențialitate.' },
  ar: { kicker: 'قانوني', updated: 'آخر تحديث: {date}', address: 'العنوان', vat: 'الرقم الضريبي', terms: 'شروط الخدمة', cookies: 'سياسة ملفات تعريف الارتباط', notice: 'الإشعار القانوني', cookieSettings: 'إعدادات ملفات تعريف الارتباط',
    membershipNote: 'بالاشتراك تطلبون أن تبدأ العضوية فورًا وتقبلون شروط الخدمة. وبصفتكم مستهلكين يمكنكم العدول خلال 14 يومًا (وإذا فعلتم بعد البدء تدفعون مبلغًا متناسبًا عن الخدمة المقدَّمة)؛ راجعوا الشروط وسياسة الخصوصية.' },
  de: { kicker: 'Rechtliches', updated: 'Zuletzt aktualisiert: {date}', address: 'Anschrift', vat: 'USt-IdNr.', terms: 'Nutzungsbedingungen', cookies: 'Cookie-Richtlinie', notice: 'Impressum', cookieSettings: 'Cookie-Einstellungen',
    membershipNote: 'Mit dem Abschluss verlangen Sie den sofortigen Beginn der Mitgliedschaft und akzeptieren die Nutzungsbedingungen. Als Verbraucher können Sie innerhalb von 14 Tagen widerrufen (tun Sie das nach Beginn, zahlen Sie einen anteiligen Betrag für die bereits erbrachte Leistung); siehe Bedingungen und Datenschutzerklärung.' },
  pl: { kicker: 'Informacje prawne', updated: 'Ostatnia aktualizacja: {date}', address: 'Adres', vat: 'Numer VAT', terms: 'Regulamin', cookies: 'Polityka cookies', notice: 'Nota prawna', cookieSettings: 'Ustawienia cookies',
    membershipNote: 'Subskrybując, żądasz natychmiastowego rozpoczęcia członkostwa i akceptujesz Regulamin. Jako konsument możesz odstąpić w ciągu 14 dni (jeśli zrobisz to po rozpoczęciu, zapłacisz proporcjonalną kwotę za już świadczoną usługę); zob. Regulamin i Politykę prywatności.' },
  ru: { kicker: 'Правовая информация', updated: 'Последнее обновление: {date}', address: 'Адрес', vat: 'Номер НДС', terms: 'Условия использования', cookies: 'Политика cookie', notice: 'Правовая информация', cookieSettings: 'Настройки cookie',
    membershipNote: 'Оформляя членство, вы просите начать его немедленно и принимаете Условия использования. Как потребитель вы вправе отказаться в течение 14 дней (если это произойдёт после начала, вы оплатите пропорциональную сумму за уже оказанную услугу); см. Условия и Политику конфиденциальности.' },
};

function fill(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{([a-z_]+)\}/g, (m, k: string) => (k in tokens ? tokens[k] : m));
}

/** The document for a locale with all {tokens} resolved. The Legal Notice also lists the street address / VAT number WHEN configured (config.ts). */
export function getLegalDoc(kind: LegalKind, locale: Locale): LegalDoc {
  const tokens = legalTokens();
  const src = LEGAL_DOCS[kind][locale] || LEGAL_DOCS[kind].en;
  const sections = src.sections.map((s) => ({ h: fill(s.h, tokens), p: s.p?.map((x) => fill(x, tokens)), li: s.li?.map((x) => fill(x, tokens)) }));
  if (kind === 'notice') {
    const ui = LEGAL_UI[locale] || LEGAL_UI.en;
    const extra: string[] = [];
    if (LEGAL.address) extra.push(`${ui.address}: ${LEGAL.address}`);
    if (LEGAL.vatNumber) extra.push(`${ui.vat}: ${LEGAL.vatNumber}`);
    if (extra.length) sections[0] = { ...sections[0], li: [...(sections[0].li || []), ...extra] };
  }
  return { title: fill(src.title, tokens), dek: fill(src.dek, tokens), sections };
}

export function legalUpdatedLabel(locale: Locale): string {
  const ui = LEGAL_UI[locale] || LEGAL_UI.en;
  let date: string = LEGAL.updated;
  try { date = new Date(LEGAL.updated + 'T00:00:00Z').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch { /* keep ISO */ }
  return ui.updated.replace('{date}', date);
}

export { LEGAL_KINDS };
export type { LegalKind };
