import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { isLocale, type Locale } from '@/lib/locales';
import PrivacyRequestForm, { type PrivacyFormLabels } from '@/components/PrivacyRequestForm';

export const dynamic = 'force-static';

interface Content {
  title: string; intro: string;
  hSources: string; pSources: string;
  hAccuracy: string; pAccuracy: string;
  hRights: string; pRights: string;
  hAttribution: string; pAttribution: string;
  hForm: string;
  form: PrivacyFormLabels;
}

const C: Record<Locale, Content> = {
  en: {
    title: 'Where our information comes from',
    intro: 'Cyprus Lifestyle is an independent guide to the Republic of Cyprus. We believe you should know how our information is gathered and kept accurate, and how to correct or remove anything about you or your business.',
    hSources: 'Our sources', pSources: 'Our directory is compiled from publicly available information: official registries and government portals, businesses’ own websites and public contact details, reputable public listings and open data such as OpenStreetMap, and our editors’ own research and on-the-ground verification. Editorial articles are written by our team and clearly bylined.',
    hAccuracy: 'Keeping it accurate', pAccuracy: 'We verify details before publishing and correct them when they change. If you run a business we list, you can claim it and keep your own details, description and offers up to date through our partner portal at /partner — changes are reviewed before they go live.',
    hRights: 'Your privacy and your choices', pRights: 'We process personal data lawfully and hold a record of our processing activities. You can ask to see, correct, delete, port, or object to the processing of your data. Use the form below or email privacy@cypruslifestyle.eu, and we will respond within one month, as the law requires. See our Privacy Policy for full details.',
    hAttribution: 'Attribution', pAttribution: 'Map data © OpenStreetMap contributors, used under the Open Database License. Other trademarks and business names belong to their respective owners.',
    hForm: 'Make a data request',
    form: { kind: 'What would you like?', access: 'See the data you hold about me', erasure: 'Delete my data', correction: 'Correct my data', objection: 'Object to processing', portability: 'Get a copy to transfer', name: 'Your name (optional)', email: 'Your email', details: 'Details (which listing, what to change, …)', submit: 'Submit request', sending: 'Submitting…' },
  },
  el: {
    title: 'Από πού προέρχονται οι πληροφορίες μας',
    intro: 'Το Cyprus Lifestyle είναι ένας ανεξάρτητος οδηγός για την Κυπριακή Δημοκρατία. Πιστεύουμε ότι πρέπει να γνωρίζετε πώς συλλέγονται και διατηρούνται ακριβείς οι πληροφορίες μας, και πώς να διορθώσετε ή να αφαιρέσετε ό,τι αφορά εσάς ή την επιχείρησή σας.',
    hSources: 'Οι πηγές μας', pSources: 'Ο κατάλογός μας συντάσσεται από δημόσια διαθέσιμες πληροφορίες: επίσημα μητρώα και κυβερνητικές πύλες, τους ιστότοπους και τα δημόσια στοιχεία επικοινωνίας των ίδιων των επιχειρήσεων, αξιόπιστους δημόσιους καταλόγους και ανοικτά δεδομένα όπως το OpenStreetMap, καθώς και την έρευνα και την επιτόπια επαλήθευση των συντακτών μας. Τα άρθρα γράφονται από την ομάδα μας με σαφή υπογραφή.',
    hAccuracy: 'Διατήρηση της ακρίβειας', pAccuracy: 'Επαληθεύουμε τα στοιχεία πριν τη δημοσίευση και τα διορθώνουμε όταν αλλάζουν. Αν διαχειρίζεστε μια επιχείρηση που καταχωρούμε, μπορείτε να τη διεκδικήσετε και να ενημερώνετε τα στοιχεία, την περιγραφή και τις προσφορές σας μέσω της πύλης συνεργατών στο /partner — οι αλλαγές ελέγχονται πριν δημοσιευθούν.',
    hRights: 'Το απόρρητο και οι επιλογές σας', pRights: 'Επεξεργαζόμαστε τα προσωπικά δεδομένα νόμιμα και τηρούμε αρχείο των δραστηριοτήτων επεξεργασίας. Μπορείτε να ζητήσετε πρόσβαση, διόρθωση, διαγραφή, φορητότητα ή να αντιταχθείτε στην επεξεργασία. Χρησιμοποιήστε τη φόρμα παρακάτω ή στείλτε email στο privacy@cypruslifestyle.eu και θα απαντήσουμε εντός ενός μηνός, όπως ορίζει ο νόμος.',
    hAttribution: 'Αναφορά πηγών', pAttribution: 'Δεδομένα χάρτη © συνεισφέροντες OpenStreetMap, βάσει της άδειας Open Database License. Τα υπόλοιπα εμπορικά σήματα και ονόματα ανήκουν στους κατόχους τους.',
    hForm: 'Υποβολή αιτήματος δεδομένων',
    form: { kind: 'Τι επιθυμείτε;', access: 'Να δω τα δεδομένα μου', erasure: 'Διαγραφή των δεδομένων μου', correction: 'Διόρθωση των δεδομένων μου', objection: 'Εναντίωση στην επεξεργασία', portability: 'Αντίγραφο για μεταφορά', name: 'Το όνομά σας (προαιρετικό)', email: 'Το email σας', details: 'Λεπτομέρειες (ποια καταχώρηση, τι αλλαγή…)', submit: 'Υποβολή', sending: 'Υποβολή…' },
  },
  ro: {
    title: 'De unde provin informațiile noastre',
    intro: 'Cyprus Lifestyle este un ghid independent al Republicii Cipru. Credem că trebuie să știți cum sunt colectate și menținute corecte informațiile noastre și cum puteți corecta sau elimina orice vă privește pe dumneavoastră sau afacerea dumneavoastră.',
    hSources: 'Sursele noastre', pSources: 'Directorul nostru este alcătuit din informații disponibile public: registre oficiale și portaluri guvernamentale, site-urile și datele de contact publice ale companiilor, liste publice de încredere și date deschise precum OpenStreetMap, plus cercetarea și verificarea pe teren a redactorilor noștri. Articolele sunt scrise de echipa noastră și semnate clar.',
    hAccuracy: 'Menținerea acurateței', pAccuracy: 'Verificăm detaliile înainte de publicare și le corectăm când se schimbă. Dacă administrați o afacere pe care o listăm, o puteți revendica și vă puteți actualiza datele, descrierea și ofertele prin portalul pentru parteneri la /partner — modificările sunt verificate înainte de publicare.',
    hRights: 'Confidențialitatea și opțiunile dvs.', pRights: 'Prelucrăm datele personale în mod legal și păstrăm o evidență a activităților de prelucrare. Puteți solicita acces, rectificare, ștergere, portabilitate sau vă puteți opune prelucrării. Folosiți formularul de mai jos sau scrieți la privacy@cypruslifestyle.eu și vom răspunde în termen de o lună, conform legii.',
    hAttribution: 'Atribuire', pAttribution: 'Date cartografice © contribuitorii OpenStreetMap, sub licența Open Database License. Celelalte mărci și denumiri aparțin proprietarilor lor.',
    hForm: 'Trimiteți o cerere privind datele',
    form: { kind: 'Ce doriți?', access: 'Să văd datele despre mine', erasure: 'Ștergerea datelor mele', correction: 'Corectarea datelor mele', objection: 'Opoziție la prelucrare', portability: 'O copie pentru transfer', name: 'Numele dvs. (opțional)', email: 'Email-ul dvs.', details: 'Detalii (ce listare, ce modificare…)', submit: 'Trimite cererea', sending: 'Se trimite…' },
  },
  ar: {
    title: 'من أين نحصل على معلوماتنا',
    intro: 'Cyprus Lifestyle دليل مستقل لجمهورية قبرص. نرى أنه من حقك أن تعرف كيف نجمع معلوماتنا ونحافظ على دقتها، وكيف يمكنك تصحيح أو إزالة أي معلومة تخصّك أو تخص نشاطك التجاري.',
    hSources: 'مصادرنا', pSources: 'يُجمع دليلنا من معلومات متاحة للعموم: السجلات الرسمية والبوابات الحكومية، والمواقع الإلكترونية وبيانات الاتصال العامة للشركات نفسها، والقوائم العامة الموثوقة والبيانات المفتوحة مثل OpenStreetMap، بالإضافة إلى بحث محرّرينا والتحقق الميداني. تُكتب المقالات من قبل فريقنا وتحمل توقيع الكاتب بوضوح.',
    hAccuracy: 'الحفاظ على الدقة', pAccuracy: 'نتحقق من التفاصيل قبل النشر ونصحّحها عند تغيّرها. إذا كنت تدير نشاطاً مُدرجاً لدينا، يمكنك المطالبة به وتحديث بياناتك ووصفك وعروضك عبر بوابة الشركاء على /partner — وتُراجَع التغييرات قبل نشرها.',
    hRights: 'خصوصيتك وخياراتك', pRights: 'نعالج البيانات الشخصية بشكل قانوني ونحتفظ بسجل لأنشطة المعالجة. يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها أو نقلها أو الاعتراض على معالجتها. استخدم النموذج أدناه أو راسلنا على privacy@cypruslifestyle.eu وسنرد خلال شهر واحد كما يقتضي القانون.',
    hAttribution: 'الإسناد', pAttribution: 'بيانات الخرائط © مساهمو OpenStreetMap، بموجب رخصة Open Database License. تعود العلامات والأسماء التجارية الأخرى لأصحابها.',
    hForm: 'تقديم طلب بشأن البيانات',
    form: { kind: 'ماذا تريد؟', access: 'الاطلاع على بياناتي', erasure: 'حذف بياناتي', correction: 'تصحيح بياناتي', objection: 'الاعتراض على المعالجة', portability: 'نسخة لنقلها', name: 'اسمك (اختياري)', email: 'بريدك الإلكتروني', details: 'التفاصيل (أي إدراج، وما التغيير…)', submit: 'إرسال الطلب', sending: 'جارٍ الإرسال…' },
  },
  de: {
    title: 'Woher unsere Informationen stammen',
    intro: 'Cyprus Lifestyle ist ein unabhängiger Führer für die Republik Zypern. Sie sollen wissen, wie wir unsere Informationen erheben und aktuell halten und wie Sie Angaben zu sich oder Ihrem Unternehmen korrigieren oder entfernen lassen können.',
    hSources: 'Unsere Quellen', pSources: 'Unser Verzeichnis wird aus öffentlich zugänglichen Informationen zusammengestellt: amtliche Register und Behördenportale, die Websites und öffentlichen Kontaktdaten der Unternehmen selbst, seriöse öffentliche Verzeichnisse und offene Daten wie OpenStreetMap sowie die Recherche und Vor-Ort-Prüfung unserer Redaktion. Artikel werden von unserem Team verfasst und klar namentlich gekennzeichnet.',
    hAccuracy: 'Aktualität sichern', pAccuracy: 'Wir prüfen Angaben vor der Veröffentlichung und korrigieren sie bei Änderungen. Wenn Sie ein von uns gelistetes Unternehmen führen, können Sie es beanspruchen und Ihre Daten, Beschreibung und Angebote über unser Partnerportal unter /partner aktuell halten — Änderungen werden vor der Freischaltung geprüft.',
    hRights: 'Ihre Privatsphäre und Ihre Wahl', pRights: 'Wir verarbeiten personenbezogene Daten rechtmäßig und führen ein Verzeichnis der Verarbeitungstätigkeiten. Sie können Auskunft, Berichtigung, Löschung, Übertragung verlangen oder der Verarbeitung widersprechen. Nutzen Sie das Formular unten oder schreiben Sie an privacy@cypruslifestyle.eu; wir antworten innerhalb eines Monats, wie gesetzlich vorgeschrieben.',
    hAttribution: 'Namensnennung', pAttribution: 'Kartendaten © OpenStreetMap-Mitwirkende, unter der Open Database License. Weitere Marken und Firmennamen gehören ihren jeweiligen Inhabern.',
    hForm: 'Datenanfrage stellen',
    form: { kind: 'Was möchten Sie?', access: 'Meine Daten einsehen', erasure: 'Meine Daten löschen', correction: 'Meine Daten berichtigen', objection: 'Der Verarbeitung widersprechen', portability: 'Kopie zur Übertragung', name: 'Ihr Name (optional)', email: 'Ihre E-Mail', details: 'Details (welcher Eintrag, was ändern…)', submit: 'Anfrage senden', sending: 'Wird gesendet…' },
  },
  pl: {
    title: 'Skąd pochodzą nasze informacje',
    intro: 'Cyprus Lifestyle to niezależny przewodnik po Republice Cypryjskiej. Uważamy, że powinieneś wiedzieć, jak zbieramy i aktualizujemy nasze informacje oraz jak poprawić lub usunąć dane dotyczące Ciebie lub Twojej firmy.',
    hSources: 'Nasze źródła', pSources: 'Nasz katalog powstaje z informacji publicznie dostępnych: oficjalnych rejestrów i portali rządowych, stron internetowych i publicznych danych kontaktowych samych firm, wiarygodnych publicznych spisów oraz danych otwartych, takich jak OpenStreetMap, a także badań i weryfikacji terenowej naszej redakcji. Artykuły pisze nasz zespół i są wyraźnie podpisane.',
    hAccuracy: 'Dbałość o dokładność', pAccuracy: 'Weryfikujemy dane przed publikacją i poprawiamy je, gdy się zmieniają. Jeśli prowadzisz firmę, którą wymieniamy, możesz ją przejąć i aktualizować swoje dane, opis i oferty przez portal partnera pod adresem /partner — zmiany są sprawdzane przed publikacją.',
    hRights: 'Twoja prywatność i wybory', pRights: 'Przetwarzamy dane osobowe zgodnie z prawem i prowadzimy rejestr czynności przetwarzania. Możesz zażądać dostępu, sprostowania, usunięcia, przeniesienia lub sprzeciwić się przetwarzaniu. Skorzystaj z formularza poniżej lub napisz na privacy@cypruslifestyle.eu, a odpowiemy w ciągu miesiąca, zgodnie z prawem.',
    hAttribution: 'Atrybucja', pAttribution: 'Dane map © współtwórcy OpenStreetMap, na licencji Open Database License. Pozostałe znaki i nazwy należą do ich właścicieli.',
    hForm: 'Złóż wniosek dotyczący danych',
    form: { kind: 'Czego potrzebujesz?', access: 'Zobaczyć moje dane', erasure: 'Usunąć moje dane', correction: 'Poprawić moje dane', objection: 'Sprzeciw wobec przetwarzania', portability: 'Kopia do przeniesienia', name: 'Twoje imię (opcjonalnie)', email: 'Twój e-mail', details: 'Szczegóły (który wpis, co zmienić…)', submit: 'Wyślij wniosek', sending: 'Wysyłanie…' },
  },
  ru: {
    title: 'Откуда мы берём информацию',
    intro: 'Cyprus Lifestyle — независимый путеводитель по Республике Кипр. Мы считаем, что вы должны знать, как мы собираем и поддерживаем точность информации и как исправить или удалить сведения о вас или вашем бизнесе.',
    hSources: 'Наши источники', pSources: 'Наш каталог составляется из общедоступной информации: официальных реестров и государственных порталов, сайтов и публичных контактов самих компаний, надёжных публичных справочников и открытых данных, таких как OpenStreetMap, а также исследований и проверки на месте нашей редакцией. Статьи пишет наша команда и они снабжены подписью автора.',
    hAccuracy: 'Поддержание точности', pAccuracy: 'Мы проверяем данные перед публикацией и исправляем их при изменениях. Если вы управляете указанным у нас бизнесом, вы можете подтвердить право на него и обновлять свои данные, описание и предложения через партнёрский портал по адресу /partner — изменения проверяются перед публикацией.',
    hRights: 'Ваша конфиденциальность и выбор', pRights: 'Мы обрабатываем персональные данные законно и ведём реестр операций обработки. Вы можете запросить доступ, исправление, удаление, перенос данных или возразить против обработки. Воспользуйтесь формой ниже или напишите на privacy@cypruslifestyle.eu — мы ответим в течение одного месяца, как требует закон.',
    hAttribution: 'Атрибуция', pAttribution: 'Картографические данные © участники OpenStreetMap, по лицензии Open Database License. Прочие товарные знаки и названия принадлежат их владельцам.',
    hForm: 'Отправить запрос по данным',
    form: { kind: 'Что вы хотите?', access: 'Посмотреть мои данные', erasure: 'Удалить мои данные', correction: 'Исправить мои данные', objection: 'Возразить против обработки', portability: 'Копию для переноса', name: 'Ваше имя (необязательно)', email: 'Ваш email', details: 'Подробности (какая запись, что изменить…)', submit: 'Отправить запрос', sending: 'Отправка…' },
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : 'en') as Locale;
  return { title: `${C[l].title} · Cyprus Lifestyle`, description: C[l].intro };
}

export default async function SourcingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : 'en') as Locale;
  setRequestLocale(l);
  const c = C[l];
  const rtl = l === 'ar';
  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '40px 16px' }} dir={rtl ? 'rtl' : 'ltr'}>
      <h1>{c.title}</h1>
      <p className="sub">{c.intro}</p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>{c.hSources}</h2>
      <p>{c.pSources}</p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>{c.hAccuracy}</h2>
      <p>{c.pAccuracy}</p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>{c.hRights}</h2>
      <p>{c.pRights}</p>
      <h2 style={{ fontSize: 20, marginTop: 28 }}>{c.hForm}</h2>
      <PrivacyRequestForm labels={c.form} locale={l} />
      <h2 style={{ fontSize: 16, marginTop: 36, opacity: .85 }}>{c.hAttribution}</h2>
      <p className="sub">{c.pAttribution}</p>
    </article>
  );
}
