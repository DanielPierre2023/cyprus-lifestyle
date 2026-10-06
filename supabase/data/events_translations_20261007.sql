-- events_translations_20261007.sql — titles of 11 of the 16 published events (6 locales) and summaries of 9 events
-- Idempotent DATA script (not a migration, no schema change). Run it by hand in the Supabase SQL editor.
-- Every column is written ONLY when it is empty or still a verbatim copy of the English text, so a human
-- translation is never overwritten and re-running the script changes nothing the second time.
-- All non-English text was written in-session (no translation API) and NEEDS NATIVE REVIEW.
-- Generated 12 UPDATE statements; each should report 'UPDATE 1'.
begin;
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Το Fork Food Market επιστρέφει!' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Fork Food Market revine!' else title_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'عودة Fork Food Market!' else title_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Fork Food Market ist zurück!' else title_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Fork Food Market wraca!' else title_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Fork Food Market возвращается!' else title_ru end
where slug = 'fork-food-market-is-back-88771035';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Reece Kidd | STAND UP COMEDY | 100 εκατομμύρια προβολές και συνεχίζει' else title_el end,
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Από το Μπέλφαστ σε 30 χώρες — ο Reece Kidd κάνει στάση στη Λευκωσία. 🇮🇪 3 φορές sold-out στο Edinburgh Fringe. 100 εκατ. προβολές. Μία μόνο βραδιά. 📅 19 Σεπτεμβρίου | Θέατρο Πάνθεον | 21:00' else summary_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Reece Kidd | STAND UP COMEDY | 100 de milioane de vizualizări și încă în creștere' else title_ro end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Din Belfast în 30 de țări — Reece Kidd face escală la Nicosia. 🇮🇪 De 3 ori sold-out la Edinburgh Fringe. 100 de milioane de vizualizări. O singură seară. 📅 19 septembrie | Teatrul Pantheon | 21:00' else summary_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'Reece Kidd | ستاند أب كوميدي | 100 مليون مشاهدة والعدّاد مستمر' else title_ar end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'من بلفاست إلى 30 دولة — ريس كيد يحطّ رحاله في نيقوسيا. 🇮🇪 نفاد التذاكر 3 مرات في مهرجان إدنبرة فرينج. 100 مليون مشاهدة. ليلة واحدة فقط. 📅 19 سبتمبر | مسرح بانثيون | 9 مساءً' else summary_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Reece Kidd | STAND-UP-COMEDY | 100 Millionen Aufrufe und es werden mehr' else title_de end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Von Belfast in 30 Länder — Reece Kidd macht Halt in Nikosia. 🇮🇪 3-mal ausverkauft beim Edinburgh Fringe. 100 Mio. Aufrufe. Nur ein Abend. 📅 19. September | Pantheon Theatre | 21 Uhr' else summary_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Reece Kidd | STAND-UP | 100 milionów wyświetleń i liczba wciąż rośnie' else title_pl end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Z Belfastu do 30 krajów — Reece Kidd zatrzymuje się w Nikozji. 🇮🇪 3-krotnie wyprzedane występy na Edinburgh Fringe. 100 mln wyświetleń. Tylko jeden wieczór. 📅 19 września | Teatr Pantheon | 21:00' else summary_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Reece Kidd | СТЕНДАП | 100 миллионов просмотров и счётчик растёт' else title_ru end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Из Белфаста в 30 стран — Reece Kidd делает остановку в Никосии. 🇮🇪 Трижды аншлаг на Эдинбургском фриндже. 100 млн просмотров. Только один вечер. 📅 19 сентября | Театр «Пантеон» | 21:00' else summary_ru end
where slug = 'reece-kidd-stand-up-comedy-100-million-views-c-57833208';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Μεγάλη συναυλία του Ιταλού τενόρου Massimo Giordano στο Κούριο | 19 Σεπτεμβρίου 2026' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Marele concert al tenorului italian Massimo Giordano la Kourion | 19 septembrie 2026' else title_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'الحفل الكبير للتينور الإيطالي ماسيمو جيوردانو في كوريون | 19 سبتمبر 2026' else title_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Großes Konzert des italienischen Tenors Massimo Giordano in Kourion | 19. September 2026' else title_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Wielki koncert włoskiego tenora Massimo Giordano w Kurionie | 19 września 2026' else title_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Большой концерт итальянского тенора Массимо Джордано в Курионе | 19 сентября 2026' else title_ru end
where slug = 'grand-concert-of-italian-tenor-massimo-giordan-14177309';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then '42ο Διεθνές Φεστιβάλ Αγίας Νάπας' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'A 42-a ediție a Festivalului Internațional Ayia Napa' else title_ro end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Un festival cultural gratuit în aer liber, cu grupuri de dans și muzică locale și invitate, concerte cu artiști ciprioți și greci, demonstrații de meșteșuguri și standuri cu mâncare. Are ca centru piața principală și mănăstirea din Ayia Napa.' else summary_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'مهرجان آيا نابا الدولي الثاني والأربعون' else title_ar end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'مهرجان ثقافي مجاني في الهواء الطلق يضم فرقًا محلية وزائرة للرقص والموسيقى، وحفلات لفنانين قبارصة ويونانيين، وعروضًا للحرف اليدوية وأكشاكًا للطعام. ويتمحور حول الساحة الرئيسية والدير في آيا نابا.' else summary_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then '42. Internationales Festival von Ayia Napa' else title_de end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Ein kostenloses Open-Air-Kulturfestival mit einheimischen und zu Gast weilenden Tanz- und Musikgruppen, Konzerten mit zypriotischen und griechischen Künstlern, Handwerksvorführungen und Essensständen. Mittelpunkt sind der Hauptplatz und das Kloster von Ayia Napa.' else summary_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then '42. Międzynarodowy Festiwal w Ayia Napie' else title_pl end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Bezpłatny plenerowy festiwal kulturalny z lokalnymi i gościnnymi zespołami tanecznymi i muzycznymi, koncertami cypryjskich i greckich wykonawców, pokazami rzemiosła i stoiskami z jedzeniem. Skupiony wokół głównego placu i klasztoru w Ayia Napie.' else summary_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then '42-й Международный фестиваль в Айя-Напе' else title_ru end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Бесплатный культурный фестиваль под открытым небом с местными и приезжими танцевальными и музыкальными коллективами, концертами кипрских и греческих исполнителей, показами ремёсел и лотками с едой. Центр — главная площадь и монастырь Айя-Напы.' else summary_ru end
where slug = '42nd-ayia-napa-international-festival';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Monolink στη Λεμεσό' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Monolink la Limassol' else title_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'Monolink في ليماسول' else title_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Monolink in Limassol' else title_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Monolink w Limassol' else title_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Monolink в Лимассоле' else title_ru end
where slug = 'monolink-in-62390950';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Adam Beyer στη Λεμεσό' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Adam Beyer la Limassol' else title_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'Adam Beyer في ليماسول' else title_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Adam Beyer in Limassol' else title_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Adam Beyer w Limassol' else title_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Adam Beyer в Лимассоле' else title_ru end
where slug = 'adam-beyer-in-41480501';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Φεστιβάλ Κρασιού Κύπρου (Λεμεσός)' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Festivalul Vinului din Cipru (Limassol)' else title_ro end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Cea mai mare și mai veche sărbătoare a vinului din Cipru, ediția a 65-a durează nouă zile, cu degustări de la crame locale, dansuri folclorice, mâncare tradițională și spectacole live. Se desfășoară în fiecare an în Grădinile Municipale de pe faleză.' else summary_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'مهرجان النبيذ القبرصي (ليماسول)' else title_ar end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'أكبر وأقدم احتفال بالنبيذ في قبرص، وتمتد دورته الخامسة والستون تسعة أيام مع تذوق من المعاصر المحلية ورقصات فولكلورية وطعام تقليدي وعروض حية. يُقام كل عام في الحدائق البلدية المطلة على البحر.' else summary_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Zypern-Weinfest (Limassol)' else title_de end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Das größte und älteste Weinfest Zyperns: Die 65. Ausgabe dauert neun Tage, mit Verkostungen lokaler Weingüter, Volkstänzen, traditionellem Essen und Live-Auftritten. Es findet jedes Jahr in den Stadtgärten an der Uferpromenade statt.' else summary_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Cypryjski Festiwal Wina (Limassol)' else title_pl end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Największe i najstarsze święto wina na Cyprze; 65. edycja trwa dziewięć dni i obejmuje degustacje u lokalnych winiarzy, tańce ludowe, tradycyjne jedzenie i występy na żywo. Co roku odbywa się w nadmorskich Ogrodach Miejskich.' else summary_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Кипрский фестиваль вина (Лимассол)' else title_ru end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Крупнейший и старейший праздник вина на Кипре: 65-й фестиваль длится девять дней и включает дегустации от местных виноделен, фольклорные танцы, традиционную еду и концерты. Проходит ежегодно в Муниципальных садах на набережной.' else summary_ru end
where slug = 'cyprus-wine-festival-limassol';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Διεθνές Φεστιβάλ Κυπρία' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Festivalul Internațional Kypria' else title_ro end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Festivalul cultural de stat emblematic al Ciprului, organizat din 1990, care prezintă în fiecare toamnă muzică, dans, operă, balet și artă performativă de talie mondială în locații din toată insula. Programul și datele exacte sunt anunțate anual de Subsecretariatul pentru Cultură.' else summary_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'مهرجان كيبريا الدولي' else title_ar end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'المهرجان الثقافي الرسمي الرئيسي في قبرص، يُقام منذ عام 1990 ويقدّم كل خريف موسيقى ورقصًا وأوبرا وباليه وفن الأداء بمستوى عالمي في أماكن متفرقة من الجزيرة. وتعلن وزارة الدولة للثقافة البرنامج والتواريخ الدقيقة سنويًا.' else summary_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Internationales Kypria-Festival' else title_de end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Zyperns staatliches Kulturfestival schlechthin, seit 1990 jeden Herbst: Musik, Tanz, Oper, Ballett und Performancekunst von Weltklasse an Spielstätten auf der ganzen Insel. Programm und genaue Termine gibt das Stellvertretende Kulturministerium jährlich bekannt.' else summary_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Międzynarodowy Festiwal Kypria' else title_pl end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Flagowy państwowy festiwal kultury Cypru, organizowany od 1990 roku, prezentujący co jesień muzykę, taniec, operę, balet i sztukę performance światowej klasy w miejscach na całej wyspie. Program i dokładne daty ogłasza co roku Wiceministerstwo Kultury.' else summary_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Международный фестиваль «Киприя»' else title_ru end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Главный государственный фестиваль культуры Кипра, проходящий с 1990 года: каждую осень музыка, танец, опера, балет и перформанс мирового уровня на площадках по всему острову. Программу и точные даты ежегодно объявляет Заместитель министра по делам культуры.' else summary_ru end
where slug = 'kypria-international-festival';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Φεστιβάλ παραστατικών τεχνών Buffer Fringe' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Festivalul de arte spectacolului Buffer Fringe' else title_ro end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Singurul festival Fringe din Cipru, desfășurat în zona-tampon a ONU și în jurul ei, cu spectacole care folosesc arta pentru a încuraja dialogul intercomunitar. Ediția 2026 include 13 artiști și formații în trei locații din Nicosia.' else summary_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'مهرجان بافر فرينج للفنون الأدائية' else title_ar end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'المهرجان الوحيد من نوع «فرينج» في قبرص، يُقام داخل المنطقة العازلة التابعة للأمم المتحدة وحولها بعروض تستخدم الفنون لتشجيع الحوار بين الطائفتين. تضم دورة 2026 ثلاثة عشر فنانًا وفرقة في ثلاثة أماكن بنيقوسيا.' else summary_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Buffer Fringe – Festival der darstellenden Künste' else title_de end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Zyperns einziges Fringe-Festival, in und um die UN-Pufferzone veranstaltet, mit Aufführungen, die die Kunst nutzen, um den Dialog zwischen den Volksgruppen zu fördern. Die Ausgabe 2026 bietet 13 Künstler und Gruppen an drei Spielorten in Nikosia.' else summary_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Festiwal sztuk performatywnych Buffer Fringe' else title_pl end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Jedyny na Cyprze festiwal Fringe, organizowany w strefie buforowej ONZ i wokół niej, z przedstawieniami, które wykorzystują sztukę do wspierania dialogu międzywspólnotowego. Edycja 2026 prezentuje 13 artystów i grup w trzech miejscach w Nikozji.' else summary_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Фестиваль исполнительских искусств Buffer Fringe' else title_ru end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Единственный на Кипре фестиваль Fringe, проходящий в буферной зоне ООН и вокруг неё, со спектаклями, использующими искусство для поощрения диалога между общинами. В программе 2026 года 13 артистов и коллективов на трёх площадках Никосии.' else summary_ru end
where slug = 'buffer-fringe-performing-arts-festival';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then 'Φεστιβάλ Σταφυλιού Κύπρου (Κρασοχώρια Λεμεσού)' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'Festivalul Strugurilor din Cipru (satele viticole din Limassol)' else title_ro end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'În septembrie și octombrie satele viticole din Limassol (Koilani, Arsos, Vouni, Lofou, Vasa, Kilani) organizează sărbători ale strugurilor și vinului, cu demonstrații de vinificație, produse din struguri, muzică populară și dans. Serbări sătești gratuite care readuc la viață vechi obiceiuri ale culesului.' else summary_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'مهرجان العنب القبرصي (قرى النبيذ في ليماسول)' else title_ar end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'في سبتمبر وأكتوبر تقيم قرى النبيذ في ليماسول (كويلاني وأرسوس وفوني ولوفو وفاسا وكيلاني) أعياد العنب والنبيذ مع عروض لصناعة النبيذ ومنتجات العنب والموسيقى الشعبية والرقص. احتفالات قروية مجانية تُحيي عادات الحصاد القديمة.' else summary_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then 'Zypriotisches Traubenfest (Weindörfer von Limassol)' else title_de end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Im September und Oktober feiern die Weindörfer von Limassol (Koilani, Arsos, Vouni, Lofou, Vasa, Kilani) Trauben- und Weinfeste mit Vorführungen zur Weinherstellung, Traubenprodukten, Volksmusik und Tanz. Kostenlose Dorffeste, die alte Erntebräuche wiederbeleben.' else summary_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then 'Cypryjskie Święto Winogron (winiarskie wioski Limassol)' else title_pl end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'We wrześniu i październiku winiarskie wioski Limassol (Koilani, Arsos, Vouni, Lofou, Vasa, Kilani) organizują święta winogron i wina z pokazami produkcji wina, produktami z winogron, muzyką ludową i tańcami. Bezpłatne wiejskie uroczystości przywracające dawne zwyczaje winobrania.' else summary_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then 'Кипрский праздник винограда (винодельческие деревни Лимасола)' else title_ru end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'В сентябре и октябре винодельческие деревни Лимассола (Койлани, Арсос, Вуни, Лофу, Васа, Килани) устраивают праздники винограда и вина с показами виноделия, продуктами из винограда, народной музыкой и танцами. Бесплатные деревенские гулянья, возрождающие старые обычаи сбора урожая.' else summary_ru end
where slug = 'cyprus-grape-festival-limassol-wine-villages';
update public.events set
  title_el = case when title_el is null or btrim(title_el) = '' or title_el = title_en then '6ο Μεσαιωνικό Φεστιβάλ Αγίας Νάπας' else title_el end,
  title_ro = case when title_ro is null or btrim(title_ro) = '' or title_ro = title_en then 'A 6-a ediție a Festivalului Medieval Ayia Napa' else title_ro end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Un festival cu tematică medievală, cu paradă pe străzi, spectacole de dans și muzică, reprezentații dramatice și grupuri participante din toată Europa. Se desfășoară în jurul mănăstirii și al orașului vechi din Ayia Napa.' else summary_ro end,
  title_ar = case when title_ar is null or btrim(title_ar) = '' or title_ar = title_en then 'مهرجان آيا نابا القروسطي السادس' else title_ar end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'مهرجان بطابع القرون الوسطى يضم موكبًا في الشوارع وعروضًا للرقص والموسيقى وعروضًا مسرحية ومجموعات مشاركة من أنحاء أوروبا. يُقام حول دير آيا نابا وبلدتها القديمة.' else summary_ar end,
  title_de = case when title_de is null or btrim(title_de) = '' or title_de = title_en then '6. Mittelalterfest von Ayia Napa' else title_de end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Ein Festival im Mittelalter-Stil mit Straßenumzug, Tanz- und Musikaufführungen, Theaterdarbietungen und teilnehmenden Gruppen aus ganz Europa. Es findet rund um das Kloster und die Altstadt von Ayia Napa statt.' else summary_de end,
  title_pl = case when title_pl is null or btrim(title_pl) = '' or title_pl = title_en then '6. Średniowieczny Festiwal w Ayia Napie' else title_pl end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Festiwal o tematyce średniowiecznej z korowodem ulicznym, występami tanecznymi i muzycznymi, przedstawieniami teatralnymi i grupami z całej Europy. Odbywa się wokół klasztoru i starego miasta w Ayia Napie.' else summary_pl end,
  title_ru = case when title_ru is null or btrim(title_ru) = '' or title_ru = title_en then '6-й Средневековый фестиваль в Айя-Напе' else title_ru end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Фестиваль в средневековом стиле с уличным шествием, танцевальными и музыкальными выступлениями, театральными представлениями и коллективами со всей Европы. Проходит вокруг монастыря и старого города Айя-Напы.' else summary_ru end
