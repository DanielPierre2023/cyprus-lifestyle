-- Rewritten articles (in-session, no API cost). Run once in Supabase → SQL Editor.
-- Each block first stores the previous text in admin_audit_log (action 'article.rewrite.manual', changes.before) so it can be restored.

begin;

-- healthcare-in-cyprus-gesy
insert into admin_audit_log (source, action, table_name, row_id, summary, changes)
select 'sql', 'article.rewrite.manual', 'blog_posts', id::text, 'healthcare-in-cyprus-gesy rewritten', jsonb_build_object('before', jsonb_build_object('content_en', content_en, 'content_el', content_el, 'content_ro', content_ro, 'content_ar', content_ar, 'content_de', content_de, 'content_pl', content_pl, 'content_ru', content_ru))
from blog_posts where slug = 'healthcare-in-cyprus-gesy';

update blog_posts set
  content_en = $rw$<p>Cyprus runs a national health system, GESY (also written GHS), beside a large private sector. Residents get broad, affordable cover through the state, and anyone who wants faster access can add a private policy on top. This is how it works in 2026.</p>
<h2>Registering and choosing a doctor</h2>
<p>Any tax resident of Cyprus can register. That includes EU citizens living here under the 60-day rule and third-country nationals with a valid permit, and dependents are covered at no extra cost. Registration is online at gesy.org.cy and takes about fifteen minutes. You need your tax identification number and proof of residency.</p>
<p>Next you choose a personal doctor, a GP. The GP is your first call for any health problem and the person who refers you to specialists.</p>
<h2>What it costs</h2>
<p>Contributions follow income instead of a flat premium. Employees pay 2.65% of gross salary and employers add 2.90%. The self-employed pay 4.70%, and pensioners and people living on passive income pay 2.65%. The contribution stops at €180,000 of income a year, so earnings above that add nothing.</p>
<p>At the point of care the amounts are small. A specialist visit costs about €6 as of 2026. Prescriptions run from free to a modest share of the price, depending on the medicine. Chronic illness and cancer treatment carry no charge.</p>
<h2>What it covers, and what private insurance adds</h2>
<p>GESY pays for the personal doctor, specialist consultations on referral, hospital and emergency treatment, maternity care, mental health services, laboratory tests and subsidised medicines. It is an EU-standard system, and residents use it every day.</p>
<p>Many also keep a private policy, typically €1,500 to €4,000 a year. It buys speed and choice: elective procedures sooner, a wider pick of specialists, shorter waits. The policy sits beside GESY and does not replace it, and the right mix depends on age, health and budget.</p>
<p><em>Rates and co-payments are those of 2026 and can change. Check gesy.org.cy or ask a licensed adviser before you rely on them.</em></p>$rw$,
  word_count = 345,
  reading_time_min = 2,
  content_el = $rw$<p>Η Κύπρος διαθέτει εθνικό σύστημα υγείας, το ΓεΣΥ (γνωστό και ως GHS), δίπλα σε έναν μεγάλο ιδιωτικό τομέα. Οι κάτοικοι έχουν ευρεία και προσιτή κάλυψη μέσω του κράτους, και όποιος θέλει ταχύτερη πρόσβαση μπορεί να προσθέσει ιδιωτική ασφάλιση. Έτσι λειτουργεί το σύστημα το 2026.</p>
