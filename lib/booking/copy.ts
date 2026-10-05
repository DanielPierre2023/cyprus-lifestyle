// lib/booking/copy.ts
// All guest- and partner-facing text of the booking engine, in the seven editions (en el ro ar de pl ru).
// Kept in one typed module (not messages/*.json) so the booking engine ships without touching the shared message
// files; scripts/tests/booking.test.ts enforces the same parity rules as `npm run check:i18n` (every key in every
// language, no empty values, identical {placeholders}).
//
// TRUTH IN ADVERTISING — every sentence below describes something the code does:
//   • the lane  → bookings.lane is set from the member session (lib/booking/queue.ts) and the queue sorts on it;
//   • the target → bookings.first_response_due_at is stamped from lib/booking/sla.ts and timed in the admin queue;
//   • "target", never "guarantee": a person still has to reply.
//   • the commission line is a disclosure that Cyprus Lifestyle MAY earn one (the ledger records it when it does).
import type { Locale } from '@/lib/locales';

export interface BookingCopy {
  // guest e-mail (added to the acknowledgement)
  refLine: string; laneMember: string; laneStandard: string; targetMember: string; targetStandard: string; trackCta: string;
  // desk update e-mail
  updSubject: string; updHeading: string; updIntro: string; updCta: string;
  // guest status page
  pageTitle: string; kicker: string; reference: string; received: string; statusLabel: string; queueLabel: string;
  queueMember: string; queueStandard: string; replyTarget: string; replyDone: string;
  optionsTitle: string; optionsIntro: string; partnerLabel: string; priceLabel: string; noOptions: string; disclosure: string;
  invalidLink: string; keepPrivate: string; hoursNote: string;
  st_new: string; st_in_progress: string; st_awaiting_partner: string; st_quote_ready: string; st_confirmed: string; st_completed: string; st_cancelled: string; st_closed: string;
  // partner e-mail
  pSubject: string; pReminderSubject: string; pHeading: string; pGreeting: string; pGreetingAnon: string; pIntro: string; pRequestLabel: string;
  pHow: string; pExpires: string; pPrivacy: string; pCta: string; pClosing: string;
  // partner page
  ppTitle: string; ppIntro: string; ppAccept: string; ppQuote: string; ppDecline: string; ppAlt: string; ppAmount: string; ppNote: string; ppNoteAlt: string;
  ppSend: string; ppSending: string; ppBadAmount: string; ppNeedAlt: string; ppThanks: string; ppCurrent: string; ppExpired: string; ppClosed: string; ppError: string; ppInvalid: string; ppNoCommit: string;
  pps_sent: string; pps_accepted: string; pps_quoted: string; pps_declined: string; pps_alternative: string;
}

const en: BookingCopy = {
  refLine: 'Your reference: {ref}',
  laneMember: 'Your request is in our member priority lane: it is handled before standard requests, and our target for a first personal reply is {target}.',
  laneStandard: 'Our target for a first personal reply is {target}.',
  targetMember: '4 working hours', targetStandard: 'one working day', trackCta: 'Track your request',
  updSubject: 'An update on your request {ref} — Cyprus Lifestyle', updHeading: 'An update on your request', updIntro: 'Our concierge desk has written to you about request {ref}:', updCta: 'View your request',
  pageTitle: 'Your request', kicker: 'Concierge', reference: 'Reference', received: 'Received', statusLabel: 'Status', queueLabel: 'Queue',
  queueMember: 'Member priority lane', queueStandard: 'Standard queue',
  replyTarget: 'Target for a first personal reply: {when}', replyDone: 'A member of our team has replied.',
  optionsTitle: 'Options from our partners', optionsIntro: 'Our desk has reviewed these replies for you. Prices are the partner’s own quote.',
  partnerLabel: 'Partner', priceLabel: 'Quoted price', noOptions: 'There are no options to show yet. We will e-mail you when there is news.',
  disclosure: 'Cyprus Lifestyle may receive a commission from partners on confirmed bookings.',
  invalidLink: 'This link is not valid.', keepPrivate: 'Keep this link private: anyone who has it can see this page.', hoursNote: 'Working hours: Monday–Friday, 09:00–18:00 Cyprus time.',
  st_new: 'Received', st_in_progress: 'Being handled', st_awaiting_partner: 'Waiting for a partner’s reply', st_quote_ready: 'Options ready', st_confirmed: 'Confirmed', st_completed: 'Completed', st_cancelled: 'Cancelled', st_closed: 'Closed',
  pSubject: 'Guest request {ref} — can you help? — Cyprus Lifestyle', pReminderSubject: 'Reminder: guest request {ref} — Cyprus Lifestyle', pHeading: 'A guest request for your business',
  pGreeting: 'Hello {name},', pGreetingAnon: 'Hello,',
  pIntro: 'The Cyprus Lifestyle concierge desk has received a request from a guest that may suit your business. Could you tell us whether you can help, and at what price?',
  pRequestLabel: 'The request', pHow: 'Reply in one click — no account or password needed. You can accept, send a price, decline, or suggest an alternative.',
  pExpires: 'This link works until {date}.', pPrivacy: 'For privacy we do not pass on the guest’s contact details; our desk relays everything.', pCta: 'Reply now', pClosing: 'Thank you,<br>The Cyprus Lifestyle Concierge Desk',
  ppTitle: 'Guest request', ppIntro: 'Please tell the Cyprus Lifestyle concierge desk whether you can help.',
  ppAccept: 'I can help', ppQuote: 'Send a price', ppDecline: 'I can’t help', ppAlt: 'Suggest an alternative', ppAmount: 'Total price in euro', ppNote: 'Message (optional)', ppNoteAlt: 'Describe your alternative',
  ppBadAmount: 'Please enter the total price in euro, for example 120 or 120.50.', ppNeedAlt: 'Please describe the alternative you propose.',
  ppSend: 'Send reply', ppSending: 'Sending…', ppThanks: 'Thank you — your reply is recorded. You can change it until the link expires.', ppCurrent: 'Your current reply: {status}',
  ppExpired: 'This link has expired. Please contact the concierge desk if you still wish to reply.', ppClosed: 'This request has been closed. Thank you.', ppError: 'We could not record your reply just now. Please try again.', ppInvalid: 'This link is not valid.',
  ppNoCommit: 'A reply is not a confirmed booking; our desk will come back to you.',
  pps_sent: 'Waiting for your reply', pps_accepted: 'You can help', pps_quoted: 'Price sent', pps_declined: 'Declined', pps_alternative: 'Alternative suggested',
};

