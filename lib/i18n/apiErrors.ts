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
