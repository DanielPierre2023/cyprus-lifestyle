'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/honeypot';

// The enquiry classes the form offers. Values are stable enums; labels are localized
// below. Kept in-component (a bounded set) so this feature ships without editing the
// seven message files — migrate into next-intl later if desired.
const CLASSES = ['concierge', 'feature', 'advertising', 'event', 'press'] as const;
type Loc = 'en' | 'el' | 'ro' | 'ar' | 'de' | 'pl' | 'ru';
type Labels = { topic: string; phone: string; district: string; opts: Record<(typeof CLASSES)[number], string> };

const L: Record<Loc, Labels> = {
  en: { topic: "I'm writing about", phone: 'Phone / WhatsApp (optional)', district: 'District (optional)', opts: { concierge: 'Concierge — a personal request', feature: 'Being featured in the magazine', advertising: 'Advertising & partnership', event: 'An event or launch', press: 'Press & media' } },
  el: { topic: 'Το αίτημά μου αφορά', phone: 'Τηλέφωνο / WhatsApp (προαιρετικό)', district: 'Επαρχία (προαιρετικό)', opts: { concierge: 'Κονσιέρζ — προσωπικό αίτημα', feature: 'Προβολή στο περιοδικό', advertising: 'Διαφήμιση & συνεργασία', event: 'Εκδήλωση ή launch', press: 'Τύπος & ΜΜΕ' } },
  ro: { topic: 'Scriu în legătură cu', phone: 'Telefon / WhatsApp (opțional)', district: 'District (opțional)', opts: { concierge: 'Concierge — o solicitare personală', feature: 'Apariție în revistă', advertising: 'Publicitate & parteneriat', event: 'Un eveniment sau o lansare', press: 'Presă & media' } },
  ar: { topic: 'أكتب بخصوص', phone: 'الهاتف / واتساب (اختياري)', district: 'المنطقة (اختياري)', opts: { concierge: 'الكونسيرج — طلب شخصي', feature: 'الظهور في المجلة', advertising: 'الإعلان والشراكة', event: 'فعالية أو إطلاق', press: 'الصحافة والإعلام' } },
  de: { topic: 'Ich schreibe wegen', phone: 'Telefon / WhatsApp (optional)', district: 'Bezirk (optional)', opts: { concierge: 'Concierge — eine persönliche Anfrage', feature: 'Ein Porträt im Magazin', advertising: 'Werbung & Partnerschaft', event: 'Eine Veranstaltung oder ein Launch', press: 'Presse & Medien' } },
  pl: { topic: 'Piszę w sprawie', phone: 'Telefon / WhatsApp (opcjonalnie)', district: 'Region (opcjonalnie)', opts: { concierge: 'Concierge — prośba osobista', feature: 'Publikacja w magazynie', advertising: 'Reklama i partnerstwo', event: 'Wydarzenie lub premiera', press: 'Prasa i media' } },
  ru: { topic: 'Я пишу по поводу', phone: 'Телефон / WhatsApp (необязательно)', district: 'Район (необязательно)', opts: { concierge: 'Консьерж — личный запрос', feature: 'Материал в журнале', advertising: 'Реклама и партнёрство', event: 'Мероприятие или запуск', press: 'Пресса и медиа' } },
};

export default function ContactForm() {
  const t = useTranslations('contactForm');
  const locale = useLocale();
  const lx = L[(locale as Loc)] || L.en;
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '', requestClass: '', phone: '', district: '' });
  const [hp, setHp] = useState(''); // honeypot — must stay empty for a real person
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState('sending');
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, [HONEYPOT_FIELD]: hp, locale }) });
    setState(res.ok ? 'done' : 'error');
  }
  if (state === 'done') return <p className="gold cform" style={{ textAlign: 'center' }}>{t('success')}</p>;
  return (
    <form className="cform" onSubmit={submit}>
      <HoneypotField value={hp} onChange={setHp} />
      <input placeholder={t('name')} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input type="email" placeholder={t('email')} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <select required aria-label={lx.topic} value={f.requestClass} onChange={(e) => setF({ ...f, requestClass: e.target.value })}>
        <option value="" disabled>{lx.topic}</option>
        {CLASSES.map((c) => <option key={c} value={c}>{lx.opts[c]}</option>)}
      </select>
      <input placeholder={lx.phone} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input placeholder={lx.district} value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} />
      <input placeholder={t('subject')} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
      <textarea placeholder={t('message')} required rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      <button className="btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? t('sending') : t('send')}</button>
      {state === 'error' ? <p className="note" style={{ color: '#b00020' }}>{t('error')}</p> : null}
    </form>
  );
}