const el: BookingCopy = {
  refLine: 'Ο κωδικός σας: {ref}',
  laneMember: 'Το αίτημά σας βρίσκεται στη λωρίδα προτεραιότητας μελών: εξυπηρετείται πριν από τα τυπικά αιτήματα και ο στόχος μας για την πρώτη προσωπική απάντηση είναι {target}.',
  laneStandard: 'Ο στόχος μας για την πρώτη προσωπική απάντηση είναι {target}.',
  targetMember: '4 εργάσιμες ώρες', targetStandard: 'μία εργάσιμη ημέρα', trackCta: 'Παρακολουθήστε το αίτημά σας',
  updSubject: 'Ενημέρωση για το αίτημά σας {ref} — Cyprus Lifestyle', updHeading: 'Ενημέρωση για το αίτημά σας', updIntro: 'Το γραφείο concierge σάς έγραψε σχετικά με το αίτημα {ref}:', updCta: 'Δείτε το αίτημά σας',
  pageTitle: 'Το αίτημά σας', kicker: 'Concierge', reference: 'Κωδικός', received: 'Παραλήφθηκε', statusLabel: 'Κατάσταση', queueLabel: 'Ουρά',
  queueMember: 'Λωρίδα προτεραιότητας μελών', queueStandard: 'Τυπική ουρά',
  replyTarget: 'Στόχος για την πρώτη προσωπική απάντηση: {when}', replyDone: 'Μέλος της ομάδας μας έχει απαντήσει.',
  optionsTitle: 'Επιλογές από τους συνεργάτες μας', optionsIntro: 'Το γραφείο μας έλεγξε αυτές τις απαντήσεις για εσάς. Οι τιμές είναι η προσφορά του ίδιου του συνεργάτη.',
  partnerLabel: 'Συνεργάτης', priceLabel: 'Προσφερόμενη τιμή', noOptions: 'Δεν υπάρχουν ακόμη επιλογές. Θα σας στείλουμε email όταν υπάρξουν νέα.',
  disclosure: 'Το Cyprus Lifestyle ενδέχεται να λαμβάνει προμήθεια από συνεργάτες για επιβεβαιωμένες κρατήσεις.',
  invalidLink: 'Αυτός ο σύνδεσμος δεν είναι έγκυρος.', keepPrivate: 'Κρατήστε αυτόν τον σύνδεσμο ιδιωτικό: όποιος τον έχει μπορεί να δει τη σελίδα.', hoursNote: 'Ώρες εργασίας: Δευτέρα–Παρασκευή, 09:00–18:00 ώρα Κύπρου.',
  st_new: 'Παραλήφθηκε', st_in_progress: 'Σε επεξεργασία', st_awaiting_partner: 'Αναμονή απάντησης συνεργάτη', st_quote_ready: 'Οι επιλογές είναι έτοιμες', st_confirmed: 'Επιβεβαιώθηκε', st_completed: 'Ολοκληρώθηκε', st_cancelled: 'Ακυρώθηκε', st_closed: 'Έκλεισε',
  pSubject: 'Αίτημα επισκέπτη {ref} — μπορείτε να βοηθήσετε; — Cyprus Lifestyle', pReminderSubject: 'Υπενθύμιση: αίτημα επισκέπτη {ref} — Cyprus Lifestyle', pHeading: 'Ένα αίτημα επισκέπτη για την επιχείρησή σας',
  pGreeting: 'Γεια σας {name},', pGreetingAnon: 'Γεια σας,',
  pIntro: 'Το γραφείο concierge του Cyprus Lifestyle έλαβε ένα αίτημα από επισκέπτη που ίσως ταιριάζει στην επιχείρησή σας. Μπορείτε να μας πείτε αν μπορείτε να βοηθήσετε και με ποια τιμή;',
  pRequestLabel: 'Το αίτημα', pHow: 'Απαντήστε με ένα κλικ — δεν χρειάζεται λογαριασμός ή κωδικός. Μπορείτε να δεχτείτε, να στείλετε τιμή, να αρνηθείτε ή να προτείνετε εναλλακτική.',
  pExpires: 'Ο σύνδεσμος ισχύει έως {date}.', pPrivacy: 'Για λόγους απορρήτου δεν διαβιβάζουμε τα στοιχεία επικοινωνίας του επισκέπτη· το γραφείο μας μεταφέρει τα πάντα.', pCta: 'Απαντήστε τώρα', pClosing: 'Ευχαριστούμε,<br>Το γραφείο Concierge του Cyprus Lifestyle',
  ppTitle: 'Αίτημα επισκέπτη', ppIntro: 'Πείτε στο γραφείο concierge του Cyprus Lifestyle αν μπορείτε να βοηθήσετε.',
  ppAccept: 'Μπορώ να βοηθήσω', ppQuote: 'Αποστολή τιμής', ppDecline: 'Δεν μπορώ να βοηθήσω', ppAlt: 'Πρόταση εναλλακτικής', ppAmount: 'Συνολική τιμή σε ευρώ', ppNote: 'Μήνυμα (προαιρετικό)', ppNoteAlt: 'Περιγράψτε την εναλλακτική σας',
  ppBadAmount: 'Εισαγάγετε τη συνολική τιμή σε ευρώ, π.χ. 120 ή 120,50.', ppNeedAlt: 'Περιγράψτε την εναλλακτική που προτείνετε.',
  ppSend: 'Αποστολή απάντησης', ppSending: 'Αποστολή…', ppThanks: 'Ευχαριστούμε — η απάντησή σας καταγράφηκε. Μπορείτε να την αλλάξετε μέχρι να λήξει ο σύνδεσμος.', ppCurrent: 'Η τρέχουσα απάντησή σας: {status}',
  ppExpired: 'Αυτός ο σύνδεσμος έχει λήξει. Επικοινωνήστε με το γραφείο concierge αν θέλετε ακόμη να απαντήσετε.', ppClosed: 'Αυτό το αίτημα έχει κλείσει. Ευχαριστούμε.', ppError: 'Δεν μπορέσαμε να καταγράψουμε την απάντησή σας τώρα. Δοκιμάστε ξανά.', ppInvalid: 'Αυτός ο σύνδεσμος δεν είναι έγκυρος.',
  ppNoCommit: 'Η απάντηση δεν συνιστά επιβεβαιωμένη κράτηση· το γραφείο μας θα επικοινωνήσει ξανά μαζί σας.',
  pps_sent: 'Αναμονή της απάντησής σας', pps_accepted: 'Μπορείτε να βοηθήσετε', pps_quoted: 'Η τιμή στάλθηκε', pps_declined: 'Απορρίφθηκε', pps_alternative: 'Προτάθηκε εναλλακτική',
};

