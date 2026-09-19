// lib/knowledge/markets.i18n.ts
// Translations of the market-hub copy (kicker/title/intro) for el/ro/ar/de/pl/ru.
// English source lives in ./markets.ts. Machine-assembled from native passes.
import { MARKET_INDEX } from './markets';
import type { KBLoc } from './qa.i18n';

export interface MarketTx { kicker: string; title: string; intro: string; }

export const MARKET_I18N: Record<string, Partial<Record<KBLoc, MarketTx>>> = {
 "russian": {
  "el": {
   "kicker": "Για ρωσόφωνους",
   "title": "Η Κύπρος για ρωσόφωνους",
   "intro": "Άδεια διαμονής και φορολογία, ρωσόφωνοι δικηγόροι και γιατροί, σχολεία για τα παιδιά και το ορθόδοξο εορτολόγιο — όλα όσα χρειάζεστε για μια ζωή που αξίζει, στη Λεμεσό και πέρα από αυτήν."
  },
  "ro": {
   "kicker": "Pentru vorbitorii de limba rusă",
   "title": "Cipru pentru vorbitorii de limba rusă",
   "intro": "Rezidență și impozite, avocați și medici vorbitori de limba rusă, școli pentru copii și calendarul ortodox — tot ce îți trebuie pentru o viață trăită frumos în Limassol și dincolo de el."
  },
  "ar": {
   "kicker": "للناطقين بالروسية",
   "title": "قبرص للناطقين بالروسية",
   "intro": "الإقامة والضرائب، محامون وأطباء يتحدثون الروسية، مدارس للأبناء والتقويم الأرثوذكسي — كل ما يلزم لحياة رغيدة في ليماسول وما وراءها."
  },
  "de": {
   "kicker": "Für Russischsprachige",
   "title": "Zypern für Russischsprachige",
   "intro": "Aufenthalt und Steuern, russischsprachige Anwälte und Ärzte, Schulen für die Kinder und der orthodoxe Kalender — alles für ein erfülltes Leben in Limassol und darüber hinaus."
  },
  "pl": {
   "kicker": "Dla osób rosyjskojęzycznych",
   "title": "Cypr dla osób rosyjskojęzycznych",
   "intro": "Rezydencja i podatki, rosyjskojęzyczni prawnicy i lekarze, szkoły dla dzieci oraz kalendarz prawosławny — wszystko, czego potrzeba do dobrego życia w Limassol i nie tylko."
  },
  "ru": {
   "kicker": "Для русскоязычных",
   "title": "Кипр для русскоязычных",
   "intro": "ВНЖ и налоги, русскоговорящие юристы и врачи, школы для детей и православный календарь — всё для полноценной жизни в Лимасоле и за его пределами."
  }
 },
 "polish": {
  "el": {
   "kicker": "Για επισκέπτες από την Πολωνία",
   "title": "Η Κύπρος για την Πολωνία",
   "intro": "Ζεστή θάλασσα για το μισό χρόνο, παραλίες για όλη την οικογένεια και τίμιες τιμές — μαζί με όλα όσα χρειάζεστε για να σχεδιάσετε το ταξίδι σας, όποια κι αν είναι η εποχή."
  },
  "ro": {
   "kicker": "Pentru vizitatorii din Polonia",
   "title": "Cipru pentru Polonia",
   "intro": "Marea caldă jumătate de an, plaje pentru familii și prețuri corecte — plus tot ce îți trebuie ca să-ți planifici călătoria, în orice anotimp."
  },
  "ar": {
   "kicker": "للزوار القادمين من بولندا",
   "title": "قبرص لبولندا",
   "intro": "بحر دافئ نصف العام، وشواطئ عائلية وقيمة صادقة — إضافة إلى كل ما تحتاجه للتخطيط لرحلتك في أي فصل من فصول السنة."
  },
  "de": {
   "kicker": "Für Gäste aus Polen",
   "title": "Zypern für Polen",
   "intro": "Ein warmes Meer über das halbe Jahr, Strände für die ganze Familie und ehrliche Preise — dazu alles, was Sie für die Reiseplanung brauchen, zu jeder Jahreszeit."
  },
  "pl": {
   "kicker": "Dla gości z Polski",
   "title": "Cypr dla Polski",
   "intro": "Ciepłe morze przez pół roku, rodzinne plaże i uczciwe ceny — a do tego wszystko, czego potrzebujesz, by zaplanować wyjazd o każdej porze roku."
  },
  "ru": {
   "kicker": "Для гостей из Польши",
   "title": "Кипр для Польши",
   "intro": "Тёплое море полгода, семейные пляжи и честные цены — а также всё необходимое, чтобы спланировать поездку в любой сезон."
  }
 },
 "romanian": {
  "el": {
   "kicker": "Για Ρουμάνους στην Κύπρο",
   "title": "Η Κύπρος για Ρουμάνους",
   "intro": "Δουλέψτε και ζήστε στο νησί — άδεια διαμονής, το κόστος ζωής, οι καθημερινές υπηρεσίες που θα χρειαστείτε και η ορθόδοξη κοινότητα που θα σας κάνει να νιώθετε σαν στο σπίτι σας."
  },
  "ro": {
   "kicker": "Pentru românii din Cipru",
   "title": "Cipru pentru români",
   "intro": "Muncește și trăiește pe insulă — rezidența, costul vieții, serviciile de zi cu zi de care vei avea nevoie și comunitatea ortodoxă care îți dă sentimentul de acasă."
  },
  "ar": {
   "kicker": "للرومانيين في قبرص",
   "title": "قبرص للرومانيين",
   "intro": "اعمل وعِش على الجزيرة — الإقامة وتكاليف المعيشة والخدمات اليومية التي ستحتاجها والجالية الأرثوذكسية التي تمنحك دفء الوطن."
  },
  "de": {
   "kicker": "Für Rumänen auf Zypern",
   "title": "Zypern für Rumänen",
   "intro": "Auf der Insel arbeiten und leben — Aufenthalt, Lebenshaltungskosten, die Dienstleistungen des Alltags, die Sie brauchen, und die orthodoxe Gemeinschaft, die Zypern zur Heimat werden lässt."
  },
  "pl": {
   "kicker": "Dla Rumunów na Cyprze",
   "title": "Cypr dla Rumunów",
   "intro": "Praca i życie na wyspie — rezydencja, koszty utrzymania, codzienne usługi, których będziesz potrzebować, oraz prawosławna wspólnota, dzięki której poczujesz się jak w domu."
  },
  "ru": {
   "kicker": "Для румын на Кипре",
   "title": "Кипр для румын",
   "intro": "Работа и жизнь на острове: ВНЖ, стоимость жизни, повседневные услуги, которые вам понадобятся, и православная община, с которой Кипр становится домом."
  }
 },
 "german": {
  "el": {
   "kicker": "Για επισκέπτες από τη Γερμανία",
   "title": "Η Κύπρος για τη Γερμανία",
   "intro": "Μονοπάτια στο Τρόοδος, οι τοιχογραφημένες εκκλησίες, τα κρασοχώρια και οι ήσυχες γωνιές — η Κύπρος πέρα από την παραλία, σχεδιασμένη με φροντίδα."
  },
  "ro": {
   "kicker": "Pentru vizitatorii din Germania",
   "title": "Cipru pentru Germania",
   "intro": "Poteci prin munții Troodos, bisericile pictate, satele viticole și colțurile liniștite — un Cipru dincolo de plajă, plănuit cu grijă."
  },
  "ar": {
   "kicker": "للزوار القادمين من ألمانيا",
   "title": "قبرص لألمانيا",
   "intro": "مسارات عبر جبال ترودوس، والكنائس المزيّنة بالجداريات، وقرى النبيذ والزوايا الهادئة — قبرص التي تتجاوز الشاطئ، مُخطَّطة بعناية."
  },
  "de": {
   "kicker": "Für Gäste aus Deutschland",
   "title": "Zypern für Deutschland",
   "intro": "Wanderwege durch das Troodos-Gebirge, die bemalten Kirchen, die Weindörfer und die stillen Winkel — das Zypern jenseits des Strandes, mit Sorgfalt geplant."
  },
  "pl": {
   "kicker": "Dla gości z Niemiec",
   "title": "Cypr dla Niemiec",
   "intro": "Szlaki przez góry Troodos, malowane kościoły, wioski winiarskie i ciche zakątki — Cypr poza plażą, zaplanowany z dbałością o każdy szczegół."
  },
  "ru": {
   "kicker": "Для гостей из Германии",
   "title": "Кипр для Германии",
   "intro": "Тропы Троодоса, расписные церкви, винные деревни и тихие уголки — Кипр по ту сторону пляжа, продуманный до мелочей."
  }
 },
 "british": {
  "el": {
   "kicker": "Για τους Βρετανούς στην Κύπρο",
   "title": "Η Κύπρος για τους Βρετανούς",
   "intro": "Αγορά ακινήτου, άδεια διαμονής και υγειονομική περίθαλψη με σαφήνεια, αγγλόφωνοι επαγγελματίες και τα καλύτερα τραπέζια του νησιού — και ύστερα, τα χωριά που αξίζει να αφήσετε την ακτή για χάρη τους."
  },
  "ro": {
   "kicker": "Pentru britanicii din Cipru",
   "title": "Cipru pentru britanici",
   "intro": "Achiziții imobiliare, rezidență și sănătate explicate limpede, profesioniști vorbitori de limba engleză și cele mai bune restaurante ale insulei — apoi satele pentru care merită să lași coasta în urmă."
  },
  "ar": {
   "kicker": "للبريطانيين في قبرص",
   "title": "قبرص للبريطانيين",
   "intro": "شراء العقارات والإقامة والرعاية الصحية بوضوح تام، ومهنيون يتحدثون الإنجليزية، وأرقى موائد الجزيرة — ثم القرى التي تستحق أن تغادر الساحل من أجلها."
  },
  "de": {
   "kicker": "Für die Briten auf Zypern",
   "title": "Zypern für die Briten",
   "intro": "Immobilienkauf, Aufenthalt und Gesundheitsversorgung verständlich erklärt, englischsprachige Fachleute und die besten Adressen der Insel — dazu die Dörfer, für die es sich lohnt, die Küste zu verlassen."
  },
  "pl": {
   "kicker": "Dla Brytyjczyków na Cyprze",
   "title": "Cypr dla Brytyjczyków",
   "intro": "Zakup nieruchomości, rezydencja i opieka zdrowotna wyjaśnione jasno, anglojęzyczni specjaliści i najlepsze stoły na wyspie — a potem wioski, dla których warto opuścić wybrzeże."
  },
  "ru": {
   "kicker": "Для британцев на Кипре",
   "title": "Кипр для британцев",
   "intro": "Понятно о покупке недвижимости, ВНЖ и медицине, англоговорящие специалисты и лучшие рестораны острова — а ещё деревни, ради которых стоит покинуть побережье."
  }
 },
 "israeli": {
  "el": {
   "kicker": "Για επισκέπτες από το Ισραήλ",
   "title": "Η Κύπρος για το Ισραήλ",
   "intro": "Σαράντα λεπτά από το σπίτι σας: οι καλύτερες παραλίες και οι μέρες με σκάφος, πού να έχετε τη βάση σας, εστιατόρια φιλικά προς την κόσερ κουζίνα και ακίνητα για όταν είστε έτοιμοι να επενδύσετε."
  },
  "ro": {
   "kicker": "Pentru vizitatorii din Israel",
   "title": "Cipru pentru Israel",
   "intro": "La patruzeci de minute de casă: cele mai frumoase plaje și ieșiri cu barca, unde să-ți stabilești baza, restaurante prietenoase cu regimul cușer și proprietăți pentru momentul în care ești gata să investești."
  },
  "ar": {
   "kicker": "للزوار القادمين من إسرائيل",
   "title": "قبرص لإسرائيل",
   "intro": "أربعون دقيقة من الوطن: أجمل الشواطئ ورحلات القوارب، وأين تستقر، ومطاعم تراعي الطعام الكوشير، وعقارات في انتظارك حين تكون مستعداً للاستثمار."
  },
  "de": {
   "kicker": "Für Gäste aus Israel",
   "title": "Zypern für Israel",
   "intro": "Vierzig Minuten von zu Hause: die schönsten Strände und Tage auf dem Boot, das richtige Quartier, koscher-freundliche Restaurants und Immobilien für den Moment, in dem Sie investieren möchten."
  },
  "pl": {
   "kicker": "Dla gości z Izraela",
   "title": "Cypr dla Izraela",
   "intro": "Czterdzieści minut od domu: najlepsze plaże i dni na łodzi, gdzie się zatrzymać, restauracje przyjazne kuchni koszernej oraz nieruchomości na moment, gdy zdecydujesz się zainwestować."
  },
  "ru": {
   "kicker": "Для гостей из Израиля",
   "title": "Кипр для Израиля",
   "intro": "Сорок минут от дома: лучшие пляжи и морские прогулки, где остановиться, кошерная кухня и недвижимость — на случай, когда вы будете готовы инвестировать."
  }
 },
 "arab": {
  "el": {
   "kicker": "Για επισκέπτες από τον Κόλπο",
   "title": "Η Κύπρος για τον Κόλπο",
   "intro": "Δροσερά μεσογειακά καλοκαίρια, εστιατόρια φιλικά προς τη χαλάλ κουζίνα, ιδιωτικές βίλες και διακριτική πολυτέλεια — με έναν κονσιέρζ να κανονίζει την κάθε λεπτομέρεια."
  },
  "ro": {
   "kicker": "Pentru vizitatorii din Golf",
   "title": "Cipru pentru Golf",
   "intro": "Veri mediteraneene răcoroase, restaurante prietenoase cu regimul halal, vile private și lux discret — cu un concierge care aranjează fiecare detaliu."
  },
  "ar": {
   "kicker": "للزوار القادمين من الخليج",
   "title": "قبرص للخليج",
   "intro": "صيف متوسطي لطيف، ومطاعم تراعي الطعام الحلال، وفلل خاصة وفخامة هادئة — مع كونسيرج يرتّب لك كل التفاصيل."
  },
  "de": {
   "kicker": "Für Gäste aus der Golfregion",
   "title": "Zypern für die Golfregion",
   "intro": "Kühlere Sommer am Mittelmeer, halal-freundliche Restaurants, private Villen und stiller Luxus — mit einem Concierge, der jedes Detail arrangiert."
  },
  "pl": {
   "kicker": "Dla gości z Zatoki",
   "title": "Cypr dla Zatoki",
   "intro": "Przyjemnie chłodne śródziemnomorskie lato, restauracje przyjazne kuchni halal, prywatne wille i dyskretny luksus — z concierge, który zadba o każdy szczegół."
  },
  "ru": {
   "kicker": "Для гостей из стран Залива",
   "title": "Кипр для стран Залива",
   "intro": "Прохладное средиземноморское лето, кухня халяль, частные виллы и сдержанная роскошь — с консьержем, который позаботится о каждой детали."
  }
 }
};

function isTx(loc: string): loc is KBLoc {
  return loc === 'el' || loc === 'ro' || loc === 'ar' || loc === 'de' || loc === 'pl' || loc === 'ru';
}

/** Localized {kicker,title,intro} for a market; English (markets.ts) for en/gaps. */
export function localizedMarket(id: string, locale: string): MarketTx {
  const m = MARKET_INDEX[id];
  const fallback: MarketTx = { kicker: m?.kicker ?? '', title: m?.title ?? id, intro: m?.intro ?? '' };
  if (!isTx(locale)) return fallback;
  const tx = MARKET_I18N[id]?.[locale];
  return tx && tx.title && tx.intro ? tx : fallback;
}