<h2>Εγγραφή και επιλογή γιατρού</h2>
<p>Μπορεί να εγγραφεί κάθε φορολογικός κάτοικος Κύπρου, μεταξύ αυτών πολίτες της ΕΕ που ζουν εδώ με τον κανόνα των 60 ημερών και υπήκοοι τρίτων χωρών με ισχύουσα άδεια. Τα εξαρτώμενα μέλη καλύπτονται χωρίς επιπλέον κόστος. Η εγγραφή γίνεται ηλεκτρονικά στο gesy.org.cy και διαρκεί περίπου δεκαπέντε λεπτά. Χρειάζονται ο αριθμός φορολογικής ταυτότητας και αποδεικτικό κατοικίας.</p>
<p>Στη συνέχεια επιλέγετε προσωπικό γιατρό. Είναι το πρώτο σημείο επαφής για κάθε πρόβλημα υγείας και αυτός που σας παραπέμπει σε ειδικούς.</p>
<h2>Πόσο κοστίζει</h2>
<p>Οι εισφορές ακολουθούν το εισόδημα και δεν υπάρχει σταθερό ασφάλιστρο. Οι μισθωτοί πληρώνουν 2,65% του μεικτού μισθού και οι εργοδότες προσθέτουν 2,90%. Οι αυτοαπασχολούμενοι πληρώνουν 4,70%, οι συνταξιούχοι και όσοι έχουν παθητικό εισόδημα 2,65%. Η εισφορά υπολογίζεται μέχρι εισόδημα 180.000 € τον χρόνο, και ό,τι ξεπερνά το όριο δεν προσθέτει τίποτα.</p>
<p>Στο σημείο παροχής περίθαλψης τα ποσά είναι μικρά. Μια επίσκεψη σε ειδικό κοστίζει περίπου 6 € το 2026. Τα φάρμακα κυμαίνονται από δωρεάν μέχρι μικρό ποσοστό της τιμής, ανάλογα με το φάρμακο. Οι χρόνιες παθήσεις και η θεραπεία του καρκίνου δεν χρεώνονται.</p>
<h2>Τι καλύπτει και τι προσθέτει η ιδιωτική ασφάλιση</h2>
<p>Το ΓεΣΥ καλύπτει τον προσωπικό γιατρό, τις επισκέψεις σε ειδικούς με παραπεμπτικό, τη νοσοκομειακή και επείγουσα περίθαλψη, τη μητρότητα, την ψυχική υγεία, τις εργαστηριακές εξετάσεις και τα επιδοτούμενα φάρμακα. Είναι σύστημα ευρωπαϊκών προδιαγραφών και οι κάτοικοι το χρησιμοποιούν καθημερινά.</p>
<p>Πολλοί κρατούν και ιδιωτικό ασφαλιστήριο, συνήθως 1.500 έως 4.000 € τον χρόνο. Αγοράζει ταχύτητα και επιλογή: προγραμματισμένες επεμβάσεις νωρίτερα, περισσότεροι ειδικοί να διαλέξετε, μικρότερες αναμονές. Το ασφαλιστήριο λειτουργεί δίπλα στο ΓεΣΥ και δεν το αντικαθιστά, και ο σωστός συνδυασμός εξαρτάται από την ηλικία, την υγεία και τον προϋπολογισμό.</p>
<p><em>Οι εισφορές και οι συμμετοχές είναι του 2026 και μπορεί να αλλάξουν. Ελέγξτε το gesy.org.cy ή ρωτήστε αδειοδοτημένο σύμβουλο πριν βασιστείτε σε αυτά.</em></p>$rw$,
  content_ro = $rw$<p>Cipru are un sistem național de sănătate, GESY (scris și GHS), care funcționează alături de un sector privat mare. Rezidenții primesc prin stat o acoperire largă și accesibilă, iar cine vrea acces mai rapid poate adăuga o asigurare privată. Așa arată sistemul în 2026.</p>
