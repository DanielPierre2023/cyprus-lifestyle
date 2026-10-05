// lib/directory/ownerCopy.ts — all seven editions of the claim-to-own and owner-management
// transactional copy: the two e-mails (verify claim / management link) and the branded result
// pages behind their links (app/api/directory/claim/verify, .../owner/verify). Pure data +
// tiny builders, no I/O, unit-tested. English is the source (exact previous wording).
// el/ro/ar/de/pl/ru: machine-written in increment 5.1 -> NEEDS NATIVE REVIEW before launch.
import { isLocale, type Locale } from '@/lib/locales';

const pick = <T,>(m: Record<Locale, T>, l?: string | null): T => m[l && isLocale(l) ? l : 'en'];
const esc = (s: string): string => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
/** Replace {biz} with the HTML-escaped business name. */
const fill = (tpl: string, biz: string): string => tpl.replace(/\{biz\}/g, esc(biz));
/** Same for plain-text slots (subject): no HTML escaping, but strip line breaks (header injection). */
const fillText = (tpl: string, biz: string): string => tpl.replace(/\{biz\}/g, String(biz ?? '').replace(/[\r\n]+/g, ' '));

// ── e-mails ────────────────────────────────────────────────────────────────────────
interface MailCopy { subject: string; heading: string; p1: string; p2: string; cta: string; preheader: string }

const IGNORE: Record<Locale, string> = {
  en: 'If you did not request this, you can safely ignore this email — nothing will change.',
  el: 'Αν δεν το ζητήσατε εσείς, αγνοήστε αυτό το μήνυμα· δεν θα αλλάξει τίποτα.',
  ro: 'Dacă nu ați făcut această solicitare, ignorați acest e-mail; nu se va modifica nimic.',
  ar: 'إن لم تكن قد طلبتَ ذلك، فتجاهل هذه الرسالة؛ لن يتغير شيء.',
  de: 'Falls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail einfach; es ändert sich nichts.',
  pl: 'Jeśli to nie Ty, zignoruj tę wiadomość; nic się nie zmieni.',
  ru: 'Если вы этого не запрашивали, просто проигнорируйте письмо: ничего не изменится.',
};

