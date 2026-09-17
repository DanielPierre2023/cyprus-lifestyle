'use client';
import { useEffect, useState } from 'react';

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

type Dict = {
  packages: string; alacarte: string; getStarted: string; quote: string; from: string;
  popular: string; secure: string; unit: Record<string, string>;
  founding: string; off: string; foundingNote: string;
  formTitle: string; fName: string; fEmail: string; fCompany: string; fMessage: string;
  send: string; sending: string; ok: string; err: string; close: string;
  successBanner: string; cancelBanner: string;
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
  },
  el: {
    packages: 'Επιλέξτε συνεργασία', alacarte: 'Ανά τοποθέτηση', getStarted: 'Ξεκινήστε', quote: 'Ζητήστε προσφορά', from: 'από',
    popular: 'Δημοφιλέστερο', secure: 'Ασφαλής πληρωμή · ακύρωση ανά πάσα στιγμή',
    unit: { 'per month': '/ μήνα', 'per year': '/ έτος', 'per feature': '/ αφιέρωμα', 'per send': '/ αποστολή', 'per event': '/ εκδήλωση' },
    founding: 'Τιμή ιδρυτικού μέλους', off: 'κερδίστε', foundingNote: 'Ιδρυτική προσφορά — οι πρώτες 100 επιχειρήσεις κλειδώνουν αυτή την τιμή για όσο παραμένουν, ακόμη κι όταν οι τιμές αυξηθούν. Οι τιμές δεν περιλαμβάνουν ΦΠΑ.',
    formTitle: 'Ζητήστε προσφορά', fName: 'Το όνομά σας', fEmail: 'Το email σας', fCompany: 'Εταιρεία (προαιρετικό)', fMessage: 'Τι αναζητάτε; (προαιρετικό)',
    send: 'Αποστολή', sending: 'Αποστολή…', ok: 'Ευχαριστούμε — θα επικοινωνήσουμε σύντομα.', err: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.', close: 'Κλείσιμο',
    successBanner: 'Ευχαριστούμε — η τοποθέτησή σας επιβεβαιώθηκε. Καλώς ήρθατε.', cancelBanner: 'Η πληρωμή ακυρώθηκε — δεν έγινε καμία χρέωση.',
  },
  ro: {
    packages: 'Alegeți un parteneriat', alacarte: 'La bucată', getStarted: 'Începeți', quote: 'Cereți o ofertă', from: 'de la',
    popular: 'Cel mai popular', secure: 'Plată securizată · anulare oricând',
    unit: { 'per month': '/ lună', 'per year': '/ an', 'per feature': '/ articol', 'per send': '/ trimitere', 'per event': '/ eveniment' },
    founding: 'Tarif de fondator', off: 'economisiți', foundingNote: 'Lansare de fondatori — primele 100 de firme păstrează acest tarif cât timp rămân, chiar și după creșterea prețurilor. Prețurile nu includ TVA.',
    formTitle: 'Cereți o ofertă', fName: 'Numele dvs.', fEmail: 'Emailul dvs.', fCompany: 'Companie (opțional)', fMessage: 'Ce căutați? (opțional)',
    send: 'Trimiteți', sending: 'Se trimite…', ok: 'Mulțumim — vă contactăm în curând.', err: 'Ceva nu a mers. Încercați din nou.', close: 'Închideți',
    successBanner: 'Mulțumim — plasarea dvs. este confirmată. Bine ați venit.', cancelBanner: 'Plată anulată — nu s-a efectuat nicio taxare.',
  },
  ar: {
    packages: 'اختر شراكة', alacarte: 'حسب الموضع', getStarted: 'ابدأ الآن', quote: 'اطلب عرض سعر', from: 'من',
    popular: 'الأكثر رواجًا', secure: 'دفع آمن · يمكن الإلغاء في أي وقت',
    unit: { 'per month': '/ شهريًا', 'per year': '/ سنويًا', 'per feature': '/ مقال', 'per send': '/ إرسال', 'per event': '/ فعالية' },
    founding: 'سعر التأسيس', off: 'وفّر', foundingNote: 'إطلاق تأسيسي — أول 100 شركة تحتفظ بهذا السعر طوال بقائها، حتى بعد ارتفاع الأسعار. الأسعار لا تشمل ضريبة القيمة المضافة.',
    formTitle: 'اطلب عرض سعر', fName: 'اسمك', fEmail: 'بريدك الإلكتروني', fCompany: 'الشركة (اختياري)', fMessage: 'عمّا تبحث؟ (اختياري)',
    send: 'إرسال', sending: 'جارٍ الإرسال…', ok: 'شكرًا لك — سنتواصل معك قريبًا.', err: 'حدث خطأ ما. حاول مرة أخرى.', close: 'إغلاق',
    successBanner: 'شكرًا لك — تم تأكيد موضعك الإعلاني. أهلًا بك.', cancelBanner: 'تم إلغاء الدفع — لم يتم تحصيل أي مبلغ.',
  },
  de: {
    packages: 'Partnerschaft wählen', alacarte: 'Nach Platzierung', getStarted: 'Loslegen', quote: 'Angebot anfordern', from: 'ab',
    popular: 'Am beliebtesten', secure: 'Sichere Zahlung · jederzeit kündbar',
    unit: { 'per month': '/ Monat', 'per year': '/ Jahr', 'per feature': '/ Beitrag', 'per send': '/ Versand', 'per event': '/ Event' },
    founding: 'Gründerpreis', off: 'sparen', foundingNote: 'Gründungsaktion — die ersten 100 Unternehmen sichern sich diesen Preis, solange sie dabeibleiben, auch nach Preiserhöhungen. Preise zzgl. MwSt.',
    formTitle: 'Angebot anfordern', fName: 'Ihr Name', fEmail: 'Ihre E-Mail', fCompany: 'Firma (optional)', fMessage: 'Wonach suchen Sie? (optional)',
    send: 'Anfrage senden', sending: 'Wird gesendet…', ok: 'Vielen Dank — wir melden uns in Kürze.', err: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.', close: 'Schließen',
    successBanner: 'Vielen Dank — Ihre Platzierung ist bestätigt. Willkommen an Bord.', cancelBanner: 'Zahlung abgebrochen — es wurde nichts berechnet.',
  },
  pl: {
    packages: 'Wybierz partnerstwo', alacarte: 'Według miejsca', getStarted: 'Zacznij', quote: 'Poproś o wycenę', from: 'od',
    popular: 'Najpopularniejsze', secure: 'Bezpieczna płatność · rezygnacja w każdej chwili',
    unit: { 'per month': '/ miesiąc', 'per year': '/ rok', 'per feature': '/ artykuł', 'per send': '/ wysyłkę', 'per event': '/ wydarzenie' },
    founding: 'Cena założycielska', off: 'oszczędzasz', foundingNote: 'Oferta założycielska — pierwszych 100 firm zachowuje tę cenę tak długo, jak z nami pozostaną, nawet po podwyżkach. Ceny nie zawierają VAT.',
    formTitle: 'Poproś o wycenę', fName: 'Imię i nazwisko', fEmail: 'Twój e-mail', fCompany: 'Firma (opcjonalnie)', fMessage: 'Czego szukasz? (opcjonalnie)',
    send: 'Wyślij zapytanie', sending: 'Wysyłanie…', ok: 'Dziękujemy — wkrótce się odezwiemy.', err: 'Coś poszło nie tak. Spróbuj ponownie.', close: 'Zamknij',
    successBanner: 'Dziękujemy — Twoja emisja jest potwierdzona. Witamy na pokładzie.', cancelBanner: 'Płatność anulowana — nie pobrano żadnej opłaty.',
  },
  ru: {
    packages: 'Выберите партнёрство', alacarte: 'По размещению', getStarted: 'Начать', quote: 'Запросить смету', from: 'от',
    popular: 'Самое популярное', secure: 'Безопасная оплата · отмена в любой момент',
    unit: { 'per month': '/ месяц', 'per year': '/ год', 'per feature': '/ материал', 'per send': '/ выпуск', 'per event': '/ событие' },
    founding: 'Тариф основателя', off: 'экономия', foundingNote: 'Стартовое предложение — первые 100 компаний сохраняют этот тариф, пока остаются с нами, даже после повышения цен. Цены без НДС.',
    formTitle: 'Запросить смету', fName: 'Ваше имя', fEmail: 'Ваш e-mail', fCompany: 'Компания (необязательно)', fMessage: 'Что вы ищете? (необязательно)',
    send: 'Отправить запрос', sending: 'Отправка…', ok: 'Спасибо — мы скоро свяжемся с вами.', err: 'Что-то пошло не так. Попробуйте ещё раз.', close: 'Закрыть',
    successBanner: 'Спасибо — ваше размещение подтверждено. Добро пожаловать.', cancelBanner: 'Оплата отменена — списание не производилось.',
  },
};

