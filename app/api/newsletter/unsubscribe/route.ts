// Public newsletter unsubscribe.  Link (made by lib/newsletterUnsub.ts):
//   /api/newsletter/unsubscribe?e=<address, base64url>&t=<signature>&l=<edition>
//   GET  → a confirmation page in the reader's language (so mail scanners that pre-fetch links cannot unsubscribe anyone)
//   POST → performs it. Also the target of the mail clients' one-click "Unsubscribe" button (RFC 8058).
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decodeEmailParam, unsubscribeSecret, verifyUnsubscribeToken } from '@/lib/newsletterUnsub';
import { isLocale, dir, type Locale } from '@/lib/locales';
import { escapeHtml } from '@/lib/util';

export const runtime = 'nodejs';

type Copy = { confirmTitle: string; confirmBody: string; button: string; doneTitle: string; doneBody: string; badTitle: string; badBody: string };
const COPY: Record<Locale, Copy> = {
  en: { confirmTitle: 'Unsubscribe from The Dispatch?', confirmBody: 'will stop receiving our weekly newsletter.', button: 'Yes, unsubscribe', doneTitle: 'You’re unsubscribed', doneBody: 'You won’t receive the weekly newsletter any more. You can subscribe again at any time on our website.', badTitle: 'Link not valid', badBody: 'This unsubscribe link is incomplete or has been altered. Please use the link at the bottom of the latest newsletter, or reply to any of our emails and we’ll remove you.' },
  de: { confirmTitle: 'Vom Newsletter abmelden?', confirmBody: 'erhält unseren wöchentlichen Newsletter nicht mehr.', button: 'Ja, abmelden', doneTitle: 'Sie sind abgemeldet', doneBody: 'Sie erhalten den wöchentlichen Newsletter nicht mehr. Sie können sich jederzeit auf unserer Website erneut anmelden.', badTitle: 'Link ungültig', badBody: 'Dieser Abmelde-Link ist unvollständig oder wurde verändert. Bitte nutzen Sie den Link am Ende des letzten Newsletters oder antworten Sie auf eine unserer E-Mails, dann entfernen wir Sie.' },
  el: { confirmTitle: 'Διαγραφή από το δελτίο;', confirmBody: 'δεν θα λαμβάνει πλέον το εβδομαδιαίο δελτίο μας.', button: 'Ναι, διαγραφή', doneTitle: 'Η διαγραφή ολοκληρώθηκε', doneBody: 'Δεν θα λαμβάνετε πλέον το εβδομαδιαίο δελτίο. Μπορείτε να εγγραφείτε ξανά οποτεδήποτε στον ιστότοπό μας.', badTitle: 'Μη έγκυρος σύνδεσμος', badBody: 'Ο σύνδεσμος διαγραφής είναι ελλιπής ή έχει τροποποιηθεί. Χρησιμοποιήστε τον σύνδεσμο στο κάτω μέρος του τελευταίου δελτίου ή απαντήστε σε οποιοδήποτε email μας και θα σας αφαιρέσουμε.' },
  pl: { confirmTitle: 'Wypisać się z newslettera?', confirmBody: 'nie będzie już otrzymywać naszego cotygodniowego newslettera.', button: 'Tak, wypisz mnie', doneTitle: 'Wypisano z newslettera', doneBody: 'Nie będziesz już otrzymywać cotygodniowego newslettera. Możesz zapisać się ponownie w dowolnym momencie na naszej stronie.', badTitle: 'Nieprawidłowy link', badBody: 'Ten link do wypisania jest niepełny lub został zmieniony. Skorzystaj z linku na końcu ostatniego newslettera albo odpowiedz na dowolną naszą wiadomość, a usuniemy Cię z listy.' },
  ro: { confirmTitle: 'Te dezabonezi de la buletin?', confirmBody: 'nu va mai primi buletinul nostru săptămânal.', button: 'Da, dezabonează-mă', doneTitle: 'Te-ai dezabonat', doneBody: 'Nu vei mai primi buletinul săptămânal. Te poți abona din nou oricând pe site-ul nostru.', badTitle: 'Link invalid', badBody: 'Acest link de dezabonare este incomplet sau a fost modificat. Folosește linkul din subsolul ultimului buletin sau răspunde la oricare dintre emailurile noastre și te vom elimina.' },
  ru: { confirmTitle: 'Отписаться от рассылки?', confirmBody: 'перестанет получать нашу еженедельную рассылку.', button: 'Да, отписаться', doneTitle: 'Вы отписались', doneBody: 'Вы больше не будете получать еженедельную рассылку. Подписаться снова можно в любой момент на нашем сайте.', badTitle: 'Недействительная ссылка', badBody: 'Эта ссылка для отписки неполная или была изменена. Воспользуйтесь ссылкой внизу последней рассылки или ответьте на любое наше письмо — мы вас удалим.' },
  ar: { confirmTitle: 'إلغاء الاشتراك في النشرة؟', confirmBody: 'لن يتلقّى نشرتنا الأسبوعية بعد الآن.', button: 'نعم، ألغِ اشتراكي', doneTitle: 'تم إلغاء اشتراكك', doneBody: 'لن تصلك النشرة الأسبوعية بعد الآن. يمكنك الاشتراك مجددًا في أي وقت عبر موقعنا.', badTitle: 'الرابط غير صالح', badBody: 'رابط إلغاء الاشتراك هذا غير مكتمل أو تم تعديله. يُرجى استخدام الرابط في أسفل آخر نشرة، أو الرد على أي من رسائلنا وسنحذفك من القائمة.' },
};

