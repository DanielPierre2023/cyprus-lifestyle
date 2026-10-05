// lib/i18n/notices.ts — small transactional strings in all seven editions that had no home:
//   * the newsletter double-opt-in landing page (app/api/newsletter/confirm)
//   * the acknowledgement e-mail for privacy (DSAR) requests, sent by app/api/privacy/request
//     (owner-approved in increment 5.2; once per address per 24 h, see lib/privacy/ack.ts)
// el/ro/ar/de/pl/ru are machine-written in increment 5.1 -> NEEDS NATIVE REVIEW.
import { isLocale, type Locale } from '@/lib/locales';
import { plural, type PluralForms } from '@/lib/i18n/format';

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

export interface AckCopy { subject: string; heading: string; body: string; refLabel: string }

const DSAR_ACK: Record<Locale, AckCopy> = {
  en: { subject: 'We received your data request — Cyprus Lifestyle', heading: 'Your request has been received', body: 'Thank you. We have received your data request and will respond within one month, as required by law. If you did not make this request, please reply to this email.', refLabel: 'Reference' },
  el: { subject: 'Λάβαμε το αίτημά σας για δεδομένα — Cyprus Lifestyle', heading: 'Το αίτημά σας παραλήφθηκε', body: 'Σας ευχαριστούμε. Λάβαμε το αίτημά σας σχετικά με τα δεδομένα σας και θα απαντήσουμε εντός ενός μηνός, όπως απαιτεί ο νόμος. Αν δεν υποβάλατε εσείς το αίτημα, απαντήστε σε αυτό το μήνυμα.', refLabel: 'Αριθμός αναφοράς' },
  ro: { subject: 'Am primit solicitarea dumneavoastră privind datele — Cyprus Lifestyle', heading: 'Solicitarea dumneavoastră a fost primită', body: 'Vă mulțumim. Am primit solicitarea dumneavoastră privind datele cu caracter personal și vă vom răspunde în termen de o lună, conform legii. Dacă nu ați făcut dumneavoastră această solicitare, răspundeți la acest e-mail.', refLabel: 'Număr de referință' },
  ar: { subject: 'استلمنا طلبك المتعلق ببياناتك — Cyprus Lifestyle', heading: 'تم استلام طلبك', body: 'شكرًا لك. استلمنا طلبك المتعلق ببياناتك وسنرد عليك خلال شهر واحد كما يقتضي القانون. إن لم تكن قد قدّمت هذا الطلب، يرجى الرد على هذه الرسالة.', refLabel: 'الرقم المرجعي' },
  de: { subject: 'Wir haben Ihre Datenanfrage erhalten — Cyprus Lifestyle', heading: 'Ihre Anfrage ist eingegangen', body: 'Vielen Dank. Wir haben Ihre Datenanfrage erhalten und antworten innerhalb eines Monats, wie gesetzlich vorgeschrieben. Falls Sie diese Anfrage nicht gestellt haben, antworten Sie bitte auf diese E-Mail.', refLabel: 'Referenz' },
  pl: { subject: 'Otrzymaliśmy Twój wniosek dotyczący danych — Cyprus Lifestyle', heading: 'Twój wniosek został przyjęty', body: 'Dziękujemy. Otrzymaliśmy Twój wniosek dotyczący danych i odpowiemy w ciągu miesiąca, zgodnie z wymogami prawa. Jeśli to nie Ty złożyłeś(-aś) ten wniosek, odpowiedz na tę wiadomość.', refLabel: 'Numer referencyjny' },
  ru: { subject: 'Мы получили ваш запрос по персональным данным — Cyprus Lifestyle', heading: 'Ваш запрос получен', body: 'Спасибо. Мы получили ваш запрос по персональным данным и ответим в течение одного месяца, как того требует закон. Если запрос отправляли не вы, пожалуйста, ответьте на это письмо.', refLabel: 'Номер обращения' },
};
export const dsarAckCopy = (locale?: string | null): AckCopy => pick(DSAR_ACK, locale);

// ── Claim-to-own / owner-link / phone-OTP messages (increment 5.2) ───────────────────────────────
// English strings are the exact texts the API returned before. el/ro/ar/de/pl/ru are machine-written
// in-session -> NEEDS NATIVE REVIEW. Used by lib/directory/claims.ts, api/directory/claim/verify and
// api/directory/owner/request.
export interface ClaimMessages {
  generic: string; already: string; otpSent: string; ownerGeneric: string;
  otpExpired: string; otpLocked: string; otpWrong: string;
  /** "That code is not correct." + attempts left; `{n}` is substituted. */
  otpWrongLeft: PluralForms;
}

