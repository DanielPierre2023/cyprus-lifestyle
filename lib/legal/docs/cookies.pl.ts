import type { LegalDoc } from '@/lib/legal/types';

export const cookiesPl: LegalDoc = {
  title: 'Polityka cookies',
  dek: 'Jakich plików cookie i podobnej pamięci przeglądarki używa Cyprus Lifestyle, po co, na jak długo i jak zachować kontrolę.',
  sections: [
    { h: '1. Czego dotyczy ta polityka', p: [
      'Polityka wyjaśnia pliki cookie, pamięć przeglądarki (np. localStorage) i podobne technologie używane w serwisie {site}. Opiera się na dyrektywie ePrivacy 2002/58/WE, wdrożonej na Cyprze ustawą 112(I)/2004 o regulacji łączności elektronicznej i usług pocztowych, oraz na RODO. Ogólne zasady przetwarzania danych osobowych opisuje Polityka prywatności.',
    ] },
    { h: '2. Jak działa zgoda w tym serwisie', p: [
      'Przy pierwszej wizycie komunikat prosi o akceptację lub odrzucenie. Dopóki nie wybierzesz, a także po odrzuceniu, nie ładujemy opcjonalnej analityki ani skryptów śledzących partnerów. Twój wybór zapisuje się w przeglądarce (wpis cl-consent), a komunikat nie wraca. Elementy niezbędne i funkcjonalne z pkt 3 i 4 nie wymagają zgody, bo służą wyłącznie do dostarczenia tego, o co prosisz (np. wybrany język lub logowanie jako członek).',
    ] },
    { h: '3. Ustawiane przez nas pliki cookie', p: ['Nie służą do reklamy ani śledzenia między witrynami.'], li: [
      'NEXT_LOCALE: pamięta język wybrany przełącznikiem języka. Ustawiany przez przeglądarkę po wyborze języka; 1 rok.',
      'cl_member: utrzymuje logowanie członka (i daje priorytetowy tor dla członków). HttpOnly, Secure, SameSite=Lax; ustawiany tylko przy logowaniu lub przywracaniu członkostwa; do 30 dni, odnawiany podczas korzystania z serwisu; usuwany po wylogowaniu.',
      'cl_business: utrzymuje logowanie właściciela firmy w strefie konta firmowego. HttpOnly, Secure, SameSite=Lax; 14 dni.',
      'cl_owner_sess: krótka sesja edycji dla właściciela wpisu w katalogu, który otworzył link zarządzania z e-maila. HttpOnly, Secure, SameSite=Lax; 60 minut.',
      'Pliki cookie logowania personelu (Supabase) ustawiamy tylko dla naszej redakcji w panelu administracyjnym, nigdy zwykłym czytelnikom.',
    ] },
    { h: '4. Używana pamięć przeglądarki (localStorage)', p: ['Przechowywana tylko na Twoim urządzeniu; nie służy do śledzenia na innych stronach.'], li: [
      'cl-consent: Twój wybór (akceptuję/odrzucam). Do czasu jego usunięcia.',
      'cl_cid: anonimowy losowy identyfikator przeglądarki, tworzony, gdy korzystasz z concierge, strony członkostwa lub konta. Pozwala concierge pamiętać preferencje, rozpoznaje członkostwo na tym urządzeniu i zlicza kliknięcia w nasze przyciski wezwania do działania. Do czasu usunięcia; członkowie mogą usunąć powiązaną z nim pamięć.',
      'cl_voiceout: czy włączono czytanie na głos concierge.',
      'cl:recent: ostatnio oglądane artykuły i wpisy (do 12), pokazywane Ci jako „ostatnio oglądane”. Nigdy nie wysyłane do nas.',
      'cl:saved-places: miejsca zapisane na mapie. Nigdy nie wysyłane do nas.',
    ] },
    { h: '5. Elementy opcjonalne, tylko po Twojej akceptacji', li: [
      'Vercel Web Analytics: zlicza odsłony, odesłania i z grubsza kraj/urządzenie, bez profili reklamowych. Według Vercel działa bez plików cookie. Ładowany dopiero po akceptacji.',
      'Vercel Speed Insights: mierzy szybkość ładowania stron, byśmy mogli utrzymać szybkość serwisu. Według Vercel działa bez plików cookie. Ładowany dopiero po akceptacji.',
      'Skrypt partnerski GetYourGuide (widget.getyourguide.com): potrzebny do wyświetlania widżetów atrakcji GetYourGuide i przypisania rezerwacji dokonanych przez nie. GetYourGuide może ustawiać własne pliki cookie lub identyfikatory. Ładowany dopiero po akceptacji; wcześniej pokazujemy zwykły link partnerski.',
    ] },
    { h: '6. Treści stron trzecich ładowane bez komunikatu', p: ['Niektóre funkcje ładują treści bezpośrednio od innych firm, gdy strona ich potrzebuje. Firmy te otrzymują Twój adres IP i dane techniczne i mogą ustawiać lub odczytywać własne pliki cookie, według własnych polityk. Możesz tego uniknąć, nie otwierając danej strony lub funkcji.'], li: [
      'Strona Live: osadzone odtwarzacze pogody i kamer internetowych Windy i YouTube (youtube-nocookie.com, Google).',
      'Mapy: biblioteka map (jsDelivr) i kafelki map (CARTO) po otwarciu mapy.',
      'Strony płatności i rozliczeń: kasa i portal klienta hostowane przez Stripe, gdy subskrybujesz lub zarządzasz rozliczeniami.',
      'Linki wychodzące (np. wskazówki dojazdu Google Maps, GetYourGuide, strony partnerów) tylko po kliknięciu.',
    ] },
    { h: '7. Zmiana wyboru i ustawienia przeglądarki', p: [
      'Wybór możesz w każdej chwili otworzyć ponownie linkiem „Ustawienia cookies” w stopce lub usuwając dane tej witryny w przeglądarce – komunikat pojawi się wtedy znowu. Możesz też zablokować lub usunąć pliki cookie i pamięć witryn w ustawieniach przeglądarki; blokada elementów niezbędnych może zakłócić logowanie, zapamiętanie języka lub pamięć concierge.',
    ] },
    { h: '8. Aktualizacje i kontakt', p: ['Aktualizujemy politykę, gdy dodajemy lub usuwamy pliki cookie lub narzędzia, a datę podajemy na górze. Pytania: {privacy_mail}.'] },
  ],
};
