import type { LegalDoc } from '@/lib/legal/types';

export const noticePl: LegalDoc = {
  title: 'Nota prawna',
  dek: 'Kto prowadzi Cyprus Lifestyle i jak się z nami skontaktować.',
  sections: [
    { h: 'Usługodawca', p: [
      'Serwis Cyprus Lifestyle ({site}) prowadzi {company}, spółka zarejestrowana w Republice Cypryjskiej (Registrar of Companies) pod numerem {reg}, z siedzibą w miejscowości {town} na Cyprze.',
    ] },
    { h: 'Kontakt', li: [
      'Ogólne zapytania czytelników: {mail}',
      'Ochrona danych i wnioski dotyczące prywatności: {privacy_mail}',
      'Reklama i współpraca: {ads_mail}',
    ] },
    { h: 'Treści i własność intelektualna', p: [
      'Teksty, zdjęcia, grafiki, logotypy i układ serwisu są chronione prawem autorskim i prawami pokrewnymi oraz należą do {company} lub jej licencjodawców. Możesz czytać, udostępniać linki i cytować krótkie fragmenty z podaniem źródła; każde inne powielanie, scraping lub komercyjne wykorzystanie wymaga naszej pisemnej zgody. Treści oznaczone jako sponsorowane lub partnerskie są tak wyraźnie oznaczone.',
    ] },
    { h: 'Linki i odpowiedzialność', p: [
      'Dbamy o rzetelność i aktualność informacji, ale nie gwarantujemy ich kompletności. Informacje o nieruchomościach, podatkach, pobycie, prawie czy zdrowiu mają charakter ogólny i nie są poradą zawodową. Serwis zawiera linki do stron osób trzecich i osadza ich treści; nie odpowiadamy za te treści. Nic w tej nocie nie ogranicza odpowiedzialności, której nie można ograniczyć z mocy prawa, także wobec konsumentów.',
    ] },
    { h: 'Reklamacje konsumentów i rozwiązywanie sporów', p: [
      'Prosimy najpierw o kontakt na {mail}; postaramy się szybko rozwiązać sprawę. Platforma internetowego rozstrzygania sporów (ODR) Komisji Europejskiej została zlikwidowana 20 lipca 2025 r., dlatego nie podajemy do niej linku. Konsumenci mogą też zwrócić się do właściwych organów ochrony konsumentów na Cyprze lub w swoim kraju. Nie jesteśmy zobowiązani ani nie zobowiązujemy się do udziału w pozasądowym rozwiązywaniu sporów przed podmiotami ADR dla konsumentów, chyba że wymaga tego prawo.',
    ] },
    { h: 'Powiązane dokumenty', p: ['Zobacz też Politykę prywatności, Regulamin i Politykę cookies.'] },
  ],
};