const CLAIM_MESSAGES: Record<Locale, ClaimMessages> = {
  en: {
    generic: "Thanks — we've started verifying your claim. If ownership can be confirmed, a verification link will be sent to the business's contact address on file (or to your email if it matches the business's own website). Otherwise our team will review your request and follow up with you by email.",
    already: 'This business already has a verified owner profile. If you need access, please contact our team and we will help.',
    otpSent: 'We’ve sent a 6-digit code by SMS to the phone number on file for this business. Enter it below to finish verifying your claim.',
    ownerGeneric: "Thanks — if this listing is a verified owner profile, we've emailed a secure management link to the contact address on file. Please check that inbox to continue.",
    otpExpired: 'That code has expired. Please start the claim again.',
    otpLocked: 'Too many incorrect attempts — this claim is locked. Please start again.',
    otpWrong: 'That code is not correct.',
    otpWrongLeft: { zero: 'That code is not correct. {n} attempts left.', one: 'That code is not correct. {n} attempt left.', two: 'That code is not correct. {n} attempts left.', few: 'That code is not correct. {n} attempts left.', many: 'That code is not correct. {n} attempts left.', other: 'That code is not correct. {n} attempts left.' },
  },
  el: {
    generic: 'Ευχαριστούμε — ξεκινήσαμε την επαλήθευση της αίτησής σας. Αν επιβεβαιωθεί η ιδιοκτησία, θα σταλεί σύνδεσμος επαλήθευσης στη διεύθυνση επικοινωνίας της επιχείρησης που έχουμε στα αρχεία μας (ή στο email σας, αν ταιριάζει με τον δικό της ιστότοπο). Διαφορετικά, η ομάδα μας θα εξετάσει το αίτημά σας και θα επικοινωνήσει μαζί σας με email.',
    already: 'Αυτή η επιχείρηση έχει ήδη επαληθευμένο προφίλ ιδιοκτήτη. Αν χρειάζεστε πρόσβαση, επικοινωνήστε με την ομάδα μας και θα σας βοηθήσουμε.',
    otpSent: 'Στείλαμε έναν εξαψήφιο κωδικό με SMS στον αριθμό τηλεφώνου που έχουμε για αυτή την επιχείρηση. Εισαγάγετέ τον παρακάτω για να ολοκληρώσετε την επαλήθευση.',
    ownerGeneric: 'Ευχαριστούμε — αν αυτή η καταχώριση είναι επαληθευμένο προφίλ ιδιοκτήτη, στείλαμε με email έναν ασφαλή σύνδεσμο διαχείρισης στη διεύθυνση επικοινωνίας που έχουμε στα αρχεία μας. Ελέγξτε εκείνο το γραμματοκιβώτιο για να συνεχίσετε.',
    otpExpired: 'Ο κωδικός έχει λήξει. Ξεκινήστε ξανά την αίτηση.',
    otpLocked: 'Πάρα πολλές λανθασμένες προσπάθειες — η αίτηση κλειδώθηκε. Ξεκινήστε ξανά.',
    otpWrong: 'Ο κωδικός δεν είναι σωστός.',
    otpWrongLeft: { zero: 'Ο κωδικός δεν είναι σωστός. Απομένουν {n} προσπάθειες.', one: 'Ο κωδικός δεν είναι σωστός. Απομένει {n} προσπάθεια.', two: 'Ο κωδικός δεν είναι σωστός. Απομένουν {n} προσπάθειες.', few: 'Ο κωδικός δεν είναι σωστός. Απομένουν {n} προσπάθειες.', many: 'Ο κωδικός δεν είναι σωστός. Απομένουν {n} προσπάθειες.', other: 'Ο κωδικός δεν είναι σωστός. Απομένουν {n} προσπάθειες.' },
  },
  ro: {
    generic: 'Vă mulțumim — am început verificarea cererii dumneavoastră. Dacă proprietatea poate fi confirmată, un link de verificare va fi trimis la adresa de contact a afacerii aflată în evidența noastră (sau la adresa dumneavoastră de e-mail, dacă aceasta corespunde site-ului afacerii). În caz contrar, echipa noastră va analiza cererea și vă va contacta prin e-mail.',
    already: 'Această afacere are deja un profil de proprietar verificat. Dacă aveți nevoie de acces, contactați echipa noastră și vă vom ajuta.',
    otpSent: 'Am trimis prin SMS un cod din 6 cifre la numărul de telefon înregistrat pentru această afacere. Introduceți-l mai jos pentru a finaliza verificarea.',
    ownerGeneric: 'Vă mulțumim — dacă această fișă este un profil de proprietar verificat, am trimis prin e-mail un link securizat de administrare la adresa de contact aflată în evidența noastră. Verificați acea căsuță de e-mail pentru a continua.',
    otpExpired: 'Codul a expirat. Reîncepeți cererea.',
    otpLocked: 'Prea multe încercări greșite — cererea este blocată. Reîncepeți.',
    otpWrong: 'Codul nu este corect.',
    otpWrongLeft: { zero: 'Codul nu este corect. Au rămas {n} de încercări.', one: 'Codul nu este corect. A rămas {n} încercare.', two: 'Codul nu este corect. Au rămas {n} de încercări.', few: 'Codul nu este corect. Au rămas {n} încercări.', many: 'Codul nu este corect. Au rămas {n} de încercări.', other: 'Codul nu este corect. Au rămas {n} de încercări.' },
  },
  ar: {
    generic: 'شكرًا لك — بدأنا التحقق من طلبك. إذا أمكن تأكيد الملكية، فسيُرسل رابط التحقق إلى عنوان التواصل المسجَّل لدينا لهذا النشاط (أو إلى بريدك الإلكتروني إذا كان يطابق موقع النشاط نفسه). وإلا فسيراجع فريقنا طلبك ويتواصل معك عبر البريد الإلكتروني.',
    already: 'لهذا النشاط ملف مالك موثَّق بالفعل. إذا كنت بحاجة إلى الوصول، يرجى التواصل مع فريقنا وسنساعدك.',
    otpSent: 'أرسلنا رمزًا من 6 أرقام برسالة نصية إلى رقم الهاتف المسجَّل لهذا النشاط. أدخله أدناه لإكمال التحقق من طلبك.',
    ownerGeneric: 'شكرًا لك — إذا كان هذا الإدراج ملف مالك موثَّقًا، فقد أرسلنا بالبريد الإلكتروني رابط إدارة آمنًا إلى عنوان التواصل المسجَّل لدينا. يرجى مراجعة ذلك البريد للمتابعة.',
    otpExpired: 'انتهت صلاحية الرمز. يرجى بدء الطلب من جديد.',
    otpLocked: 'محاولات خاطئة كثيرة — تم قفل هذا الطلب. يرجى البدء من جديد.',
    otpWrong: 'الرمز غير صحيح.',
    otpWrongLeft: { zero: 'الرمز غير صحيح. المحاولات المتبقية: {n}.', one: 'الرمز غير صحيح. المحاولات المتبقية: {n}.', two: 'الرمز غير صحيح. المحاولات المتبقية: {n}.', few: 'الرمز غير صحيح. المحاولات المتبقية: {n}.', many: 'الرمز غير صحيح. المحاولات المتبقية: {n}.', other: 'الرمز غير صحيح. المحاولات المتبقية: {n}.' },
  },
  de: {
    generic: 'Vielen Dank — wir haben mit der Prüfung Ihres Antrags begonnen. Lässt sich die Inhaberschaft bestätigen, senden wir einen Bestätigungslink an die hinterlegte Kontaktadresse des Unternehmens (oder an Ihre E-Mail-Adresse, wenn sie zur Website des Unternehmens passt). Andernfalls prüft unser Team Ihre Anfrage und meldet sich per E-Mail bei Ihnen.',
    already: 'Dieses Unternehmen hat bereits ein verifiziertes Inhaberprofil. Wenn Sie Zugang benötigen, wenden Sie sich bitte an unser Team — wir helfen Ihnen gern.',
    otpSent: 'Wir haben einen 6-stelligen Code per SMS an die für dieses Unternehmen hinterlegte Telefonnummer gesendet. Geben Sie ihn unten ein, um die Prüfung abzuschließen.',
    ownerGeneric: 'Vielen Dank — wenn dieser Eintrag ein verifiziertes Inhaberprofil ist, haben wir einen sicheren Verwaltungslink an die hinterlegte Kontaktadresse gesendet. Bitte prüfen Sie dieses Postfach, um fortzufahren.',
    otpExpired: 'Der Code ist abgelaufen. Bitte starten Sie den Antrag erneut.',
    otpLocked: 'Zu viele falsche Versuche — dieser Antrag ist gesperrt. Bitte starten Sie erneut.',
    otpWrong: 'Der Code ist nicht korrekt.',
    otpWrongLeft: { zero: 'Der Code ist nicht korrekt. Noch {n} Versuche übrig.', one: 'Der Code ist nicht korrekt. Noch {n} Versuch übrig.', two: 'Der Code ist nicht korrekt. Noch {n} Versuche übrig.', few: 'Der Code ist nicht korrekt. Noch {n} Versuche übrig.', many: 'Der Code ist nicht korrekt. Noch {n} Versuche übrig.', other: 'Der Code ist nicht korrekt. Noch {n} Versuche übrig.' },
  },
  pl: {
    generic: 'Dziękujemy — rozpoczęliśmy weryfikację Twojego zgłoszenia. Jeśli uda się potwierdzić własność, link weryfikacyjny zostanie wysłany na zapisany adres kontaktowy firmy (lub na Twój adres e-mail, jeśli odpowiada stronie internetowej firmy). W przeciwnym razie nasz zespół rozpatrzy zgłoszenie i skontaktuje się z Tobą e-mailem.',
    already: 'Ta firma ma już zweryfikowany profil właściciela. Jeśli potrzebujesz dostępu, skontaktuj się z naszym zespołem — pomożemy.',
    otpSent: 'Wysłaliśmy 6-cyfrowy kod SMS-em na numer telefonu zapisany dla tej firmy. Wpisz go poniżej, aby dokończyć weryfikację.',
    ownerGeneric: 'Dziękujemy — jeśli ta wizytówka ma zweryfikowany profil właściciela, wysłaliśmy bezpieczny link do zarządzania na zapisany adres kontaktowy. Sprawdź tę skrzynkę, aby kontynuować.',
    otpExpired: 'Kod wygasł. Rozpocznij zgłoszenie od nowa.',
    otpLocked: 'Zbyt wiele błędnych prób — zgłoszenie zostało zablokowane. Rozpocznij od nowa.',
    otpWrong: 'Kod jest nieprawidłowy.',
    otpWrongLeft: { zero: 'Kod jest nieprawidłowy. Pozostało {n} prób.', one: 'Kod jest nieprawidłowy. Pozostała {n} próba.', two: 'Kod jest nieprawidłowy. Pozostało {n} prób.', few: 'Kod jest nieprawidłowy. Pozostały {n} próby.', many: 'Kod jest nieprawidłowy. Pozostało {n} prób.', other: 'Kod jest nieprawidłowy. Pozostało {n} prób.' },
  },
  ru: {
    generic: 'Спасибо — мы начали проверку вашей заявки. Если право собственности удастся подтвердить, ссылка для подтверждения будет отправлена на контактный адрес компании, который есть в наших данных (или на ваш адрес, если он совпадает с сайтом компании). В противном случае наша команда рассмотрит заявку и свяжется с вами по электронной почте.',
    already: 'У этой компании уже есть подтверждённый профиль владельца. Если вам нужен доступ, свяжитесь с нашей командой — мы поможем.',
    otpSent: 'Мы отправили 6-значный код по SMS на номер телефона, указанный для этой компании. Введите его ниже, чтобы завершить проверку.',
    ownerGeneric: 'Спасибо — если эта карточка имеет подтверждённый профиль владельца, мы отправили защищённую ссылку для управления на контактный адрес, который есть в наших данных. Проверьте этот почтовый ящик, чтобы продолжить.',
    otpExpired: 'Срок действия кода истёк. Начните заявку заново.',
    otpLocked: 'Слишком много неверных попыток — заявка заблокирована. Начните заново.',
    otpWrong: 'Код неверный.',
    otpWrongLeft: { zero: 'Код неверный. Осталось {n} попыток.', one: 'Код неверный. Осталась {n} попытка.', two: 'Код неверный. Осталось {n} попыток.', few: 'Код неверный. Осталось {n} попытки.', many: 'Код неверный. Осталось {n} попыток.', other: 'Код неверный. Осталось {n} попытки.' },
  },
};
export const claimMessages = (locale?: string | null): ClaimMessages => pick(CLAIM_MESSAGES, locale);