const ro: BookingCopy = {
  refLine: 'Referința dumneavoastră: {ref}',
  laneMember: 'Solicitarea dumneavoastră se află pe culoarul prioritar al membrilor: este tratată înaintea solicitărilor obișnuite, iar ținta noastră pentru primul răspuns personal este {target}.',
  laneStandard: 'Ținta noastră pentru primul răspuns personal este {target}.',
  targetMember: '4 ore lucrătoare', targetStandard: 'o zi lucrătoare', trackCta: 'Urmăriți solicitarea',
  updSubject: 'Noutăți despre solicitarea {ref} — Cyprus Lifestyle', updHeading: 'Noutăți despre solicitarea dumneavoastră', updIntro: 'Biroul nostru de concierge v-a scris în legătură cu solicitarea {ref}:', updCta: 'Vedeți solicitarea',
  pageTitle: 'Solicitarea dumneavoastră', kicker: 'Concierge', reference: 'Referință', received: 'Primită', statusLabel: 'Stare', queueLabel: 'Coadă',
  queueMember: 'Culoar prioritar pentru membri', queueStandard: 'Coadă obișnuită',
  replyTarget: 'Țintă pentru primul răspuns personal: {when}', replyDone: 'Un membru al echipei noastre a răspuns.',
  optionsTitle: 'Opțiuni de la partenerii noștri', optionsIntro: 'Biroul nostru a verificat aceste răspunsuri pentru dumneavoastră. Prețurile sunt oferta proprie a partenerului.',
  partnerLabel: 'Partener', priceLabel: 'Preț oferit', noOptions: 'Încă nu există opțiuni de afișat. Vă vom scrie prin e-mail când avem noutăți.',
  disclosure: 'Cyprus Lifestyle poate primi un comision de la parteneri pentru rezervările confirmate.',
  invalidLink: 'Acest link nu este valid.', keepPrivate: 'Păstrați acest link privat: oricine îl are poate vedea această pagină.', hoursNote: 'Program de lucru: luni–vineri, 09:00–18:00, ora Ciprului.',
  st_new: 'Primită', st_in_progress: 'În lucru', st_awaiting_partner: 'Se așteaptă răspunsul unui partener', st_quote_ready: 'Opțiuni pregătite', st_confirmed: 'Confirmată', st_completed: 'Finalizată', st_cancelled: 'Anulată', st_closed: 'Închisă',
  pSubject: 'Solicitare de oaspete {ref} — puteți ajuta? — Cyprus Lifestyle', pReminderSubject: 'Memento: solicitare de oaspete {ref} — Cyprus Lifestyle', pHeading: 'O solicitare de oaspete pentru afacerea dumneavoastră',
  pGreeting: 'Bună ziua, {name},', pGreetingAnon: 'Bună ziua,',
  pIntro: 'Biroul de concierge Cyprus Lifestyle a primit de la un oaspete o solicitare care s-ar potrivi afacerii dumneavoastră. Ne puteți spune dacă puteți ajuta și la ce preț?',
  pRequestLabel: 'Solicitarea', pHow: 'Răspundeți dintr-un singur clic — fără cont sau parolă. Puteți accepta, trimite un preț, refuza sau propune o alternativă.',
  pExpires: 'Acest link este valabil până la {date}.', pPrivacy: 'Din motive de confidențialitate nu transmitem datele de contact ale oaspetelui; biroul nostru retransmite totul.', pCta: 'Răspundeți acum', pClosing: 'Vă mulțumim,<br>Biroul Concierge Cyprus Lifestyle',
  ppTitle: 'Solicitare de oaspete', ppIntro: 'Spuneți-i biroului de concierge Cyprus Lifestyle dacă puteți ajuta.',
  ppAccept: 'Pot ajuta', ppQuote: 'Trimit un preț', ppDecline: 'Nu pot ajuta', ppAlt: 'Propun o alternativă', ppAmount: 'Preț total în euro', ppNote: 'Mesaj (opțional)', ppNoteAlt: 'Descrieți alternativa dumneavoastră',
  ppBadAmount: 'Introduceți prețul total în euro, de exemplu 120 sau 120,50.', ppNeedAlt: 'Descrieți alternativa pe care o propuneți.',
  ppSend: 'Trimite răspunsul', ppSending: 'Se trimite…', ppThanks: 'Vă mulțumim — răspunsul a fost înregistrat. Îl puteți modifica până la expirarea linkului.', ppCurrent: 'Răspunsul dumneavoastră actual: {status}',
  ppExpired: 'Acest link a expirat. Contactați biroul de concierge dacă doriți totuși să răspundeți.', ppClosed: 'Această solicitare a fost închisă. Vă mulțumim.', ppError: 'Nu am putut înregistra răspunsul acum. Încercați din nou.', ppInvalid: 'Acest link nu este valid.',
  ppNoCommit: 'Un răspuns nu este o rezervare confirmată; biroul nostru va reveni către dumneavoastră.',
  pps_sent: 'Se așteaptă răspunsul dumneavoastră', pps_accepted: 'Puteți ajuta', pps_quoted: 'Preț trimis', pps_declined: 'Refuzat', pps_alternative: 'Alternativă propusă',
};

