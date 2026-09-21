// POST /api/concierge/request  { q, answer?, picks?, name?, email?, phone?, note?, locale? }
// Captures an "Ask the island" request so it LANDS somewhere real and ACTIONABLE.
//
// The backend — the admin Concierge Requests inbox — is the system of record.
// Every request is:
//   1. classified (category · district · tier) with the same multilingual brain
//      the concierge chat uses, so the desk sees WHAT and WHERE at a glance;
//   2. auto-matched to specialists server-side when the guest submitted "cold"
//      (no chat picks), so a request is never an empty lead — premium requests
//      get the luxury houses first (the tier travels with the client);
//   3. recorded in concierge_requests (the durable queue), then
//   4. announced to the right desk by email — luxury desk vs standard desk —
//      as a best-effort notification only. Email never gates the record.
// The guest, if they left an email, gets an instant on-brand acknowledgement in
// their own language, elevated for premium requests.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { sendEmail, brandedEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';
import { classifyRequest, matchForRequest } from '@/lib/concierge/brain';

export const runtime = 'nodejs';

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

// Guest auto-acknowledgement, localised into all seven languages (no English
// fallback). Sent the moment a guest leaves an email, so a request is never a
// silent void: they get an instant, on-brand confirmation while the desk follows
// up. `premium` is appended when the request reads as high-end, so the glamour
// tier feels seen from the first reply. Dormant until RESEND_API_KEY + EMAIL_FROM
// are set (sendEmail no-ops safely).
interface Ack { subject: string; heading: string; greetingNamed: string; greeting: string; intro: string; premium: string; picksIntro: string; closing: string; cta: string; }
const ACK: Record<Locale, Ack> = {
  en: { subject: "We've received your request — Cyprus Lifestyle", heading: 'Your request is in good hands', greetingNamed: 'Dear {name},', greeting: 'Hello,', intro: "Thank you for reaching out to Cyprus Lifestyle. We've received your request and our concierge will personally get back to you, usually within one business day.", premium: 'Your request has been passed to our private client desk, which curates only the finest addresses on the island.', picksIntro: 'In the meantime, a few places from our directory that may suit:', closing: 'Warm regards,<br>The Cyprus Lifestyle Concierge', cta: 'Explore Cyprus Lifestyle' },
  el: { subject: 'Λάβαμε το αίτημά σας — Cyprus Lifestyle', heading: 'Το αίτημά σας είναι σε καλά χέρια', greetingNamed: 'Αγαπητέ/ή {name},', greeting: 'Γεια σας,', intro: 'Σας ευχαριστούμε που επικοινωνήσατε με το Cyprus Lifestyle. Λάβαμε το αίτημά σας και ο concierge μας θα επικοινωνήσει προσωπικά μαζί σας, συνήθως εντός μίας εργάσιμης ημέρας.', premium: 'Το αίτημά σας διαβιβάστηκε στο γραφείο ιδιωτών πελατών μας, που επιμελείται μόνο τις πιο εκλεκτές διευθύνσεις του νησιού.', picksIntro: 'Στο μεταξύ, μερικές επιλογές από τον κατάλογό μας που ίσως ταιριάζουν:', closing: 'Με εκτίμηση,<br>Ο Concierge του Cyprus Lifestyle', cta: 'Ανακαλύψτε το Cyprus Lifestyle' },
  ro: { subject: 'Am primit solicitarea dumneavoastră — Cyprus Lifestyle', heading: 'Solicitarea dumneavoastră este pe mâini bune', greetingNamed: 'Stimate/ă {name},', greeting: 'Bună ziua,', intro: 'Vă mulțumim că ați contactat Cyprus Lifestyle. Am primit solicitarea dumneavoastră, iar concierge-ul nostru vă va răspunde personal, de obicei în maximum o zi lucrătoare.', premium: 'Solicitarea dumneavoastră a fost transmisă biroului nostru pentru clienți privați, care selectează doar cele mai rafinate adrese de pe insulă.', picksIntro: 'Între timp, câteva opțiuni din directorul nostru care s-ar putea potrivi:', closing: 'Cu stimă,<br>Concierge Cyprus Lifestyle', cta: 'Descoperiți Cyprus Lifestyle' },
  ar: { subject: 'لقد استلمنا طلبك — Cyprus Lifestyle', heading: 'طلبك بين أيادٍ أمينة', greetingNamed: 'عزيزي {name}،', greeting: 'مرحباً،', intro: 'شكراً لتواصلك مع Cyprus Lifestyle. لقد استلمنا طلبك وسيتواصل معك الكونسيرج لدينا شخصياً، عادةً خلال يوم عمل واحد.', premium: 'تمّت إحالة طلبك إلى مكتب عملائنا الخاصّين، الذي ينتقي أرقى العناوين في الجزيرة حصراً.', picksIntro: 'في هذه الأثناء، إليك بعض الخيارات من دليلنا التي قد تناسبك:', closing: 'مع خالص التقدير،<br>كونسيرج Cyprus Lifestyle', cta: 'اكتشف Cyprus Lifestyle' },
  de: { subject: 'Wir haben Ihre Anfrage erhalten — Cyprus Lifestyle', heading: 'Ihre Anfrage ist in guten Händen', greetingNamed: 'Sehr geehrte(r) {name},', greeting: 'Guten Tag,', intro: 'Vielen Dank für Ihre Kontaktaufnahme mit Cyprus Lifestyle. Wir haben Ihre Anfrage erhalten und unser Concierge wird sich persönlich bei Ihnen melden, in der Regel innerhalb eines Werktages.', premium: 'Ihre Anfrage wurde an unser Private-Client-Desk weitergeleitet, das ausschließlich die feinsten Adressen der Insel kuratiert.', picksIntro: 'In der Zwischenzeit einige passende Adressen aus unserem Verzeichnis:', closing: 'Herzliche Grüße,<br>Ihr Cyprus-Lifestyle-Concierge', cta: 'Cyprus Lifestyle entdecken' },
  pl: { subject: 'Otrzymaliśmy Twoje zgłoszenie — Cyprus Lifestyle', heading: 'Twoje zgłoszenie jest w dobrych rękach', greetingNamed: 'Szanowny/a {name},', greeting: 'Dzień dobry,', intro: 'Dziękujemy za kontakt z Cyprus Lifestyle. Otrzymaliśmy Twoje zgłoszenie, a nasz concierge skontaktuje się z Tobą osobiście, zwykle w ciągu jednego dnia roboczego.', premium: 'Twoje zgłoszenie zostało przekazane do naszego biura klienta prywatnego, które dobiera wyłącznie najlepsze adresy na wyspie.', picksIntro: 'W międzyczasie kilka propozycji z naszego katalogu, które mogą pasować:', closing: 'Z poważaniem,<br>Concierge Cyprus Lifestyle', cta: 'Odkryj Cyprus Lifestyle' },
  ru: { subject: 'Мы получили ваш запрос — Cyprus Lifestyle', heading: 'Ваш запрос в надёжных руках', greetingNamed: 'Уважаемый(ая) {name},', greeting: 'Здравствуйте,', intro: 'Благодарим за обращение в Cyprus Lifestyle. Мы получили ваш запрос, и наш консьерж свяжется с вами лично, как правило, в течение одного рабочего дня.', premium: 'Ваш запрос передан в отдел частных клиентов, который отбирает только самые изысканные адреса на острове.', picksIntro: 'А пока — несколько вариантов из нашего каталога, которые могут подойти:', closing: 'С уважением,<br>Консьерж Cyprus Lifestyle', cta: 'Открыть Cyprus Lifestyle' },
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true });
  if (!(await rateLimit(req, 'concierge-request'))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }

  const query = String(body.q || '').trim().slice(0, 500);
  if (query.length < 3) return NextResponse.json({ ok: false, error: 'Nothing to send yet.' }, { status: 400 });
  const answer = String(body.answer || '').trim().slice(0, 2000) || null;
  const name = String(body.name || '').trim().slice(0, 120) || null;
  const email = String(body.email || '').trim().toLowerCase() || null;
  const phone = String(body.phone || '').trim().slice(0, 40) || null;
  const note = String(body.note || '').trim().slice(0, 2000) || null;
  const locale: Locale = isLocale(String(body.locale)) ? (body.locale as Locale) : 'en';
  const rawPicks: Record<string, unknown>[] = Array.isArray(body.picks) ? (body.picks as Record<string, unknown>[]) : [];
  let picks = rawPicks.slice(0, 8)
    .map((p) => ({ slug: String(p.slug || ''), name: String(p.name || ''), why: String(p.why || '') }))
    .filter((p) => p.slug);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'That email doesn’t look right.' }, { status: 400 });
  }

  // Classify the request with the shared multilingual brain: best-guess service
  // category, district and tier (premium vs standard). Pure + fast, no I/O.
  const { category, district, tier } = classifyRequest(`${query}\n${note || ''}`);

  // If the guest submitted "cold" (no picks from the chat), auto-match specialists
  // server-side so the desk opens a fully-worked lead, not an empty one. Premium
  // requests are matched luxury-first. Best-effort — a match failure never blocks
  // the record, and genuinely finding nothing is what marks a real demand gap.
  let autoMatched = false;
  if (picks.length === 0) {
    try {
      const matched = await matchForRequest(locale, `${query} ${note || ''}`.trim(), tier, 6);
      if (matched.length) {
        picks = matched.map((p) => ({ slug: p.slug, name: p.name || '', why: [p.subtype || p.type, p.district].filter(Boolean).join(' · ') }));
        autoMatched = true;
      }
    } catch { /* directory unavailable — leave picks empty (a true gap) */ }
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from('concierge_requests').insert({
    query, answer, picks: picks.length ? picks : null,
    name, email, phone, note, locale, category, district, tier, status: 'new',
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  // Notify the right desk (best-effort — the request is safely recorded either way).
  // Premium requests go to the private-client desk when one is configured; both
  // tiers fall back through the shared inboxes so a request is never lost. Set
  // CONCIERGE_INBOX (standard) and CONCIERGE_INBOX_LUXURY (private-client) to route.
  const luxuryTo = process.env.CONCIERGE_INBOX_LUXURY || process.env.LUXURY_DESK || '';
  const standardTo = process.env.CONCIERGE_INBOX || '';
  const fallbackTo = process.env.DIRECTORY_INBOX || process.env.ADVERTISE_INBOX || process.env.EMAIL_FROM || '';
  const to = ((tier === 'premium' ? (luxuryTo || standardTo) : standardTo) || fallbackTo);
  if (to) {
    const tierTag = tier === 'premium' ? '★ PREMIUM' : 'standard';
    const meta = [category, district].filter(Boolean).map((v) => esc(String(v))).join(' · ');
    const picksHtml = picks && picks.length
      ? `<p><strong>${autoMatched ? 'Auto-matched' : 'Suggested'}:</strong> ${picks.map((p) => esc(p.name || p.slug)).join(', ')}</p>`
      : '<p><em>No directory match — a demand gap to fill.</em></p>';
    const html = brandedEmail({
      locale: 'en',
      heading: tier === 'premium' ? 'New PREMIUM concierge request' : 'New concierge request',
      bodyHtml:
        `<p style="font-size:17px"><strong>${esc(query)}</strong></p>` +
        `<p style="opacity:.75">Tier: <strong>${tierTag}</strong>${meta ? ` &nbsp;·&nbsp; ${meta}` : ''}</p>` +
        (name || email || phone
          ? `<p>${[name, email, phone].filter(Boolean).map((v) => esc(String(v))).join(' · ')}</p>`
          : '<p><em>No contact left — demand signal.</em></p>') +
        (note ? `<p>${esc(note)}</p>` : '') + picksHtml +
        `<p style="opacity:.6;font-size:13px">Work this request in the admin panel → Concierge Requests. This email is a notification; the panel is the queue.</p>`,
      preheader: `${tierTag} · ${query.slice(0, 70)}`,
    });
    await sendEmail({ to, subject: `${tier === 'premium' ? '★ PREMIUM ' : ''}Concierge request — ${query.slice(0, 56)}`, html, replyTo: email || undefined }).catch(() => {});
  }

  // Auto-acknowledge the guest (only if they left an email), in their language,
  // with the suggested picks so they get value immediately. Premium requests get
  // an elevated line. Best-effort.
  if (email) {
    const t = ACK[locale] || ACK.en;
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.com').replace(/\/$/, '');
    const ctaUrl = locale === 'en' ? base : `${base}/${locale}`;
    const greeting = name ? t.greetingNamed.replace('{name}', esc(name)) : t.greeting;
    const premiumLine = tier === 'premium' ? `<p style="margin-top:14px">${t.premium}</p>` : '';
    const picksList = picks.length
      ? `<p style="margin-top:18px">${t.picksIntro}</p><ul style="padding-inline-start:20px;margin:8px 0">${picks.map((p) => `<li style="margin:4px 0">${esc(p.name || p.slug)}</li>`).join('')}</ul>`
      : '';
    const guestHtml = brandedEmail({
      locale,
      heading: t.heading,
      bodyHtml: `<p>${greeting}</p><p>${t.intro}</p>${premiumLine}<p style="opacity:.7;font-style:italic">&ldquo;${esc(query)}&rdquo;</p>${picksList}<p style="margin-top:18px">${t.closing}</p>`,
      ctaLabel: t.cta,
      ctaUrl,
      preheader: t.heading,
    });
    await sendEmail({ to: email, subject: t.subject, html: guestHtml }).catch(() => {});
  }

  return NextResponse.json({ ok: true, tier });
}
