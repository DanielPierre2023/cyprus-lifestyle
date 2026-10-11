'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/honeypot';
import { numberFormatter } from '@/lib/i18n/format';
import { dir as dirOf, type Locale } from '@/lib/locales';
import { COUNTRY_CODES, isEuMemberState } from '@/lib/vat/countries';

export interface RateItem {
  slot: string;
  label: string;
  format: string | null;
  unit: string | null;      // 'per month' | 'per year' | 'per feature' | 'per send' | 'per event'
  price_from: number | null;
  price_to: number | null;
  list_price: number | null; // rack (full) price — struck-through anchor when > price_from
  kind: string;             // 'package' | 'alacarte'
  blurb: string | null;
  self_serve: boolean;
}

// Error codes POST /api/advertise/checkout answers with ({ ok: false, error: <code> }) before it creates a
// checkout session — each has a translated message (Dict.buyErr). The value is the input the message is
// about (that input is flagged and focused); null = about the form as a whole. vat_unverifiable is about the
// VIES service being down, not about the number, so it does not flag the VAT field.
type BuyField = 'email' | 'company' | 'country' | 'vatId';
const ERR_FIELD = {
  email_required: 'email', country_required: 'country', company_required: 'company',
  vat_format: 'vatId', vat_invalid: 'vatId', vat_unverifiable: null,
} as const satisfies Record<string, BuyField | null>;
type BuyErr = keyof typeof ERR_FIELD;
const isBuyErr = (c: unknown): c is BuyErr => typeof c === 'string' && Object.prototype.hasOwnProperty.call(ERR_FIELD, c);

type Dict = {
  packages: string; alacarte: string; getStarted: string; quote: string; from: string;
  popular: string; secure: string; unit: Record<string, string>;
  founding: string; off: string; foundingNote: string;
  formTitle: string; fName: string; fEmail: string; fCompany: string; fMessage: string;
  send: string; sending: string; ok: string; err: string; close: string;
  successBanner: string; cancelBanner: string;
  // Self-serve checkout form (BuyModal). It reuses fName / fEmail / err / close from above; fCompany carries a
  // baked-in "(optional)" that is wrong once a VAT number makes the company mandatory, hence bCompany + bOptional.
  bTitle: string; bCompany: string; bOptional: string; bCountry: string; bCountryPh: string;
  bVat: string; bVatHelp: string; bVatNote: string; bSubmit: string; bBusy: string; bNoVat: string;
  buyErr: Record<BuyErr, string>;
};