const ar: BookingCopy = {
  refLine: 'رقمك المرجعي: {ref}',
  laneMember: 'طلبك في مسار الأولوية للأعضاء: يُعالج قبل الطلبات العادية، وهدفنا للرد الشخصي الأول هو {target}.',
  laneStandard: 'هدفنا للرد الشخصي الأول هو {target}.',
  targetMember: '4 ساعات عمل', targetStandard: 'يوم عمل واحد', trackCta: 'تتبّع طلبك',
  updSubject: 'تحديث بشأن طلبك {ref} — Cyprus Lifestyle', updHeading: 'تحديث بشأن طلبك', updIntro: 'كتب لك مكتب الكونسيرج بشأن الطلب {ref}:', updCta: 'عرض طلبك',
  pageTitle: 'طلبك', kicker: 'كونسيرج', reference: 'المرجع', received: 'تاريخ الاستلام', statusLabel: 'الحالة', queueLabel: 'الطابور',
  queueMember: 'مسار الأولوية للأعضاء', queueStandard: 'الطابور العادي',
  replyTarget: 'الهدف للرد الشخصي الأول: {when}', replyDone: 'ردّ أحد أعضاء فريقنا.',
  optionsTitle: 'خيارات من شركائنا', optionsIntro: 'راجع مكتبنا هذه الردود من أجلك. الأسعار هي عرض الشريك نفسه.',
  partnerLabel: 'الشريك', priceLabel: 'السعر المعروض', noOptions: 'لا توجد خيارات لعرضها بعد. سنراسلك بالبريد الإلكتروني عند وجود جديد.',
  disclosure: 'قد تتلقى Cyprus Lifestyle عمولة من الشركاء على الحجوزات المؤكدة.',
  invalidLink: 'هذا الرابط غير صالح.', keepPrivate: 'أبقِ هذا الرابط خاصاً: يستطيع كل من يملكه رؤية هذه الصفحة.', hoursNote: 'ساعات العمل: من الاثنين إلى الجمعة، 09:00–18:00 بتوقيت قبرص.',
  st_new: 'تم الاستلام', st_in_progress: 'قيد المعالجة', st_awaiting_partner: 'بانتظار ردّ الشريك', st_quote_ready: 'الخيارات جاهزة', st_confirmed: 'مؤكد', st_completed: 'مكتمل', st_cancelled: 'ملغى', st_closed: 'مغلق',
  pSubject: 'طلب ضيف {ref} — هل يمكنكم المساعدة؟ — Cyprus Lifestyle', pReminderSubject: 'تذكير: طلب ضيف {ref} — Cyprus Lifestyle', pHeading: 'طلب ضيف لعملكم',
  pGreeting: 'مرحباً {name}،', pGreetingAnon: 'مرحباً،',
  pIntro: 'استلم مكتب الكونسيرج في Cyprus Lifestyle طلباً من أحد الضيوف قد يناسب عملكم. هل يمكنكم إخبارنا إن كان بإمكانكم المساعدة وبأي سعر؟',
  pRequestLabel: 'الطلب', pHow: 'ردّوا بنقرة واحدة — دون حساب أو كلمة مرور. يمكنكم القبول أو إرسال سعر أو الاعتذار أو اقتراح بديل.',
  pExpires: 'يعمل هذا الرابط حتى {date}.', pPrivacy: 'حفاظاً على الخصوصية لا ننقل بيانات اتصال الضيف؛ مكتبنا ينقل كل شيء.', pCta: 'ردّوا الآن', pClosing: 'شكراً لكم،<br>مكتب الكونسيرج في Cyprus Lifestyle',
  ppTitle: 'طلب ضيف', ppIntro: 'أخبروا مكتب الكونسيرج في Cyprus Lifestyle إن كان بإمكانكم المساعدة.',
  ppAccept: 'يمكنني المساعدة', ppQuote: 'إرسال سعر', ppDecline: 'لا يمكنني المساعدة', ppAlt: 'اقتراح بديل', ppAmount: 'السعر الإجمالي باليورو', ppNote: 'رسالة (اختيارية)', ppNoteAlt: 'صفوا البديل الذي تقترحونه',
  ppBadAmount: 'أدخلوا السعر الإجمالي باليورو، مثلاً 120 أو 120.50.', ppNeedAlt: 'صفوا البديل الذي تقترحونه.',
  ppSend: 'إرسال الرد', ppSending: 'جارٍ الإرسال…', ppThanks: 'شكراً لكم — تم تسجيل ردكم. يمكنكم تغييره حتى انتهاء صلاحية الرابط.', ppCurrent: 'ردكم الحالي: {status}',
  ppExpired: 'انتهت صلاحية هذا الرابط. يُرجى التواصل مع مكتب الكونسيرج إن كنتم ما زلتم ترغبون في الرد.', ppClosed: 'أُغلق هذا الطلب. شكراً لكم.', ppError: 'تعذّر تسجيل ردكم الآن. يُرجى المحاولة مرة أخرى.', ppInvalid: 'هذا الرابط غير صالح.',
  ppNoCommit: 'الردّ ليس حجزاً مؤكداً؛ سيعود إليكم مكتبنا.',
  pps_sent: 'بانتظار ردكم', pps_accepted: 'يمكنكم المساعدة', pps_quoted: 'تم إرسال السعر', pps_declined: 'تم الاعتذار', pps_alternative: 'تم اقتراح بديل',
};