const mask = (email: string) => { const [u, d] = email.split('@'); return `${u.slice(0, 1)}•••@${d}`; };

function page(locale: Locale, title: string, bodyHtml: string, status = 200): Response {
  const html = `<!doctype html><html lang="${locale}" dir="${dir(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#F6F1E7;color:#16181C;font-family:Georgia,'Times New Roman',serif;display:flex;min-height:100vh;align-items:center;justify-content:center}
.card{background:#fff;border:1px solid #e7e0d2;max-width:460px;width:calc(100% - 32px);padding:36px;text-align:center;border-radius:4px}
h1{color:#0B0E11;font-size:22px;margin:0 0 12px}p{font-size:16px;line-height:1.6;color:#3a3a3a;margin:0 0 16px}
.b{background:#0B0E11;color:#C9A24C;padding:16px;letter-spacing:3px;font-weight:700;margin:-36px -36px 24px;border-radius:4px 4px 0 0}
button{background:#0B0E11;color:#C9A24C;border:0;padding:12px 26px;font:inherit;font-weight:700;letter-spacing:.04em;border-radius:2px;cursor:pointer}</style></head>
<body><div class="card"><div class="b">CYPRUS&nbsp;LIFESTYLE</div><h1>${escapeHtml(title)}</h1>${bodyHtml}</div></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function parse(req: NextRequest): { email: string; token: string; locale: Locale; valid: boolean } {
  const q = new URL(req.url).searchParams;
  const l = q.get('l') || 'en';
  const locale: Locale = isLocale(l) ? l : 'en';
  const email = decodeEmailParam(q.get('e') || '');
  const token = (q.get('t') || '').trim();
  return { email, token, locale, valid: !!email && verifyUnsubscribeToken(email, token, unsubscribeSecret()) };
}

export async function GET(req: NextRequest) {
  const { email, locale, valid } = parse(req);
  const c = COPY[locale];
  if (!valid) return page(locale, c.badTitle, `<p>${escapeHtml(c.badBody)}</p>`, 400);
  return page(locale, c.confirmTitle, `<p><b dir="ltr">${escapeHtml(mask(email))}</b> ${escapeHtml(c.confirmBody)}</p><form method="post" action="${escapeHtml(new URL(req.url).pathname + new URL(req.url).search)}"><button type="submit">${escapeHtml(c.button)}</button></form>`);
}

export async function POST(req: NextRequest) {
  const { email, locale, valid } = parse(req);
  const c = COPY[locale];
  if (!valid) return page(locale, c.badTitle, `<p>${escapeHtml(c.badBody)}</p>`, 400);
  const { error } = await supabaseAdmin().from('newsletter_subscribers')
    .update({ is_active: false, unsubscribed_at: new Date().toISOString() }).eq('email', email);
  if (error) return page(locale, c.badTitle, `<p>${escapeHtml(c.badBody)}</p>`, 500);
  return page(locale, c.doneTitle, `<p>${escapeHtml(c.doneBody)}</p>`);
}