where slug = '6th-ayia-napa-medieval-festival';
update public.events set
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Μετά από ένα απίστευτο Halcyon Dayz 2025, επιστρέφουμε στη Λάρνακα, 24–30 Σεπτεμβρίου 2026, και ανυπομονούμε να δούμε παλιούς και νέους φίλους στον ήλιο!' else summary_el end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'După un Halcyon Dayz 2025 cu adevărat incredibil, ne întoarcem la Larnaca, 24–30 septembrie 2026, și abia așteptăm să revedem vechi prieteni și să cunoaștem alții noi la soare!' else summary_ro end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'بعد نسخة 2025 المذهلة من Halcyon Dayz، نعود إلى لارنكا في الفترة من 24 إلى 30 سبتمبر 2026، ولا نطيق الانتظار للقاء الأصدقاء القدامى والجدد تحت الشمس!' else summary_ar end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Nach einem wirklich unglaublichen Halcyon Dayz 2025 geht es zurück nach Larnaka, vom 24. bis 30. September 2026 — wir können es kaum erwarten, alte und neue Freunde in der Sonne zu treffen!' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Po naprawdę niesamowitym Halcyon Dayz 2025 wracamy do Larnaki, 24–30 września 2026, i już nie możemy się doczekać spotkania starych i nowych przyjaciół w słońcu!' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'После по-настоящему потрясающего Halcyon Dayz 2025 мы возвращаемся в Ларнаку, 24–30 сентября 2026 года, и не можем дождаться встречи со старыми и новыми друзьями под солнцем!' else summary_ru end
where slug = 'halcyon-dayz-2026-41465209';
commit;