const de: BookingCopy = {
  refLine: 'Ihre Referenz: {ref}',
  laneMember: 'Ihre Anfrage liegt auf der Prioritätsspur für Mitglieder: Sie wird vor Standardanfragen bearbeitet, und unser Ziel für eine erste persönliche Antwort ist {target}.',
  laneStandard: 'Unser Ziel für eine erste persönliche Antwort ist {target}.',
  targetMember: '4 Arbeitsstunden', targetStandard: 'ein Arbeitstag', trackCta: 'Anfrage verfolgen',
  updSubject: 'Neuigkeiten zu Ihrer Anfrage {ref} — Cyprus Lifestyle', updHeading: 'Neuigkeiten zu Ihrer Anfrage', updIntro: 'Unser Concierge-Desk hat Ihnen zu Anfrage {ref} geschrieben:', updCta: 'Anfrage ansehen',
  pageTitle: 'Ihre Anfrage', kicker: 'Concierge', reference: 'Referenz', received: 'Eingegangen', statusLabel: 'Status', queueLabel: 'Warteschlange',
  queueMember: 'Prioritätsspur für Mitglieder', queueStandard: 'Standard-Warteschlange',
  replyTarget: 'Ziel für die erste persönliche Antwort: {when}', replyDone: 'Ein Teammitglied hat geantwortet.',
  optionsTitle: 'Optionen unserer Partner', optionsIntro: 'Unser Desk hat diese Antworten für Sie geprüft. Die Preise sind das eigene Angebot des Partners.',
  partnerLabel: 'Partner', priceLabel: 'Angebotspreis', noOptions: 'Es gibt noch keine Optionen. Wir schreiben Ihnen per E-Mail, sobald es Neuigkeiten gibt.',
  disclosure: 'Cyprus Lifestyle erhält von Partnern möglicherweise eine Provision für bestätigte Buchungen.',
  invalidLink: 'Dieser Link ist nicht gültig.', keepPrivate: 'Behandeln Sie diesen Link vertraulich: Jeder, der ihn hat, kann diese Seite sehen.', hoursNote: 'Arbeitszeiten: Montag–Freitag, 09:00–18:00 Uhr Zypern-Zeit.',
  st_new: 'Eingegangen', st_in_progress: 'In Bearbeitung', st_awaiting_partner: 'Warten auf Antwort eines Partners', st_quote_ready: 'Optionen bereit', st_confirmed: 'Bestätigt', st_completed: 'Abgeschlossen', st_cancelled: 'Storniert', st_closed: 'Geschlossen',
  pSubject: 'Gästeanfrage {ref} — können Sie helfen? — Cyprus Lifestyle', pReminderSubject: 'Erinnerung: Gästeanfrage {ref} — Cyprus Lifestyle', pHeading: 'Eine Gästeanfrage für Ihr Unternehmen',
  pGreeting: 'Guten Tag {name},', pGreetingAnon: 'Guten Tag,',
  pIntro: 'Der Concierge-Desk von Cyprus Lifestyle hat eine Gästeanfrage erhalten, die zu Ihrem Unternehmen passen könnte. Können Sie uns sagen, ob Sie helfen können und zu welchem Preis?',
  pRequestLabel: 'Die Anfrage', pHow: 'Antworten Sie mit einem Klick — ohne Konto und Passwort. Sie können zusagen, einen Preis senden, absagen oder eine Alternative vorschlagen.',
  pExpires: 'Dieser Link gilt bis {date}.', pPrivacy: 'Aus Datenschutzgründen geben wir die Kontaktdaten des Gastes nicht weiter; unser Desk vermittelt alles.', pCta: 'Jetzt antworten', pClosing: 'Vielen Dank,<br>Der Cyprus-Lifestyle-Concierge-Desk',
  ppTitle: 'Gästeanfrage', ppIntro: 'Bitte teilen Sie dem Concierge-Desk von Cyprus Lifestyle mit, ob Sie helfen können.',
  ppAccept: 'Ich kann helfen', ppQuote: 'Preis senden', ppDecline: 'Ich kann nicht helfen', ppAlt: 'Alternative vorschlagen', ppAmount: 'Gesamtpreis in Euro', ppNote: 'Nachricht (optional)', ppNoteAlt: 'Beschreiben Sie Ihre Alternative',
  ppBadAmount: 'Bitte geben Sie den Gesamtpreis in Euro ein, z. B. 120 oder 120,50.', ppNeedAlt: 'Bitte beschreiben Sie die vorgeschlagene Alternative.',
  ppSend: 'Antwort senden', ppSending: 'Wird gesendet…', ppThanks: 'Vielen Dank — Ihre Antwort wurde gespeichert. Sie können sie bis zum Ablauf des Links ändern.', ppCurrent: 'Ihre aktuelle Antwort: {status}',
  ppExpired: 'Dieser Link ist abgelaufen. Bitte kontaktieren Sie den Concierge-Desk, wenn Sie noch antworten möchten.', ppClosed: 'Diese Anfrage wurde geschlossen. Vielen Dank.', ppError: 'Ihre Antwort konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut.', ppInvalid: 'Dieser Link ist nicht gültig.',
  ppNoCommit: 'Eine Antwort ist keine bestätigte Buchung; unser Desk meldet sich bei Ihnen.',
  pps_sent: 'Warten auf Ihre Antwort', pps_accepted: 'Sie können helfen', pps_quoted: 'Preis gesendet', pps_declined: 'Abgelehnt', pps_alternative: 'Alternative vorgeschlagen',
};