const CLAIM_MAIL: Record<Locale, MailCopy> = {
  en: {
    subject: 'Verify your claim — {biz}', heading: 'Confirm your claim of {biz}',
    p1: 'Someone asked to claim and verify the Cyprus Lifestyle listing for <strong>{biz}</strong>.',
    p2: 'If this was you (or your business), open the secure confirmation page below and click <strong>Confirm</strong> to take ownership of the listing. The link is valid for 72 hours and can be used once — ownership transfers only when you click Confirm on that page, so it is safe to open.',
    cta: 'Review your claim', preheader: 'Verify your claim of {biz} on Cyprus Lifestyle',
  },
  el: {
    subject: 'Επαλήθευση της διεκδίκησης — {biz}', heading: 'Επιβεβαιώστε τη διεκδίκηση του {biz}',
    p1: 'Κάποιος ζήτησε να διεκδικήσει και να επαληθεύσει την καταχώριση του <strong>{biz}</strong> στο Cyprus Lifestyle.',
    p2: 'Αν ήσασταν εσείς (ή η επιχείρησή σας), ανοίξτε την ασφαλή σελίδα επιβεβαίωσης παρακάτω και πατήστε <strong>Επιβεβαίωση</strong> για να αναλάβετε την καταχώριση. Ο σύνδεσμος ισχύει για 72 ώρες και μπορεί να χρησιμοποιηθεί μία φορά. Η κυριότητα μεταφέρεται μόνο όταν πατήσετε Επιβεβαίωση στη σελίδα αυτή, επομένως είναι ασφαλές να την ανοίξετε.',
    cta: 'Έλεγχος της διεκδίκησης', preheader: 'Επαλήθευση της διεκδίκησης του {biz} στο Cyprus Lifestyle',
  },
  ro: {
    subject: 'Verificați revendicarea — {biz}', heading: 'Confirmați revendicarea {biz}',
    p1: 'Cineva a cerut să revendice și să verifice pagina <strong>{biz}</strong> din Cyprus Lifestyle.',
    p2: 'Dacă ați fost dumneavoastră (sau firma dumneavoastră), deschideți pagina securizată de confirmare de mai jos și apăsați <strong>Confirmă</strong> pentru a prelua controlul paginii. Linkul este valabil 72 de ore și poate fi folosit o singură dată. Proprietatea se transferă doar când apăsați Confirmă pe acea pagină, deci îl puteți deschide fără risc.',
    cta: 'Verificați revendicarea', preheader: 'Verificați revendicarea {biz} în Cyprus Lifestyle',
  },
  ar: {
    subject: 'تأكيد ملكية الإدراج — {biz}', heading: 'أكّد مطالبتك بملكية {biz}',
    p1: 'طلب شخص ما المطالبة بملكية إدراج <strong>{biz}</strong> في Cyprus Lifestyle والتحقق منه.',
    p2: 'إن كنتَ أنت (أو شركتك)، فافتح صفحة التأكيد الآمنة أدناه واضغط <strong>تأكيد</strong> لتولّي إدارة الإدراج. الرابط صالح لمدة 72 ساعة ويمكن استخدامه مرة واحدة فقط. لا تنتقل الملكية إلا عند الضغط على «تأكيد» في تلك الصفحة، لذا فإن فتحها آمن.',
    cta: 'مراجعة الطلب', preheader: 'تأكيد ملكية {biz} على Cyprus Lifestyle',
  },
  de: {
    subject: 'Inhaberschaft bestätigen — {biz}', heading: 'Bestätigen Sie Ihren Anspruch auf {biz}',
    p1: 'Jemand hat beantragt, den Cyprus-Lifestyle-Eintrag für <strong>{biz}</strong> zu beanspruchen und zu verifizieren.',
    p2: 'Waren Sie das (oder Ihr Unternehmen), öffnen Sie die sichere Bestätigungsseite unten und klicken Sie auf <strong>Bestätigen</strong>, um den Eintrag zu übernehmen. Der Link ist 72 Stunden gültig und kann nur einmal verwendet werden. Die Inhaberschaft wird erst übertragen, wenn Sie auf dieser Seite auf „Bestätigen“ klicken; das Öffnen ist also unbedenklich.',
    cta: 'Anspruch prüfen', preheader: 'Inhaberschaft von {biz} bei Cyprus Lifestyle bestätigen',
  },
  pl: {
    subject: 'Potwierdź prawa do wizytówki — {biz}', heading: 'Potwierdź swoje prawa do {biz}',
    p1: 'Ktoś poprosił o przejęcie i weryfikację wizytówki <strong>{biz}</strong> w Cyprus Lifestyle.',
    p2: 'Jeśli to Ty (lub Twoja firma), otwórz poniższą bezpieczną stronę potwierdzenia i kliknij <strong>Potwierdź</strong>, aby przejąć wizytówkę. Link jest ważny 72 godziny i można go użyć tylko raz. Prawa do wizytówki zostaną przeniesione dopiero po kliknięciu „Potwierdź” na tej stronie, więc jej otwarcie jest bezpieczne.',
    cta: 'Sprawdź zgłoszenie', preheader: 'Potwierdź prawa do {biz} w Cyprus Lifestyle',
  },
  ru: {
    subject: 'Подтвердите права на карточку — {biz}', heading: 'Подтвердите права на {biz}',
    p1: 'Кто-то запросил права на карточку <strong>{biz}</strong> в Cyprus Lifestyle и её верификацию.',
    p2: 'Если это были вы (или ваша компания), откройте защищённую страницу подтверждения ниже и нажмите <strong>Подтвердить</strong>, чтобы принять карточку под управление. Ссылка действует 72 часа и может быть использована один раз. Права переходят к вам только после нажатия «Подтвердить» на этой странице, поэтому открывать её безопасно.',
    cta: 'Проверить заявку', preheader: 'Подтверждение прав на {biz} в Cyprus Lifestyle',
  },
};

