// lib/i18n/notices.ts — small transactional strings in all seven editions that had no home:
//   * the newsletter double-opt-in landing page (app/api/newsletter/confirm)
//   * the acknowledgement e-mail for privacy (DSAR) requests (builder only, NOT wired:
//     sending to a user-typed address is a behaviour change the owner must approve, see docs/I18N.md)
// el/ro/ar/de/pl/ru are machine-written in increment 5.1 -> NEEDS NATIVE REVIEW.
import { isLocale, type Locale } from '@/lib/locales';

const pick = <T,>(m: Record<Locale, T>, l?: string | null): T => m[l && isLocale(l) ? l : 'en'];

export interface ConfirmPageCopy { ok: string; bad: string; home: string }
const CONFIRM_PAGE: Record<Locale, ConfirmPageCopy> = {
  en: { ok: 'Your subscription is confirmed. Welcome to Cyprus Lifestyle.', bad: 'This confirmation link is invalid or has expired.', home: 'Go to the homepage →' },
  el: { ok: 'Η εγγραφή σας επιβεβαιώθηκε. Καλώς ήρθατε στο Cyprus Lifestyle.', bad: 'Ο σύνδεσμος επιβεβαίωσης δεν είναι έγκυρος ή έχει λήξει.', home: 'Μετάβαση στην αρχική σελίδα →' },
  ro: { ok: 'Abonarea dumneavoastră a fost confirmată. Bun venit la Cyprus Lifestyle.', bad: 'Linkul de confirmare nu este valid sau a expirat.', home: 'Mergeți la pagina principală →' },
  ar: { ok: 'تم تأكيد اشتراكك. أهلًا بك في Cyprus Lifestyle.', bad: 'رابط التأكيد غير صالح أو انتهت صلاحيته.', home: 'الانتقال إلى الصفحة الرئيسية ←' },
  de: { ok: 'Ihr Abonnement ist bestätigt. Willkommen bei Cyprus Lifestyle.', bad: 'Dieser Bestätigungslink ist ungültig oder abgelaufen.', home: 'Zur Startseite →' },
  pl: { ok: 'Twoja subskrypcja została potwierdzona. Witamy w Cyprus Lifestyle.', bad: 'Ten link potwierdzający jest nieprawidłowy lub wygasł.', home: 'Przejdź do strony głównej →' },
  ru: { ok: 'Ваша подписка подтверждена. Добро пожаловать в Cyprus Lifestyle.', bad: 'Ссылка для подтверждения недействительна или истекла.', home: 'На главную →' },
};
export const confirmPageCopy = (locale?: string | null): ConfirmPageCopy => pick(CONFIRM_PAGE, locale);

export interface AckCopy { subject: string; heading: string; body: string }

const DSAR_ACK: Record<Locale, AckCopy> = {
  en: { subject: 'We received your data request — Cyprus Lifestyle', heading: 'Your request has been received', body: 'Thank you. We have received your data request and will respond within one month, as required by law. If you did not make this request, please reply to this email.' },
  el: { subject: 'Λάβαμε το αίτημά σας για δεδομένα — Cyprus Lifestyle', heading: 'Το αίτημά σας παραλήφθηκε', body: 'Σας ευχαριστούμε. Λάβαμε το αίτημά σας σχετικά με τα δεδομένα σας και θα απαντήσουμε εντός ενός μηνός, όπως απαιτεί ο νόμος. Αν δεν υποβάλατε εσείς το αίτημα, απαντήστε σε αυτό το μήνυμα.' },
  ro: { subject: 'Am primit solicitarea dumneavoastră privind datele — Cyprus Lifestyle', heading: 'Solicitarea dumneavoastră a fost primită', body: 'Vă mulțumim. Am primit solicitarea dumneavoastră privind datele cu caracter personal și vă vom răspunde în termen de o lună, conform legii. Dacă nu ați făcut dumneavoastră această solicitare, răspundeți la acest e-mail.' },
  ar: { subject: 'استلمنا طلبك المتعلق ببياناتك — Cyprus Lifestyle', heading: 'تم استلام طلبك', body: 'شكرًا لك. استلمنا طلبك المتعلق ببياناتك وسنرد عليك خلال شهر واحد كما يقتضي القانون. إن لم تكن قد قدّمت هذا الطلب، يرجى الرد على هذه الرسالة.' },
  de: { subject: 'Wir haben Ihre Datenanfrage erhalten — Cyprus Lifestyle', heading: 'Ihre Anfrage ist eingegangen', body: 'Vielen Dank. Wir haben Ihre Datenanfrage erhalten und antworten innerhalb eines Monats, wie gesetzlich vorgeschrieben. Falls Sie diese Anfrage nicht gestellt haben, antworten Sie bitte auf diese E-Mail.' },
  pl: { subject: 'Otrzymaliśmy Twój wniosek dotyczący danych — Cyprus Lifestyle', heading: 'Twój wniosek został przyjęty', body: 'Dziękujemy. Otrzymaliśmy Twój wniosek dotyczący danych i odpowiemy w ciągu miesiąca, zgodnie z wymogami prawa. Jeśli to nie Ty złożyłeś(-aś) ten wniosek, odpowiedz na tę wiadomość.' },
  ru: { subject: 'Мы получили ваш запрос по персональным данным — Cyprus Lifestyle', heading: 'Ваш запрос получен', body: 'Спасибо. Мы получили ваш запрос по персональным данным и ответим в течение одного месяца, как того требует закон. Если запрос отправляли не вы, пожалуйста, ответьте на это письмо.' },
};
export const dsarAckCopy = (locale?: string | null): AckCopy => pick(DSAR_ACK, locale);
