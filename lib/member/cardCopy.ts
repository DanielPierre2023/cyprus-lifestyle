// lib/member/cardCopy.ts
// All text of the member card (on /account) and of the public verification page /card/verify/<token>, in the seven editions
// (en el ro ar de pl ru). A typed module (not messages/*.json) so the card ships without touching the shared message files;
// scripts/tests/member.card.test.ts enforces the same parity rules as `npm run check:i18n` (every key in every language,
// no empty values, identical {placeholders}).
//
// TRUTH IN ADVERTISING — what this copy may say:
//   • the card IDENTIFIES the member (valid / not valid, first name if chosen, year joined) — that is all the code does;
//   • offers exist only if the owner added them (member_offers). With none, the card says so plainly, and never hints at a
//     discount. Wording like "exclusive discounts", "save at partner venues" is NOT allowed unless an offer is listed.
//   • non-English text needs native review.
import type { Locale } from '@/lib/locales';

export interface CardCopy {
  // the card on /account
  cTitle: string; cStatus: string; cSince: string; cQr: string; cIntroNone: string; cIntroOffers: string; cShows: string;
  cOffersTitle: string; cOffersNone: string;
  cNameLabel: string; cNamePh: string; cNameSave: string; cNameSaved: string; cNameInvalid: string;
  cRotate: string; cRotateConfirm: string; cRotated: string; cPreview: string; cError: string;
  // the public verification page
  vTitle: string; vKicker: string; vValid: string; vMember: string; vSince: string; vInvalid: string; vInvalidNote: string; vBusy: string;
  vOffersTitle: string; vRedeem: string; vRedeeming: string; vRedeemed: string; vAlready: string; vUnavailable: string; vRateLimited: string; vError: string;
  vRedeemNote: string; vScope: string;
}

const EN: CardCopy = {
  cTitle: 'Member card', cStatus: 'Member', cSince: 'Member since {year}', cQr: 'QR code of your Cyprus Lifestyle member card',
  cIntroNone: 'This card identifies you as a Cyprus Lifestyle member. Partner offers are added by Cyprus Lifestyle over time; there are none yet, and the card does not by itself entitle you to a discount anywhere.',
  cIntroOffers: 'Show this code at a partner venue that lists an offer below. The venue can confirm that your membership is current.',
  cShows: 'Venue staff who scan the code see only: that your membership is valid, your first name (if you add one) and the year you joined. They never see your e-mail address or phone number.',
  cOffersTitle: 'Current partner offers', cOffersNone: 'No partner offers at the moment.',
  cNameLabel: 'Name shown on the card (optional)', cNamePh: 'First name or initials', cNameSave: 'Save', cNameSaved: 'Saved.', cNameInvalid: 'Please use letters only, up to 24 characters.',
  cRotate: 'Replace this card', cRotateConfirm: 'Create a new card? The current QR code stops working immediately.', cRotated: 'Done. Your new card is shown above; the old QR code no longer works.',
  cPreview: 'See what venues see', cError: 'We could not do that just now. Please try again in a few minutes.',
  vTitle: 'Member card check', vKicker: 'Cyprus Lifestyle', vValid: 'Valid', vMember: 'Member', vSince: 'Member since {year}',
  vInvalid: 'Not valid', vInvalidNote: 'This card is not valid. It may have been replaced, or the membership may have ended.',
  vBusy: 'Too many checks from this connection. Please try again in a minute.',
  vOffersTitle: 'Partner offers', vRedeem: 'Redeem', vRedeeming: 'Saving…', vRedeemed: 'Redeemed', vAlready: 'Already redeemed today', vUnavailable: 'This offer is no longer available.',
  vRateLimited: 'Too many attempts. Please wait a minute.', vError: 'Could not record this. Please try again.',
  vRedeemNote: 'Press Redeem once the offer has been given. The only thing recorded is the offer and the time; one redemption per member per offer per day.',
  vScope: 'This page confirms only that the card is valid, the first name (if the member chose to add one) and the year the member joined.',
};