const pl: BookingCopy = {
  refLine: 'Twój numer referencyjny: {ref}',
  laneMember: 'Twoje zgłoszenie jest na ścieżce priorytetowej dla członków: jest obsługiwane przed zgłoszeniami standardowymi, a nasz cel dla pierwszej osobistej odpowiedzi to {target}.',
  laneStandard: 'Nasz cel dla pierwszej osobistej odpowiedzi to {target}.',
  targetMember: '4 godziny robocze', targetStandard: 'jeden dzień roboczy', trackCta: 'Śledź zgłoszenie',
  updSubject: 'Nowości w sprawie zgłoszenia {ref} — Cyprus Lifestyle', updHeading: 'Nowości w sprawie Twojego zgłoszenia', updIntro: 'Nasze biuro concierge napisało do Ciebie w sprawie zgłoszenia {ref}:', updCta: 'Zobacz zgłoszenie',
  pageTitle: 'Twoje zgłoszenie', kicker: 'Concierge', reference: 'Numer', received: 'Otrzymano', statusLabel: 'Status', queueLabel: 'Kolejka',
  queueMember: 'Ścieżka priorytetowa dla członków', queueStandard: 'Kolejka standardowa',
  replyTarget: 'Cel dla pierwszej osobistej odpowiedzi: {when}', replyDone: 'Członek naszego zespołu odpowiedział.',
  optionsTitle: 'Propozycje od naszych partnerów', optionsIntro: 'Nasze biuro sprawdziło te odpowiedzi dla Ciebie. Ceny to własna oferta partnera.',
  partnerLabel: 'Partner', priceLabel: 'Oferowana cena', noOptions: 'Nie ma jeszcze propozycji do pokazania. Napiszemy do Ciebie e-mailem, gdy pojawią się nowości.',
  disclosure: 'Cyprus Lifestyle może otrzymywać od partnerów prowizję za potwierdzone rezerwacje.',
  invalidLink: 'Ten link jest nieprawidłowy.', keepPrivate: 'Zachowaj ten link dla siebie: każdy, kto go ma, może zobaczyć tę stronę.', hoursNote: 'Godziny pracy: poniedziałek–piątek, 09:00–18:00 czasu cypryjskiego.',
  st_new: 'Otrzymano', st_in_progress: 'W trakcie obsługi', st_awaiting_partner: 'Czekamy na odpowiedź partnera', st_quote_ready: 'Propozycje gotowe', st_confirmed: 'Potwierdzone', st_completed: 'Zrealizowane', st_cancelled: 'Anulowane', st_closed: 'Zamknięte',
  pSubject: 'Zapytanie gościa {ref} — czy możecie pomóc? — Cyprus Lifestyle', pReminderSubject: 'Przypomnienie: zapytanie gościa {ref} — Cyprus Lifestyle', pHeading: 'Zapytanie gościa dla Waszej firmy',
  pGreeting: 'Dzień dobry, {name},', pGreetingAnon: 'Dzień dobry,',
  pIntro: 'Biuro concierge Cyprus Lifestyle otrzymało od gościa zapytanie, które może pasować do Waszej firmy. Czy możecie powiedzieć, czy możecie pomóc i w jakiej cenie?',
  pRequestLabel: 'Zapytanie', pHow: 'Odpowiedz jednym kliknięciem — bez konta i hasła. Możesz przyjąć, wysłać cenę, odmówić lub zaproponować alternatywę.',
  pExpires: 'Ten link działa do {date}.', pPrivacy: 'Ze względu na prywatność nie przekazujemy danych kontaktowych gościa; nasze biuro pośredniczy we wszystkim.', pCta: 'Odpowiedz teraz', pClosing: 'Dziękujemy,<br>Biuro Concierge Cyprus Lifestyle',
  ppTitle: 'Zapytanie gościa', ppIntro: 'Powiedz biuru concierge Cyprus Lifestyle, czy możesz pomóc.',
  ppAccept: 'Mogę pomóc', ppQuote: 'Wyślij cenę', ppDecline: 'Nie mogę pomóc', ppAlt: 'Zaproponuj alternatywę', ppAmount: 'Cena całkowita w euro', ppNote: 'Wiadomość (opcjonalnie)', ppNoteAlt: 'Opisz swoją alternatywę',
  ppBadAmount: 'Podaj cenę całkowitą w euro, np. 120 lub 120,50.', ppNeedAlt: 'Opisz proponowaną alternatywę.',
  ppSend: 'Wyślij odpowiedź', ppSending: 'Wysyłanie…', ppThanks: 'Dziękujemy — odpowiedź została zapisana. Możesz ją zmienić do wygaśnięcia linku.', ppCurrent: 'Twoja obecna odpowiedź: {status}',
  ppExpired: 'Ten link wygasł. Skontaktuj się z biurem concierge, jeśli nadal chcesz odpowiedzieć.', ppClosed: 'To zapytanie zostało zamknięte. Dziękujemy.', ppError: 'Nie udało się teraz zapisać odpowiedzi. Spróbuj ponownie.', ppInvalid: 'Ten link jest nieprawidłowy.',
  ppNoCommit: 'Odpowiedź nie jest potwierdzoną rezerwacją; nasze biuro się z Tobą skontaktuje.',
  pps_sent: 'Czekamy na Twoją odpowiedź', pps_accepted: 'Możesz pomóc', pps_quoted: 'Cena wysłana', pps_declined: 'Odmówiono', pps_alternative: 'Zaproponowano alternatywę',
};