const GOLD = '#C9A24C';

export default function AdvertiseFunnel({ items, locale = 'en', status }: { items: RateItem[]; locale?: string; status?: string }) {
  const d = L[locale] || L.en;
  const nf = new Intl.NumberFormat(locale === 'ar' ? 'ar' : locale, { maximumFractionDigits: 0 });
  const packages = items.filter((i) => i.kind === 'package');
  const alacarte = items.filter((i) => i.kind !== 'package');

  const [quoteFor, setQuoteFor] = useState<RateItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
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

  async function startCheckout(i: RateItem) {
    setBusy(i.slot);
    try {
      const res = await fetch('/api/advertise/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: i.slot, locale }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.ok && j.url) { window.location.href = j.url as string; return; }
      // Not available for self-serve (or Stripe not live yet) → fall back to a quote.
      setQuoteFor(i);
    } catch {
      setQuoteFor(i);
    } finally {
      setBusy(null);
    }
  }

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
                    disabled={busy === i.slot}
                    onClick={() => (i.self_serve ? startCheckout(i) : setQuoteFor(i))}
                    className="btn"
                    style={{ marginTop: 18, width: '100%', background: featured ? GOLD : 'var(--obsidian, #0B0E11)', color: featured ? '#0B0E11' : '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer', fontWeight: 600 }}>
                    {busy === i.slot ? '…' : i.self_serve ? d.getStarted : d.quote}
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
                  disabled={busy === i.slot}
                  onClick={() => (i.self_serve ? startCheckout(i) : setQuoteFor(i))}
                  style={{ background: 'transparent', border: `1px solid ${i.self_serve ? GOLD : 'var(--line, #d9cfb8)'}`, color: 'var(--ink, #171922)', borderRadius: 4, padding: '9px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {busy === i.slot ? '…' : i.self_serve ? d.getStarted : d.quote}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {quoteFor ? <QuoteModal item={quoteFor} locale={locale} d={d} onClose={() => setQuoteFor(null)} /> : null}
    </div>
  );
}

function QuoteModal({ item, locale, d, onClose }: { item: RateItem; locale: string; d: Dict; onClose: () => void }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [f, setF] = useState({ name: '', email: '', company: '', message: '', website: '' }); // website = honeypot

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
        body: JSON.stringify({ ...f, slot: item.slot, label: item.label, locale }),
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
            {/* honeypot */}
            <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} aria-hidden="true" />
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
