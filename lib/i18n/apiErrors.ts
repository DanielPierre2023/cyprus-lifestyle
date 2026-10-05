// lib/i18n/apiErrors.ts — stable machine-readable API error CODES with localised messages.
// Contract (additive, backwards compatible): an error body is
//   { ok: false, code: '<stable code>', error: '<message in the caller's locale; English by default>' }
// so existing clients that show `error` keep working, and new clients can switch on `code`
// and render their own translation. Public routes only; admin stays English.
import type { Locale } from '@/lib/locales';
import { isLocale } from '@/lib/locales';

export const API_ERROR_CODES = [
  'rate_limited', 'missing_listing', 'name_email_required', 'invalid_email',
  'forbidden', 'not_found', 'server_error', 'invalid_input',
  // increment 5.2 — the remaining public forms/routes
  'contact_fields_required', 'post_required', 'comment_fields_required', 'missing_slug', 'rating_range',
  'review_too_short', 'review_failed', 'checkout_failed', 'save_failed', 'already_member', 'signed_out',
  'no_billing', 'unavailable', 'not_configured', 'link_expired', 'link_invalid', 'dsar_failed',
  'code_required', 'subscribe_failed',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

// en strings are the exact texts the routes returned before, so nothing visible changes in English.
// el/ro/ar/de/pl/ru: machine-written in increment 5.1, needs native review.
const MESSAGES: Record<ApiErrorCode, Record<Locale, string>> = {
  rate_limited: {
    en: 'Too many requests — please wait a moment.', el: 'Πάρα πολλά αιτήματα — περιμένετε λίγο.',
    ro: 'Prea multe cereri — vă rugăm să așteptați puțin.', ar: 'طلبات كثيرة جدًا — يرجى الانتظار قليلًا.',
    de: 'Zu viele Anfragen — bitte einen Moment warten.', pl: 'Zbyt wiele żądań — poczekaj chwilę.',
    ru: 'Слишком много запросов — подождите немного.',
  },
  missing_listing: {
    en: 'Missing listing.', el: 'Λείπει η καταχώριση.', ro: 'Lipsește fișa afacerii.', ar: 'الإدراج مفقود.',
    de: 'Eintrag fehlt.', pl: 'Brak wizytówki.', ru: 'Не указана карточка.',
  },
  name_email_required: {
    en: 'A name and a valid email are required.', el: 'Απαιτούνται όνομα και έγκυρη διεύθυνση email.',
    ro: 'Sunt necesare un nume și o adresă de e-mail validă.', ar: 'الاسم وبريد إلكتروني صالح مطلوبان.',
    de: 'Name und gültige E-Mail-Adresse sind erforderlich.', pl: 'Imię i prawidłowy adres e-mail są wymagane.',
    ru: 'Требуются имя и действительный адрес электронной почты.',
  },
  invalid_email: {
    en: 'A valid email is required.', el: 'Απαιτείται έγκυρη διεύθυνση email.',
    ro: 'Este necesară o adresă de e-mail validă.', ar: 'مطلوب بريد إلكتروني صالح.',
    de: 'Eine gültige E-Mail-Adresse ist erforderlich.', pl: 'Wymagany jest prawidłowy adres e-mail.',
    ru: 'Требуется действительный адрес электронной почты.',
  },
  forbidden: {
    en: 'Forbidden', el: 'Δεν επιτρέπεται.', ro: 'Acces interzis.', ar: 'غير مسموح.',
    de: 'Zugriff verweigert.', pl: 'Brak dostępu.', ru: 'Доступ запрещён.',
  },
  not_found: {
    en: 'Not found.', el: 'Δεν βρέθηκε.', ro: 'Nu a fost găsit.', ar: 'غير موجود.',
    de: 'Nicht gefunden.', pl: 'Nie znaleziono.', ru: 'Не найдено.',
  },
  server_error: {
    en: 'Something went wrong. Please try again.', el: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
    ro: 'Ceva nu a mers bine. Încercați din nou.', ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    de: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.', pl: 'Coś poszło nie tak. Spróbuj ponownie.',
    ru: 'Что-то пошло не так. Попробуйте ещё раз.',
  },
  invalid_input: {
    en: 'Please check the form and try again.', el: 'Ελέγξτε τη φόρμα και δοκιμάστε ξανά.',
    ro: 'Verificați formularul și încercați din nou.', ar: 'يرجى مراجعة النموذج والمحاولة مرة أخرى.',
    de: 'Bitte prüfen Sie das Formular und versuchen Sie es erneut.', pl: 'Sprawdź formularz i spróbuj ponownie.',
    ru: 'Проверьте форму и повторите попытку.',
  },
  contact_fields_required: {
    en: 'name, a valid email and a message are required', el: 'Απαιτούνται όνομα, έγκυρη διεύθυνση email και μήνυμα.',
    ro: 'Sunt necesare numele, o adresă de e-mail validă și un mesaj.', ar: 'الاسم وبريد إلكتروني صالح ورسالة مطلوبة.',
    de: 'Name, eine gültige E-Mail-Adresse und eine Nachricht sind erforderlich.', pl: 'Imię, prawidłowy adres e-mail i wiadomość są wymagane.',
    ru: 'Требуются имя, действительный адрес электронной почты и сообщение.',
  },
  post_required: {
    en: 'post_id required', el: 'Λείπει το άρθρο.', ro: 'Lipsește articolul.', ar: 'المقال مفقود.',
    de: 'Beitrag fehlt.', pl: 'Brak artykułu.', ru: 'Не указана статья.',
  },
  comment_fields_required: {
    en: 'post_id, author_name and content are required', el: 'Απαιτούνται όνομα και σχόλιο.',
    ro: 'Sunt necesare numele și comentariul.', ar: 'الاسم والتعليق مطلوبان.',
    de: 'Name und Kommentar sind erforderlich.', pl: 'Imię i komentarz są wymagane.', ru: 'Требуются имя и комментарий.',
  },
  missing_slug: {
    en: 'Missing slug.', el: 'Λείπει η καταχώριση.', ro: 'Lipsește fișa afacerii.', ar: 'الإدراج مفقود.',
    de: 'Eintrag fehlt.', pl: 'Brak wizytówki.', ru: 'Не указана карточка.',
  },
  rating_range: {
    en: 'Rating must be between 1 and 5.', el: 'Η βαθμολογία πρέπει να είναι από 1 έως 5.',
    ro: 'Evaluarea trebuie să fie între 1 și 5.', ar: 'يجب أن يكون التقييم بين 1 و5.',
    de: 'Die Bewertung muss zwischen 1 und 5 liegen.', pl: 'Ocena musi mieścić się w zakresie od 1 do 5.', ru: 'Оценка должна быть от 1 до 5.',
  },
  review_too_short: {
    en: 'Review is too short.', el: 'Η κριτική είναι πολύ σύντομη.', ro: 'Recenzia este prea scurtă.', ar: 'المراجعة قصيرة جدًا.',
    de: 'Die Bewertung ist zu kurz.', pl: 'Opinia jest zbyt krótka.', ru: 'Отзыв слишком короткий.',
  },
  review_failed: {
    en: 'Could not save review.', el: 'Η κριτική δεν αποθηκεύτηκε.', ro: 'Recenzia nu a putut fi salvată.', ar: 'تعذّر حفظ المراجعة.',
    de: 'Die Bewertung konnte nicht gespeichert werden.', pl: 'Nie udało się zapisać opinii.', ru: 'Не удалось сохранить отзыв.',
  },
  checkout_failed: {
    en: 'Could not start checkout.', el: 'Δεν ήταν δυνατή η έναρξη της πληρωμής.', ro: 'Plata nu a putut fi inițiată.', ar: 'تعذّر بدء عملية الدفع.',
    de: 'Der Bezahlvorgang konnte nicht gestartet werden.', pl: 'Nie udało się rozpocząć płatności.', ru: 'Не удалось начать оплату.',
  },
  save_failed: {
    en: 'Could not save. Please try again.', el: 'Η αποθήκευση απέτυχε. Δοκιμάστε ξανά.', ro: 'Salvarea nu a reușit. Încercați din nou.',
    ar: 'تعذّر الحفظ. يرجى المحاولة مرة أخرى.', de: 'Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.',
    pl: 'Nie udało się zapisać. Spróbuj ponownie.', ru: 'Не удалось сохранить. Попробуйте ещё раз.',
  },
  already_member: {
    en: 'You already have an active membership.', el: 'Έχετε ήδη ενεργή συνδρομή μέλους.', ro: 'Aveți deja un abonament de membru activ.',
    ar: 'لديك بالفعل عضوية نشطة.', de: 'Sie haben bereits eine aktive Mitgliedschaft.', pl: 'Masz już aktywne członkostwo.', ru: 'У вас уже есть активное членство.',
  },
  signed_out: {
    en: 'Please sign in again.', el: 'Συνδεθείτε ξανά.', ro: 'Conectați-vă din nou.', ar: 'يرجى تسجيل الدخول مرة أخرى.',
    de: 'Bitte melden Sie sich erneut an.', pl: 'Zaloguj się ponownie.', ru: 'Пожалуйста, войдите снова.',
  },
  no_billing: {
    en: 'There is no billing profile on this account.', el: 'Δεν υπάρχει προφίλ χρέωσης σε αυτόν τον λογαριασμό.',
    ro: 'Acest cont nu are un profil de facturare.', ar: 'لا يوجد ملف فوترة لهذا الحساب.',
    de: 'Für dieses Konto gibt es kein Rechnungsprofil.', pl: 'To konto nie ma profilu rozliczeniowego.', ru: 'У этой учётной записи нет платёжного профиля.',
  },
  unavailable: {
    en: 'This is temporarily unavailable. Please try again later.', el: 'Δεν είναι προσωρινά διαθέσιμο. Δοκιμάστε ξανά αργότερα.',
    ro: 'Momentan indisponibil. Încercați din nou mai târziu.', ar: 'غير متاح مؤقتًا. يرجى المحاولة لاحقًا.',
    de: 'Vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.', pl: 'Tymczasowo niedostępne. Spróbuj ponownie później.',
    ru: 'Временно недоступно. Повторите попытку позже.',
  },
  not_configured: {
    en: 'Online payment is not available yet.', el: 'Η ηλεκτρονική πληρωμή δεν είναι ακόμη διαθέσιμη.',
    ro: 'Plata online nu este încă disponibilă.', ar: 'الدفع عبر الإنترنت غير متاح بعد.',
    de: 'Online-Zahlung ist noch nicht verfügbar.', pl: 'Płatność online nie jest jeszcze dostępna.', ru: 'Онлайн-оплата пока недоступна.',
  },
  link_expired: {
    en: 'This link has expired.', el: 'Ο σύνδεσμος έχει λήξει.', ro: 'Linkul a expirat.', ar: 'انتهت صلاحية هذا الرابط.',
    de: 'Dieser Link ist abgelaufen.', pl: 'Ten link wygasł.', ru: 'Срок действия ссылки истёк.',
  },
  link_invalid: {
    en: 'This link is not valid.', el: 'Ο σύνδεσμος δεν είναι έγκυρος.', ro: 'Linkul nu este valid.', ar: 'هذا الرابط غير صالح.',
    de: 'Dieser Link ist ungültig.', pl: 'Ten link jest nieprawidłowy.', ru: 'Ссылка недействительна.',
  },
  dsar_failed: {
    en: 'Could not submit — please email us directly.', el: 'Η υποβολή απέτυχε — στείλτε μας απευθείας email.',
    ro: 'Trimiterea nu a reușit — vă rugăm să ne scrieți direct pe e-mail.', ar: 'تعذّر الإرسال — يرجى مراسلتنا مباشرة عبر البريد الإلكتروني.',
    de: 'Die Übermittlung ist fehlgeschlagen — bitte schreiben Sie uns direkt per E-Mail.', pl: 'Nie udało się wysłać — napisz do nas bezpośrednio e-mailem.',
    ru: 'Не удалось отправить — напишите нам напрямую по электронной почте.',
  },
  code_required: {
    en: 'A claim id and code are required.', el: 'Απαιτούνται το αναγνωριστικό αιτήματος και ο κωδικός.',
    ro: 'Sunt necesare identificatorul cererii și codul.', ar: 'معرّف الطلب والرمز مطلوبان.',
    de: 'Antragskennung und Code sind erforderlich.', pl: 'Identyfikator zgłoszenia i kod są wymagane.', ru: 'Требуются идентификатор заявки и код.',
  },
  subscribe_failed: {
    en: 'Could not subscribe. Please try again.', el: 'Η εγγραφή απέτυχε. Δοκιμάστε ξανά.', ro: 'Abonarea nu a reușit. Încercați din nou.',
    ar: 'تعذّر الاشتراك. يرجى المحاولة مرة أخرى.', de: 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.',
    pl: 'Nie udało się zapisać. Spróbuj ponownie.', ru: 'Не удалось оформить подписку. Попробуйте ещё раз.',
  },
};

export function isApiErrorCode(x: unknown): x is ApiErrorCode {
  return typeof x === 'string' && (API_ERROR_CODES as readonly string[]).includes(x);
}

export function errorMessage(code: ApiErrorCode, locale?: string | null): string {
  const row = MESSAGES[code];
  return row[locale && isLocale(locale) ? locale : 'en'] ?? row.en;
}

/** Body for NextResponse.json(errorBody('rate_limited', loc), { status: 429 }). */
export function errorBody(code: ApiErrorCode, locale?: string | null): { ok: false; code: ApiErrorCode; error: string } {
  return { ok: false, code, error: errorMessage(code, locale) };
}

/**
 * Body for routes whose existing clients switch on a short machine KEY in `error` ('busy', 'invalid',
 * 'already_member'…): `error` stays exactly as before, `code` and a localised `message` are ADDED.
 */
export function keyedErrorBody(
  code: ApiErrorCode, key: string, locale?: string | null,
): { ok: false; code: ApiErrorCode; error: string; message: string } {
  return { ok: false, code, error: key, message: errorMessage(code, locale) };
}

/** Body when the English `error` text is route-specific / dynamic (e.g. a database message): `code` is added, `error` is kept verbatim. */
export function codedError(code: ApiErrorCode, error: string): { ok: false; code: ApiErrorCode; error: string } {
  return { ok: false, code, error };
}
