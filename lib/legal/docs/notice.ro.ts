import type { LegalDoc } from '@/lib/legal/types';

export const noticeRo: LegalDoc = {
  title: 'Mențiuni legale',
  dek: 'Cine operează Cyprus Lifestyle și cum ne puteți contacta.',
  sections: [
    { h: 'Furnizorul serviciului', p: [
      'Cyprus Lifestyle ({site}) este operat de {company}, societate înregistrată în Republica Cipru (Registrar of Companies) cu numărul {reg}, cu sediul în {town}, Cipru.',
    ] },
    { h: 'Contact', li: [
      'Întrebări generale ale cititorilor: {mail}',
      'Protecția datelor și cereri privind confidențialitatea: {privacy_mail}',
      'Publicitate și parteneriate: {ads_mail}',
    ] },
    { h: 'Conținut și proprietate intelectuală', p: [
      'Textele, imaginile, grafica, siglele și compilația acestui site sunt protejate de dreptul de autor și drepturile conexe și aparțin {company} sau licențiatorilor ei. Puteți citi, distribui linkuri și cita fragmente scurte cu indicarea sursei; orice altă reproducere, extragere automată (scraping) sau reutilizare comercială necesită acordul nostru scris. Conținutul marcat ca sponsorizat sau de parteneriat este identificat ca atare.',
    ] },
    { h: 'Linkuri și răspundere', p: [
      'Ne străduim ca informațiile să fie corecte și actuale, dar nu garantăm caracterul complet. Informațiile despre proprietăți, fiscalitate, rezidență, drept sau sănătate sunt generale și nu constituie consultanță profesională. Site-ul conține linkuri către site-uri terțe și încorporează conținut terț; nu răspundem pentru acesta. Nicio prevedere din această mențiune nu limitează răspunderea care nu poate fi limitată prin lege, inclusiv față de consumatori.',
    ] },
    { h: 'Reclamații ale consumatorilor și soluționarea litigiilor', p: [
      'Vă rugăm să ne contactați mai întâi la {mail}; vom încerca să rezolvăm rapid problema. Platforma europeană de soluționare online a litigiilor (SOL/ODR) a Comisiei Europene a fost închisă la 20 iulie 2025, de aceea nu trimitem la ea. Consumatorii se pot adresa și autorităților competente de protecție a consumatorilor din Cipru sau din țara lor. Nu suntem obligați și nu ne-am angajat să participăm la proceduri extrajudiciare de soluționare a litigiilor în fața entităților ADR pentru consumatori, decât dacă legea o cere.',
    ] },
    { h: 'Documente conexe', p: ['Consultați și Politica de confidențialitate, Termenii și condițiile și Politica privind cookie-urile.'] },
  ],
};
