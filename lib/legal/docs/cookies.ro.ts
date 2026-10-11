import type { LegalDoc } from '@/lib/legal/types';

export const cookiesRo: LegalDoc = {
  title: 'Politica privind cookie-urile',
  dek: 'Ce cookie-uri și stocare similară în browser folosește Cyprus Lifestyle, de ce, cât timp și cum rămâneți în control.',
  sections: [
    { h: '1. Ce acoperă această politică', p: [
      'Politica explică cookie-urile, stocarea în browser (precum localStorage) și tehnologiile similare folosite pe {site}. Se întemeiază pe Directiva ePrivacy 2002/58/CE, transpusă în Cipru prin Legea 112(I)/2004 privind reglementarea comunicațiilor electronice și a serviciilor poștale, și pe GDPR. Modul general de prelucrare a datelor personale este descris în Politica de confidențialitate.',
    ] },
    { h: '2. Cum funcționează consimțământul pe acest site', p: [
      'La prima vizită, o notificare vă cere să acceptați sau să refuzați. Până alegeți, și dacă refuzați, nu încărcăm analiză opțională și nici scripturi de urmărire ale partenerilor. Alegerea este stocată în browser (intrarea cl-consent), iar notificarea nu mai revine. Elementele necesare și funcționale din secțiunile 3 și 4 nu cer consimțământ, fiind folosite doar pentru a furniza ceva ce ați cerut (de ex. limba aleasă sau autentificarea ca membru).',
    ] },
    { h: '3. Cookie-uri pe care le setăm', p: ['Nu sunt folosite pentru publicitate sau urmărire între site-uri.'], li: [
      'NEXT_LOCALE: reține limba aleasă cu selectorul de limbă. Setat de browser când alegeți o limbă; 1 an.',
      'cl_member: vă păstrează autentificat ca membru (și vă dă culoarul prioritar al membrilor). HttpOnly, Secure, SameSite=Lax; setat doar când vă autentificați sau vă restaurați abonamentul; până la 30 de zile, reînnoit cât folosiți site-ul; șters la deconectare.',
      'cl_business: păstrează autentificat un proprietar de firmă în zona contului de firmă. HttpOnly, Secure, SameSite=Lax; 14 zile.',
      'cl_owner_sess: o sesiune scurtă de editare pentru proprietarul unei fișe din director care a deschis un link de gestionare primit pe e-mail. HttpOnly, Secure, SameSite=Lax; 60 de minute.',
      'Cookie-urile de autentificare ale personalului (Supabase) se setează doar pentru redacția noastră, în zona de administrare, niciodată pentru cititorii obișnuiți.',
    ] },
    { h: '4. Stocarea în browser (localStorage) pe care o folosim', p: ['Stocată doar pe dispozitivul dumneavoastră; nu este folosită pentru urmărire pe alte site-uri.'], li: [
      'cl-consent: alegerea dumneavoastră (accept/refuz). Păstrată până o ștergeți.',
      'cl_cid: un identificator anonim aleatoriu al browserului, creat când folosiți concierge-ul, pagina de abonament sau contul. Permite concierge-ului să rețină preferințele, recunoaște abonamentul pe acest dispozitiv și numără clicurile pe butoanele noastre de acțiune. Păstrat până îl ștergeți; membrii pot șterge memoria legată de el.',
      'cl_voiceout: dacă ați activat citirea cu voce tare a concierge-ului.',
      'cl:recent: ultimele articole și fișe vizualizate (până la 12), afișate ca „vizualizate recent”. Nu ne sunt trimise niciodată.',
      'cl:saved-places: locurile salvate pe hartă. Nu ne sunt trimise niciodată.',
    ] },
    { h: '5. Elemente opționale, doar după acceptarea dumneavoastră', li: [
      'Vercel Web Analytics: numără vizualizări de pagini, referitori și, aproximativ, țara/dispozitivul, fără profiluri publicitare. Potrivit Vercel, funcționează fără cookie-uri. Se încarcă doar după acceptare.',
      'Vercel Speed Insights: măsoară performanța de încărcare pentru ca site-ul să rămână rapid. Potrivit Vercel, funcționează fără cookie-uri. Se încarcă doar după acceptare.',
      'Scriptul partenerului GetYourGuide (widget.getyourguide.com): necesar pentru afișarea widgeturilor de experiențe GetYourGuide și pentru atribuirea rezervărilor făcute prin ele. GetYourGuide poate seta propriile cookie-uri sau identificatori. Se încarcă doar după acceptare; până atunci apare un simplu link de partener.',
    ] },
    { h: '6. Conținut terț care se încarcă fără notificare', p: ['Unele funcții încarcă conținut direct de la alte companii atunci când pagina îl cere. Acestea primesc adresa dumneavoastră IP și date tehnice și pot seta sau citi propriile cookie-uri, conform propriilor politici. Le puteți evita nedeschizând pagina sau funcția respectivă.'], li: [
      'Pagina Live: playere încorporate de meteo și webcam de la Windy și YouTube (youtube-nocookie.com, Google).',
      'Hărți: biblioteca de hărți (jsDelivr) și dalele de hartă (CARTO) când deschideți o hartă.',
      'Pagini de plată și facturare: casa de plată și portalul clienților găzduite de Stripe, când vă abonați sau gestionați facturarea.',
      'Linkuri externe (de ex. indicații Google Maps, GetYourGuide, site-uri partenere) doar când dați clic pe ele.',
    ] },
    { h: '7. Schimbarea alegerii și setările browserului', p: [
      'Puteți redeschide oricând alegerea prin linkul „Setări cookie-uri” din subsol sau ștergând datele acestui site în browser, după care notificarea reapare. Puteți bloca sau șterge cookie-uri și stocarea site-urilor din setările browserului; blocarea elementelor necesare poate opri autentificarea, memorarea limbii sau memoria concierge-ului.',
    ] },
    { h: '8. Actualizări și contact', p: ['Actualizăm politica atunci când adăugăm sau eliminăm cookie-uri ori instrumente și afișăm data sus. Întrebări: {privacy_mail}.'] },
  ],
};