<h2>Înscrierea și alegerea medicului</h2>
<p>Se poate înscrie orice rezident fiscal al Ciprului: cetățenii UE care locuiesc aici după regula celor 60 de zile, precum și resortisanții din țări terțe cu permis valabil. Persoanele aflate în întreținere sunt acoperite fără costuri suplimentare. Înscrierea se face online, pe gesy.org.cy, și durează cam cincisprezece minute. Sunt necesare numărul de identificare fiscală și dovada rezidenței.</p>
<p>Apoi se alege un medic personal, un medic de familie (GP). El este primul contact pentru orice problemă de sănătate și cel care trimite la specialiști.</p>
<h2>Cât costă</h2>
<p>Contribuțiile depind de venit, nu există o primă fixă. Angajații plătesc 2,65% din salariul brut, iar angajatorii adaugă 2,90%. Persoanele care lucrează pe cont propriu plătesc 4,70%, iar pensionarii și cei cu venituri pasive 2,65%. Contribuția se calculează până la un venit de 180.000 € pe an; ce depășește suma nu mai adaugă nimic.</p>
<p>La locul tratamentului sumele rămân mici. O consultație la specialist costă în 2026 cam 6 €. Rețetele variază de la gratuite la o mică parte din preț, în funcție de medicament. Bolile cronice și tratamentul cancerului nu se plătesc.</p>
<h2>Ce acoperă și ce adaugă asigurarea privată</h2>
<p>GESY plătește medicul personal, consultațiile la specialist pe baza trimiterii, tratamentul în spital și de urgență, îngrijirea maternă, serviciile de sănătate mintală, analizele de laborator și medicamentele subvenționate. Este un sistem la standard european, pe care rezidenții îl folosesc zilnic.</p>
<p>Mulți păstrează și o asigurare privată, de obicei între 1.500 și 4.000 € pe an. Ea cumpără viteză și alegere: intervenții programate mai devreme, mai mulți specialiști la dispoziție, așteptări mai scurte. Polița stă alături de GESY, nu îl înlocuiește, iar combinația potrivită depinde de vârstă, sănătate și buget.</p>
<p><em>Contribuțiile și coplățile sunt cele din 2026 și se pot schimba. Verificați gesy.org.cy sau întrebați un consultant autorizat înainte de a vă baza pe ele.</em></p>$rw$,
  content_ar = $rw$<p>تدير قبرص نظامًا صحيًا وطنيًا هو GESY (ويُكتب أيضًا GHS) إلى جانب قطاع خاص كبير. يحصل المقيمون من الدولة على تغطية واسعة وميسورة، ومن يريد وصولًا أسرع يستطيع إضافة بوليصة خاصة. هذه طريقة عمل النظام في عام 2026.</p>
<h2>التسجيل واختيار الطبيب</h2>
<p>يحق لكل مقيم ضريبي في قبرص أن يسجّل، ومنهم مواطنو الاتحاد الأوروبي الذين يقيمون هنا بموجب قاعدة الستين يومًا، ومواطنو الدول الثالثة الحاصلون على تصريح ساري. ويشمل التأمين المُعالين دون تكلفة إضافية. يتم التسجيل عبر الإنترنت على gesy.org.cy ويستغرق نحو خمس عشرة دقيقة. المطلوب رقم التعريف الضريبي وإثبات الإقامة.</p>
<p>بعد ذلك تختار طبيبًا شخصيًا هو طبيب الأسرة (GP). هو أول جهة تتصل بها عند أي مشكلة صحية، وهو الذي يحيلك إلى الأخصائيين.</p>
<h2>التكلفة</h2>
<p>تتبع الاشتراكات الدخل ولا يوجد قسط ثابت. يدفع الموظفون 2.65% من الراتب الإجمالي ويضيف أصحاب العمل 2.90%. ويدفع العاملون لحسابهم الخاص 4.70%، والمتقاعدون ومن يعيشون على دخل سلبي 2.65%. يُحتسب الاشتراك حتى دخل سنوي قدره 180,000 يورو، وما يزيد على ذلك لا يضيف شيئًا.</p>
<p>عند تلقي العلاج تبقى المبالغ صغيرة. تبلغ كلفة زيارة الأخصائي نحو 6 يورو في عام 2026. وتتراوح أسعار الأدوية الموصوفة من المجانية إلى حصة صغيرة من السعر بحسب الدواء. أما الأمراض المزمنة وعلاج السرطان فلا يُدفع عنهما شيء.</p>
<h2>ما يغطيه النظام وما تضيفه البوليصة الخاصة</h2>
<p>يتحمل GESY تكلفة الطبيب الشخصي واستشارات الأخصائيين بالإحالة والعلاج في المستشفى والطوارئ. ويغطي كذلك رعاية الأمومة والصحة النفسية والفحوص المخبرية والأدوية المدعومة. إنه نظام بمعايير أوروبية يستخدمه المقيمون كل يوم.</p>
<p>ويحتفظ كثيرون ببوليصة خاصة أيضًا، تتراوح عادة بين 1,500 و4,000 يورو في السنة. هي تشتري السرعة والاختيار: عمليات اختيارية في وقت أبكر، مع عدد أكبر من الأخصائيين وانتظار أقصر. تعمل البوليصة إلى جانب GESY ولا تحل محله، ويتوقف المزيج المناسب على العمر والصحة والميزانية.</p>
<p><em>الاشتراكات والمساهمات المذكورة لعام 2026 وقد تتغير. راجع gesy.org.cy أو اسأل مستشارًا مرخصًا قبل أن تعتمد عليها.</em></p>$rw$,
  content_de = $rw$<p>Zypern betreibt ein staatliches Gesundheitssystem, GESY (auch GHS genannt), neben einem großen privaten Sektor. Wer hier lebt, bekommt vom Staat eine breite, bezahlbare Versorgung, und wer schneller behandelt werden will, kann eine private Police dazunehmen. So funktioniert das System 2026.</p>