const MANAGE_MAIL: Record<Locale, MailCopy> = {
  en: {
    subject: 'Manage your listing — {biz}', heading: 'Manage your listing — {biz}',
    p1: 'You asked to manage the Cyprus Lifestyle listing for <strong>{biz}</strong>.',
    p2: 'Use the secure link below to open your listing editor. It is valid for 60 minutes and can be used once.',
    cta: 'Open listing editor', preheader: 'Your management link for {biz} on Cyprus Lifestyle',
  },
  el: {
    subject: 'Διαχείριση της καταχώρισής σας — {biz}', heading: 'Διαχείριση της καταχώρισής σας — {biz}',
    p1: 'Ζητήσατε να διαχειριστείτε την καταχώριση του <strong>{biz}</strong> στο Cyprus Lifestyle.',
    p2: 'Χρησιμοποιήστε τον ασφαλή σύνδεσμο παρακάτω για να ανοίξετε τον επεξεργαστή της καταχώρισης. Ισχύει για 60 λεπτά και μπορεί να χρησιμοποιηθεί μία φορά.',
    cta: 'Άνοιγμα επεξεργαστή', preheader: 'Ο σύνδεσμος διαχείρισης για το {biz} στο Cyprus Lifestyle',
  },
  ro: {
    subject: 'Gestionați pagina — {biz}', heading: 'Gestionați pagina — {biz}',
    p1: 'Ați cerut să gestionați pagina <strong>{biz}</strong> din Cyprus Lifestyle.',
    p2: 'Folosiți linkul securizat de mai jos pentru a deschide editorul paginii. Este valabil 60 de minute și poate fi folosit o singură dată.',
    cta: 'Deschideți editorul', preheader: 'Linkul de gestionare pentru {biz} în Cyprus Lifestyle',
  },
  ar: {
    subject: 'إدارة إدراجك — {biz}', heading: 'إدارة إدراجك — {biz}',
    p1: 'لقد طلبتَ إدارة إدراج <strong>{biz}</strong> في Cyprus Lifestyle.',
    p2: 'استخدم الرابط الآمن أدناه لفتح محرّر الإدراج. الرابط صالح لمدة 60 دقيقة ويمكن استخدامه مرة واحدة فقط.',
    cta: 'فتح محرّر الإدراج', preheader: 'رابط إدارة {biz} على Cyprus Lifestyle',
  },
  de: {
    subject: 'Ihren Eintrag verwalten — {biz}', heading: 'Ihren Eintrag verwalten — {biz}',
    p1: 'Sie haben darum gebeten, den Cyprus-Lifestyle-Eintrag für <strong>{biz}</strong> zu verwalten.',
    p2: 'Öffnen Sie über den sicheren Link unten den Editor für Ihren Eintrag. Er ist 60 Minuten gültig und kann nur einmal verwendet werden.',
    cta: 'Editor öffnen', preheader: 'Ihr Verwaltungslink für {biz} bei Cyprus Lifestyle',
  },
  pl: {
    subject: 'Zarządzaj wizytówką — {biz}', heading: 'Zarządzaj wizytówką — {biz}',
    p1: 'Zgłoszono prośbę o zarządzanie wizytówką <strong>{biz}</strong> w Cyprus Lifestyle.',
    p2: 'Użyj bezpiecznego linku poniżej, aby otworzyć edytor wizytówki. Jest ważny 60 minut i można go użyć tylko raz.',
    cta: 'Otwórz edytor', preheader: 'Link do zarządzania {biz} w Cyprus Lifestyle',
  },
  ru: {
    subject: 'Управление карточкой — {biz}', heading: 'Управление карточкой — {biz}',
    p1: 'Вы запросили управление карточкой <strong>{biz}</strong> в Cyprus Lifestyle.',
    p2: 'Откройте редактор карточки по защищённой ссылке ниже. Она действует 60 минут и может быть использована один раз.',
    cta: 'Открыть редактор', preheader: 'Ссылка для управления {biz} в Cyprus Lifestyle',
  },
};

export interface BuiltMail { subject: string; heading: string; bodyHtml: string; ctaLabel: string; preheader: string }