const ru: BookingCopy = {
  refLine: 'Ваш номер заявки: {ref}',
  laneMember: 'Ваш запрос находится в приоритетной полосе для участников клуба: он обрабатывается раньше обычных запросов, а наша цель по первому личному ответу — {target}.',
  laneStandard: 'Наша цель по первому личному ответу — {target}.',
  targetMember: '4 рабочих часа', targetStandard: 'один рабочий день', trackCta: 'Отследить запрос',
  updSubject: 'Новости по вашему запросу {ref} — Cyprus Lifestyle', updHeading: 'Новости по вашему запросу', updIntro: 'Наш консьерж-деск написал вам по запросу {ref}:', updCta: 'Открыть запрос',
  pageTitle: 'Ваш запрос', kicker: 'Консьерж', reference: 'Номер', received: 'Получен', statusLabel: 'Статус', queueLabel: 'Очередь',
  queueMember: 'Приоритетная полоса для участников', queueStandard: 'Обычная очередь',
  replyTarget: 'Цель по первому личному ответу: {when}', replyDone: 'Сотрудник нашей команды уже ответил.',
  optionsTitle: 'Варианты от наших партнёров', optionsIntro: 'Наш деск проверил эти ответы для вас. Цены — собственное предложение партнёра.',
  partnerLabel: 'Партнёр', priceLabel: 'Предложенная цена', noOptions: 'Пока нет вариантов для показа. Мы напишем вам по e-mail, когда появятся новости.',
  disclosure: 'Cyprus Lifestyle может получать комиссию от партнёров за подтверждённые бронирования.',
  invalidLink: 'Эта ссылка недействительна.', keepPrivate: 'Не передавайте эту ссылку: любой, у кого она есть, может открыть эту страницу.', hoursNote: 'Рабочие часы: понедельник–пятница, 09:00–18:00 по времени Кипра.',
  st_new: 'Получен', st_in_progress: 'В работе', st_awaiting_partner: 'Ожидаем ответ партнёра', st_quote_ready: 'Варианты готовы', st_confirmed: 'Подтверждён', st_completed: 'Выполнен', st_cancelled: 'Отменён', st_closed: 'Закрыт',
  pSubject: 'Запрос гостя {ref} — сможете помочь? — Cyprus Lifestyle', pReminderSubject: 'Напоминание: запрос гостя {ref} — Cyprus Lifestyle', pHeading: 'Запрос гостя для вашего бизнеса',
  pGreeting: 'Здравствуйте, {name}!', pGreetingAnon: 'Здравствуйте!',
  pIntro: 'Консьерж-деск Cyprus Lifestyle получил от гостя запрос, который может подойти вашему бизнесу. Подскажите, сможете ли вы помочь и по какой цене?',
  pRequestLabel: 'Запрос', pHow: 'Ответьте в один клик — без аккаунта и пароля. Можно согласиться, отправить цену, отказаться или предложить альтернативу.',
  pExpires: 'Эта ссылка действует до {date}.', pPrivacy: 'В целях конфиденциальности мы не передаём контакты гостя; всё передаёт наш деск.', pCta: 'Ответить', pClosing: 'Спасибо,<br>Консьерж-деск Cyprus Lifestyle',
  ppTitle: 'Запрос гостя', ppIntro: 'Сообщите консьерж-деску Cyprus Lifestyle, сможете ли вы помочь.',
  ppAccept: 'Я могу помочь', ppQuote: 'Отправить цену', ppDecline: 'Не могу помочь', ppAlt: 'Предложить альтернативу', ppAmount: 'Общая цена в евро', ppNote: 'Сообщение (необязательно)', ppNoteAlt: 'Опишите вашу альтернативу',
  ppBadAmount: 'Укажите общую цену в евро, например 120 или 120,50.', ppNeedAlt: 'Опишите предлагаемую альтернативу.',
  ppSend: 'Отправить ответ', ppSending: 'Отправка…', ppThanks: 'Спасибо — ваш ответ записан. Его можно изменить до истечения ссылки.', ppCurrent: 'Ваш текущий ответ: {status}',
  ppExpired: 'Срок действия ссылки истёк. Свяжитесь с консьерж-деском, если всё ещё хотите ответить.', ppClosed: 'Этот запрос закрыт. Спасибо.', ppError: 'Сейчас не удалось записать ваш ответ. Попробуйте ещё раз.', ppInvalid: 'Эта ссылка недействительна.',
  ppNoCommit: 'Ответ не является подтверждённым бронированием; наш деск свяжется с вами.',
  pps_sent: 'Ожидаем ваш ответ', pps_accepted: 'Вы можете помочь', pps_quoted: 'Цена отправлена', pps_declined: 'Отказ', pps_alternative: 'Предложена альтернатива',
};

export const BOOKING_COPY: Record<Locale, BookingCopy> = { en, el, ro, ar, de, pl, ru };
export const bookingCopy = (locale: string): BookingCopy => (BOOKING_COPY as Record<string, BookingCopy>)[locale] || en;
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