<h2>Anmeldung und Wahl des Hausarztes</h2>
<p>Jeder Steuerresident Zyperns kann sich anmelden, auch EU-Bürger, die nach der 60-Tage-Regel hier leben, und Drittstaatsangehörige mit gültiger Aufenthaltsgenehmigung. Angehörige sind ohne Aufpreis mitversichert. Die Anmeldung läuft online über gesy.org.cy und dauert etwa fünfzehn Minuten. Sie brauchen Ihre Steueridentifikationsnummer und einen Wohnsitznachweis.</p>
<p>Danach wählen Sie einen persönlichen Arzt, einen Hausarzt (GP). Er ist Ihre erste Anlaufstelle bei jedem Gesundheitsproblem und überweist Sie an Fachärzte.</p>
<h2>Was es kostet</h2>
<p>Die Beiträge richten sich nach dem Einkommen, eine Pauschalprämie gibt es nicht. Arbeitnehmer zahlen 2,65 % des Bruttogehalts, Arbeitgeber legen 2,90 % drauf. Selbstständige zahlen 4,70 %, Rentner und Bezieher von passivem Einkommen 2,65 %. Berechnet wird der Beitrag bis zu einem Jahreseinkommen von 180.000 €; was darüber liegt, bleibt beitragsfrei.</p>
<p>Bei der Behandlung selbst bleiben die Beträge klein. Ein Facharztbesuch kostet 2026 etwa 6 €. Bei Rezepten reicht die Spanne von kostenlos bis zu einem kleinen Anteil am Preis, je nach Medikament. Chronische Erkrankungen und Krebsbehandlungen sind gebührenfrei.</p>
<h2>Leistungen und private Zusatzversicherung</h2>
<p>GESY übernimmt den Hausarzt, Facharztbesuche auf Überweisung, Krankenhaus- und Notfallbehandlung, Mutterschaftsleistungen, psychische Gesundheitsversorgung, Laboruntersuchungen und bezuschusste Medikamente. Es ist ein System nach EU-Standard, das die Einwohner täglich nutzen.</p>
<p>Viele schließen zusätzlich eine private Police ab, meist für 1.500 bis 4.000 € im Jahr. Sie kauft Tempo und Auswahl: planbare Eingriffe früher, mehr Fachärzte zur Wahl, kürzere Wartezeiten. Die Police steht neben GESY und ersetzt es nicht. Welche Mischung passt, hängt von Alter, Gesundheit und Budget ab.</p>
<p><em>Beiträge und Zuzahlungen gelten für 2026 und können sich ändern. Prüfen Sie gesy.org.cy oder fragen Sie einen zugelassenen Berater, bevor Sie sich darauf verlassen.</em></p>$rw$,
  content_pl = $rw$<p>Cypr ma państwowy system opieki zdrowotnej, GESY (zapisywany też jako GHS), który działa obok dużego sektora prywatnego. Mieszkańcy dostają od państwa szeroką i niedrogą opiekę, a kto chce szybszego dostępu, może dokupić prywatną polisę. Tak to wygląda w 2026 roku.</p>