function buildMail(c: MailCopy, ignore: string, biz: string): BuiltMail {
  return {
    subject: fillText(c.subject, biz), heading: fill(c.heading, biz),
    bodyHtml: `<p>${fill(c.p1, biz)}</p><p>${c.p2}</p><p>${ignore}</p>`,
    ctaLabel: c.cta, preheader: fillText(c.preheader, biz),
  };
}
export const claimVerifyMail = (locale: string | null | undefined, biz: string): BuiltMail => buildMail(pick(CLAIM_MAIL, locale), pick(IGNORE, locale), biz);
export const manageLinkMail = (locale: string | null | undefined, biz: string): BuiltMail => buildMail(pick(MANAGE_MAIL, locale), pick(IGNORE, locale), biz);

// ── pages behind the links ───────────────────────────────────────────────────────────
export interface PageCopy {
  browse: string; linkH: string; missingH: string;
  // claim verify
  confirmTitle: string; confirmH: string; confirmP1: string; confirmP2: string; confirmBtn: string;
  claimDeadTitle: string; claimInvalid: string; claimExpired: string;
  claimMissingTitle: string; claimMissingBody: string;
  verifiedTitle: string; verifiedH: string; verifiedBody: string;
  // owner management link
  waitTitle: string; waitH: string; waitBody: string;
  mgmtMissingTitle: string; mgmtMissingBody: string;
  mgmtDeadTitle: string; mgmtExpired: string; mgmtInvalid: string;
}