/** The "wrong code, N attempts left" sentence with the CLDR plural for `locale`. */
export function otpWrongLeftMessage(locale: string | null | undefined, remaining: number): string {
  return plural(locale, remaining, claimMessages(locale).otpWrongLeft);
}

// On-screen confirmation after submitting the privacy request form (English = the previous text).
const DSAR_RECEIVED: Record<Locale, string> = {
  en: 'Your request has been received. We will respond within one month, as required by law.',
  el: 'Το αίτημά σας παραλήφθηκε. Θα απαντήσουμε εντός ενός μηνός, όπως απαιτεί ο νόμος.',
  ro: 'Solicitarea dumneavoastră a fost primită. Vă vom răspunde în termen de o lună, conform legii.',
  ar: 'تم استلام طلبك. سنرد عليك خلال شهر واحد كما يقتضي القانون.',
  de: 'Ihre Anfrage ist eingegangen. Wir antworten innerhalb eines Monats, wie gesetzlich vorgeschrieben.',
  pl: 'Twój wniosek został przyjęty. Odpowiemy w ciągu miesiąca, zgodnie z wymogami prawa.',
  ru: 'Ваш запрос получен. Мы ответим в течение одного месяца, как того требует закон.',
};
export const dsarReceivedMessage = (locale?: string | null): string => pick(DSAR_RECEIVED, locale);