const L: Record<string, Dict> = {
  en: {
    packages: 'Choose a partnership', alacarte: 'By the placement', getStarted: 'Get started', quote: 'Request a quote', from: 'from',
    popular: 'Most popular', secure: 'Secure checkout · cancel anytime',
    unit: { 'per month': '/ month', 'per year': '/ year', 'per feature': '/ feature', 'per send': '/ send', 'per event': '/ event' },
    founding: 'Founding rate', off: 'save', foundingNote: 'Founding launch — the first 100 businesses lock this rate for as long as they stay, even after prices rise. Prices shown exclude VAT.',
    formTitle: 'Request a quote', fName: 'Your name', fEmail: 'Your email', fCompany: 'Company (optional)', fMessage: 'What are you looking for? (optional)',
    send: 'Send enquiry', sending: 'Sending…', ok: "Thank you — we'll be in touch shortly.", err: 'Something went wrong. Please try again.', close: 'Close',
    successBanner: 'Thank you — your placement is confirmed. Welcome aboard.', cancelBanner: 'Checkout cancelled — no charge was made.',
    bTitle: 'Your details', bCompany: 'Company', bOptional: '(optional)', bCountry: 'Country', bCountryPh: 'Select your country',
    bVat: 'EU VAT number', bVatHelp: 'Leave empty if you are not VAT-registered.',
    bVatNote: 'Prices exclude VAT. VAT is added at checkout. Businesses in another EU country with a valid VAT number pay no VAT (reverse charge).',
    bSubmit: 'Continue to secure checkout', bBusy: 'One moment…', bNoVat: 'Continue without VAT number',
    buyErr: {
      email_required: 'Please enter a valid email address.',
      country_required: 'Please choose your country.',
      company_required: 'Please enter your company name when you give a VAT number.',
      vat_format: "This VAT number doesn't match the selected country or isn't in a valid format.",
      vat_invalid: 'This VAT number was not found in the EU VAT register (VIES). Check it, or leave it empty to continue — VAT will then be added.',
      vat_unverifiable: "We couldn't reach the EU VAT register right now. Try again in a minute, or continue without a VAT number (VAT will be added).",
    },
  },
  el: {
    packages: 'Επιλέξτε συνεργασία', alacarte: 'Ανά τοποθέτηση', getStarted: 'Ξεκινήστε', quote: 'Ζητήστε προσφορά', from: 'από',
    popular: 'Δημοφιλέστερο', secure: 'Ασφαλής πληρωμή · ακύρωση ανά πάσα στιγμή',
    unit: { 'per month': '/ μήνα', 'per year': '/ έτος', 'per feature': '/ αφιέρωμα', 'per send': '/ αποστολή', 'per event': '/ εκδήλωση' },
    founding: 'Τιμή ιδρυτικού μέλους', off: 'κερδίστε', foundingNote: 'Ιδρυτική προσφορά — οι πρώτες 100 επιχειρήσεις κλειδώνουν αυτή την τιμή για όσο παραμένουν, ακόμη κι όταν οι τιμές αυξηθούν. Οι τιμές δεν περιλαμβάνουν ΦΠΑ.',
    formTitle: 'Ζητήστε προσφορά', fName: 'Το όνομά σας', fEmail: 'Το email σας', fCompany: 'Εταιρεία (προαιρετικό)', fMessage: 'Τι αναζητάτε; (προαιρετικό)',
    send: 'Αποστολή', sending: 'Αποστολή…', ok: 'Ευχαριστούμε — θα επικοινωνήσουμε σύντομα.', err: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.', close: 'Κλείσιμο',
    successBanner: 'Ευχαριστούμε — η τοποθέτησή σας επιβεβαιώθηκε. Καλώς ήρθατε.', cancelBanner: 'Η πληρωμή ακυρώθηκε — δεν έγινε καμία χρέωση.',
    bTitle: 'Τα στοιχεία σας', bCompany: 'Εταιρεία', bOptional: '(προαιρετικό)', bCountry: 'Χώρα', bCountryPh: 'Επιλέξτε χώρα',
    bVat: 'Αριθμός ΦΠΑ ΕΕ', bVatHelp: 'Αφήστε το πεδίο κενό αν δεν είστε εγγεγραμμένοι στο ΦΠΑ.',
    bVatNote: 'Οι τιμές δεν περιλαμβάνουν ΦΠΑ. Ο ΦΠΑ προστίθεται κατά την πληρωμή. Επιχειρήσεις σε άλλη χώρα της ΕΕ με έγκυρο αριθμό ΦΠΑ δεν επιβαρύνονται με ΦΠΑ (αντίστροφη χρέωση).',
    bSubmit: 'Συνέχεια στην ασφαλή πληρωμή', bBusy: 'Μια στιγμή…', bNoVat: 'Συνέχεια χωρίς αριθμό ΦΠΑ',
    buyErr: {
      email_required: 'Εισαγάγετε μια έγκυρη διεύθυνση email.',
      country_required: 'Επιλέξτε τη χώρα σας.',
      company_required: 'Εισαγάγετε την επωνυμία της εταιρείας σας εφόσον δηλώνετε αριθμό ΦΠΑ.',
      vat_format: 'Αυτός ο αριθμός ΦΠΑ δεν ταιριάζει με την επιλεγμένη χώρα ή δεν έχει έγκυρη μορφή.',
      vat_invalid: 'Ο αριθμός ΦΠΑ δεν βρέθηκε στο μητρώο ΦΠΑ της ΕΕ (VIES). Ελέγξτε τον ή αφήστε το πεδίο κενό για να συνεχίσετε — θα προστεθεί ΦΠΑ.',
      vat_unverifiable: 'Δεν μπορέσαμε να συνδεθούμε με το μητρώο ΦΠΑ της ΕΕ αυτή τη στιγμή. Δοκιμάστε ξανά σε ένα λεπτό ή συνεχίστε χωρίς αριθμό ΦΠΑ (θα προστεθεί ΦΠΑ).',
    },
  },
  ro: {
    packages: 'Alegeți un parteneriat', alacarte: 'La bucată', getStarted: 'Începeți', quote: 'Cereți o ofertă', from: 'de la',
    popular: 'Cel mai popular', secure: 'Plată securizată · anulare oricând',
    unit: { 'per month': '/ lună', 'per year': '/ an', 'per feature': '/ articol', 'per send': '/ trimitere', 'per event': '/ eveniment' },
    founding: 'Tarif de fondator', off: 'economisiți', foundingNote: 'Lansare de fondatori — primele 100 de firme păstrează acest tarif cât timp rămân, chiar și după creșterea prețurilor. Prețurile nu includ TVA.',
    formTitle: 'Cereți o ofertă', fName: 'Numele dvs.', fEmail: 'Emailul dvs.', fCompany: 'Companie (opțional)', fMessage: 'Ce căutați? (opțional)',
    send: 'Trimiteți', sending: 'Se trimite…', ok: 'Mulțumim — vă contactăm în curând.', err: 'Ceva nu a mers. Încercați din nou.', close: 'Închideți',
    successBanner: 'Mulțumim — plasarea dvs. este confirmată. Bine ați venit.', cancelBanner: 'Plată anulată — nu s-a efectuat nicio taxare.',
    bTitle: 'Datele dvs.', bCompany: 'Companie', bOptional: '(opțional)', bCountry: 'Țara', bCountryPh: 'Selectați țara',
    bVat: 'Cod TVA intracomunitar', bVatHelp: 'Lăsați gol dacă nu sunteți înregistrat în scopuri de TVA.',
    bVatNote: 'Prețurile nu includ TVA. TVA-ul se adaugă la plată. Firmele din alt stat al UE cu un cod de TVA valid nu plătesc TVA (taxare inversă).',
    bSubmit: 'Continuați spre plata securizată', bBusy: 'Un moment…', bNoVat: 'Continuați fără cod de TVA',
    buyErr: {
      email_required: 'Introduceți o adresă de email validă.',
      country_required: 'Alegeți țara dvs.',
      company_required: 'Introduceți denumirea companiei dacă indicați un cod de TVA.',
      vat_format: 'Acest cod de TVA nu corespunde țării selectate sau nu are un format valid.',
      vat_invalid: 'Acest cod de TVA nu a fost găsit în registrul TVA al UE (VIES). Verificați-l sau lăsați câmpul gol pentru a continua — se va adăuga TVA.',
      vat_unverifiable: 'Momentan nu am putut contacta registrul TVA al UE. Încercați din nou peste un minut sau continuați fără cod de TVA (se va adăuga TVA).',
    },
  },
  ar: {
    packages: 'اختر شراكة', alacarte: 'حسب الموضع', getStarted: 'ابدأ الآن', quote: 'اطلب عرض سعر', from: 'من',
    popular: 'الأكثر رواجًا', secure: 'دفع آمن · يمكن الإلغاء في أي وقت',
    unit: { 'per month': '/ شهريًا', 'per year': '/ سنويًا', 'per feature': '/ مقال', 'per send': '/ إرسال', 'per event': '/ فعالية' },
    founding: 'سعر التأسيس', off: 'وفّر', foundingNote: 'إطلاق تأسيسي — أول 100 شركة تحتفظ بهذا السعر طوال بقائها، حتى بعد ارتفاع الأسعار. الأسعار لا تشمل ضريبة القيمة المضافة.',
    formTitle: 'اطلب عرض سعر', fName: 'اسمك', fEmail: 'بريدك الإلكتروني', fCompany: 'الشركة (اختياري)', fMessage: 'عمّا تبحث؟ (اختياري)',
    send: 'إرسال', sending: 'جارٍ الإرسال…', ok: 'شكرًا لك — سنتواصل معك قريبًا.', err: 'حدث خطأ ما. حاول مرة أخرى.', close: 'إغلاق',
    successBanner: 'شكرًا لك — تم تأكيد موضعك الإعلاني. أهلًا بك.', cancelBanner: 'تم إلغاء الدفع — لم يتم تحصيل أي مبلغ.',
    bTitle: 'بياناتك', bCompany: 'الشركة', bOptional: '(اختياري)', bCountry: 'الدولة', bCountryPh: 'اختر دولتك',
    bVat: 'رقم ضريبة القيمة المضافة في الاتحاد الأوروبي', bVatHelp: 'اتركه فارغًا إذا لم تكن مسجّلًا لأغراض ضريبة القيمة المضافة.',
    bVatNote: 'الأسعار لا تشمل ضريبة القيمة المضافة، وتُضاف عند إتمام الدفع. الشركات في دولة أخرى من الاتحاد الأوروبي ولديها رقم ضريبة قيمة مضافة صالح لا تدفع الضريبة (آلية الاحتساب العكسي).',
    bSubmit: 'المتابعة إلى الدفع الآمن', bBusy: 'لحظة من فضلك…', bNoVat: 'المتابعة بدون رقم ضريبة القيمة المضافة',
    buyErr: {
      email_required: 'أدخل عنوان بريد إلكتروني صالحًا.',
      country_required: 'اختر دولتك.',
      company_required: 'أدخل اسم شركتك عند إدخال رقم ضريبة القيمة المضافة.',
      vat_format: 'رقم ضريبة القيمة المضافة هذا لا يتطابق مع الدولة المختارة أو أن صيغته غير صالحة.',
      vat_invalid: 'لم يُعثر على رقم ضريبة القيمة المضافة هذا في سجل الاتحاد الأوروبي (VIES). تحقّق منه، أو اتركه فارغًا للمتابعة — وستُضاف الضريبة حينئذٍ.',
      vat_unverifiable: 'تعذّر الوصول إلى سجل ضريبة القيمة المضافة في الاتحاد الأوروبي حاليًا. حاول مجددًا بعد دقيقة، أو تابع بدون رقم ضريبة القيمة المضافة (وستُضاف الضريبة).',
    },
  },
  de: {
    packages: 'Partnerschaft wählen', alacarte: 'Nach Platzierung', getStarted: 'Loslegen', quote: 'Angebot anfordern', from: 'ab',
    popular: 'Am beliebtesten', secure: 'Sichere Zahlung · jederzeit kündbar',
    unit: { 'per month': '/ Monat', 'per year': '/ Jahr', 'per feature': '/ Beitrag', 'per send': '/ Versand', 'per event': '/ Event' },
    founding: 'Gründerpreis', off: 'sparen', foundingNote: 'Gründungsaktion — die ersten 100 Unternehmen sichern sich diesen Preis, solange sie dabeibleiben, auch nach Preiserhöhungen. Preise zzgl. MwSt.',
    formTitle: 'Angebot anfordern', fName: 'Ihr Name', fEmail: 'Ihre E-Mail', fCompany: 'Firma (optional)', fMessage: 'Wonach suchen Sie? (optional)',
    send: 'Anfrage senden', sending: 'Wird gesendet…', ok: 'Vielen Dank — wir melden uns in Kürze.', err: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.', close: 'Schließen',
    successBanner: 'Vielen Dank — Ihre Platzierung ist bestätigt. Willkommen an Bord.', cancelBanner: 'Zahlung abgebrochen — es wurde nichts berechnet.',
    bTitle: 'Ihre Angaben', bCompany: 'Firma', bOptional: '(optional)', bCountry: 'Land', bCountryPh: 'Land auswählen',
    bVat: 'EU-USt-IdNr.', bVatHelp: 'Leer lassen, wenn Sie nicht umsatzsteuerlich registriert sind.',
    bVatNote: 'Preise zzgl. MwSt. Die MwSt. wird beim Bezahlen hinzugerechnet. Unternehmen in einem anderen EU-Land mit gültiger USt-IdNr. zahlen keine MwSt. (Reverse-Charge-Verfahren).',
    bSubmit: 'Weiter zur sicheren Zahlung', bBusy: 'Einen Moment…', bNoVat: 'Ohne USt-IdNr. fortfahren',
    buyErr: {
      email_required: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      country_required: 'Bitte wählen Sie Ihr Land aus.',
      company_required: 'Bitte geben Sie den Firmennamen an, wenn Sie eine USt-IdNr. angeben.',
      vat_format: 'Diese USt-IdNr. passt nicht zum gewählten Land oder hat kein gültiges Format.',
      vat_invalid: 'Diese USt-IdNr. wurde im EU-Register (VIES) nicht gefunden. Bitte prüfen Sie die Nummer oder lassen Sie das Feld leer, um fortzufahren — die MwSt. wird dann berechnet.',
      vat_unverifiable: 'Das EU-Register (VIES) ist derzeit nicht erreichbar. Bitte versuchen Sie es in einer Minute erneut oder fahren Sie ohne USt-IdNr. fort (die MwSt. wird dann berechnet).',
    },
  },
  pl: {
    packages: 'Wybierz partnerstwo', alacarte: 'Według miejsca', getStarted: 'Zacznij', quote: 'Poproś o wycenę', from: 'od',
    popular: 'Najpopularniejsze', secure: 'Bezpieczna płatność · rezygnacja w każdej chwili',
    unit: { 'per month': '/ miesiąc', 'per year': '/ rok', 'per feature': '/ artykuł', 'per send': '/ wysyłkę', 'per event': '/ wydarzenie' },
    founding: 'Cena założycielska', off: 'oszczędzasz', foundingNote: 'Oferta założycielska — pierwszych 100 firm zachowuje tę cenę tak długo, jak z nami pozostaną, nawet po podwyżkach. Ceny nie zawierają VAT.',
    formTitle: 'Poproś o wycenę', fName: 'Imię i nazwisko', fEmail: 'Twój e-mail', fCompany: 'Firma (opcjonalnie)', fMessage: 'Czego szukasz? (opcjonalnie)',
    send: 'Wyślij zapytanie', sending: 'Wysyłanie…', ok: 'Dziękujemy — wkrótce się odezwiemy.', err: 'Coś poszło nie tak. Spróbuj ponownie.', close: 'Zamknij',
    successBanner: 'Dziękujemy — Twoja emisja jest potwierdzona. Witamy na pokładzie.', cancelBanner: 'Płatność anulowana — nie pobrano żadnej opłaty.',
    bTitle: 'Dane do zamówienia', bCompany: 'Firma', bOptional: '(opcjonalnie)', bCountry: 'Kraj', bCountryPh: 'Wybierz kraj',
    bVat: 'Numer VAT UE', bVatHelp: 'Jeśli nie są Państwo zarejestrowani jako podatnik VAT, proszę pozostawić to pole puste.',
    bVatNote: 'Ceny nie zawierają VAT. VAT zostanie doliczony przy płatności. Firmy z innego kraju UE z ważnym numerem VAT nie płacą VAT (odwrotne obciążenie).',
    bSubmit: 'Przejdź do bezpiecznej płatności', bBusy: 'Chwileczkę…', bNoVat: 'Kontynuuj bez numeru VAT',
    buyErr: {
      email_required: 'Proszę podać prawidłowy adres e-mail.',
      country_required: 'Proszę wybrać kraj.',
      company_required: 'Proszę podać nazwę firmy, jeśli podają Państwo numer VAT.',
      vat_format: 'Ten numer VAT nie pasuje do wybranego kraju lub ma nieprawidłowy format.',
      vat_invalid: 'Nie znaleziono tego numeru VAT w unijnym rejestrze VAT (VIES). Proszę go sprawdzić lub pozostawić pole puste, aby kontynuować — VAT zostanie wtedy doliczony.',
      vat_unverifiable: 'Nie udało się teraz połączyć z unijnym rejestrem VAT. Proszę spróbować ponownie za minutę lub kontynuować bez numeru VAT (VAT zostanie doliczony).',
    },
  },
  ru: {
    packages: 'Выберите партнёрство', alacarte: 'По размещению', getStarted: 'Начать', quote: 'Запросить смету', from: 'от',
    popular: 'Самое популярное', secure: 'Безопасная оплата · отмена в любой момент',
    unit: { 'per month': '/ месяц', 'per year': '/ год', 'per feature': '/ материал', 'per send': '/ выпуск', 'per event': '/ событие' },
    founding: 'Тариф основателя', off: 'экономия', foundingNote: 'Стартовое предложение — первые 100 компаний сохраняют этот тариф, пока остаются с нами, даже после повышения цен. Цены без НДС.',
    formTitle: 'Запросить смету', fName: 'Ваше имя', fEmail: 'Ваш e-mail', fCompany: 'Компания (необязательно)', fMessage: 'Что вы ищете? (необязательно)',
    send: 'Отправить запрос', sending: 'Отправка…', ok: 'Спасибо — мы скоро свяжемся с вами.', err: 'Что-то пошло не так. Попробуйте ещё раз.', close: 'Закрыть',
    successBanner: 'Спасибо — ваше размещение подтверждено. Добро пожаловать.', cancelBanner: 'Оплата отменена — списание не производилось.',
    bTitle: 'Ваши данные', bCompany: 'Компания', bOptional: '(необязательно)', bCountry: 'Страна', bCountryPh: 'Выберите страну',
    bVat: 'Номер плательщика НДС в ЕС', bVatHelp: 'Оставьте поле пустым, если вы не зарегистрированы как плательщик НДС.',
    bVatNote: 'Цены указаны без НДС. НДС добавляется при оплате. Компании из другой страны ЕС с действующим номером плательщика НДС налог не уплачивают (обратное начисление).',
    bSubmit: 'Перейти к безопасной оплате', bBusy: 'Подождите…', bNoVat: 'Продолжить без номера НДС',
    buyErr: {
      email_required: 'Введите корректный адрес e-mail.',
      country_required: 'Выберите страну.',
      company_required: 'Укажите название компании, если вводите номер плательщика НДС.',
      vat_format: 'Этот номер НДС не соответствует выбранной стране или имеет неверный формат.',
      vat_invalid: 'Этот номер НДС не найден в реестре плательщиков НДС ЕС (VIES). Проверьте его или оставьте поле пустым, чтобы продолжить — тогда НДС будет добавлен.',
      vat_unverifiable: 'Сейчас не удалось связаться с реестром НДС ЕС. Повторите попытку через минуту или продолжите без номера НДС (НДС будет добавлен).',
    },
  },
};