const PAGES: Record<Locale, PageCopy> = {
  en: {
    browse: 'Browse the directory', linkH: 'This link can’t be used', missingH: 'This link is not valid',
    confirmTitle: 'Confirm your claim — {biz}', confirmH: 'Confirm you own {biz}',
    confirmP1: 'You\'re about to take ownership of the Cyprus Lifestyle listing for <strong>{biz}</strong> and turn it into a verified, owner-managed profile.',
    confirmP2: 'For your security nothing changes until you click Confirm below. If you didn\'t request this, simply close this page.',
    confirmBtn: 'Confirm & verify ownership',
    claimDeadTitle: 'Claim link expired',
    claimInvalid: 'This verification link is no longer valid. It may have already been used, or it has been superseded by a newer link. Please start the claim again if you still need to verify.',
    claimExpired: 'This verification link has expired. Links are valid for 72 hours — please start the claim again to receive a fresh one.',
    claimMissingTitle: 'Claim link invalid', claimMissingBody: 'The verification link is missing its token. Please use the most recent link we emailed you.',
    verifiedTitle: 'Listing verified', verifiedH: 'Your listing is verified',
    verifiedBody: 'Thank you — ownership is confirmed and your listing is now a verified first-party profile. Our team will be in touch to help you complete it.',
    waitTitle: 'Please wait', waitH: 'Too many attempts', waitBody: 'Please wait a moment and open your management link again.',
    mgmtMissingTitle: 'Management link invalid', mgmtMissingBody: 'The management link is missing its token. Please use the most recent link we emailed you.',
    mgmtDeadTitle: 'Management link expired',
    mgmtExpired: 'This management link has expired. Links are valid for 60 minutes — please request a fresh one from your listing.',
    mgmtInvalid: 'This management link is no longer valid. It may have already been used, or it has been superseded by a newer link. Please request a fresh one from your listing.',
  },
  el: {
    browse: 'Περιήγηση στον κατάλογο', linkH: 'Ο σύνδεσμος δεν μπορεί να χρησιμοποιηθεί', missingH: 'Ο σύνδεσμος δεν είναι έγκυρος',
    confirmTitle: 'Επιβεβαίωση διεκδίκησης — {biz}', confirmH: 'Επιβεβαιώστε ότι σας ανήκει το {biz}',
    confirmP1: 'Πρόκειται να αναλάβετε την καταχώριση του <strong>{biz}</strong> στο Cyprus Lifestyle και να τη μετατρέψετε σε επαληθευμένο προφίλ που διαχειρίζεστε εσείς.',
    confirmP2: 'Για την ασφάλειά σας, τίποτα δεν αλλάζει μέχρι να πατήσετε Επιβεβαίωση παρακάτω. Αν δεν το ζητήσατε εσείς, απλώς κλείστε αυτή τη σελίδα.',
    confirmBtn: 'Επιβεβαίωση και επαλήθευση κυριότητας',
    claimDeadTitle: 'Ο σύνδεσμος διεκδίκησης έληξε',
    claimInvalid: 'Αυτός ο σύνδεσμος επαλήθευσης δεν ισχύει πλέον. Ίσως έχει ήδη χρησιμοποιηθεί ή έχει αντικατασταθεί από νεότερο. Ξεκινήστε ξανά τη διεκδίκηση αν χρειάζεται ακόμη επαλήθευση.',
    claimExpired: 'Ο σύνδεσμος επαλήθευσης έχει λήξει. Οι σύνδεσμοι ισχύουν για 72 ώρες — ξεκινήστε ξανά τη διεκδίκηση για να λάβετε νέο.',
    claimMissingTitle: 'Μη έγκυρος σύνδεσμος διεκδίκησης', claimMissingBody: 'Στον σύνδεσμο επαλήθευσης λείπει το αναγνωριστικό. Χρησιμοποιήστε τον πιο πρόσφατο σύνδεσμο που σας στείλαμε.',
    verifiedTitle: 'Η καταχώριση επαληθεύτηκε', verifiedH: 'Η καταχώρισή σας επαληθεύτηκε',
    verifiedBody: 'Ευχαριστούμε — η κυριότητα επιβεβαιώθηκε και η καταχώρισή σας είναι πλέον επαληθευμένο προφίλ της ίδιας της επιχείρησης. Η ομάδα μας θα επικοινωνήσει μαζί σας για να το ολοκληρώσετε.',
    waitTitle: 'Παρακαλούμε περιμένετε', waitH: 'Πάρα πολλές προσπάθειες', waitBody: 'Περιμένετε λίγο και ανοίξτε ξανά τον σύνδεσμο διαχείρισης.',
    mgmtMissingTitle: 'Μη έγκυρος σύνδεσμος διαχείρισης', mgmtMissingBody: 'Στον σύνδεσμο διαχείρισης λείπει το αναγνωριστικό. Χρησιμοποιήστε τον πιο πρόσφατο σύνδεσμο που σας στείλαμε.',
    mgmtDeadTitle: 'Ο σύνδεσμος διαχείρισης έληξε',
    mgmtExpired: 'Ο σύνδεσμος διαχείρισης έχει λήξει. Οι σύνδεσμοι ισχύουν για 60 λεπτά — ζητήστε νέο από την καταχώρισή σας.',
    mgmtInvalid: 'Ο σύνδεσμος διαχείρισης δεν ισχύει πλέον. Ίσως έχει ήδη χρησιμοποιηθεί ή έχει αντικατασταθεί από νεότερο. Ζητήστε νέο από την καταχώρισή σας.',
  },
  ro: {
    browse: 'Răsfoiți directorul', linkH: 'Acest link nu mai poate fi folosit', missingH: 'Acest link nu este valid',
    confirmTitle: 'Confirmați revendicarea — {biz}', confirmH: 'Confirmați că {biz} vă aparține',
    confirmP1: 'Sunteți pe cale să preluați pagina <strong>{biz}</strong> din Cyprus Lifestyle și s-o transformați într-un profil verificat, gestionat de proprietar.',
    confirmP2: 'Pentru siguranța dumneavoastră, nu se schimbă nimic până nu apăsați Confirmă mai jos. Dacă nu ați făcut această solicitare, închideți pur și simplu această pagină.',
    confirmBtn: 'Confirmă și verifică proprietatea',
    claimDeadTitle: 'Linkul de revendicare a expirat',
    claimInvalid: 'Acest link de verificare nu mai este valid. Este posibil să fi fost deja folosit sau înlocuit de un link mai nou. Reluați revendicarea dacă mai aveți nevoie de verificare.',
    claimExpired: 'Acest link de verificare a expirat. Linkurile sunt valabile 72 de ore — reluați revendicarea pentru a primi unul nou.',
    claimMissingTitle: 'Link de revendicare invalid', claimMissingBody: 'Linkului de verificare îi lipsește jetonul. Folosiți cel mai recent link trimis pe e-mail.',
    verifiedTitle: 'Pagină verificată', verifiedH: 'Pagina dumneavoastră este verificată',
    verifiedBody: 'Vă mulțumim — proprietatea este confirmată, iar pagina dumneavoastră este acum un profil verificat, gestionat direct de firmă. Echipa noastră vă va contacta pentru a o finaliza împreună.',
    waitTitle: 'Vă rugăm să așteptați', waitH: 'Prea multe încercări', waitBody: 'Așteptați puțin și deschideți din nou linkul de gestionare.',
    mgmtMissingTitle: 'Link de gestionare invalid', mgmtMissingBody: 'Linkului de gestionare îi lipsește jetonul. Folosiți cel mai recent link trimis pe e-mail.',
    mgmtDeadTitle: 'Linkul de gestionare a expirat',
    mgmtExpired: 'Acest link de gestionare a expirat. Linkurile sunt valabile 60 de minute — solicitați unul nou din pagina dumneavoastră.',
    mgmtInvalid: 'Acest link de gestionare nu mai este valid. Este posibil să fi fost deja folosit sau înlocuit de un link mai nou. Solicitați unul nou din pagina dumneavoastră.',
  },
  ar: {
    browse: 'تصفّح الدليل', linkH: 'لا يمكن استخدام هذا الرابط', missingH: 'هذا الرابط غير صالح',
    confirmTitle: 'تأكيد المطالبة — {biz}', confirmH: 'أكّد أنك تملك {biz}',
    confirmP1: 'أنت على وشك تولّي إدراج <strong>{biz}</strong> في Cyprus Lifestyle وتحويله إلى ملف موثّق يديره صاحبه.',
    confirmP2: 'حرصًا على أمانك، لن يتغير شيء حتى تضغط «تأكيد» أدناه. إن لم تطلب ذلك، فأغلق هذه الصفحة.',
    confirmBtn: 'تأكيد والتحقق من الملكية',
    claimDeadTitle: 'انتهت صلاحية رابط المطالبة',
    claimInvalid: 'لم يعد رابط التحقق هذا صالحًا. ربما استُخدم من قبل أو حلّ محلَّه رابط أحدث. ابدأ المطالبة من جديد إن كنت ما زلت بحاجة إلى التحقق.',
    claimExpired: 'انتهت صلاحية رابط التحقق. الروابط صالحة لمدة 72 ساعة — ابدأ المطالبة من جديد لتحصل على رابط جديد.',
    claimMissingTitle: 'رابط المطالبة غير صالح', claimMissingBody: 'رابط التحقق ينقصه الرمز. يرجى استخدام أحدث رابط أرسلناه إلى بريدك.',
    verifiedTitle: 'تم توثيق الإدراج', verifiedH: 'تم توثيق إدراجك',
    verifiedBody: 'شكرًا لك — تم تأكيد الملكية وأصبح إدراجك ملفًا موثّقًا يديره صاحب النشاط. سيتواصل معك فريقنا لمساعدتك على إكماله.',
    waitTitle: 'يرجى الانتظار', waitH: 'محاولات كثيرة جدًا', waitBody: 'انتظر قليلًا ثم افتح رابط الإدارة مرة أخرى.',
    mgmtMissingTitle: 'رابط الإدارة غير صالح', mgmtMissingBody: 'رابط الإدارة ينقصه الرمز. يرجى استخدام أحدث رابط أرسلناه إلى بريدك.',
    mgmtDeadTitle: 'انتهت صلاحية رابط الإدارة',
    mgmtExpired: 'انتهت صلاحية رابط الإدارة. الروابط صالحة لمدة 60 دقيقة — اطلب رابطًا جديدًا من صفحة إدراجك.',
    mgmtInvalid: 'لم يعد رابط الإدارة هذا صالحًا. ربما استُخدم من قبل أو حلّ محلَّه رابط أحدث. اطلب رابطًا جديدًا من صفحة إدراجك.',
  },
  de: {
    browse: 'Verzeichnis durchsuchen', linkH: 'Dieser Link kann nicht verwendet werden', missingH: 'Dieser Link ist ungültig',
    confirmTitle: 'Anspruch bestätigen — {biz}', confirmH: 'Bestätigen Sie, dass {biz} Ihnen gehört',
    confirmP1: 'Sie sind dabei, den Cyprus-Lifestyle-Eintrag für <strong>{biz}</strong> zu übernehmen und in ein verifiziertes, vom Inhaber verwaltetes Profil umzuwandeln.',
    confirmP2: 'Zu Ihrer Sicherheit ändert sich nichts, bis Sie unten auf „Bestätigen“ klicken. Falls Sie das nicht angefordert haben, schließen Sie einfach diese Seite.',
    confirmBtn: 'Bestätigen und Inhaberschaft verifizieren',
    claimDeadTitle: 'Anspruchs-Link abgelaufen',
    claimInvalid: 'Dieser Bestätigungslink ist nicht mehr gültig. Möglicherweise wurde er bereits verwendet oder durch einen neueren Link ersetzt. Starten Sie den Anspruch erneut, falls Sie noch verifizieren müssen.',
    claimExpired: 'Dieser Bestätigungslink ist abgelaufen. Links sind 72 Stunden gültig — starten Sie den Anspruch erneut, um einen neuen zu erhalten.',
    claimMissingTitle: 'Anspruchs-Link ungültig', claimMissingBody: 'Dem Bestätigungslink fehlt das Token. Bitte verwenden Sie den neuesten Link, den wir Ihnen gesendet haben.',
    verifiedTitle: 'Eintrag verifiziert', verifiedH: 'Ihr Eintrag ist verifiziert',
    verifiedBody: 'Vielen Dank — die Inhaberschaft ist bestätigt und Ihr Eintrag ist nun ein verifiziertes Profil des Betriebs selbst. Unser Team meldet sich bei Ihnen, um ihn gemeinsam zu vervollständigen.',
    waitTitle: 'Bitte warten', waitH: 'Zu viele Versuche', waitBody: 'Bitte warten Sie einen Moment und öffnen Sie Ihren Verwaltungslink erneut.',
    mgmtMissingTitle: 'Verwaltungslink ungültig', mgmtMissingBody: 'Dem Verwaltungslink fehlt das Token. Bitte verwenden Sie den neuesten Link, den wir Ihnen gesendet haben.',
    mgmtDeadTitle: 'Verwaltungslink abgelaufen',
    mgmtExpired: 'Dieser Verwaltungslink ist abgelaufen. Links sind 60 Minuten gültig — fordern Sie in Ihrem Eintrag einen neuen an.',
    mgmtInvalid: 'Dieser Verwaltungslink ist nicht mehr gültig. Möglicherweise wurde er bereits verwendet oder durch einen neueren Link ersetzt. Fordern Sie in Ihrem Eintrag einen neuen an.',
  },
  pl: {
    browse: 'Przeglądaj katalog', linkH: 'Tego linku nie można użyć', missingH: 'Ten link jest nieprawidłowy',
    confirmTitle: 'Potwierdź prawa do wizytówki — {biz}', confirmH: 'Potwierdź, że {biz} należy do Ciebie',
    confirmP1: 'Za chwilę przejmiesz wizytówkę <strong>{biz}</strong> w Cyprus Lifestyle i zamienisz ją w zweryfikowany profil zarządzany przez właściciela.',
    confirmP2: 'Dla Twojego bezpieczeństwa nic się nie zmieni, dopóki nie klikniesz poniżej „Potwierdź”. Jeśli to nie Ty, po prostu zamknij tę stronę.',
    confirmBtn: 'Potwierdź i zweryfikuj prawa własności',
    claimDeadTitle: 'Link do przejęcia wygasł',
    claimInvalid: 'Ten link weryfikacyjny nie jest już ważny. Mógł zostać już użyty lub zastąpiony nowszym. Rozpocznij procedurę od nowa, jeśli nadal chcesz zweryfikować wizytówkę.',
    claimExpired: 'Ten link weryfikacyjny wygasł. Linki są ważne 72 godziny — rozpocznij procedurę od nowa, aby otrzymać nowy.',
    claimMissingTitle: 'Nieprawidłowy link do przejęcia', claimMissingBody: 'W linku weryfikacyjnym brakuje tokenu. Użyj najnowszego linku, który do Ciebie wysłaliśmy.',
    verifiedTitle: 'Wizytówka zweryfikowana', verifiedH: 'Twoja wizytówka jest zweryfikowana',
    verifiedBody: 'Dziękujemy — prawa własności zostały potwierdzone, a Twoja wizytówka jest teraz zweryfikowanym profilem prowadzonym przez samą firmę. Nasz zespół skontaktuje się z Tobą, aby pomóc ją uzupełnić.',
    waitTitle: 'Poczekaj chwilę', waitH: 'Zbyt wiele prób', waitBody: 'Poczekaj chwilę i otwórz link do zarządzania jeszcze raz.',
    mgmtMissingTitle: 'Nieprawidłowy link do zarządzania', mgmtMissingBody: 'W linku do zarządzania brakuje tokenu. Użyj najnowszego linku, który do Ciebie wysłaliśmy.',
    mgmtDeadTitle: 'Link do zarządzania wygasł',
    mgmtExpired: 'Ten link do zarządzania wygasł. Linki są ważne 60 minut — poproś o nowy na stronie swojej wizytówki.',
    mgmtInvalid: 'Ten link do zarządzania nie jest już ważny. Mógł zostać już użyty lub zastąpiony nowszym. Poproś o nowy na stronie swojej wizytówki.',
  },
  ru: {
    browse: 'Открыть каталог', linkH: 'Эту ссылку нельзя использовать', missingH: 'Недействительная ссылка',
    confirmTitle: 'Подтверждение прав — {biz}', confirmH: 'Подтвердите, что {biz} принадлежит вам',
    confirmP1: 'Вы собираетесь принять под управление карточку <strong>{biz}</strong> в Cyprus Lifestyle и превратить её в проверенный профиль, которым управляет владелец.',
    confirmP2: 'Для вашей безопасности ничего не изменится, пока вы не нажмёте «Подтвердить» ниже. Если вы этого не запрашивали, просто закройте страницу.',
    confirmBtn: 'Подтвердить и проверить права',
    claimDeadTitle: 'Срок действия ссылки истёк',
    claimInvalid: 'Эта ссылка для проверки больше не действует. Возможно, она уже использована или заменена более новой. Начните заявку заново, если проверка всё ещё нужна.',
    claimExpired: 'Срок действия ссылки для проверки истёк. Ссылки действуют 72 часа — начните заявку заново, чтобы получить новую.',
    claimMissingTitle: 'Недействительная ссылка', claimMissingBody: 'В ссылке для проверки отсутствует токен. Используйте самую свежую ссылку из нашего письма.',
    verifiedTitle: 'Карточка подтверждена', verifiedH: 'Ваша карточка подтверждена',
    verifiedBody: 'Спасибо — права подтверждены, и теперь ваша карточка является проверенным профилем, который ведёт сама компания. Наша команда свяжется с вами, чтобы помочь её заполнить.',
    waitTitle: 'Пожалуйста, подождите', waitH: 'Слишком много попыток', waitBody: 'Подождите немного и откройте ссылку для управления ещё раз.',
    mgmtMissingTitle: 'Недействительная ссылка управления', mgmtMissingBody: 'В ссылке для управления отсутствует токен. Используйте самую свежую ссылку из нашего письма.',
    mgmtDeadTitle: 'Срок действия ссылки истёк',
    mgmtExpired: 'Срок действия ссылки для управления истёк. Ссылки действуют 60 минут — запросите новую на странице вашей карточки.',
    mgmtInvalid: 'Эта ссылка для управления больше не действует. Возможно, она уже использована или заменена более новой. Запросите новую на странице вашей карточки.',
  },
};

export const pageCopy = (locale: string | null | undefined): PageCopy => pick(PAGES, locale);
/** Fill {biz} (HTML-escaped) into a page string. */
export const withBiz = (tpl: string, biz: string): string => fill(tpl, biz);
/** Plain-text variant for <title>. */
export const withBizText = (tpl: string, biz: string): string => fillText(tpl, biz);