const COPY: Record<Locale, CardCopy> = {
  en: EN,
  de: {
    cTitle: 'Mitgliedskarte', cStatus: 'Mitglied', cSince: 'Mitglied seit {year}', cQr: 'QR-Code Ihrer Cyprus-Lifestyle-Mitgliedskarte',
    cIntroNone: 'Diese Karte weist Sie als Mitglied von Cyprus Lifestyle aus. Partnerangebote ergänzt Cyprus Lifestyle nach und nach; derzeit gibt es keine, und die Karte berechtigt für sich allein nirgendwo zu einem Rabatt.',
    cIntroOffers: 'Zeigen Sie diesen Code bei einem Partner, der unten ein Angebot führt. Das Lokal kann bestätigen, dass Ihre Mitgliedschaft gültig ist.',
    cShows: 'Das Personal, das den Code scannt, sieht nur: dass Ihre Mitgliedschaft gültig ist, Ihren Vornamen (falls Sie einen angeben) und das Jahr Ihres Beitritts. Ihre E-Mail-Adresse und Telefonnummer sieht es nie.',
    cOffersTitle: 'Aktuelle Partnerangebote', cOffersNone: 'Derzeit keine Partnerangebote.',
    cNameLabel: 'Auf der Karte angezeigter Name (optional)', cNamePh: 'Vorname oder Initialen', cNameSave: 'Speichern', cNameSaved: 'Gespeichert.', cNameInvalid: 'Bitte nur Buchstaben, höchstens 24 Zeichen.',
    cRotate: 'Karte ersetzen', cRotateConfirm: 'Neue Karte erstellen? Der aktuelle QR-Code funktioniert sofort nicht mehr.', cRotated: 'Fertig. Ihre neue Karte steht oben; der alte QR-Code funktioniert nicht mehr.',
    cPreview: 'Ansehen, was Lokale sehen', cError: 'Das hat gerade nicht geklappt. Bitte versuchen Sie es in einigen Minuten erneut.',
    vTitle: 'Prüfung der Mitgliedskarte', vKicker: 'Cyprus Lifestyle', vValid: 'Gültig', vMember: 'Mitglied', vSince: 'Mitglied seit {year}',
    vInvalid: 'Nicht gültig', vInvalidNote: 'Diese Karte ist nicht gültig. Sie wurde möglicherweise ersetzt, oder die Mitgliedschaft ist beendet.',
    vBusy: 'Zu viele Prüfungen von dieser Verbindung. Bitte in einer Minute erneut versuchen.',
    vOffersTitle: 'Partnerangebote', vRedeem: 'Einlösen', vRedeeming: 'Wird gespeichert…', vRedeemed: 'Eingelöst', vAlready: 'Heute bereits eingelöst', vUnavailable: 'Dieses Angebot ist nicht mehr verfügbar.',
    vRateLimited: 'Zu viele Versuche. Bitte eine Minute warten.', vError: 'Das konnte nicht erfasst werden. Bitte erneut versuchen.',
    vRedeemNote: 'Tippen Sie auf Einlösen, sobald das Angebot gewährt wurde. Erfasst werden nur das Angebot und die Uhrzeit; eine Einlösung pro Mitglied und Angebot am Tag.',
    vScope: 'Diese Seite bestätigt nur, dass die Karte gültig ist, den Vornamen (falls das Mitglied einen angegeben hat) und das Beitrittsjahr.',
  },
  el: {
    cTitle: 'Κάρτα μέλους', cStatus: 'Μέλος', cSince: 'Μέλος από το {year}', cQr: 'Κωδικός QR της κάρτας μέλους Cyprus Lifestyle',
    cIntroNone: 'Αυτή η κάρτα σας ταυτοποιεί ως μέλος του Cyprus Lifestyle. Οι προσφορές συνεργατών προστίθενται από το Cyprus Lifestyle με τον καιρό· προς το παρόν δεν υπάρχουν, και η κάρτα από μόνη της δεν παρέχει δικαίωμα έκπτωσης πουθενά.',
    cIntroOffers: 'Δείξτε αυτόν τον κωδικό σε συνεργάτη που έχει προσφορά στη λίστα παρακάτω. Το κατάστημα μπορεί να επιβεβαιώσει ότι η συνδρομή σας είναι σε ισχύ.',
    cShows: 'Το προσωπικό που σαρώνει τον κωδικό βλέπει μόνο: ότι η συνδρομή σας ισχύει, το μικρό σας όνομα (αν προσθέσετε) και το έτος εγγραφής σας. Δεν βλέπει ποτέ το email ή το τηλέφωνό σας.',
    cOffersTitle: 'Τρέχουσες προσφορές συνεργατών', cOffersNone: 'Προς το παρόν δεν υπάρχουν προσφορές συνεργατών.',
    cNameLabel: 'Όνομα στην κάρτα (προαιρετικό)', cNamePh: 'Μικρό όνομα ή αρχικά', cNameSave: 'Αποθήκευση', cNameSaved: 'Αποθηκεύτηκε.', cNameInvalid: 'Μόνο γράμματα, έως 24 χαρακτήρες.',
    cRotate: 'Αντικατάσταση κάρτας', cRotateConfirm: 'Να δημιουργηθεί νέα κάρτα; Ο τρέχων κωδικός QR θα πάψει να λειτουργεί αμέσως.', cRotated: 'Έτοιμο. Η νέα κάρτα εμφανίζεται παραπάνω· ο παλιός κωδικός QR δεν λειτουργεί πια.',
    cPreview: 'Δείτε τι βλέπουν τα καταστήματα', cError: 'Δεν ήταν δυνατό αυτή τη στιγμή. Δοκιμάστε ξανά σε λίγα λεπτά.',
    vTitle: 'Έλεγχος κάρτας μέλους', vKicker: 'Cyprus Lifestyle', vValid: 'Έγκυρη', vMember: 'Μέλος', vSince: 'Μέλος από το {year}',
    vInvalid: 'Μη έγκυρη', vInvalidNote: 'Η κάρτα δεν είναι έγκυρη. Μπορεί να έχει αντικατασταθεί ή η συνδρομή να έχει λήξει.',
    vBusy: 'Πάρα πολλοί έλεγχοι από αυτή τη σύνδεση. Δοκιμάστε ξανά σε ένα λεπτό.',
    vOffersTitle: 'Προσφορές συνεργατών', vRedeem: 'Εξαργύρωση', vRedeeming: 'Αποθήκευση…', vRedeemed: 'Εξαργυρώθηκε', vAlready: 'Έχει ήδη εξαργυρωθεί σήμερα', vUnavailable: 'Αυτή η προσφορά δεν είναι πλέον διαθέσιμη.',
    vRateLimited: 'Πάρα πολλές προσπάθειες. Περιμένετε ένα λεπτό.', vError: 'Δεν ήταν δυνατή η καταγραφή. Δοκιμάστε ξανά.',
    vRedeemNote: 'Πατήστε Εξαργύρωση αφού δοθεί η προσφορά. Καταγράφονται μόνο η προσφορά και η ώρα· μία εξαργύρωση ανά μέλος και προσφορά την ημέρα.',
    vScope: 'Η σελίδα επιβεβαιώνει μόνο ότι η κάρτα είναι έγκυρη, το μικρό όνομα (αν το μέλος επέλεξε να το προσθέσει) και το έτος εγγραφής.',
  },
  pl: {
    cTitle: 'Karta członkowska', cStatus: 'Członek', cSince: 'Członek od {year}', cQr: 'Kod QR Twojej karty członkowskiej Cyprus Lifestyle',
    cIntroNone: 'Ta karta potwierdza, że jesteś członkiem Cyprus Lifestyle. Oferty partnerów Cyprus Lifestyle dodaje z czasem; na razie ich nie ma, a sama karta nigdzie nie daje prawa do zniżki.',
    cIntroOffers: 'Pokaż ten kod u partnera, który ma poniżej ofertę. Lokal może potwierdzić, że Twoje członkostwo jest aktualne.',
    cShows: 'Obsługa skanująca kod widzi tylko: że członkostwo jest ważne, Twoje imię (jeśli je dodasz) i rok dołączenia. Nigdy nie widzi Twojego adresu e-mail ani numeru telefonu.',
    cOffersTitle: 'Aktualne oferty partnerów', cOffersNone: 'Obecnie brak ofert partnerów.',
    cNameLabel: 'Imię widoczne na karcie (opcjonalnie)', cNamePh: 'Imię lub inicjały', cNameSave: 'Zapisz', cNameSaved: 'Zapisano.', cNameInvalid: 'Tylko litery, maksymalnie 24 znaki.',
    cRotate: 'Wymień kartę', cRotateConfirm: 'Utworzyć nową kartę? Obecny kod QR przestanie działać natychmiast.', cRotated: 'Gotowe. Nowa karta jest powyżej; stary kod QR już nie działa.',
    cPreview: 'Zobacz, co widzą lokale', cError: 'Nie udało się tego teraz zrobić. Spróbuj ponownie za kilka minut.',
    vTitle: 'Sprawdzenie karty członkowskiej', vKicker: 'Cyprus Lifestyle', vValid: 'Ważna', vMember: 'Członek', vSince: 'Członek od {year}',
    vInvalid: 'Nieważna', vInvalidNote: 'Ta karta jest nieważna. Mogła zostać wymieniona albo członkostwo wygasło.',
    vBusy: 'Zbyt wiele sprawdzeń z tego połączenia. Spróbuj za minutę.',
    vOffersTitle: 'Oferty partnerów', vRedeem: 'Zrealizuj', vRedeeming: 'Zapisywanie…', vRedeemed: 'Zrealizowano', vAlready: 'Już zrealizowano dzisiaj', vUnavailable: 'Ta oferta nie jest już dostępna.',
    vRateLimited: 'Zbyt wiele prób. Poczekaj minutę.', vError: 'Nie udało się zapisać. Spróbuj ponownie.',
    vRedeemNote: 'Naciśnij Zrealizuj po udzieleniu oferty. Zapisywane są tylko oferta i godzina; jedna realizacja na członka i ofertę dziennie.',
    vScope: 'Ta strona potwierdza tylko, że karta jest ważna, imię (jeśli członek je dodał) i rok dołączenia.',
  },
  ro: {
    cTitle: 'Card de membru', cStatus: 'Membru', cSince: 'Membru din {year}', cQr: 'Codul QR al cardului dumneavoastră de membru Cyprus Lifestyle',
    cIntroNone: 'Acest card vă identifică drept membru Cyprus Lifestyle. Ofertele partenerilor sunt adăugate de Cyprus Lifestyle în timp; deocamdată nu există niciuna, iar cardul singur nu dă dreptul la reducere nicăieri.',
    cIntroOffers: 'Arătați acest cod la un partener care are o ofertă în lista de mai jos. Localul poate confirma că abonamentul dumneavoastră este valabil.',
    cShows: 'Personalul care scanează codul vede doar: că abonamentul este valabil, prenumele dumneavoastră (dacă îl adăugați) și anul în care v-ați alăturat. Nu vede niciodată adresa de e-mail sau numărul de telefon.',
    cOffersTitle: 'Ofertele curente ale partenerilor', cOffersNone: 'Momentan nu există oferte de la parteneri.',
    cNameLabel: 'Numele afișat pe card (opțional)', cNamePh: 'Prenume sau inițiale', cNameSave: 'Salvează', cNameSaved: 'Salvat.', cNameInvalid: 'Doar litere, cel mult 24 de caractere.',
    cRotate: 'Înlocuiți cardul', cRotateConfirm: 'Creați un card nou? Codul QR actual încetează să funcționeze imediat.', cRotated: 'Gata. Noul card este afișat mai sus; vechiul cod QR nu mai funcționează.',
    cPreview: 'Vedeți ce văd localurile', cError: 'Nu am putut face asta acum. Încercați din nou peste câteva minute.',
    vTitle: 'Verificarea cardului de membru', vKicker: 'Cyprus Lifestyle', vValid: 'Valabil', vMember: 'Membru', vSince: 'Membru din {year}',
    vInvalid: 'Nevalabil', vInvalidNote: 'Acest card nu este valabil. Poate a fost înlocuit sau abonamentul s-a încheiat.',
    vBusy: 'Prea multe verificări de la această conexiune. Încercați din nou peste un minut.',
    vOffersTitle: 'Ofertele partenerilor', vRedeem: 'Valorifică', vRedeeming: 'Se salvează…', vRedeemed: 'Valorificat', vAlready: 'Deja valorificat astăzi', vUnavailable: 'Această ofertă nu mai este disponibilă.',
    vRateLimited: 'Prea multe încercări. Așteptați un minut.', vError: 'Nu s-a putut înregistra. Încercați din nou.',
    vRedeemNote: 'Apăsați Valorifică după ce oferta a fost acordată. Se înregistrează doar oferta și ora; o valorificare pe membru, pe ofertă, pe zi.',
    vScope: 'Această pagină confirmă doar că cardul este valabil, prenumele (dacă membrul a ales să îl adauge) și anul înscrierii.',
  },
  ru: {
    cTitle: 'Карта участника', cStatus: 'Участник', cSince: 'Участник с {year} года', cQr: 'QR-код вашей карты участника Cyprus Lifestyle',
    cIntroNone: 'Эта карта подтверждает, что вы участник Cyprus Lifestyle. Предложения партнёров добавляются Cyprus Lifestyle со временем; пока их нет, и сама по себе карта нигде не даёт права на скидку.',
    cIntroOffers: 'Покажите этот код у партнёра, чьё предложение указано ниже. Заведение может подтвердить, что ваше членство действует.',
    cShows: 'Сотрудник, сканирующий код, видит только: что членство действительно, ваше имя (если вы его добавите) и год вступления. Адрес e-mail и номер телефона он не видит никогда.',
    cOffersTitle: 'Текущие предложения партнёров', cOffersNone: 'Сейчас предложений партнёров нет.',
    cNameLabel: 'Имя на карте (по желанию)', cNamePh: 'Имя или инициалы', cNameSave: 'Сохранить', cNameSaved: 'Сохранено.', cNameInvalid: 'Только буквы, не более 24 символов.',
    cRotate: 'Заменить карту', cRotateConfirm: 'Создать новую карту? Текущий QR-код перестанет работать сразу.', cRotated: 'Готово. Новая карта показана выше; старый QR-код больше не работает.',
    cPreview: 'Посмотреть, что видят заведения', cError: 'Сейчас не получилось. Попробуйте снова через несколько минут.',
    vTitle: 'Проверка карты участника', vKicker: 'Cyprus Lifestyle', vValid: 'Действительна', vMember: 'Участник', vSince: 'Участник с {year} года',
    vInvalid: 'Недействительна', vInvalidNote: 'Эта карта недействительна. Возможно, её заменили или членство закончилось.',
    vBusy: 'Слишком много проверок с этого подключения. Повторите через минуту.',
    vOffersTitle: 'Предложения партнёров', vRedeem: 'Применить', vRedeeming: 'Сохранение…', vRedeemed: 'Применено', vAlready: 'Сегодня уже применено', vUnavailable: 'Это предложение больше недоступно.',
    vRateLimited: 'Слишком много попыток. Подождите минуту.', vError: 'Не удалось записать. Повторите попытку.',
    vRedeemNote: 'Нажмите «Применить», когда предложение предоставлено. Записываются только предложение и время; одно применение на участника и предложение в день.',
    vScope: 'Эта страница подтверждает только, что карта действительна, имя (если участник его добавил) и год вступления.',
  },
  ar: {
    cTitle: 'بطاقة العضوية', cStatus: 'عضو', cSince: 'عضو منذ {year}', cQr: 'رمز QR لبطاقة عضويتك في Cyprus Lifestyle',
    cIntroNone: 'تُثبت هذه البطاقة أنك عضو في Cyprus Lifestyle. تضيف Cyprus Lifestyle عروض الشركاء مع الوقت؛ لا توجد أي عروض حاليًا، والبطاقة وحدها لا تمنحك خصمًا في أي مكان.',
    cIntroOffers: 'أظهر هذا الرمز لدى شريك لديه عرض مذكور أدناه. يستطيع المكان التأكد من أن عضويتك سارية.',
    cShows: 'يرى الموظف الذي يمسح الرمز فقط: أن عضويتك سارية، واسمك الأول (إن أضفته)، وسنة انضمامك. ولا يرى أبدًا بريدك الإلكتروني أو رقم هاتفك.',
    cOffersTitle: 'عروض الشركاء الحالية', cOffersNone: 'لا توجد عروض شركاء حاليًا.',
    cNameLabel: 'الاسم الظاهر على البطاقة (اختياري)', cNamePh: 'الاسم الأول أو الأحرف الأولى', cNameSave: 'حفظ', cNameSaved: 'تم الحفظ.', cNameInvalid: 'أحرف فقط، بحد أقصى 24 حرفًا.',
    cRotate: 'استبدال البطاقة', cRotateConfirm: 'إنشاء بطاقة جديدة؟ سيتوقف رمز QR الحالي عن العمل فورًا.', cRotated: 'تم. بطاقتك الجديدة معروضة أعلاه؛ ولم يعد رمز QR القديم يعمل.',
    cPreview: 'اطّلع على ما تراه الأماكن', cError: 'تعذّر تنفيذ ذلك الآن. يُرجى المحاولة مجددًا بعد دقائق.',
    vTitle: 'التحقق من بطاقة العضوية', vKicker: 'Cyprus Lifestyle', vValid: 'صالحة', vMember: 'عضو', vSince: 'عضو منذ {year}',
    vInvalid: 'غير صالحة', vInvalidNote: 'هذه البطاقة غير صالحة. ربما استُبدلت أو انتهت العضوية.',
    vBusy: 'عدد كبير من عمليات التحقق من هذا الاتصال. حاول مجددًا بعد دقيقة.',
    vOffersTitle: 'عروض الشركاء', vRedeem: 'استخدام العرض', vRedeeming: 'جارٍ الحفظ…', vRedeemed: 'تم الاستخدام', vAlready: 'سبق استخدامه اليوم', vUnavailable: 'لم يعد هذا العرض متاحًا.',
    vRateLimited: 'محاولات كثيرة. انتظر دقيقة.', vError: 'تعذّر التسجيل. حاول مجددًا.',
    vRedeemNote: 'اضغط «استخدام العرض» بعد تقديم العرض. يُسجَّل العرض والوقت فقط؛ استخدام واحد لكل عضو ولكل عرض في اليوم.',
    vScope: 'تؤكد هذه الصفحة فقط أن البطاقة صالحة، والاسم الأول (إن اختار العضو إضافته)، وسنة الانضمام.',
  },
};

export const cardCopy = (l: string): CardCopy => COPY[l as Locale] || COPY.en;
export const cardCopyAll = COPY;
export const fillCard = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_m, k) => (k in vars ? String(vars[k]) : `{${k}}`));
