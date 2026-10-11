// lib/concierge/restoreEmail.ts — the membership restore email, in all seven editions.
// Rendered through brandedEmail() (RTL-aware for Arabic), like the newsletter confirmation.
import type { Locale } from '@/lib/locales';

export interface RestoreEmailCopy { subject: string; heading: string; body: string; cta: string; footnote: string }

const COPY: Record<Locale, RestoreEmailCopy> = {
  en: { subject: 'Restore your Cyprus Lifestyle membership', heading: 'Restore your membership', body: 'Use the button below to restore your Concierge Membership on the device where you open it. The link works once and expires in 30 minutes.', cta: 'Restore membership', footnote: 'If you did not ask for this, you can safely ignore this email — nothing has changed.' },
  de: { subject: 'Stellen Sie Ihre Cyprus-Lifestyle-Mitgliedschaft wieder her', heading: 'Mitgliedschaft wiederherstellen', body: 'Mit der Schaltfläche unten stellen Sie Ihre Concierge-Mitgliedschaft auf dem Gerät wieder her, auf dem Sie sie öffnen. Der Link funktioniert nur einmal und läuft nach 30 Minuten ab.', cta: 'Mitgliedschaft wiederherstellen', footnote: 'Falls Sie dies nicht angefordert haben, können Sie diese E-Mail unbesorgt ignorieren — es wurde nichts geändert.' },
  el: { subject: 'Επαναφορά της συνδρομής σας στο Cyprus Lifestyle', heading: 'Επαναφορά της συνδρομής σας', body: 'Με το κουμπί παρακάτω επαναφέρετε τη συνδρομή Concierge στη συσκευή όπου το ανοίγετε. Ο σύνδεσμος λειτουργεί μία φορά και λήγει σε 30 λεπτά.', cta: 'Επαναφορά συνδρομής', footnote: 'Αν δεν το ζητήσατε εσείς, αγνοήστε με ασφάλεια αυτό το email — τίποτα δεν έχει αλλάξει.' },
  pl: { subject: 'Przywróć swoje członkostwo Cyprus Lifestyle', heading: 'Przywróć członkostwo', body: 'Przyciskiem poniżej przywrócisz członkostwo Concierge na urządzeniu, na którym go otworzysz. Link działa jednorazowo i wygasa po 30 minutach.', cta: 'Przywróć członkostwo', footnote: 'Jeśli to nie Ty o to prosiłeś, po prostu zignoruj tę wiadomość — nic się nie zmieniło.' },
  ro: { subject: 'Restaurați abonamentul Cyprus Lifestyle', heading: 'Restaurați abonamentul', body: 'Cu butonul de mai jos restaurați abonamentul Concierge pe dispozitivul pe care îl deschideți. Linkul funcționează o singură dată și expiră în 30 de minute.', cta: 'Restaurează abonamentul', footnote: 'Dacă nu ați cerut acest lucru, puteți ignora în siguranță acest email — nu s-a schimbat nimic.' },
  ru: { subject: 'Восстановите членство в Cyprus Lifestyle', heading: 'Восстановление членства', body: 'Кнопка ниже восстановит ваше консьерж-членство на том устройстве, где вы её откроете. Ссылка действует один раз и истекает через 30 минут.', cta: 'Восстановить членство', footnote: 'Если вы этого не запрашивали, просто проигнорируйте письмо — ничего не изменилось.' },
  ar: { subject: 'استعد عضويتك في Cyprus Lifestyle', heading: 'استعادة عضويتك', body: 'استخدم الزر أدناه لاستعادة عضوية الكونسيرج على الجهاز الذي تفتحه منه. الرابط يعمل مرة واحدة فقط وتنتهي صلاحيته خلال 30 دقيقة.', cta: 'استعادة العضوية', footnote: 'إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان — لم يتغيّر شيء.' },
};

export function restoreEmailCopy(locale: Locale): RestoreEmailCopy { return COPY[locale] || COPY.en; }
