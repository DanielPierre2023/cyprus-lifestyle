// lib/member/lifecycleCopy.ts
// The two member lifecycle e-mails, in the seven editions (en el ro ar de pl ru):
//   grace — "there is a problem with your payment; access continues until {date}"   (sent once when a membership enters the grace period)
//   ended — "your membership has ended; this is what stops, this is how to rejoin"   (sent once when the benefits stop)
// A typed module, not messages/*.json; scripts/tests/member.lifecycle.test.ts enforces parity (every key, no empties, same
// {placeholders}). Truth in advertising: the lists below name only things the code really switches off (lane, card, member-level
// answers) and the real data rule (preferences erased {days} days after the end). Non-English text needs native review.
import type { Locale } from '@/lib/locales';

export interface LifecycleCopy {
  graceSubject: string; graceHeading: string; graceBody: string; graceHow: string; graceCta: string; graceFoot: string;
  endedSubject: string; endedHeading: string; endedBody: string; endedStops: string; endedKept: string; endedRejoin: string; endedCta: string; endedFoot: string;
}

const COPY: Record<Locale, LifecycleCopy> = {
  en: {
    graceSubject: 'Payment problem with your Cyprus Lifestyle membership',
    graceHeading: 'We could not collect your membership payment',
    graceBody: 'The latest payment for your Cyprus Lifestyle membership did not go through. Your membership benefits continue until {date} while we try again.',
    graceHow: 'To keep your membership, please update your card: open your account (sign in with this e-mail address), then choose “Manage billing, invoices and cancellation”.',
    graceCta: 'Open my account',
    graceFoot: 'If you have already fixed this, you can ignore this message. If you no longer want the membership, you do not need to do anything.',
    endedSubject: 'Your Cyprus Lifestyle membership has ended',
    endedHeading: 'Your membership has ended',
    endedBody: 'Your Cyprus Lifestyle membership has ended, so the member benefits have stopped.',
    endedStops: 'What stops: the priority lane for your requests, your member card (its QR code no longer verifies) and the fuller member-level answers from the concierge.',
    endedKept: 'The preferences the concierge remembered for you are kept for {days} days and then erased. You can still sign in to your account to download your invoices.',
    endedRejoin: 'You are welcome to rejoin at any time.',
    endedCta: 'Rejoin',
    endedFoot: 'You are receiving this once, because your membership ended. Thank you for being a member.',
  },
  de: {
    graceSubject: 'Zahlungsproblem bei Ihrer Cyprus-Lifestyle-Mitgliedschaft',
    graceHeading: 'Wir konnten Ihre Mitgliedsgebühr nicht einziehen',
    graceBody: 'Die letzte Zahlung für Ihre Cyprus-Lifestyle-Mitgliedschaft ist nicht durchgegangen. Ihre Mitgliedervorteile bleiben bis zum {date} bestehen, während wir es erneut versuchen.',
    graceHow: 'Um Ihre Mitgliedschaft zu behalten, aktualisieren Sie bitte Ihre Karte: Öffnen Sie Ihr Konto (Anmeldung mit dieser E-Mail-Adresse) und wählen Sie „Zahlung, Rechnungen und Kündigung verwalten“.',
    graceCta: 'Mein Konto öffnen',
    graceFoot: 'Wenn Sie das bereits erledigt haben, können Sie diese Nachricht ignorieren. Wenn Sie die Mitgliedschaft nicht mehr möchten, müssen Sie nichts tun.',
    endedSubject: 'Ihre Cyprus-Lifestyle-Mitgliedschaft ist beendet',
    endedHeading: 'Ihre Mitgliedschaft ist beendet',
    endedBody: 'Ihre Cyprus-Lifestyle-Mitgliedschaft ist beendet, die Mitgliedervorteile enden damit.',
    endedStops: 'Was endet: die Prioritätsspur für Ihre Anfragen, Ihre Mitgliedskarte (der QR-Code wird nicht mehr bestätigt) und die ausführlicheren Antworten des Concierge für Mitglieder.',
    endedKept: 'Die Vorlieben, die sich der Concierge für Sie gemerkt hat, bleiben {days} Tage gespeichert und werden dann gelöscht. In Ihr Konto können Sie sich weiterhin anmelden, um Ihre Rechnungen herunterzuladen.',
    endedRejoin: 'Sie können jederzeit wieder beitreten.',
    endedCta: 'Erneut beitreten',
    endedFoot: 'Sie erhalten diese Nachricht einmalig, weil Ihre Mitgliedschaft beendet wurde. Danke, dass Sie Mitglied waren.',
  },
  el: {
    graceSubject: 'Πρόβλημα πληρωμής στη συνδρομή σας στο Cyprus Lifestyle',
    graceHeading: 'Δεν καταφέραμε να εισπράξουμε την πληρωμή της συνδρομής σας',
    graceBody: 'Η τελευταία πληρωμή για τη συνδρομή σας στο Cyprus Lifestyle δεν ολοκληρώθηκε. Τα προνόμια της συνδρομής σας συνεχίζονται έως τις {date} ενώ προσπαθούμε ξανά.',
    graceHow: 'Για να διατηρήσετε τη συνδρομή σας, ενημερώστε την κάρτα σας: ανοίξτε τον λογαριασμό σας (συνδεθείτε με αυτή τη διεύθυνση email) και επιλέξτε «Διαχείριση χρεώσεων, τιμολογίων και ακύρωσης».',
    graceCta: 'Άνοιγμα του λογαριασμού μου',
    graceFoot: 'Αν το έχετε ήδη διορθώσει, αγνοήστε αυτό το μήνυμα. Αν δεν επιθυμείτε πλέον τη συνδρομή, δεν χρειάζεται να κάνετε τίποτα.',
    endedSubject: 'Η συνδρομή σας στο Cyprus Lifestyle έληξε',
    endedHeading: 'Η συνδρομή σας έληξε',
    endedBody: 'Η συνδρομή σας στο Cyprus Lifestyle έληξε, επομένως τα προνόμια μέλους σταμάτησαν.',
    endedStops: 'Τι σταματά: η λωρίδα προτεραιότητας για τα αιτήματά σας, η κάρτα μέλους σας (ο κωδικός QR δεν επαληθεύεται πια) και οι πληρέστερες απαντήσεις του concierge για μέλη.',
    endedKept: 'Οι προτιμήσεις που θυμάται ο concierge για εσάς διατηρούνται για {days} ημέρες και μετά διαγράφονται. Μπορείτε να συνδεθείτε στον λογαριασμό σας για να κατεβάσετε τα τιμολόγιά σας.',
    endedRejoin: 'Μπορείτε να ξαναγίνετε μέλος όποτε θέλετε.',
    endedCta: 'Επανεγγραφή',
    endedFoot: 'Λαμβάνετε αυτό το μήνυμα μία φορά, επειδή έληξε η συνδρομή σας. Σας ευχαριστούμε που ήσασταν μέλος.',
  },
  pl: {
    graceSubject: 'Problem z płatnością za członkostwo w Cyprus Lifestyle',
    graceHeading: 'Nie udało się pobrać opłaty za członkostwo',
    graceBody: 'Ostatnia płatność za Twoje członkostwo w Cyprus Lifestyle nie przeszła. Korzyści członkowskie obowiązują do {date}, a my ponawiamy próbę.',
    graceHow: 'Aby zachować członkostwo, zaktualizuj kartę: otwórz swoje konto (zaloguj się tym adresem e-mail) i wybierz „Zarządzaj płatnościami, fakturami i rezygnacją”.',
    graceCta: 'Otwórz moje konto',
    graceFoot: 'Jeśli już to naprawiłeś, zignoruj tę wiadomość. Jeśli nie chcesz już członkostwa, nie musisz nic robić.',
    endedSubject: 'Twoje członkostwo w Cyprus Lifestyle wygasło',
    endedHeading: 'Twoje członkostwo wygasło',
    endedBody: 'Twoje członkostwo w Cyprus Lifestyle wygasło, więc korzyści członkowskie przestały obowiązywać.',
    endedStops: 'Co się kończy: priorytetowa ścieżka dla Twoich zapytań, karta członkowska (jej kod QR nie jest już potwierdzany) i pełniejsze odpowiedzi concierge dla członków.',
    endedKept: 'Preferencje zapamiętane przez concierge są przechowywane przez {days} dni, a potem usuwane. Nadal możesz zalogować się na konto, aby pobrać faktury.',
    endedRejoin: 'Możesz wrócić w dowolnym momencie.',
    endedCta: 'Dołącz ponownie',
    endedFoot: 'Dostajesz tę wiadomość jednorazowo, ponieważ Twoje członkostwo wygasło. Dziękujemy, że byłeś członkiem.',
  },
  ro: {
    graceSubject: 'Problemă de plată la abonamentul dumneavoastră Cyprus Lifestyle',
    graceHeading: 'Nu am putut încasa plata abonamentului',
    graceBody: 'Ultima plată pentru abonamentul dumneavoastră Cyprus Lifestyle nu a trecut. Avantajele de membru continuă până la {date}, în timp ce încercăm din nou.',
    graceHow: 'Pentru a păstra abonamentul, actualizați cardul: deschideți contul (autentificați-vă cu această adresă de e-mail) și alegeți „Gestionați plățile, facturile și anularea”.',
    graceCta: 'Deschide contul meu',
    graceFoot: 'Dacă ați rezolvat deja, ignorați acest mesaj. Dacă nu mai doriți abonamentul, nu trebuie să faceți nimic.',
    endedSubject: 'Abonamentul dumneavoastră Cyprus Lifestyle s-a încheiat',
    endedHeading: 'Abonamentul s-a încheiat',
    endedBody: 'Abonamentul dumneavoastră Cyprus Lifestyle s-a încheiat, deci avantajele de membru au încetat.',
    endedStops: 'Ce încetează: culoarul prioritar pentru cererile dumneavoastră, cardul de membru (codul QR nu mai este validat) și răspunsurile mai ample ale concierge-ului pentru membri.',
    endedKept: 'Preferințele reținute de concierge pentru dumneavoastră sunt păstrate {days} de zile, apoi șterse. Vă puteți autentifica în continuare în cont pentru a descărca facturile.',
    endedRejoin: 'Vă puteți reînscrie oricând.',
    endedCta: 'Reînscriere',
    endedFoot: 'Primiți acest mesaj o singură dată, deoarece abonamentul s-a încheiat. Vă mulțumim că ați fost membru.',
  },
  ru: {
    graceSubject: 'Проблема с оплатой членства в Cyprus Lifestyle',
    graceHeading: 'Не удалось списать оплату членства',
    graceBody: 'Последний платёж за ваше членство в Cyprus Lifestyle не прошёл. Преимущества участника действуют до {date}, пока мы повторяем попытку.',
    graceHow: 'Чтобы сохранить членство, обновите карту: откройте личный кабинет (войдите с этим адресом e-mail) и выберите «Платежи, счета и отмена».',
    graceCta: 'Открыть мой кабинет',
    graceFoot: 'Если вы уже всё исправили, просто проигнорируйте это письмо. Если членство вам больше не нужно, ничего делать не нужно.',
    endedSubject: 'Ваше членство в Cyprus Lifestyle закончилось',
    endedHeading: 'Ваше членство закончилось',
    endedBody: 'Ваше членство в Cyprus Lifestyle закончилось, поэтому преимущества участника прекратились.',
    endedStops: 'Что прекращается: приоритетная очередь для ваших запросов, карта участника (её QR-код больше не подтверждается) и более подробные ответы консьержа для участников.',
    endedKept: 'Предпочтения, которые консьерж запомнил о вас, хранятся {days} дней, затем удаляются. Войти в личный кабинет и скачать счета можно по-прежнему.',
    endedRejoin: 'Вы можете вернуться в любое время.',
    endedCta: 'Вступить снова',
    endedFoot: 'Вы получаете это письмо один раз, потому что членство закончилось. Спасибо, что были с нами.',
  },
  ar: {
    graceSubject: 'مشكلة في دفع عضويتك في Cyprus Lifestyle',
    graceHeading: 'تعذّر تحصيل دفعة عضويتك',
    graceBody: 'لم تنجح آخر دفعة لعضويتك في Cyprus Lifestyle. تستمر مزايا عضويتك حتى {date} بينما نعيد المحاولة.',
    graceHow: 'للحفاظ على عضويتك، يُرجى تحديث بطاقتك: افتح حسابك (سجّل الدخول بهذا البريد الإلكتروني) ثم اختر «إدارة الدفع والفواتير والإلغاء».',
    graceCta: 'فتح حسابي',
    graceFoot: 'إن كنت قد عالجت الأمر بالفعل فتجاهل هذه الرسالة. وإن لم تعد ترغب في العضوية فلا يلزمك فعل شيء.',
    endedSubject: 'انتهت عضويتك في Cyprus Lifestyle',
    endedHeading: 'انتهت عضويتك',
    endedBody: 'انتهت عضويتك في Cyprus Lifestyle، وبذلك توقفت مزايا الأعضاء.',
    endedStops: 'ما يتوقف: مسار الأولوية لطلباتك، وبطاقة العضوية (لم يعد رمز QR الخاص بها يُؤكَّد)، والإجابات الأوسع من الكونسيرج للأعضاء.',
    endedKept: 'تُحفظ التفضيلات التي تذكّرها الكونسيرج عنك لمدة {days} يومًا ثم تُمحى. ما زال بإمكانك تسجيل الدخول إلى حسابك لتنزيل فواتيرك.',
    endedRejoin: 'يسعدنا انضمامك مجددًا في أي وقت.',
    endedCta: 'الانضمام مجددًا',
    endedFoot: 'تصلك هذه الرسالة مرة واحدة فقط لأن عضويتك انتهت. شكرًا لأنك كنت عضوًا.',
  },
};

export const lifecycleCopy = (l: string): LifecycleCopy => COPY[l as Locale] || COPY.en;
export const lifecycleCopyAll = COPY;