const GOLD = '#C9A24C';

export default function AdvertiseFunnel({ items, locale = 'en', status }: { items: RateItem[]; locale?: string; status?: string }) {
  const d = L[locale] || L.en;
  const nf = numberFormatter(locale, { maximumFractionDigits: 0 });
  const packages = items.filter((i) => i.kind === 'package');
  const alacarte = items.filter((i) => i.kind !== 'package');

  const [quoteFor, setQuoteFor] = useState<RateItem | null>(null);
  const [buyFor, setBuyFor] = useState<RateItem | null>(null);
  const [banner, setBanner] = useState<string | null>(
    status === 'success' ? d.successBanner : status === 'cancel' ? d.cancelBanner : null,
  );

  function priceText(i: RateItem): string {
    if (i.price_from == null) return '';
    const unit = i.unit ? (d.unit[i.unit] || '') : '';
    if (i.price_to != null) return `€${nf.format(i.price_from)}–${nf.format(i.price_to)} ${unit}`.trim();
    const prefix = i.slot === 'tier-partner' ? `${d.from} ` : '';
    return `${prefix}€${nf.format(i.price_from)} ${unit}`.trim();
  }
  function rackText(i: RateItem): string {
    if (i.list_price == null) return '';
    const unit = i.unit ? (d.unit[i.unit] || '') : '';
    return `€${nf.format(i.list_price)} ${unit}`.trim();
  }
  function savePct(i: RateItem): number | null {
    if (i.list_price == null || i.price_from == null || i.list_price <= i.price_from) return null;
    return Math.round((1 - i.price_from / i.list_price) * 100);
  }
  const hasFounding = items.some((i) => savePct(i) != null);

  return (
    <div>
      {banner ? (
        <div role="status" style={{
          margin: '0 0 24px', padding: '12px 16px', borderRadius: 6,
          background: status === 'success' ? 'rgba(78,122,70,.12)' : 'rgba(192,73,46,.10)',
          border: `1px solid ${status === 'success' ? '#4E7A46' : '#C0492E'}`, color: 'var(--ink, #171922)',
        }}>
          {banner} <button onClick={() => setBanner(null)} aria-label={d.close}
            style={{ float: 'inline-end', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft,#8a8371)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      ) : null}

      {hasFounding ? (
        <div style={{ margin: '0 0 24px', padding: '10px 16px', borderRadius: 6, background: 'rgba(201,162,76,.10)', border: `1px solid ${GOLD}`, color: 'var(--ink, #171922)', fontSize: 14, display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--gold-deep, #a9832f)', textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 12, whiteSpace: 'nowrap' }}>{d.founding}</span>
          <span style={{ flex: 1 }}>{d.foundingNote}</span>
        </div>
      ) : null}

      {/* Packages */}
      {packages.length ? (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>{d.packages}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {packages.map((i) => {
              const featured = i.slot === 'tier-featured';
              return (
                <div key={i.slot} style={{
                  position: 'relative', display: 'flex', flexDirection: 'column',
                  border: `1px solid ${featured ? GOLD : 'var(--line, #e3d9c4)'}`, borderRadius: 8, padding: '22px 20px',
                  background: featured ? 'rgba(201,162,76,.05)' : 'var(--paper, #fff)',
                }}>
                  {featured ? (
                    <span style={{ position: 'absolute', top: -11, insetInlineStart: 20, background: GOLD, color: '#0B0E11', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999 }}>{d.popular}</span>
                  ) : null}
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--gold-deep, #a9832f)' }}>{i.label}</div>
                  {savePct(i) != null ? (
                    <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--gold-deep, #a9832f)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{d.founding} · {d.off} {savePct(i)}%</div>
                  ) : null}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', margin: savePct(i) != null ? '2px 0 2px' : '8px 0 2px' }}>
                    <span style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: 30, fontWeight: 600, color: 'var(--ink, #171922)' }}>{priceText(i)}</span>
                    {savePct(i) != null ? <s style={{ fontSize: 16, color: 'var(--ink-soft, #8a8371)' }}>{rackText(i)}</s> : null}
                  </div>
                  {i.format ? <div style={{ fontSize: 13, color: 'var(--ink-soft, #8a8371)' }}>{i.format}</div> : null}
                  {i.blurb ? <p style={{ fontSize: 14, color: 'var(--ink-soft, #5b5647)', lineHeight: 1.5, margin: '12px 0 0', flex: 1 }}>{i.blurb}</p> : <div style={{ flex: 1 }} />}
                  <button
                    onClick={() => (i.self_serve ? setBuyFor(i) : setQuoteFor(i))}
                    className="btn"
                    style={{ marginTop: 18, width: '100%', background: featured ? GOLD : 'var(--obsidian, #0B0E11)', color: featured ? '#0B0E11' : '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer', fontWeight: 600 }}>
                    {i.self_serve ? d.getStarted : d.quote}
                  </button>
                  {i.self_serve ? <div style={{ fontSize: 11, color: 'var(--ink-soft, #8a8371)', textAlign: 'center', marginTop: 8 }}>{d.secure}</div> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* À la carte */}
      {alacarte.length ? (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>{d.alacarte}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {alacarte.map((i) => (
              <div key={i.slot} style={{ border: '1px solid var(--line, #e3d9c4)', borderRadius: 6, padding: '16px 16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 700, color: 'var(--ink, #171922)' }}>{i.label}</div>
                {i.format ? <div style={{ fontSize: 12.5, color: 'var(--ink-soft, #8a8371)', margin: '2px 0 8px' }}>{i.format}</div> : null}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 18, color: 'var(--ink, #171922)' }}>{priceText(i)}</span>
                  {savePct(i) != null ? <s style={{ fontSize: 13, color: 'var(--ink-soft, #8a8371)' }}>{rackText(i)}</s> : null}
                </div>
                {savePct(i) != null ? <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--gold-deep, #a9832f)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{d.founding} · {d.off} {savePct(i)}%</div> : null}
                {i.blurb ? <p style={{ fontSize: 13, color: 'var(--ink-soft, #5b5647)', lineHeight: 1.5, margin: '0 0 12px', flex: 1 }}>{i.blurb}</p> : <div style={{ flex: 1 }} />}
                <button
                  onClick={() => (i.self_serve ? setBuyFor(i) : setQuoteFor(i))}
                  style={{ background: 'transparent', border: `1px solid ${i.self_serve ? GOLD : 'var(--line, #d9cfb8)'}`, color: 'var(--ink, #171922)', borderRadius: 4, padding: '9px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {i.self_serve ? d.getStarted : d.quote}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {quoteFor ? <QuoteModal item={quoteFor} locale={locale} d={d} onClose={() => setQuoteFor(null)} /> : null}
      {buyFor ? (
        <BuyModal item={buyFor} locale={locale} d={d} onClose={() => setBuyFor(null)}
          onQuote={(i) => { setBuyFor(null); setQuoteFor(i); }} />
      ) : null}
    </div>
  );
}

function QuoteModal({ item, locale, d, onClose }: { item: RateItem; locale: string; d: Dict; onClose: () => void }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  // `company` is a REAL, visible field (stored on the lead) — it must never double as the
  // spam trap. The trap is the separate hidden `hp` value below (see lib/honeypot.ts).
  const [f, setF] = useState({ name: '', email: '', company: '', message: '' });
  const [hp, setHp] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit() {
    if (!f.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) { setState('err'); return; }
    setState('sending');
    try {
      const res = await fetch('/api/advertise/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, [HONEYPOT_FIELD]: hp, slot: item.slot, label: item.label, locale }),
      });
      const j = await res.json().catch(() => ({}));
      setState(j.ok ? 'ok' : 'err');
    } catch { setState('err'); }
  }

  const input: React.CSSProperties = { width: '100%', padding: '11px 12px', border: '1px solid var(--line, #d9cfb8)', borderRadius: 6, fontSize: 15, marginTop: 10, background: 'var(--paper,#fff)', color: 'var(--ink,#171922)' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,14,17,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ background: 'var(--paper, #fff)', borderRadius: 10, maxWidth: 460, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--disp, Georgia, serif)', fontSize: 22 }}>{d.formTitle}</h3>
          <button onClick={onClose} aria-label={d.close} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink-soft,#8a8371)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--gold-deep, #a9832f)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>{item.label}</div>

        {state === 'ok' ? (
          <p style={{ margin: '18px 0 0', color: 'var(--ink, #171922)' }}>{d.ok}</p>
        ) : (
          <>
            <input style={input} placeholder={d.fName} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input style={input} type="email" placeholder={d.fEmail} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input style={input} placeholder={d.fCompany} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
            <textarea style={{ ...input, minHeight: 84, resize: 'vertical' }} placeholder={d.fMessage} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            {/* honeypot — hidden spam trap the server checks (lib/ratelimit.ts isHoneypot) */}
            <HoneypotField value={hp} onChange={setHp} />
            {state === 'err' ? <p style={{ color: '#C0492E', fontSize: 13, margin: '10px 0 0' }}>{d.err}</p> : null}
            <button onClick={submit} disabled={state === 'sending'} className="btn"
              style={{ marginTop: 14, width: '100%', background: GOLD, color: '#0B0E11', border: 'none', padding: '12px 16px', cursor: 'pointer', fontWeight: 600 }}>
              {state === 'sending' ? d.sending : d.send}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Self-serve purchase ──────────────────────────────────────────────────────────────────────────
// Collects what the server needs to price VAT correctly — the buyer's country and, for an EU business, its
// VAT number, which the server checks against VIES before it creates any checkout — then hands over to Stripe.
// Same look and RTL behaviour as QuoteModal (direction comes from <html dir>, spacing uses logical
// properties); only the always-Latin inputs (email, VAT number) are pinned to dir="ltr" so their punctuation
// cannot be reordered inside an Arabic page.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ERR_RED = '#B03E26'; // darker than the banner's #C0492E so small error text keeps AA contrast on --paper

function BuyModal({ item, locale, d, onClose, onQuote }: {
  item: RateItem; locale: string; d: Dict; onClose: () => void; onQuote: (item: RateItem) => void;
}) {
  const rtl = dirOf(locale as Locale) === 'rtl';
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [f, setF] = useState({ email: '', name: '', company: '', country: '', vatId: '' });
  const [hp, setHp] = useState(''); // hidden spam trap, same as QuoteModal (lib/honeypot.ts)
  const [sending, setSending] = useState(false);
  // A new object per failure, so the same error twice in a row still re-runs the focus effect below.
  const [err, setErr] = useState<{ code: BuyErr | 'generic' } | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLSelectElement>(null);
  const vatRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const inflight = useRef<AbortController | null>(null); // set while a request is out (and while the browser leaves for Stripe)
  const downOnBackdrop = useRef(false);

  const euCountry = isEuMemberState(f.country);
  const vatGiven = euCountry && f.vatId.trim() !== '';

  // Every country, named in the visitor's language and sorted by that language's own collation. Built once per
  // locale (not on every keystroke); the value sent is always the ISO code.
  const countryOptions = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try { names = new Intl.DisplayNames([locale], { type: 'region' }); } catch { /* no region names here → show the codes */ }
    const rows = COUNTRY_CODES.map((code) => {
      let name = code;
      try { name = names?.of(code) || code; } catch { /* keep the code */ }
      return { code, name };
    });
    try { rows.sort((a, b) => a.name.localeCompare(b.name, locale)); } catch { rows.sort((a, b) => a.name.localeCompare(b.name)); }
    return rows.map((c) => <option key={c.code} value={c.code} style={{ color: 'var(--ink,#171922)' }}>{c.name}</option>);
  }, [locale]);

  // Open: focus the first field. Close: hand focus back to the button that opened us and drop a request still out.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    emailRef.current?.focus();
    return () => { inflight.current?.abort(); opener?.focus?.(); };
  }, []);

  // Escape closes; Tab / Shift+Tab stay inside the dialog (it is aria-modal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const root = dialogRef.current;
      if (e.key !== 'Tab' || !root) return;
      const tabbable = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button'))
        .filter((n) => !n.disabled && n.tabIndex >= 0); // the honeypot has tabIndex -1
      if (!tabbable.length) return;
      const at = document.activeElement;
      const lost = !root.contains(at);
      if (e.shiftKey ? lost || at === tabbable[0] : lost || at === tabbable[tabbable.length - 1]) {
        e.preventDefault();
        tabbable[e.shiftKey ? tabbable.length - 1 : 0].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Back/forward cache: returning from the payment page can restore this page exactly as it was, with the
  // submit button still disabled — re-arm it.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) { inflight.current = null; setSending(false); } };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const msg = err ? (err.code === 'generic' ? d.err : d.buyErr[err.code]) : '';
  const errField: BuyField | null = err && err.code !== 'generic' ? ERR_FIELD[err.code] : null;

  // After a failed attempt, focus the input the message is about; otherwise bring focus back to the submit
  // button (browsers drop focus from a button that was disabled while the request ran).
  useEffect(() => {
    if (!err) return;
    const field = err.code === 'generic' ? null : ERR_FIELD[err.code];
    const target = field === 'email' ? emailRef.current : field === 'company' ? companyRef.current
      : field === 'country' ? countryRef.current : field === 'vatId' ? vatRef.current
      : dialogRef.current?.contains(document.activeElement) ? null : submitRef.current;
    target?.focus();
  }, [err]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setF((p) => ({ ...p, [k]: v }));
    setErr(null);
  };

  async function submit(skipVat = false) {
    if (inflight.current) return;
    const email = f.email.trim(), name = f.name.trim(), company = f.company.trim();
    const vatId = skipVat || !euCountry ? '' : f.vatId.trim(); // a number typed before switching to a non-EU country is not sent
    // The same checks — and the same codes — as the server, so a mistake gets the same message either way.
    const bad: BuyErr | null = !EMAIL_RE.test(email) ? 'email_required'
      : !f.country ? 'country_required'
      : vatId && !company ? 'company_required' : null;
    if (bad) { setErr({ code: bad }); return; }

    const ctl = new AbortController();
    inflight.current = ctl;
    setErr(null);
    setSending(true);
    try {
      const body: Record<string, string> = { slot: item.slot, locale, email, country: f.country, [HONEYPOT_FIELD]: hp };
      if (name) body.name = name;
      if (company) body.company = company;
      if (vatId) body.vatId = vatId;
      const res = await fetch('/api/advertise/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal,
      });
      const j: { ok?: boolean; url?: string; error?: string; quote?: boolean } = await res.json().catch(() => ({}));
      if (ctl.signal.aborted) return; // closed while the request was out
      if (j.ok && j.url) { window.location.href = j.url; return; } // stay disabled while the browser navigates away
      if (j.quote || j.error === 'quote') { onQuote(item); return; } // placement is by quote (or Stripe not live) → enquiry form
      setErr({ code: isBuyErr(j.error) ? j.error : 'generic' });
    } catch {
      if (ctl.signal.aborted) return;
      setErr({ code: 'generic' });
    }
    inflight.current = null;
    setSending(false);
  }

  // "Continue without VAT number" (after vat_unverifiable): clear the field and go again without it.
  function skipVat() {
    setF((p) => ({ ...p, vatId: '' }));
    void submit(true);
  }

  // 16px (QuoteModal uses 15): below 16px iOS Safari zooms the page in when a field is focused.
  const input: React.CSSProperties = { width: '100%', padding: '11px 12px', border: '1px solid var(--line, #d9cfb8)', borderRadius: 6, fontSize: 16, marginTop: 6, background: 'var(--paper,#fff)', color: 'var(--ink,#171922)' };
  // The flagged input swaps the whole `border` shorthand (React warns when a shorthand and a longhand are mixed).
  const box = (field: BuyField, latin = false): React.CSSProperties => ({
    ...input, ...(latin ? { textAlign: rtl ? 'right' : 'left' } : null), ...(errField === field ? { border: `1px solid ${ERR_RED}` } : null),
  });
  const label: React.CSSProperties = { display: 'block', marginTop: 14, fontSize: 13, color: 'var(--ink, #171922)' };
  const optional: React.CSSProperties = { color: 'var(--ink-soft, #5b5647)' };
  const aria = (field: BuyField) => (errField === field ? { 'aria-invalid': true as const, 'aria-describedby': id('err') } : {});
  // The one live error message: right under the input it is about, or above the buttons when it is about the form.
  const alertAt = (field: BuyField | null) => (err && errField === field ? (
    <p id={id('err')} role="alert" style={{ color: ERR_RED, fontSize: 13, lineHeight: 1.45, margin: field ? '6px 0 0' : '12px 0 0' }}>{msg}</p>
  ) : null);
  const button: React.CSSProperties = { width: '100%', justifyContent: 'center', textAlign: 'center', fontWeight: 600, ...(rtl ? { letterSpacing: 'normal' } : null) };

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (downOnBackdrop.current && e.target === e.currentTarget) onClose(); }} // a drag that ends on the backdrop is not a click on it
      style={{ position: 'fixed', inset: 0, background: 'rgba(11,14,17,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={id('title')}
        style={{ position: 'relative', background: 'var(--paper, #fff)', borderRadius: 10, maxWidth: 460, width: '100%', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h3 id={id('title')} style={{ margin: 0, fontFamily: rtl ? 'var(--arabic-display, Georgia, serif)' : 'var(--disp, Georgia, serif)', fontSize: 22 }}>{d.bTitle}</h3>
          <button type="button" onClick={onClose} aria-label={d.close} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink-soft,#8a8371)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--gold-deep, #a9832f)', textTransform: 'uppercase', letterSpacing: rtl ? 'normal' : '.06em', marginTop: 4 }}>{item.label}</div>

        <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label htmlFor={id('email')} style={label}>{d.fEmail}</label>
          <input id={id('email')} ref={emailRef} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            maxLength={254} dir="ltr" required value={f.email} onChange={set('email')} {...aria('email')} style={box('email', true)} />
          {alertAt('email')}

          <label htmlFor={id('name')} style={label}>{d.fName} <span style={optional}>{d.bOptional}</span></label>
          <input id={id('name')} name="name" autoComplete="name" maxLength={120} value={f.name} onChange={set('name')} style={input} />

          <label htmlFor={id('company')} style={label}>{d.bCompany}{vatGiven ? null : <span style={optional}> {d.bOptional}</span>}</label>
          <input id={id('company')} ref={companyRef} name="company" autoComplete="organization" maxLength={160}
            required={vatGiven} value={f.company} onChange={set('company')} {...aria('company')} style={box('company')} />
          {alertAt('company')}

          <label htmlFor={id('country')} style={label}>{d.bCountry}</label>
          <select id={id('country')} ref={countryRef} name="country" autoComplete="country" required value={f.country} onChange={set('country')}
            {...aria('country')} style={{ ...box('country'), color: f.country ? 'var(--ink,#171922)' : 'var(--ink-soft,#5b5647)' }}>
            <option value="" disabled>{d.bCountryPh}</option>
            {countryOptions}
          </select>
          {alertAt('country')}

          {euCountry ? (
            <>
              <label htmlFor={id('vat')} style={label}>{d.bVat}<span style={optional}> {d.bOptional}</span></label>
              <input id={id('vat')} ref={vatRef} name="vatId" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                maxLength={40} dir="ltr" value={f.vatId} onChange={set('vatId')}
                aria-invalid={errField === 'vatId' || undefined}
                aria-describedby={errField === 'vatId' ? `${id('vat-help')} ${id('err')}` : id('vat-help')}
                style={box('vatId', true)} />
              <p id={id('vat-help')} style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.45, color: 'var(--ink-soft, #5b5647)' }}>{d.bVatHelp}</p>
              {alertAt('vatId')}
            </>
          ) : null}

          {/* honeypot — hidden spam trap the server checks (lib/ratelimit.ts isHoneypot) */}
          <HoneypotField value={hp} onChange={setHp} />

          <p style={{ margin: '18px 0 0', padding: '10px 12px', borderRadius: 6, background: 'rgba(201,162,76,.08)', border: '1px solid rgba(201,162,76,.45)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-soft, #5b5647)' }}>{d.bVatNote}</p>
          {alertAt(null)}

          <button ref={submitRef} type="submit" disabled={sending} className="btn"
            style={{ ...button, marginTop: 14, background: GOLD, color: '#0B0E11', border: 'none', padding: '12px 16px', cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.7 : 1 }}>
            {sending ? d.bBusy : d.bSubmit}
          </button>
          {err?.code === 'vat_unverifiable' ? (
            <button type="button" onClick={skipVat} className="btn"
              style={{ ...button, marginTop: 10, background: 'transparent', color: 'var(--ink, #171922)', border: '1px solid var(--line, #d9cfb8)', padding: '11px 16px', cursor: 'pointer' }}>
              {d.bNoVat}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