<h2>Rejestracja i wybór lekarza</h2>
<p>Zarejestrować się może każdy rezydent podatkowy Cypru, w tym obywatele UE mieszkający tu na zasadzie 60 dni oraz obywatele państw trzecich z ważnym zezwoleniem. Osoby pozostające na utrzymaniu są objęte opieką bez dodatkowych kosztów. Rejestracja odbywa się online na gesy.org.cy i zajmuje około piętnastu minut. Potrzebny jest numer identyfikacji podatkowej i dokument potwierdzający miejsce zamieszkania.</p>
<p>Potem wybiera się lekarza osobistego, czyli lekarza rodzinnego (GP). To pierwszy kontakt przy każdym problemie zdrowotnym i osoba, która kieruje do specjalistów.</p>
<h2>Ile to kosztuje</h2>
<p>Składki zależą od dochodu, nie ma stałej opłaty. Pracownicy płacą 2,65% wynagrodzenia brutto, a pracodawcy dokładają 2,90%. Osoby prowadzące własną działalność płacą 4,70%, emeryci i osoby z dochodem pasywnym 2,65%. Składkę liczy się do dochodu 180 000 € rocznie, a wszystko powyżej tej kwoty nic nie dodaje.</p>
<p>Przy samym leczeniu kwoty są niewielkie. Wizyta u specjalisty kosztuje w 2026 roku około 6 €. Leki na receptę kosztują od zera do niewielkiej części ceny, zależnie od preparatu. Choroby przewlekłe i leczenie nowotworów są bezpłatne.</p>
<h2>Co obejmuje system i co dodaje prywatne ubezpieczenie</h2>
<p>GESY pokrywa lekarza osobistego, wizyty u specjalistów ze skierowaniem, leczenie szpitalne i ratunkowe, opiekę położniczą, zdrowie psychiczne, badania laboratoryjne i leki refundowane. To system na unijnym poziomie, z którego mieszkańcy korzystają codziennie.</p>
<p>Wielu ma dodatkowo prywatną polisę, zwykle za 1500 do 4000 € rocznie. Kupuje się nią szybkość i wybór: zabiegi planowe wcześniej, więcej specjalistów do wyboru, krótsze kolejki. Polisa działa obok GESY i go nie zastępuje, a właściwy dobór zależy od wieku, zdrowia i budżetu.</p>
<p><em>Składki i dopłaty podano według stanu na 2026 rok i mogą się zmienić. Sprawdź gesy.org.cy lub zapytaj licencjonowanego doradcę, zanim oprzesz na nich decyzję.</em></p>$rw$,
  content_ru = $rw$<p>На Кипре действует государственная система здравоохранения GESY (её пишут и как GHS), а рядом работает большой частный сектор. Жители получают от государства широкое и недорогое покрытие, а кто хочет попасть к врачу быстрее, может добавить частную страховку. Вот как всё устроено в 2026 году.</p>
<h2>Регистрация и выбор врача</h2>
<p>Зарегистрироваться может любой налоговый резидент Кипра, в том числе граждане ЕС, живущие здесь по правилу 60 дней, и граждане третьих стран с действующим разрешением. Иждивенцы покрываются без доплаты. Регистрация проходит онлайн на gesy.org.cy и занимает около пятнадцати минут. Нужны налоговый идентификационный номер и подтверждение места жительства.</p>
<p>Затем вы выбираете личного врача, семейного терапевта (GP). К нему обращаются в первую очередь с любой проблемой, и он же направляет к специалистам.</p>
<h2>Сколько это стоит</h2>
<p>Взносы зависят от дохода, фиксированной премии нет. Работники платят 2,65% от брутто-зарплаты, работодатели добавляют 2,90%. Самозанятые платят 4,70%, пенсионеры и получатели пассивного дохода 2,65%. Взнос считается с дохода до 180 000 € в год, а всё, что выше, ничего не добавляет.</p>
<p>При самом лечении суммы небольшие. Визит к специалисту стоит в 2026 году около 6 €. Лекарства по рецепту стоят от нуля до небольшой доли цены, в зависимости от препарата. Хронические болезни и лечение рака не оплачиваются.</p>
<h2>Что покрывается и что добавляет частная страховка</h2>
<p>GESY оплачивает личного врача, консультации специалистов по направлению, лечение в больнице и неотложную помощь, ведение беременности и родов, психическое здоровье, лабораторные анализы и субсидируемые лекарства. Это система европейского уровня, которой жители пользуются каждый день.</p>
<p>Многие держат и частный полис, обычно от 1500 до 4000 € в год. Он покупает скорость и выбор: плановые операции раньше, больше специалистов на выбор, короче очереди. Полис работает рядом с GESY и его не заменяет, а подходящее сочетание зависит от возраста, здоровья и бюджета.</p>
<p><em>Ставки взносов и доплаты приведены на 2026 год и могут измениться. Проверьте gesy.org.cy или спросите лицензированного консультанта, прежде чем на них полагаться.</em></p>$rw$,
  updated_at = now()
where slug = 'healthcare-in-cyprus-gesy';

commit;

-- Check: select slug, word_count, updated_at from blog_posts where slug in ('healthcare-in-cyprus-gesy');
