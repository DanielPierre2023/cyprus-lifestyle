// lib/advertise/paymentFailedMail.ts — the e-mail an ADVERTISER gets when the card payment for a running advertising
// subscription fails (sent from the Stripe webhook, once per failure episode: the order only moves active -> failed once).
// Members are NOT mailed from here: they already get the grace/ended notices of lib/member/lifecycle.ts, so Stripe's own
// failed-payment e-mails stay OFF (docs/MEMBER-CARD.md) and nobody receives two messages.
// An advertiser has no sign-in, so there is no self-service link; the message asks them to reply and says a secure Stripe
// link will follow. Only claims what the code does. Seven editions; non-English text needs native review.
import { brandedEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';

export interface PaymentFailedCopy { subject: string; heading: string; body: string; how: string; foot: string }

export const PAYMENT_FAILED_COPY: Record<Locale, PaymentFailedCopy> = {
  en: {
    subject: 'Your Cyprus Lifestyle advertising payment did not go through',
    heading: 'We could not collect your advertising payment',
    body: 'The latest card payment for your Cyprus Lifestyle advertising subscription did not go through. Stripe, our payment provider, will try the card again.',
    how: 'To update your card, simply reply to this e-mail and we will send you a secure link to do it. No card details are ever sent by e-mail.',
    foot: 'If you have already fixed this, you can ignore this message. You are receiving it once for this payment problem.',
  },
  de: {
    subject: 'Ihre Zahlung für die Werbung bei Cyprus Lifestyle ist nicht durchgegangen',
    heading: 'Wir konnten Ihre Werbezahlung nicht einziehen',
    body: 'Die letzte Kartenzahlung für Ihr Werbeabonnement bei Cyprus Lifestyle ist nicht durchgegangen. Stripe, unser Zahlungsdienstleister, versucht es mit der Karte erneut.',
    how: 'Um Ihre Karte zu aktualisieren, antworten Sie einfach auf diese E-Mail, dann senden wir Ihnen einen sicheren Link dafür. Kartendaten werden niemals per E-Mail verschickt.',
    foot: 'Wenn Sie das bereits erledigt haben, können Sie diese Nachricht ignorieren. Sie erhalten sie einmalig zu diesem Zahlungsproblem.',
  },
  el: {
    subject: 'Η πληρωμή για τη διαφήμισή σας στο Cyprus Lifestyle δεν ολοκληρώθηκε',
    heading: 'Δεν καταφέραμε να εισπράξουμε την πληρωμή της διαφήμισής σας',
    body: 'Η τελευταία πληρωμή με κάρτα για τη διαφημιστική σας συνδρομή στο Cyprus Lifestyle δεν ολοκληρώθηκε. Η Stripe, ο πάροχος πληρωμών μας, θα επαναλάβει την προσπάθεια με την κάρτα.',
    how: 'Για να ενημερώσετε την κάρτα σας, απαντήστε απλώς σε αυτό το e-mail και θα σας στείλουμε έναν ασφαλή σύνδεσμο. Στοιχεία κάρτας δεν αποστέλλονται ποτέ με e-mail.',
    foot: 'Αν το έχετε ήδη διορθώσει, αγνοήστε αυτό το μήνυμα. Το λαμβάνετε μία φορά για αυτό το πρόβλημα πληρωμής.',
  },
  ro: {
    subject: 'Plata pentru publicitatea dumneavoastră Cyprus Lifestyle nu a fost procesată',
    heading: 'Nu am putut încasa plata pentru publicitate',
    body: 'Ultima plată cu cardul pentru abonamentul dumneavoastră publicitar Cyprus Lifestyle nu a fost procesată. Stripe, furnizorul nostru de plăți, va încerca din nou cardul.',
    how: 'Pentru a actualiza cardul, răspundeți pur și simplu la acest e-mail și vă vom trimite un link securizat. Datele cardului nu sunt trimise niciodată prin e-mail.',
    foot: 'Dacă ați rezolvat deja, ignorați acest mesaj. Îl primiți o singură dată pentru această problemă de plată.',
  },
  ar: {
    subject: 'لم تتم عملية دفع إعلانكم في Cyprus Lifestyle',
    heading: 'تعذّر علينا تحصيل دفعة إعلانكم',
    body: 'لم تتم آخر دفعة بالبطاقة لاشتراككم الإعلاني في Cyprus Lifestyle. ستعيد Stripe، مزوّد الدفع لدينا، محاولة الدفع بالبطاقة.',
    how: 'لتحديث بطاقتكم، يكفي أن تردّوا على هذه الرسالة وسنرسل لكم رابطًا آمنًا لذلك. لا تُرسَل بيانات البطاقة عبر البريد الإلكتروني أبدًا.',
    foot: 'إذا كنتم قد عالجتم الأمر بالفعل، فيمكنكم تجاهل هذه الرسالة. تصلكم مرة واحدة فقط عن مشكلة الدفع هذه.',
  },
  pl: {
    subject: 'Płatność za reklamę w Cyprus Lifestyle nie powiodła się',
    heading: 'Nie udało się pobrać płatności za reklamę',
    body: 'Ostatnia płatność kartą za subskrypcję reklamową w Cyprus Lifestyle nie powiodła się. Stripe, nasz operator płatności, ponowi próbę obciążenia karty.',
    how: 'Aby zaktualizować kartę, wystarczy odpowiedzieć na tę wiadomość, a wyślemy Ci bezpieczny link. Dane karty nigdy nie są wysyłane e-mailem.',
    foot: 'Jeśli już to naprawiłeś, zignoruj tę wiadomość. Otrzymujesz ją jednorazowo w związku z tym problemem z płatnością.',
  },
  ru: {
    subject: 'Платёж за рекламу в Cyprus Lifestyle не прошёл',
    heading: 'Нам не удалось списать оплату за рекламу',
    body: 'Последний платёж картой за вашу рекламную подписку в Cyprus Lifestyle не прошёл. Stripe, наш платёжный провайдер, повторит попытку списания.',
    how: 'Чтобы обновить карту, просто ответьте на это письмо, и мы пришлём вам безопасную ссылку. Данные карты никогда не отправляются по электронной почте.',
    foot: 'Если вы уже всё исправили, просто проигнорируйте это письмо. Вы получаете его один раз по этой платёжной проблеме.',
  },
};

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
const loc = (l: string | null | undefined): Locale => (l && isLocale(l) ? (l as Locale) : 'en');

export function paymentFailedMail(locale: string | null | undefined): { subject: string; html: string } {
  const l = loc(locale), c = PAYMENT_FAILED_COPY[l];
  return {
    subject: c.subject,
    html: brandedEmail({
      locale: l, heading: esc(c.heading),
      bodyHtml: `<p>${esc(c.body)}</p><p>${esc(c.how)}</p><p style="opacity:.75;font-size:14px">${esc(c.foot)}</p>`,
      preheader: c.heading,
    }),
  };
}
