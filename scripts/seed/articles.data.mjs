// scripts/seed/articles.data.mjs — roadmap item 16 (bulk multilingual content sprint).
// The authoring source for seeded evergreen articles, in ALL SEVEN languages (no
// English fallback). gen-articles-sql.mjs turns this into an idempotent migration
// (supabase/migrations/0100_seed_articles.sql). Facts are web-researched and cited
// (see `sources`); regulatory/financial figures carry an "as of 2026" caveat in the
// body, per the house grounding rules. Republic of Cyprus (south) only.
//
// Content is HTML (rendered via dangerouslySetInnerHTML in the article page). Keep it
// to <h2>/<p>/<ul><li>/<em>; no backticks inside the strings (they delimit them).

export const LOCALES = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];

export const ARTICLES = [
  // ── Article 1 — Buying property in Cyprus as a foreigner ────────────────────
  {
    slug: 'buying-property-in-cyprus-foreigner-guide',
    batch: 1,
    category: 'property',
    author_name: 'The Cyprus Lifestyle Desk',
    reading_time_min: 6,
    source_url: 'https://research.cy/guides/buying-process.html',
    sources: [
      'https://research.cy/guides/buying-process.html',
      'https://realcy.app/guides/property-taxes-2026/',
      'https://globallawexperts.com/cyprus-real-estate-tax-changes-2026/',
    ],
    tags: {
      en: ['property', 'buying property', 'relocation', 'investment'],
      el: ['ακίνητα', 'αγορά ακινήτου', 'μετεγκατάσταση', 'επένδυση'],
      ro: ['imobiliare', 'cumpărare locuință', 'relocare', 'investiții'],
      ar: ['عقارات', 'شراء عقار', 'انتقال', 'استثمار'],
      de: ['Immobilien', 'Immobilienkauf', 'Umzug', 'Investition'],
      pl: ['nieruchomości', 'zakup nieruchomości', 'relokacja', 'inwestycja'],
      ru: ['недвижимость', 'покупка недвижимости', 'переезд', 'инвестиции'],
    },
    title: {
      en: 'Buying Property in Cyprus as a Foreigner: The 2026 Guide',
      el: 'Αγορά Ακινήτου στην Κύπρο για Ξένους: Ο Οδηγός 2026',
      ro: 'Cumpărarea unei proprietăți în Cipru ca străin: Ghidul 2026',
      ar: 'شراء عقار في قبرص للأجانب: دليل 2026',
      de: 'Immobilienkauf in Zypern als Ausländer: Der Leitfaden 2026',
      pl: 'Zakup nieruchomości na Cyprze przez obcokrajowca: Przewodnik 2026',
      ru: 'Покупка недвижимости на Кипре иностранцем: гид 2026',
    },
    excerpt: {
      en: 'Who may buy, the permit for non-EU buyers, the step-by-step process, and the taxes and fees to budget for — clearly, for the Republic of Cyprus.',
      el: 'Ποιοι μπορούν να αγοράσουν, η άδεια για αγοραστές εκτός ΕΕ, η διαδικασία βήμα προς βήμα, και οι φόροι και τα έξοδα — καθαρά, για την Κυπριακή Δημοκρατία.',
      ro: 'Cine poate cumpăra, permisul pentru cumpărătorii din afara UE, procesul pas cu pas și taxele de luat în calcul — clar, pentru Republica Cipru.',
      ar: 'من يحق له الشراء، وتصريح المشترين من خارج الاتحاد الأوروبي، والخطوات بالتفصيل، والضرائب والرسوم — بوضوح، لجمهورية قبرص.',
      de: 'Wer kaufen darf, die Genehmigung für Käufer aus Nicht-EU-Ländern, der Ablauf Schritt für Schritt sowie Steuern und Gebühren — klar, für die Republik Zypern.',
      pl: 'Kto może kupić, zezwolenie dla nabywców spoza UE, proces krok po kroku oraz podatki i opłaty — jasno, dla Republiki Cypryjskiej.',
      ru: 'Кто может покупать, разрешение для покупателей из-за пределов ЕС, пошаговый процесс, налоги и сборы — понятно, для Республики Кипр.',
    },
    summary: {
      en: 'A clear, current guide to buying a home in the Republic of Cyprus as a foreigner: eligibility, the non-EU permit, the legal process and the 2026 taxes and fees.',
      el: 'Ένας καθαρός, επίκαιρος οδηγός για την αγορά κατοικίας στην Κυπριακή Δημοκρατία ως ξένος: επιλεξιμότητα, άδεια εκτός ΕΕ, νομική διαδικασία και φόροι/έξοδα 2026.',
      ro: 'Un ghid clar și actual pentru cumpărarea unei locuințe în Republica Cipru ca străin: eligibilitate, permisul non-UE, procesul juridic și taxele din 2026.',
      ar: 'دليل واضح ومحدَّث لشراء منزل في جمهورية قبرص كأجنبي: الأهلية، وتصريح غير الأوروبيين، والإجراءات القانونية، وضرائب ورسوم 2026.',
      de: 'Ein klarer, aktueller Leitfaden zum Immobilienkauf in der Republik Zypern als Ausländer: Voraussetzungen, Nicht-EU-Genehmigung, Rechtsablauf und Steuern 2026.',
      pl: 'Przejrzysty, aktualny przewodnik po zakupie domu w Republice Cypryjskiej przez obcokrajowca: uprawnienia, zezwolenie spoza UE, proces prawny i podatki 2026.',
      ru: 'Понятный актуальный гид по покупке жилья в Республике Кипр иностранцем: право на покупку, разрешение для не-граждан ЕС, юридический процесс и налоги 2026.',
    },
    seo_title: {
      en: 'Buying Property in Cyprus as a Foreigner (2026 Guide)',
      el: 'Αγορά Ακινήτου στην Κύπρο για Ξένους (Οδηγός 2026)',
      ro: 'Cumpărarea unei proprietăți în Cipru ca străin (Ghid 2026)',
      ar: 'شراء عقار في قبرص للأجانب (دليل 2026)',
      de: 'Immobilienkauf in Zypern als Ausländer (Leitfaden 2026)',
      pl: 'Zakup nieruchomości na Cyprze przez obcokrajowca (2026)',
      ru: 'Покупка недвижимости на Кипре иностранцем (гид 2026)',
    },
    seo_description: {
      en: 'Who can buy, the non-EU permit, the legal process, and 2026 VAT, transfer fees and stamp duty for buying a home in the Republic of Cyprus.',
      el: 'Ποιοι αγοράζουν, η άδεια εκτός ΕΕ, η νομική διαδικασία και ΦΠΑ, μεταβιβαστικά και χαρτόσημο 2026 για αγορά κατοικίας στην Κυπριακή Δημοκρατία.',
      ro: 'Cine poate cumpăra, permisul non-UE, procesul juridic și TVA, taxele de transfer și timbrul în 2026 pentru o locuință în Republica Cipru.',
      ar: 'من يستطيع الشراء، وتصريح غير الأوروبيين، والإجراءات القانونية، وضريبة القيمة المضافة ورسوم النقل والطوابع لعام 2026 في جمهورية قبرص.',
      de: 'Wer kaufen darf, die Nicht-EU-Genehmigung, der Rechtsablauf sowie MwSt., Übertragungsgebühren und Stempelsteuer 2026 in der Republik Zypern.',
      pl: 'Kto może kupić, zezwolenie spoza UE, proces prawny oraz VAT, opłaty transferowe i skarbowa w 2026 przy zakupie domu w Republice Cypryjskiej.',
      ru: 'Кто может купить, разрешение для не-ЕС, юридический процесс, НДС, сборы за передачу и гербовый сбор 2026 в Республике Кипр.',
    },
    content: {
      en: `<p>The Republic of Cyprus has drawn homeowners and investors for decades: an English-speaking, EU legal system, a Mediterranean climate that runs from spring to late autumn, and a property market that spans seafront apartments in Limassol, villas above Paphos and stone houses in the hill villages. Buying here as a foreigner is straightforward — provided you go about it in the right order.</p>
<h2>Can a foreigner buy property in Cyprus?</h2>
<p>EU citizens buy on the same footing as Cypriots, with no restriction. Non-EU citizens — including British buyers since Brexit — may acquire one home (an apartment, a house or a villa) or a plot of up to about 4,014 m², subject to approval from the Council of Ministers. In practice this is a routine formality that takes roughly two to three months and is virtually always granted; you can usually take possession while it is processed.</p>
<h2>The process, step by step</h2>
<p>The single most important decision is to appoint your own <strong>independent lawyer</strong> — never the one recommended by the developer or agent — before you pay anything. Expect legal fees of around €1,500–3,000. Your lawyer runs due diligence: a title-deed search, checks for mortgages or other encumbrances, and confirmation that planning and permits are in order.</p>
<p>You then place a reservation deposit (typically €5,000–10,000) to take the property off the market, and sign a Contract of Sale. Crucially, that contract is lodged at the District Lands Office within about 60 days — this secures your right to the property. For an off-plan purchase, payments are staged against construction milestones. Ownership is completed when the title deed is transferred at the Department of Lands and Surveys.</p>
<h2>Taxes and fees (as of 2026)</h2>
<p>On a new build, VAT is 19%, reduced to <strong>5%</strong> on a primary residence for the first 130 m² of buildable area — with a transaction value cap of €350,000, a maximum area of 190 m², and a commitment to live in it for at least ten years. Resale homes carry no VAT. Transfer fees follow a tiered scale that has had a standing 50% reduction (broadly 1.5–4% effective), and are waived entirely where VAT was paid on the property. Stamp duty on the purchase contract was abolished from 1 January 2026. Your lawyer will give you an exact all-in figure for your specific purchase.</p>
<h2>A word on title deeds</h2>
<p>Insist on a clean title deed, or a clear, documented path to one. Reforms since 2011 and 2015 resolved most of the historical backlog, but this is exactly what your independent lawyer is for — verify before you commit.</p>
<h2>How Cyprus Lifestyle can help</h2>
<p>Our concierge can introduce you to vetted independent lawyers and reputable estate agents in the district you are considering, and help you gather two or three quotes so you can compare honestly. For anything bespoke or high-value, we can arrange a dedicated concierge to accompany you through the purchase.</p>
<p><em>Figures are current as of 2026 and indicative; always confirm the exact rules and costs with a licensed Cyprus lawyer before you commit.</em></p>`,
      el: `<p>Η Κυπριακή Δημοκρατία προσελκύει ιδιοκτήτες και επενδυτές εδώ και δεκαετίες: αγγλόφωνο, ευρωπαϊκό νομικό σύστημα, μεσογειακό κλίμα από την άνοιξη ως το τέλος του φθινοπώρου, και μια αγορά ακινήτων που εκτείνεται από παραθαλάσσια διαμερίσματα στη Λεμεσό ως βίλες πάνω από την Πάφο και πέτρινα σπίτια στα ορεινά χωριά. Η αγορά εδώ ως ξένος είναι απλή — αρκεί να ακολουθήσετε τη σωστή σειρά.</p>
<h2>Μπορεί ένας ξένος να αγοράσει ακίνητο στην Κύπρο;</h2>
<p>Οι πολίτες της ΕΕ αγοράζουν με τους ίδιους όρους όπως οι Κύπριοι, χωρίς περιορισμό. Οι πολίτες εκτός ΕΕ — συμπεριλαμβανομένων των Βρετανών μετά το Brexit — μπορούν να αποκτήσουν μία κατοικία (διαμέρισμα, σπίτι ή βίλα) ή οικόπεδο έως περίπου 4.014 τ.μ., με έγκριση του Υπουργικού Συμβουλίου. Στην πράξη πρόκειται για τυπική διαδικασία δύο έως τριών μηνών που σχεδόν πάντα εγκρίνεται· συνήθως μπορείτε να πάρετε κατοχή όσο εκκρεμεί.</p>
<h2>Η διαδικασία, βήμα προς βήμα</h2>
<p>Η πιο σημαντική απόφαση είναι να ορίσετε τον δικό σας <strong>ανεξάρτητο δικηγόρο</strong> — ποτέ αυτόν που προτείνει ο κατασκευαστής ή ο μεσίτης — πριν πληρώσετε οτιδήποτε. Υπολογίστε αμοιβές περίπου €1.500–3.000. Ο δικηγόρος σας διενεργεί τον έλεγχο: έρευνα τίτλου, έλεγχο για υποθήκες ή βάρη, και επιβεβαίωση ότι οι άδειες είναι εντάξει.</p>
<p>Στη συνέχεια καταβάλλετε προκαταβολή κράτησης (συνήθως €5.000–10.000) και υπογράφετε το Πωλητήριο Έγγραφο. Καθοριστικά, το συμβόλαιο κατατίθεται στο Επαρχιακό Κτηματολόγιο εντός περίπου 60 ημερών — αυτό κατοχυρώνει το δικαίωμά σας στο ακίνητο. Για αγορά υπό ανέγερση, οι πληρωμές γίνονται σταδιακά ανάλογα με την πρόοδο. Η κυριότητα ολοκληρώνεται με τη μεταβίβαση του τίτλου στο Τμήμα Κτηματολογίου και Χωρομετρίας.</p>
<h2>Φόροι και έξοδα (από το 2026)</h2>
<p>Σε νεόδμητο, ο ΦΠΑ είναι 19%, μειωμένος στο <strong>5%</strong> για κύρια κατοικία για τα πρώτα 130 τ.μ. δομήσιμης επιφάνειας — με ανώτατο όριο αξίας €350.000, μέγιστη επιφάνεια 190 τ.μ. και δέσμευση διαμονής τουλάχιστον δέκα ετών. Τα μεταπωλούμενα ακίνητα δεν έχουν ΦΠΑ. Τα μεταβιβαστικά τέλη ακολουθούν κλιμακωτή κλίμακα με πάγια μείωση 50% (περίπου 1,5–4% ουσιαστικά) και δεν επιβάλλονται όπου έχει καταβληθεί ΦΠΑ. Το χαρτόσημο στο συμβόλαιο καταργήθηκε από την 1η Ιανουαρίου 2026. Ο δικηγόρος σας θα σας δώσει ακριβές συνολικό ποσό.</p>
<h2>Μια λέξη για τους τίτλους ιδιοκτησίας</h2>
<p>Επιμείνετε σε καθαρό τίτλο ιδιοκτησίας ή σε σαφή, τεκμηριωμένη πορεία προς αυτόν. Οι μεταρρυθμίσεις του 2011 και 2015 έλυσαν το μεγαλύτερο μέρος των παλαιών εκκρεμοτήτων, αλλά ακριβώς γι’ αυτό υπάρχει ο ανεξάρτητος δικηγόρος σας — επαληθεύστε πριν δεσμευτείτε.</p>
<h2>Πώς μπορεί να βοηθήσει το Cyprus Lifestyle</h2>
<p>Το concierge μας μπορεί να σας συστήσει ελεγμένους ανεξάρτητους δικηγόρους και αξιόπιστους μεσίτες στην επαρχία που σας ενδιαφέρει, και να σας βοηθήσει να συγκεντρώσετε δύο ή τρεις προσφορές για να συγκρίνετε τίμια. Για οτιδήποτε εξατομικευμένο ή υψηλής αξίας, μπορούμε να οργανώσουμε αποκλειστικό concierge να σας συνοδεύσει.</p>
<p><em>Τα στοιχεία ισχύουν από το 2026 και είναι ενδεικτικά· επιβεβαιώνετε πάντα τους ακριβείς κανόνες και το κόστος με αδειούχο Κύπριο δικηγόρο.</em></p>`,
      ro: `<p>Republica Cipru atrage de decenii proprietari și investitori: un sistem juridic european, vorbitor de engleză, o climă mediteraneană care ține din primăvară până toamna târziu și o piață imobiliară care merge de la apartamente pe faleza din Limassol la vile deasupra orașului Paphos și case de piatră în satele de deal. Cumpărarea aici ca străin este simplă — dacă procedezi în ordinea corectă.</p>
<h2>Poate un străin să cumpere o proprietate în Cipru?</h2>
<p>Cetățenii UE cumpără în aceleași condiții ca ciprioții, fără restricții. Cetățenii din afara UE — inclusiv britanicii după Brexit — pot achiziționa o singură locuință (apartament, casă sau vilă) ori un teren de până la circa 4.014 m², cu aprobarea Consiliului de Miniștri. În practică este o formalitate de rutină, care durează două-trei luni și se acordă aproape întotdeauna; de regulă poți intra în posesie cât timp se procesează.</p>
<h2>Procesul, pas cu pas</h2>
<p>Cea mai importantă decizie este să îți numești propriul <strong>avocat independent</strong> — niciodată cel recomandat de dezvoltator sau de agent — înainte de a plăti ceva. Onorariile sunt de aproximativ €1.500–3.000. Avocatul face verificările: căutarea titlului de proprietate, verificarea ipotecilor sau a sarcinilor și confirmarea că autorizațiile sunt în regulă.</p>
<p>Apoi plătești un avans de rezervare (de obicei €5.000–10.000) și semnezi Contractul de Vânzare. Esențial, contractul se depune la Oficiul Cadastral Districtual în circa 60 de zile — asta îți asigură dreptul asupra proprietății. Pentru o achiziție „pe planșă”, plățile sunt eșalonate pe etape de construcție. Proprietatea se finalizează la transferul titlului la Departamentul de Cadastru.</p>
<h2>Taxe și costuri (din 2026)</h2>
<p>La o construcție nouă, TVA este 19%, redus la <strong>5%</strong> pentru locuința principală, pentru primii 130 m² de suprafață construibilă — cu un plafon de valoare de €350.000, o suprafață maximă de 190 m² și obligația de a locui acolo cel puțin zece ani. Locuințele revândute nu au TVA. Taxele de transfer urmează o scală progresivă cu o reducere permanentă de 50% (efectiv circa 1,5–4%) și nu se aplică deloc acolo unde s-a plătit TVA. Timbrul pe contractul de vânzare a fost abolit de la 1 ianuarie 2026. Avocatul îți va da o cifră totală exactă.</p>
<h2>Un cuvânt despre titlurile de proprietate</h2>
<p>Insistă pe un titlu curat sau pe un drum clar, documentat, către el. Reformele din 2011 și 2015 au rezolvat cea mai mare parte a restanțelor istorice, dar tocmai pentru asta există avocatul tău independent — verifică înainte de a te angaja.</p>
<h2>Cum te poate ajuta Cyprus Lifestyle</h2>
<p>Concierge-ul nostru te poate pune în legătură cu avocați independenți verificați și agenți imobiliari de încredere în districtul care te interesează și te ajută să obții două-trei oferte pentru o comparație corectă. Pentru orice este personalizat sau de valoare mare, putem organiza un concierge dedicat care să te însoțească.</p>
<p><em>Cifrele sunt valabile în 2026 și au caracter orientativ; confirmă întotdeauna regulile și costurile exacte cu un avocat cipriot autorizat.</em></p>`,
      ar: `<p>تجذب جمهورية قبرص المالكين والمستثمرين منذ عقود: نظام قانوني أوروبي يتعامل بالإنجليزية، ومناخ متوسطي يمتد من الربيع إلى أواخر الخريف، وسوق عقاري يتنوع من شقق على الواجهة البحرية في ليماسول إلى فيلات تطل على بافوس وبيوت حجرية في القرى الجبلية. الشراء هنا كأجنبي أمر مباشر — شرط أن تسير بالترتيب الصحيح.</p>
<h2>هل يمكن للأجنبي شراء عقار في قبرص؟</h2>
<p>يشتري مواطنو الاتحاد الأوروبي بالشروط نفسها كالقبارصة دون قيود. أما مواطنو خارج الاتحاد — ومنهم البريطانيون بعد بريكست — فيمكنهم تملك منزل واحد (شقة أو بيت أو فيلا) أو قطعة أرض تصل إلى نحو 4٬014 م²، بموافقة مجلس الوزراء. عملياً هذا إجراء روتيني يستغرق شهرين إلى ثلاثة ويُمنح دائماً تقريباً؛ وغالباً يمكنك الحيازة أثناء المعالجة.</p>
<h2>الخطوات، واحدة تلو الأخرى</h2>
<p>أهم قرار هو تعيين <strong>محامٍ مستقل</strong> خاص بك — وليس من يوصي به المطوّر أو الوكيل — قبل دفع أي مبلغ. توقّع أتعاباً بنحو €1٬500–3٬000. يجري محاميك التدقيق: بحث سند الملكية، والتحقق من الرهون أو الأعباء، والتأكد من سلامة التراخيص.</p>
<p>ثم تدفع عربون حجز (عادة €5٬000–10٬000) وتوقّع عقد البيع. والأهم أن يُسجَّل العقد في دائرة الأراضي المحلية خلال نحو 60 يوماً — فهذا يحفظ حقك في العقار. في الشراء على الخارطة تُدفع الأقساط وفق مراحل البناء. وتكتمل الملكية بنقل سند الملكية في دائرة الأراضي والمساحة.</p>
<h2>الضرائب والرسوم (اعتباراً من 2026)</h2>
<p>على البناء الجديد، ضريبة القيمة المضافة 19%، وتُخفَّض إلى <strong>5%</strong> للسكن الأساسي على أول 130 م² من المساحة القابلة للبناء — بسقف قيمة €350٬000 ومساحة قصوى 190 م² والتزام بالسكن عشر سنوات على الأقل. لا ضريبة قيمة مضافة على عقارات إعادة البيع. رسوم النقل بمقياس متدرج مع تخفيض دائم بنسبة 50% (نحو 1.5–4% فعلياً)، وتُعفى تماماً حيث دُفعت ضريبة القيمة المضافة. أُلغيت رسوم الطوابع على عقد الشراء اعتباراً من 1 يناير 2026. سيمنحك محاميك رقماً إجمالياً دقيقاً.</p>
<h2>كلمة عن سندات الملكية</h2>
<p>أصرّ على سند ملكية نظيف أو مسار موثّق واضح للحصول عليه. عالجت إصلاحات 2011 و2015 معظم التأخيرات التاريخية، ولكن لهذا بالضبط يوجد محاميك المستقل — تحقّق قبل الالتزام.</p>
<h2>كيف يساعدك Cyprus Lifestyle</h2>
<p>يمكن لخدمة الكونسيرج لدينا أن تعرّفك على محامين مستقلين موثوقين ووكلاء عقاريين محترمين في المنطقة التي تفكّر فيها، وأن تساعدك في جمع عرضين أو ثلاثة للمقارنة بأمانة. ولأي أمر خاص أو عالي القيمة، يمكننا ترتيب كونسيرج مخصّص يرافقك.</p>
<p><em>الأرقام سارية اعتباراً من 2026 وهي إرشادية؛ تحقّق دائماً من القواعد والتكاليف الدقيقة مع محامٍ قبرصي مرخّص قبل الالتزام.</em></p>`,
      de: `<p>Die Republik Zypern zieht seit Jahrzehnten Eigentümer und Investoren an: ein englischsprachiges EU-Rechtssystem, ein mediterranes Klima vom Frühjahr bis in den späten Herbst und ein Immobilienmarkt, der von Wohnungen am Meer in Limassol über Villen oberhalb von Paphos bis zu Steinhäusern in den Bergdörfern reicht. Der Kauf als Ausländer ist unkompliziert — sofern man in der richtigen Reihenfolge vorgeht.</p>
<h2>Darf ein Ausländer in Zypern Immobilien kaufen?</h2>
<p>EU-Bürger kaufen zu denselben Bedingungen wie Zyprer, ohne Einschränkung. Nicht-EU-Bürger — einschließlich Briten seit dem Brexit — dürfen eine Wohnimmobilie (Wohnung, Haus oder Villa) oder ein Grundstück von bis zu etwa 4.014 m² erwerben, vorbehaltlich der Genehmigung des Ministerrats. In der Praxis ist das eine Formsache von rund zwei bis drei Monaten, die nahezu immer erteilt wird; in der Regel können Sie die Immobilie schon während der Bearbeitung nutzen.</p>
<h2>Der Ablauf, Schritt für Schritt</h2>
<p>Die wichtigste Entscheidung ist, Ihren eigenen <strong>unabhängigen Anwalt</strong> zu beauftragen — niemals den vom Bauträger oder Makler empfohlenen — bevor Sie irgendetwas zahlen. Rechnen Sie mit Honoraren von etwa €1.500–3.000. Ihr Anwalt führt die Due Diligence durch: Prüfung des Grundbuchtitels, Kontrolle auf Hypotheken oder Belastungen und Bestätigung, dass Baugenehmigungen in Ordnung sind.</p>
<p>Anschließend zahlen Sie eine Reservierungsanzahlung (typisch €5.000–10.000) und unterzeichnen den Kaufvertrag. Entscheidend: Der Vertrag wird innerhalb von rund 60 Tagen beim Bezirksgrundbuchamt hinterlegt — das sichert Ihr Recht an der Immobilie. Bei einem Kauf vom Plan erfolgen die Zahlungen in Bauabschnitten. Das Eigentum ist mit der Übertragung des Titels beim Katasteramt abgeschlossen.</p>
<h2>Steuern und Gebühren (Stand 2026)</h2>
<p>Bei einem Neubau beträgt die Mehrwertsteuer 19%, ermäßigt auf <strong>5%</strong> für einen Hauptwohnsitz auf die ersten 130 m² bebaubarer Fläche — mit einer Wertobergrenze von €350.000, einer Höchstfläche von 190 m² und der Verpflichtung, mindestens zehn Jahre darin zu wohnen. Wiederverkaufsimmobilien tragen keine Mehrwertsteuer. Übertragungsgebühren folgen einer gestaffelten Skala mit einer dauerhaften Ermäßigung von 50% (effektiv etwa 1,5–4%) und entfallen ganz, wenn Mehrwertsteuer gezahlt wurde. Die Stempelsteuer auf den Kaufvertrag wurde zum 1. Januar 2026 abgeschafft. Ihr Anwalt nennt Ihnen eine genaue Gesamtsumme.</p>
<h2>Ein Wort zu den Eigentumstiteln</h2>
<p>Bestehen Sie auf einem sauberen Eigentumstitel oder einem klaren, dokumentierten Weg dorthin. Die Reformen von 2011 und 2015 haben den größten Teil des historischen Rückstaus gelöst, aber genau dafür ist Ihr unabhängiger Anwalt da — prüfen Sie, bevor Sie sich binden.</p>
<h2>Wie Cyprus Lifestyle hilft</h2>
<p>Unser Concierge kann Sie mit geprüften unabhängigen Anwälten und seriösen Maklern im gewünschten Bezirk zusammenbringen und Ihnen helfen, zwei oder drei Angebote für einen ehrlichen Vergleich einzuholen. Für alles Maßgeschneiderte oder Hochwertige organisieren wir einen persönlichen Concierge, der Sie begleitet.</p>
<p><em>Die Angaben gelten mit Stand 2026 und sind Richtwerte; bestätigen Sie die genauen Regeln und Kosten stets mit einem zugelassenen zyprischen Anwalt.</em></p>`,
      pl: `<p>Republika Cypryjska od dziesięcioleci przyciąga właścicieli i inwestorów: anglojęzyczny, unijny system prawny, śródziemnomorski klimat od wiosny do późnej jesieni oraz rynek nieruchomości od apartamentów przy morzu w Limassol, przez wille nad Pafos, po kamienne domy w górskich wioskach. Zakup tutaj jako obcokrajowiec jest prosty — o ile robi się to we właściwej kolejności.</p>
<h2>Czy obcokrajowiec może kupić nieruchomość na Cyprze?</h2>
<p>Obywatele UE kupują na tych samych zasadach co Cypryjczycy, bez ograniczeń. Obywatele spoza UE — w tym Brytyjczycy po Brexicie — mogą nabyć jedną nieruchomość mieszkalną (mieszkanie, dom lub willę) albo działkę do około 4014 m², za zgodą Rady Ministrów. W praktyce to rutynowa formalność trwająca dwa–trzy miesiące, niemal zawsze udzielana; zwykle można objąć nieruchomość już w trakcie rozpatrywania.</p>
<h2>Proces krok po kroku</h2>
<p>Najważniejsza decyzja to wyznaczenie własnego <strong>niezależnego prawnika</strong> — nigdy tego poleconego przez dewelopera czy pośrednika — przed jakąkolwiek płatnością. Honoraria to około €1500–3000. Prawnik przeprowadza due diligence: sprawdzenie tytułu własności, kontrolę hipotek i obciążeń oraz potwierdzenie, że pozwolenia są w porządku.</p>
<p>Następnie wpłacasz zadatek rezerwacyjny (zwykle €5000–10 000) i podpisujesz umowę sprzedaży. Co kluczowe, umowę składa się w Okręgowym Urzędzie Katastralnym w ciągu około 60 dni — to zabezpiecza Twoje prawo do nieruchomości. Przy zakupie „z planu” płatności są rozłożone na etapy budowy. Własność zostaje sfinalizowana wraz z przeniesieniem tytułu w Departamencie Katastru i Geodezji.</p>
<h2>Podatki i opłaty (stan na 2026)</h2>
<p>Przy nowej inwestycji VAT wynosi 19%, obniżony do <strong>5%</strong> dla głównego miejsca zamieszkania na pierwsze 130 m² powierzchni użytkowej — z limitem wartości €350 000, maksymalną powierzchnią 190 m² i zobowiązaniem do zamieszkiwania przez co najmniej dziesięć lat. Nieruchomości z rynku wtórnego nie mają VAT. Opłaty transferowe mają skalę progresywną ze stałą obniżką 50% (efektywnie około 1,5–4%) i nie są pobierane tam, gdzie zapłacono VAT. Opłatę skarbową od umowy zniesiono od 1 stycznia 2026. Prawnik poda dokładną kwotę całkowitą.</p>
<h2>Słowo o aktach własności</h2>
<p>Domagaj się czystego tytułu własności lub jasnej, udokumentowanej drogi do niego. Reformy z 2011 i 2015 roku rozwiązały większość historycznych zaległości, ale właśnie po to jest Twój niezależny prawnik — sprawdź, zanim się zobowiążesz.</p>
<h2>Jak pomaga Cyprus Lifestyle</h2>
<p>Nasz concierge może polecić sprawdzonych niezależnych prawników i renomowanych pośredników w wybranym okręgu oraz pomóc zebrać dwie–trzy oferty do uczciwego porównania. Przy sprawach szytych na miarę lub o dużej wartości zorganizujemy dedykowanego concierge, który Ci towarzyszy.</p>
<p><em>Dane są aktualne na 2026 i mają charakter orientacyjny; zawsze potwierdź dokładne zasady i koszty u licencjonowanego cypryjskiego prawnika.</em></p>`,
      ru: `<p>Республика Кипр десятилетиями привлекает владельцев и инвесторов: англоязычная правовая система ЕС, средиземноморский климат с весны до поздней осени и рынок недвижимости — от квартир у моря в Лимасоле до вилл над Пафосом и каменных домов в горных деревнях. Покупка здесь иностранцем проста — если действовать в правильном порядке.</p>
<h2>Может ли иностранец купить недвижимость на Кипре?</h2>
<p>Граждане ЕС покупают на равных с киприотами, без ограничений. Граждане из-за пределов ЕС — включая британцев после Brexit — могут приобрести одно жильё (квартиру, дом или виллу) либо участок до примерно 4014 м² с одобрения Совета министров. На практике это рутинная формальность на два-три месяца, которая почти всегда предоставляется; обычно вы можете вступить во владение, пока идёт оформление.</p>
<h2>Процесс шаг за шагом</h2>
<p>Самое важное решение — назначить собственного <strong>независимого юриста</strong> — никогда не того, кого рекомендует застройщик или агент — до любых платежей. Гонорар — примерно €1500–3000. Юрист проводит проверку: поиск по титулу, проверку на ипотеки и обременения и подтверждение, что разрешения в порядке.</p>
<p>Затем вы вносите резервный депозит (обычно €5000–10 000) и подписываете договор купли-продажи. Принципиально: договор подаётся в Окружное земельное управление примерно в течение 60 дней — это закрепляет ваше право на объект. При покупке на этапе строительства платежи привязаны к этапам стройки. Право собственности завершается передачей титула в Департаменте земель и кадастра.</p>
<h2>Налоги и сборы (по состоянию на 2026)</h2>
<p>На новостройку НДС составляет 19%, сниженный до <strong>5%</strong> для основного жилья на первые 130 м² застраиваемой площади — с потолком стоимости €350 000, максимальной площадью 190 м² и обязательством проживать не менее десяти лет. Вторичное жильё НДС не облагается. Сборы за передачу идут по прогрессивной шкале с постоянной скидкой 50% (фактически около 1,5–4%) и вовсе не взимаются там, где был уплачен НДС. Гербовый сбор с договора купли-продажи отменён с 1 января 2026 года. Точную итоговую сумму назовёт ваш юрист.</p>
<h2>Несколько слов о титулах</h2>
<p>Настаивайте на чистом титуле собственности или на ясном, документально подтверждённом пути к нему. Реформы 2011 и 2015 годов сняли большую часть исторических задержек, но именно для этого и нужен ваш независимый юрист — проверяйте до того, как связывать себя обязательствами.</p>
<h2>Чем поможет Cyprus Lifestyle</h2>
<p>Наш консьерж познакомит вас с проверенными независимыми юристами и надёжными агентами в интересующем вас округе и поможет собрать два-три предложения для честного сравнения. Для всего индивидуального или дорогостоящего мы организуем персонального консьержа, который будет сопровождать вас.</p>
<p><em>Данные актуальны на 2026 год и являются ориентировочными; всегда уточняйте точные правила и расходы у лицензированного кипрского юриста.</em></p>`,
    },
  },

  // ── Article 2 — The best time to visit Cyprus ───────────────────────────────
  {
    slug: 'best-time-to-visit-cyprus',
    batch: 1,
    category: 'travel',
    author_name: 'The Cyprus Lifestyle Desk',
    reading_time_min: 5,
    source_url: 'https://www.22places.com/best-time-to-visit-cyprus/',
    sources: [
      'https://www.22places.com/best-time-to-visit-cyprus/',
      'https://www.audleytravel.com/cyprus/best-time-to-visit',
    ],
    tags: {
      en: ['travel', 'when to visit', 'weather', 'beaches'],
      el: ['ταξίδι', 'πότε να επισκεφθείτε', 'καιρός', 'παραλίες'],
      ro: ['călătorie', 'când să vizitezi', 'vreme', 'plaje'],
      ar: ['سفر', 'أفضل وقت للزيارة', 'الطقس', 'الشواطئ'],
      de: ['Reise', 'beste Reisezeit', 'Wetter', 'Strände'],
      pl: ['podróże', 'kiedy jechać', 'pogoda', 'plaże'],
      ru: ['путешествия', 'когда ехать', 'погода', 'пляжи'],
    },
    title: {
      en: 'The Best Time to Visit Cyprus',
      el: 'Η Καλύτερη Εποχή για να Επισκεφθείτε την Κύπρο',
      ro: 'Cel mai bun moment pentru a vizita Ciprul',
      ar: 'أفضل وقت لزيارة قبرص',
      de: 'Die beste Reisezeit für Zypern',
      pl: 'Najlepszy czas na wyjazd na Cypr',
      ru: 'Лучшее время для поездки на Кипр',
    },
    excerpt: {
      en: 'Summer sun, the shoulder-season sweet spot, or a mild green winter — how to choose the right month for the Cyprus you want.',
      el: 'Καλοκαιρινός ήλιος, η ιδανική ενδιάμεση εποχή ή ένας ήπιος, καταπράσινος χειμώνας — πώς να διαλέξετε τον σωστό μήνα.',
      ro: 'Soarele verii, perioada perfectă de tranziție sau o iarnă blândă și verde — cum alegi luna potrivită pentru Ciprul dorit.',
      ar: 'شمس الصيف، أو فترة الذروة المعتدلة بين المواسم، أو شتاء لطيف أخضر — كيف تختار الشهر المناسب لقبرص التي تريدها.',
      de: 'Sommersonne, die ideale Nebensaison oder ein milder, grüner Winter — so wählen Sie den richtigen Monat.',
      pl: 'Letnie słońce, idealny sezon przejściowy albo łagodna, zielona zima — jak wybrać właściwy miesiąc.',
      ru: 'Летнее солнце, идеальный межсезонный период или мягкая зелёная зима — как выбрать нужный месяц.',
    },
    summary: {
      en: 'When to go to Cyprus, season by season: summer heat, the spring and autumn sweet spot, sea temperatures, and a mild green winter for villages and hiking.',
      el: 'Πότε να πάτε στην Κύπρο, εποχή προς εποχή: καλοκαιρινή ζέστη, η ιδανική άνοιξη και φθινόπωρο, θερμοκρασίες θάλασσας και ήπιος χειμώνας για χωριά και πεζοπορία.',
      ro: 'Când să mergi în Cipru, sezon cu sezon: căldura verii, perioada ideală de primăvară și toamnă, temperatura mării și o iarnă blândă pentru sate și drumeții.',
      ar: 'متى تزور قبرص، موسماً بموسم: حرّ الصيف، وأفضل أوقات الربيع والخريف، ودرجات حرارة البحر، وشتاء لطيف للقرى والمشي.',
      de: 'Wann nach Zypern, Saison für Saison: Sommerhitze, die ideale Zeit im Frühjahr und Herbst, Wassertemperaturen und ein milder Winter für Dörfer und Wandern.',
      pl: 'Kiedy jechać na Cypr, sezon po sezonie: letni upał, idealna wiosna i jesień, temperatura morza oraz łagodna zima na wioski i wędrówki.',
      ru: 'Когда ехать на Кипр, сезон за сезоном: летняя жара, идеальные весна и осень, температура моря и мягкая зима для деревень и походов.',
    },
    seo_title: {
      en: 'The Best Time to Visit Cyprus (Season by Season)',
      el: 'Η Καλύτερη Εποχή για την Κύπρο (Εποχή προς Εποχή)',
      ro: 'Cel mai bun moment pentru a vizita Ciprul (pe sezoane)',
      ar: 'أفضل وقت لزيارة قبرص (موسماً بموسم)',
      de: 'Die beste Reisezeit für Zypern (Saison für Saison)',
      pl: 'Najlepszy czas na Cypr (sezon po sezonie)',
      ru: 'Лучшее время для поездки на Кипр (по сезонам)',
    },
    seo_description: {
      en: 'Season-by-season guide to visiting Cyprus: summer heat, the spring/autumn sweet spot, sea temperatures and a mild green winter.',
      el: 'Οδηγός εποχής προς εποχή για την Κύπρο: καλοκαιρινή ζέστη, ιδανική άνοιξη/φθινόπωρο, θερμοκρασίες θάλασσας και ήπιος χειμώνας.',
      ro: 'Ghid pe sezoane pentru Cipru: căldura verii, perioada ideală primăvară/toamnă, temperatura mării și o iarnă blândă.',
      ar: 'دليل موسمي لزيارة قبرص: حرّ الصيف، وأفضل أوقات الربيع والخريف، ودرجات حرارة البحر، وشتاء لطيف.',
      de: 'Saisonaler Leitfaden für Zypern: Sommerhitze, ideale Zeit im Frühjahr/Herbst, Wassertemperaturen und milder Winter.',
      pl: 'Sezonowy przewodnik po Cyprze: letni upał, idealna wiosna/jesień, temperatura morza i łagodna zima.',
      ru: 'Посезонный гид по Кипру: летняя жара, идеальные весна и осень, температура моря и мягкая зима.',
    },
    content: {
      en: `<p>There is no wrong time to come to the Republic of Cyprus — only the right time for the trip you have in mind. The island runs warm and sunny for much of the year, so the real question is whether you are chasing the sea, a quieter table, or the green mountains.</p>
<h2>Summer (July–August): the sea at its warmest</h2>
<p>High summer is hot — around 30–33°C on the coast, and up to the high thirties inland in Nicosia. The sea is at its warmest, roughly 26–28°C, and resort towns are at their liveliest. This is the season for beach days and late dinners, but also the busiest and priciest, so book ahead.</p>
<h2>Spring and autumn (April–May, September–October): the sweet spot</h2>
<p>For most visitors this is the finest time to come. Days are warm rather than fierce — think the low-to-mid twenties in spring and the mid-to-high twenties in autumn — with fewer crowds and better value. The sea stays swimmable well into October, still holding 24–27°C from the summer, while the light softens and the countryside is either in blossom or in harvest. September and October pair warm water with the grape and wine season inland.</p>
<h2>Winter (November–March): mild, green and quiet</h2>
<p>Cyprus winters are gentle by European standards — daytime highs of about 12–18°C on the coast, the landscape at its greenest, and prices at their lowest. It is the season for the hill villages, long lunches in mountain tavernas, and walking the Troodos trails. When there is snow high on the mountains, you can, on the right day, ski in the morning and be on the coast by the afternoon.</p>
<h2>So, when should you go?</h2>
<p>For swimming and nightlife, come June to early October; the water is comfortable from roughly late May to early November. For sightseeing, wineries and hiking, spring (March–May) and autumn (September–November) are ideal. For calm, greenery and value, choose winter.</p>
<h2>Getting your bearings</h2>
<p>Two airports serve the south: Larnaca (LCA), the main gateway, and Paphos (PFO). Driving is on the left, the currency is the euro, Greek and English are widely spoken, and the emergency number is 112. For getting around, the local ride-hailing apps are Bolt, CabCY and nTaxi.</p>
<h2>Let us plan it around the season</h2>
<p>Tell our concierge what you are hoping for — beaches, wine country, the mountains, a quiet villa — and we will suggest the month that suits it and arrange the stay, the table and the transfers to match.</p>
<p><em>Temperatures are typical seasonal ranges, not guarantees; check the forecast close to your dates.</em></p>`,
      el: `<p>Δεν υπάρχει λάθος εποχή για να έρθετε στην Κυπριακή Δημοκρατία — μόνο η σωστή εποχή για το ταξίδι που έχετε στο μυαλό σας. Το νησί είναι ζεστό και ηλιόλουστο μεγάλο μέρος του χρόνου, οπότε το πραγματικό ερώτημα είναι αν κυνηγάτε τη θάλασσα, ένα πιο ήσυχο τραπέζι ή τα πράσινα βουνά.</p>
<h2>Καλοκαίρι (Ιούλιος–Αύγουστος): η θάλασσα στα πιο ζεστά της</h2>
<p>Το μεσοκαλόκαιρο είναι ζεστό — γύρω στους 30–33°C στην ακτή και έως τους υψηλούς τριάντα στην ενδοχώρα, στη Λευκωσία. Η θάλασσα είναι στα πιο ζεστά της, περίπου 26–28°C, και οι παραθαλάσσιες πόλεις στο πιο ζωντανό τους. Είναι η εποχή για παραλία και βραδινά δείπνα, αλλά και η πιο πολυσύχναστη και ακριβή — κλείστε εγκαίρως.</p>
<h2>Άνοιξη και φθινόπωρο (Απρίλιος–Μάιος, Σεπτέμβριος–Οκτώβριος): η ιδανική στιγμή</h2>
<p>Για τους περισσότερους επισκέπτες είναι η καλύτερη εποχή. Οι μέρες είναι ζεστές χωρίς υπερβολή — γύρω στους είκοσι την άνοιξη και στα μέσα-υψηλά είκοσι το φθινόπωρο — με λιγότερο κόσμο και καλύτερες τιμές. Η θάλασσα παραμένει κολυμβήσιμη μέχρι τα βαθιά του Οκτωβρίου, κρατώντας ακόμη 24–27°C από το καλοκαίρι, ενώ το φως μαλακώνει και η ύπαιθρος ανθίζει ή τρυγά. Σεπτέμβριος και Οκτώβριος συνδυάζουν ζεστό νερό με την εποχή του κρασιού στην ενδοχώρα.</p>
<h2>Χειμώνας (Νοέμβριος–Μάρτιος): ήπιος, πράσινος και ήσυχος</h2>
<p>Οι κυπριακοί χειμώνες είναι ήπιοι για ευρωπαϊκά δεδομένα — μέγιστες γύρω στους 12–18°C στην ακτή, το τοπίο στο πιο πράσινό του και οι τιμές στις χαμηλότερες. Είναι η εποχή για τα ορεινά χωριά, τα μακρόσυρτα γεύματα στις ταβέρνες και τα μονοπάτια του Τροόδους. Όταν χιονίζει ψηλά, μια καλή μέρα μπορείτε να κάνετε σκι το πρωί και να είστε στην ακτή το απόγευμα.</p>
<h2>Πότε λοιπόν να πάτε;</h2>
<p>Για κολύμπι και νυχτερινή ζωή, από τον Ιούνιο ως τις αρχές Οκτωβρίου· το νερό είναι ευχάριστο περίπου από τα τέλη Μαΐου ως τις αρχές Νοεμβρίου. Για αξιοθέατα, οινοποιεία και πεζοπορία, η άνοιξη (Μάρτιος–Μάιος) και το φθινόπωρο (Σεπτέμβριος–Νοέμβριος) είναι ιδανικά. Για ηρεμία, πρασινάδα και οικονομία, επιλέξτε χειμώνα.</p>
<h2>Για να προσανατολιστείτε</h2>
<p>Δύο αεροδρόμια εξυπηρετούν τον νότο: η Λάρνακα (LCA), η κύρια πύλη, και η Πάφος (PFO). Η οδήγηση είναι αριστερά, το νόμισμα είναι το ευρώ, μιλιούνται ευρέως ελληνικά και αγγλικά, και ο αριθμός έκτακτης ανάγκης είναι το 112. Για μετακινήσεις, οι τοπικές εφαρμογές είναι Bolt, CabCY και nTaxi.</p>
<h2>Αφήστε μας να το σχεδιάσουμε ανά εποχή</h2>
<p>Πείτε στο concierge μας τι επιθυμείτε — παραλίες, κρασοχώρια, βουνό, μια ήσυχη βίλα — και θα σας προτείνουμε τον κατάλληλο μήνα και θα κανονίσουμε τη διαμονή, το τραπέζι και τις μεταφορές.</p>
<p><em>Οι θερμοκρασίες είναι τυπικά εποχικά εύρη, όχι εγγυήσεις· ελέγξτε την πρόγνωση κοντά στις ημερομηνίες σας.</em></p>`,
      ro: `<p>Nu există un moment nepotrivit pentru a veni în Republica Cipru — există doar momentul potrivit pentru călătoria la care te gândești. Insula e caldă și însorită mare parte din an, așa că întrebarea reală e dacă urmărești marea, o masă mai liniștită sau munții verzi.</p>
<h2>Vara (iulie–august): marea la cea mai caldă</h2>
<p>În toiul verii e cald — în jur de 30–33°C pe coastă și până spre 37°C în interior, la Nicosia. Marea e la cea mai caldă, aproximativ 26–28°C, iar orașele de coastă sunt cele mai animate. E sezonul plajei și al cinelor târzii, dar și cel mai aglomerat și mai scump — rezervă din timp.</p>
<h2>Primăvara și toamna (aprilie–mai, septembrie–octombrie): momentul ideal</h2>
<p>Pentru majoritatea vizitatorilor este cea mai frumoasă perioadă. Zilele sunt calde, nu toride — în jur de 20°C primăvara și spre 25–27°C toamna — cu mai puțină lume și prețuri mai bune. Marea rămâne bună de înot până spre finalul lui octombrie, păstrând încă 24–27°C din vară, în timp ce lumina se îmblânzește, iar peisajul e fie înflorit, fie în cules. Septembrie și octombrie îmbină apa caldă cu sezonul viei și al vinului în interior.</p>
<h2>Iarna (noiembrie–martie): blândă, verde și liniștită</h2>
<p>Iernile cipriote sunt blânde după standarde europene — maxime de circa 12–18°C pe coastă, peisajul la cel mai verde și prețurile la cele mai mici. E sezonul satelor de munte, al prânzurilor lungi în tavernele montane și al potecilor din Troodos. Când e zăpadă sus, într-o zi bună poți schia dimineața și ajunge pe coastă după-amiaza.</p>
<h2>Deci, când să mergi?</h2>
<p>Pentru înot și viață de noapte, vino din iunie până la începutul lui octombrie; apa e plăcută cam de la sfârșitul lui mai până la începutul lui noiembrie. Pentru obiective, crame și drumeții, primăvara (martie–mai) și toamna (septembrie–noiembrie) sunt ideale. Pentru liniște, verdeață și economie, alege iarna.</p>
<h2>Ca să te orientezi</h2>
<p>Sudul e deservit de două aeroporturi: Larnaca (LCA), poarta principală, și Paphos (PFO). Se conduce pe stânga, moneda e euro, se vorbesc pe larg greaca și engleza, iar numărul de urgență este 112. Pentru deplasări, aplicațiile locale sunt Bolt, CabCY și nTaxi.</p>
<h2>Lasă-ne să planificăm în funcție de sezon</h2>
<p>Spune-i concierge-ului nostru ce îți dorești — plaje, podgorii, munte, o vilă liniștită — și îți vom sugera luna potrivită, aranjând cazarea, masa și transferurile pe măsură.</p>
<p><em>Temperaturile sunt intervale sezoniere tipice, nu garanții; verifică prognoza aproape de datele tale.</em></p>`,
      ar: `<p>لا يوجد وقت خاطئ لزيارة جمهورية قبرص — بل الوقت المناسب للرحلة التي تفكّر فيها. الجزيرة دافئة ومشمسة معظم العام، فالسؤال الحقيقي هو: هل تسعى إلى البحر، أم إلى طاولة أهدأ، أم إلى الجبال الخضراء؟</p>
<h2>الصيف (يوليو–أغسطس): البحر في أدفأ حالاته</h2>
<p>ذروة الصيف حارّة — نحو 30–33°م على الساحل، وحتى أواخر الثلاثينيات في الداخل بنيقوسيا. البحر في أدفأ حالاته، نحو 26–28°م، ومدن المنتجعات في أوج حيويتها. إنه موسم الشواطئ والعشاء المتأخر، لكنه أيضاً الأكثر ازدحاماً وكلفة — احجز مبكراً.</p>
<h2>الربيع والخريف (أبريل–مايو، سبتمبر–أكتوبر): الوقت الأمثل</h2>
<p>لمعظم الزوّار هذا أجمل وقت. الأيام دافئة لا لاهبة — نحو منتصف العشرينيات ربيعاً، وأواخر العشرينيات خريفاً — مع ازدحام أقل وأسعار أفضل. يبقى البحر صالحاً للسباحة حتى أواخر أكتوبر، محتفظاً بنحو 24–27°م من حرارة الصيف، بينما يلين الضوء ويكون الريف إمّا مزهراً أو في موسم الحصاد. يجمع سبتمبر وأكتوبر بين الماء الدافئ وموسم العنب والنبيذ في الداخل.</p>
<h2>الشتاء (نوفمبر–مارس): معتدل وأخضر وهادئ</h2>
<p>شتاء قبرص لطيف بالمقاييس الأوروبية — عظمى نحو 12–18°م على الساحل، والطبيعة في أشد اخضرارها، والأسعار في أدناها. إنه موسم القرى الجبلية والغداء الطويل في المطاعم الجبلية ومسارات ترودوس. وحين يتساقط الثلج في الأعالي، يمكنك في يومٍ مناسب أن تتزلّج صباحاً وتكون على الساحل بعد الظهر.</p>
<h2>إذن، متى تذهب؟</h2>
<p>للسباحة والحياة الليلية، تعال من يونيو إلى أوائل أكتوبر؛ الماء مريح تقريباً من أواخر مايو إلى أوائل نوفمبر. لمعالم السياحة والمصانع والنبيذ والمشي، الربيع (مارس–مايو) والخريف (سبتمبر–نوفمبر) مثاليان. للهدوء والخضرة والاقتصاد، اختر الشتاء.</p>
<h2>لتتعرّف على المكان</h2>
<p>يخدم الجنوب مطاران: لارنكا (LCA)، البوابة الرئيسية، وبافوس (PFO). القيادة على اليسار، والعملة اليورو، وتُستخدم اليونانية والإنجليزية على نطاق واسع، ورقم الطوارئ 112. للتنقل، تطبيقات النقل المحلية هي Bolt وCabCY وnTaxi.</p>
<h2>دعنا نخطّط حسب الموسم</h2>
<p>أخبر خدمة الكونسيرج لدينا بما تتمناه — شواطئ، أو بلاد النبيذ، أو الجبال، أو فيلا هادئة — وسنقترح الشهر المناسب ونرتّب الإقامة والمائدة والتنقلات بما يلائمه.</p>
<p><em>درجات الحرارة نطاقات موسمية معتادة وليست ضمانات؛ راجع توقعات الطقس قرب موعد سفرك.</em></p>`,
      de: `<p>Es gibt keine falsche Zeit für die Republik Zypern — nur die richtige Zeit für die Reise, die Ihnen vorschwebt. Die Insel ist einen Großteil des Jahres warm und sonnig, die eigentliche Frage ist also, ob Sie das Meer, einen ruhigeren Tisch oder die grünen Berge suchen.</p>
<h2>Sommer (Juli–August): das Meer am wärmsten</h2>
<p>Der Hochsommer ist heiß — rund 30–33°C an der Küste und bis in die hohen Dreißiger im Landesinneren in Nikosia. Das Meer ist mit etwa 26–28°C am wärmsten, und die Küstenorte sind am lebhaftesten. Es ist die Zeit für Strandtage und späte Abendessen, aber auch die vollste und teuerste — buchen Sie früh.</p>
<h2>Frühling und Herbst (April–Mai, September–Oktober): die ideale Zeit</h2>
<p>Für die meisten Gäste ist dies die schönste Zeit. Die Tage sind warm statt sengend — etwa Anfang bis Mitte zwanzig im Frühjahr und Mitte bis Ende zwanzig im Herbst — mit weniger Andrang und besseren Preisen. Das Meer bleibt bis weit in den Oktober badetauglich und hält noch 24–27°C aus dem Sommer, während das Licht weicher wird und das Land blüht oder erntet. September und Oktober verbinden warmes Wasser mit der Trauben- und Weinsaison im Inland.</p>
<h2>Winter (November–März): mild, grün und ruhig</h2>
<p>Zyperns Winter sind nach europäischen Maßstäben sanft — Tageshöchstwerte von etwa 12–18°C an der Küste, die Landschaft am grünsten und die Preise am niedrigsten. Es ist die Zeit für die Bergdörfer, lange Mittagessen in Bergtavernen und die Wege des Troodos. Wenn oben Schnee liegt, können Sie an einem guten Tag morgens Ski fahren und nachmittags an der Küste sein.</p>
<h2>Also, wann sollten Sie reisen?</h2>
<p>Zum Baden und für das Nachtleben kommen Sie von Juni bis Anfang Oktober; das Wasser ist etwa von Ende Mai bis Anfang November angenehm. Für Besichtigungen, Weingüter und Wandern sind Frühling (März–Mai) und Herbst (September–November) ideal. Für Ruhe, Grün und günstige Preise wählen Sie den Winter.</p>
<h2>Zur Orientierung</h2>
<p>Zwei Flughäfen bedienen den Süden: Larnaka (LCA), das Haupttor, und Paphos (PFO). Es herrscht Linksverkehr, die Währung ist der Euro, Griechisch und Englisch sind weit verbreitet, und die Notrufnummer ist 112. Für unterwegs sind die lokalen Fahrdienst-Apps Bolt, CabCY und nTaxi.</p>
<h2>Lassen Sie uns nach Saison planen</h2>
<p>Sagen Sie unserem Concierge, was Sie sich wünschen — Strände, Weinland, die Berge, eine ruhige Villa — und wir schlagen Ihnen den passenden Monat vor und arrangieren Unterkunft, Tisch und Transfers dazu.</p>
<p><em>Die Temperaturen sind typische saisonale Bereiche, keine Garantien; prüfen Sie die Vorhersage kurz vor Ihren Terminen.</em></p>`,
      pl: `<p>Nie ma złego czasu na przyjazd do Republiki Cypryjskiej — jest tylko właściwy czas na podróż, o której myślisz. Wyspa jest ciepła i słoneczna przez większość roku, więc prawdziwe pytanie brzmi: gonisz za morzem, spokojniejszym stolikiem czy zielonymi górami?</p>
<h2>Lato (lipiec–sierpień): morze najcieplejsze</h2>
<p>Pełnia lata jest gorąca — około 30–33°C na wybrzeżu i pod 37°C w głębi lądu, w Nikozji. Morze jest najcieplejsze, około 26–28°C, a miejscowości nadmorskie najżywsze. To sezon plaż i późnych kolacji, ale też najbardziej zatłoczony i najdroższy — rezerwuj z wyprzedzeniem.</p>
<h2>Wiosna i jesień (kwiecień–maj, wrzesień–październik): idealny moment</h2>
<p>Dla większości gości to najpiękniejszy czas. Dni są ciepłe, a nie upalne — około dwudziestu kilku stopni wiosną i pod trzydzieści jesienią — z mniejszym tłokiem i lepszymi cenami. Morze nadaje się do kąpieli aż do końca października, wciąż utrzymując 24–27°C z lata, gdy światło łagodnieje, a wieś kwitnie lub trwają zbiory. Wrzesień i październik łączą ciepłą wodę z sezonem winogron i wina w głębi lądu.</p>
<h2>Zima (listopad–marzec): łagodna, zielona i cicha</h2>
<p>Cypryjskie zimy są łagodne jak na europejskie standardy — maksymalnie około 12–18°C na wybrzeżu, krajobraz najbardziej zielony, a ceny najniższe. To sezon górskich wiosek, długich obiadów w górskich tawernach i szlaków Troodos. Gdy w górach leży śnieg, w dobry dzień można rano jeździć na nartach, a po południu być na wybrzeżu.</p>
<h2>Więc kiedy jechać?</h2>
<p>Na kąpiele i życie nocne przyjedź od czerwca do początku października; woda jest przyjemna mniej więcej od końca maja do początku listopada. Na zwiedzanie, winnice i wędrówki idealne są wiosna (marzec–maj) i jesień (wrzesień–listopad). Dla spokoju, zieleni i oszczędności wybierz zimę.</p>
<h2>Żeby się zorientować</h2>
<p>Południe obsługują dwa lotniska: Larnaka (LCA), główna brama, i Pafos (PFO). Ruch jest lewostronny, walutą jest euro, powszechnie mówi się po grecku i angielsku, a numer alarmowy to 112. Do przemieszczania się lokalne aplikacje to Bolt, CabCY i nTaxi.</p>
<h2>Zaplanujmy to pod sezon</h2>
<p>Powiedz naszemu concierge, czego oczekujesz — plaż, krainy wina, gór, spokojnej willi — a zaproponujemy odpowiedni miesiąc i zorganizujemy pobyt, stolik i transfery.</p>
<p><em>Temperatury to typowe zakresy sezonowe, a nie gwarancje; sprawdź prognozę blisko swoich dat.</em></p>`,
      ru: `<p>Неудачного времени для поездки в Республику Кипр не бывает — есть лишь подходящее время для той поездки, о которой вы думаете. Остров тёплый и солнечный большую часть года, поэтому вопрос в том, за чем вы едете: за морем, за спокойным ужином или за зелёными горами.</p>
<h2>Лето (июль–август): море самое тёплое</h2>
<p>Разгар лета жаркий — около 30–33°C на побережье и под 37°C внутри острова, в Никосии. Море самое тёплое, примерно 26–28°C, а курортные города наиболее оживлённые. Это сезон пляжей и поздних ужинов, но и самый людный и дорогой — бронируйте заранее.</p>
<h2>Весна и осень (апрель–май, сентябрь–октябрь): золотая середина</h2>
<p>Для большинства гостей это лучшее время. Дни тёплые, но не изнуряющие — около двадцати с небольшим весной и ближе к тридцати осенью — при меньшем количестве людей и лучших ценах. Море пригодно для купания до конца октября, сохраняя ещё 24–27°C с лета, свет становится мягче, а сельская местность либо в цвету, либо в сборе урожая. Сентябрь и октябрь сочетают тёплую воду с сезоном винограда и вина внутри острова.</p>
<h2>Зима (ноябрь–март): мягкая, зелёная и тихая</h2>
<p>Кипрские зимы мягкие по европейским меркам — дневные максимумы около 12–18°C на побережье, природа самая зелёная, а цены самые низкие. Это сезон горных деревень, долгих обедов в горных тавернах и троп Троодоса. Когда в горах лежит снег, в удачный день можно кататься на лыжах утром и оказаться на побережье к вечеру.</p>
<h2>Так когда же ехать?</h2>
<p>Для купания и ночной жизни приезжайте с июня до начала октября; вода комфортна примерно с конца мая до начала ноября. Для осмотра достопримечательностей, виноделен и походов идеальны весна (март–май) и осень (сентябрь–ноябрь). Ради тишины, зелени и экономии выбирайте зиму.</p>
<h2>Чтобы сориентироваться</h2>
<p>Юг обслуживают два аэропорта: Ларнака (LCA), главные ворота, и Пафос (PFO). Движение левостороннее, валюта — евро, широко распространены греческий и английский, номер экстренной помощи — 112. Для передвижения местные приложения такси — Bolt, CabCY и nTaxi.</p>
<h2>Спланируем поездку под сезон</h2>
<p>Скажите нашему консьержу, чего вам хочется — пляжей, винной страны, гор, тихой виллы — и мы предложим подходящий месяц и организуем проживание, столик и трансферы.</p>
<p><em>Температуры — это типичные сезонные диапазоны, а не гарантии; уточните прогноз ближе к вашим датам.</em></p>`,
    },
  },

  // ── Article 3 — Cyprus tax residency: the 60-day rule & non-dom ──────────────
  {
    slug: 'cyprus-tax-residency-60-day-non-dom',
    batch: 2,
    category: 'business',
    author_name: 'The Cyprus Lifestyle Desk',
    reading_time_min: 6,
    source_url: 'https://www.mondaq.com/cyprus/tax-authorities/1754142/cyprus-tax-residency-the-definitive-guide-to-the-60-day-rule-non-dom-status-and-tax-free-dividends-2026',
    sources: [
      'https://www.mondaq.com/cyprus/tax-authorities/1754142/cyprus-tax-residency-the-definitive-guide-to-the-60-day-rule-non-dom-status-and-tax-free-dividends-2026',
      'https://gk-lawfirm.com/cyprus-tax-residency/',
      'https://www.cyprustaxlife.com/learn/corporate-tax-cyprus',
    ],
    tags: {
      en: ['tax', 'residency', 'non-dom', 'relocation'],
      el: ['φορολογία', 'φορολογική κατοικία', 'non-dom', 'μετεγκατάσταση'],
      ro: ['taxe', 'rezidență fiscală', 'non-dom', 'relocare'],
      ar: ['ضرائب', 'الإقامة الضريبية', 'غير مقيم ضريبياً', 'انتقال'],
      de: ['Steuern', 'Steueransässigkeit', 'Non-Dom', 'Umzug'],
      pl: ['podatki', 'rezydencja podatkowa', 'non-dom', 'relokacja'],
      ru: ['налоги', 'налоговое резидентство', 'non-dom', 'переезд'],
    },
    title: {
      en: 'Cyprus Tax Residency: The 60-Day Rule and Non-Dom Status',
      el: 'Φορολογική Κατοικία στην Κύπρο: Ο Κανόνας των 60 Ημερών και το Non-Dom',
      ro: 'Rezidența fiscală în Cipru: regula celor 60 de zile și statutul non-dom',
      ar: 'الإقامة الضريبية في قبرص: قاعدة الـ60 يوماً ووضع غير المقيم ضريبياً',
      de: 'Steueransässigkeit in Zypern: die 60-Tage-Regel und der Non-Dom-Status',
      pl: 'Rezydencja podatkowa na Cyprze: zasada 60 dni i status non-dom',
      ru: 'Налоговое резидентство Кипра: правило 60 дней и статус non-dom',
    },
    excerpt: {
      en: 'Become tax resident on as few as 60 days a year, and pay no tax on dividends beyond a modest health levy — how the Cyprus regime works in 2026.',
      el: 'Γίνετε φορολογικός κάτοικος με μόλις 60 ημέρες τον χρόνο και μην πληρώνετε φόρο σε μερίσματα πέρα από μια μικρή εισφορά υγείας — πώς λειτουργεί το 2026.',
      ro: 'Devii rezident fiscal cu doar 60 de zile pe an și nu plătești impozit pe dividende dincolo de o contribuție modestă la sănătate — cum funcționează în 2026.',
      ar: 'كن مقيماً ضريبياً بـ60 يوماً فقط سنوياً، ولا تدفع ضريبة على الأرباح الموزعة سوى مساهمة صحية بسيطة — كيف يعمل النظام في 2026.',
      de: 'Mit nur 60 Tagen im Jahr steuerlich ansässig werden und auf Dividenden außer einer geringen Gesundheitsabgabe keine Steuer zahlen — so funktioniert es 2026.',
      pl: 'Zostań rezydentem podatkowym już przy 60 dniach w roku i nie płać podatku od dywidend poza skromną składką zdrowotną — jak to działa w 2026.',
      ru: 'Станьте налоговым резидентом всего за 60 дней в году и не платите налог с дивидендов сверх скромного взноса на здравоохранение — как это работает в 2026.',
    },
    summary: {
      en: 'How Cyprus tax residency works in 2026: the 183-day and 60-day rules, non-domicile status and its 17-year exemption, and what Cyprus does not tax.',
      el: 'Πώς λειτουργεί η φορολογική κατοικία στην Κύπρο το 2026: οι κανόνες των 183 και 60 ημερών, το καθεστώς non-dom και η 17ετής απαλλαγή, και τι δεν φορολογείται.',
      ro: 'Cum funcționează rezidența fiscală în Cipru în 2026: regulile de 183 și 60 de zile, statutul non-dom și scutirea de 17 ani și ce nu se impozitează.',
      ar: 'كيف تعمل الإقامة الضريبية في قبرص عام 2026: قاعدتا 183 و60 يوماً، ووضع غير المقيم وإعفاؤه لـ17 عاماً، وما لا تفرض عليه قبرص ضرائب.',
      de: 'Wie die Steueransässigkeit in Zypern 2026 funktioniert: die 183- und 60-Tage-Regeln, der Non-Dom-Status und seine 17-Jahres-Befreiung, und was Zypern nicht besteuert.',
      pl: 'Jak działa rezydencja podatkowa na Cyprze w 2026: zasady 183 i 60 dni, status non-dom i jego 17-letnie zwolnienie oraz czego Cypr nie opodatkowuje.',
      ru: 'Как работает налоговое резидентство Кипра в 2026: правила 183 и 60 дней, статус non-dom и его освобождение на 17 лет, и что Кипр не облагает налогом.',
    },
    seo_title: {
      en: 'Cyprus Tax Residency 2026: 60-Day Rule & Non-Dom Status',
      el: 'Φορολογική Κατοικία Κύπρου 2026: Κανόνας 60 Ημερών & Non-Dom',
      ro: 'Rezidența fiscală Cipru 2026: regula de 60 de zile și non-dom',
      ar: 'الإقامة الضريبية في قبرص 2026: قاعدة 60 يوماً ووضع non-dom',
      de: 'Steueransässigkeit Zypern 2026: 60-Tage-Regel & Non-Dom',
      pl: 'Rezydencja podatkowa Cypr 2026: zasada 60 dni i non-dom',
      ru: 'Налоговое резидентство Кипра 2026: правило 60 дней и non-dom',
    },
    seo_description: {
      en: 'The Cyprus 60-day tax residency rule, non-domicile status and its 17-year SDC exemption, the 2026 dividend rules, and taxes Cyprus does not levy.',
      el: 'Ο κανόνας των 60 ημερών, το καθεστώς non-dom και η 17ετής απαλλαγή SDC, οι κανόνες μερισμάτων 2026 και οι φόροι που δεν επιβάλλει η Κύπρος.',
      ro: 'Regula de 60 de zile, statutul non-dom și scutirea de 17 ani de la SDC, regulile din 2026 pentru dividende și ce impozite nu percepe Ciprul.',
      ar: 'قاعدة الـ60 يوماً، ووضع غير المقيم وإعفاء الـ17 عاماً من SDC، وقواعد الأرباح لعام 2026، والضرائب التي لا تفرضها قبرص.',
      de: 'Die 60-Tage-Regel, der Non-Dom-Status und die 17-jährige SDC-Befreiung, die Dividendenregeln 2026 und Steuern, die Zypern nicht erhebt.',
      pl: 'Zasada 60 dni, status non-dom i 17-letnie zwolnienie z SDC, zasady dywidend na 2026 oraz podatki, których Cypr nie pobiera.',
      ru: 'Правило 60 дней, статус non-dom и освобождение от SDC на 17 лет, правила по дивидендам 2026 и налоги, которых на Кипре нет.',
    },
    content: {
      en: `<p>Cyprus has become one of Europe's most attractive bases for entrepreneurs, investors and remote professionals — not through secrecy, but through a clear, legislated regime: a low-tax EU jurisdiction where you can become tax resident on as few as 60 days a year, and where "non-domiciled" residents pay no tax on dividends and interest beyond a modest health levy. Here is how it actually works, as of 2026.</p>
<h2>Two ways to become a Cyprus tax resident</h2>
<p>The classic route is the <strong>183-day rule</strong>: spend more than 183 days in Cyprus in a calendar year and you are tax resident, with no further conditions.</p>
<p>The <strong>60-day rule</strong> is what makes Cyprus unusual. You qualify in a given year if you meet all four conditions: you spend at least 60 days in Cyprus; you do not spend more than 183 days in any single other country; you carry on a business in Cyprus, are employed by a Cyprus-based company, or are a director of a Cyprus tax-resident company; and you keep a permanent home in Cyprus, owned or rented, at some point in the year. As of 2026 the earlier requirement not to be tax resident anywhere else has been removed.</p>
<h2>Non-domiciled status — the headline benefit</h2>
<p>A Cyprus tax resident who is "non-domiciled" is exempt from the Special Defence Contribution (SDC), the tax that would otherwise apply to dividends, interest and rental income. Non-dom status lasts up to 17 years — you are treated as domiciled once you have been resident for 17 of the last 20 years. Because Cyprus does not levy personal income tax on dividends in the first place, a non-dom's dividend income is effectively taxed only by the General Health System contribution of 2.65%, itself capped at €180,000 of income a year. For 2026 the SDC on dividends for domiciled residents is 5%.</p>
<h2>And what Cyprus does not tax</h2>
<p>There is no inheritance tax and no wealth tax. Capital gains tax applies only to gains on immovable property situated in Cyprus — not to gains on shares or other assets. On the corporate side, the income-tax rate rose to 15% from 1 January 2026 (from 12.5%) to meet the OECD global-minimum-tax rules, still among the more competitive in the EU.</p>
<h2>Is it right for you?</h2>
<p>The regime is genuine and widely used, but it rewards getting the details right — days counted correctly, real substance behind a company, and coordination with the tax rules of your current country. This is not a do-it-yourself exercise.</p>
<h2>How Cyprus Lifestyle can help</h2>
<p>Our concierge can introduce you to vetted Cyprus tax advisers, accountants and immigration lawyers who handle exactly these moves, and help you line up two or three so you can choose with confidence.</p>
<p><em>This is general information current as of 2026, not tax advice; the rules are detailed and change — take professional advice on your own situation before acting.</em></p>`,
      el: `<p>Η Κύπρος έχει γίνει μία από τις πιο ελκυστικές βάσεις στην Ευρώπη για επιχειρηματίες, επενδυτές και επαγγελματίες εξ αποστάσεως — όχι μέσω μυστικότητας, αλλά μέσω ενός σαφούς, θεσμοθετημένου καθεστώτος: μια δικαιοδοσία της ΕΕ με χαμηλή φορολογία, όπου μπορείτε να γίνετε φορολογικός κάτοικος με μόλις 60 ημέρες τον χρόνο, και όπου οι «non-domiciled» κάτοικοι δεν πληρώνουν φόρο σε μερίσματα και τόκους πέρα από μια μικρή εισφορά υγείας. Δείτε πώς λειτουργεί, από το 2026.</p>
<h2>Δύο τρόποι να γίνετε φορολογικός κάτοικος Κύπρου</h2>
<p>Η κλασική οδός είναι ο <strong>κανόνας των 183 ημερών</strong>: αν περάσετε πάνω από 183 ημέρες στην Κύπρο σε ένα ημερολογιακό έτος, είστε φορολογικός κάτοικος, χωρίς άλλες προϋποθέσεις.</p>
<p>Ο <strong>κανόνας των 60 ημερών</strong> είναι αυτό που κάνει την Κύπρο ξεχωριστή. Πληροίτε τις προϋποθέσεις σε ένα έτος αν ισχύουν και τα τέσσερα: περνάτε τουλάχιστον 60 ημέρες στην Κύπρο· δεν περνάτε πάνω από 183 ημέρες σε καμία άλλη μεμονωμένη χώρα· ασκείτε επιχείρηση στην Κύπρο, εργάζεστε σε κυπριακή εταιρεία ή είστε διευθυντής κυπριακής φορολογικά κάτοικης εταιρείας· και διατηρείτε μόνιμη κατοικία στην Κύπρο, ιδιόκτητη ή ενοικιαζόμενη, κάποια στιγμή μέσα στο έτος. Από το 2026 έχει καταργηθεί η προηγούμενη απαίτηση να μην είστε φορολογικός κάτοικος αλλού.</p>
<h2>Το καθεστώς non-domiciled — το βασικό πλεονέκτημα</h2>
<p>Ένας φορολογικός κάτοικος Κύπρου που είναι «non-domiciled» απαλλάσσεται από την Έκτακτη Εισφορά για την Άμυνα (SDC), τον φόρο που διαφορετικά θα εφαρμοζόταν σε μερίσματα, τόκους και εισοδήματα από ενοίκια. Το καθεστώς non-dom διαρκεί έως 17 χρόνια — θεωρείστε ότι έχετε κατοικία (domicile) στην Κύπρο μόλις γίνετε κάτοικος για 17 από τα τελευταία 20 χρόνια. Επειδή η Κύπρος δεν επιβάλλει καταρχήν φόρο εισοδήματος στα μερίσματα, το μέρισμα ενός non-dom φορολογείται ουσιαστικά μόνο με την εισφορά στο Γενικό Σύστημα Υγείας 2,65%, με ανώτατο όριο εισοδήματος €180.000 τον χρόνο. Για το 2026 το SDC στα μερίσματα για τους domiciled κατοίκους είναι 5%.</p>
<h2>Και τι δεν φορολογεί η Κύπρος</h2>
<p>Δεν υπάρχει φόρος κληρονομιάς ούτε φόρος πλούτου. Ο φόρος υπεραξίας εφαρμόζεται μόνο σε κέρδη από ακίνητη περιουσία που βρίσκεται στην Κύπρο — όχι σε κέρδη από μετοχές ή άλλα περιουσιακά στοιχεία. Στο εταιρικό σκέλος, ο φόρος εισοδήματος αυξήθηκε στο 15% από την 1η Ιανουαρίου 2026 (από 12,5%) για να συμμορφωθεί με τους κανόνες παγκόσμιου ελάχιστου φόρου του ΟΟΣΑ, παραμένοντας από τους πιο ανταγωνιστικούς στην ΕΕ.</p>
<h2>Σας ταιριάζει;</h2>
<p>Το καθεστώς είναι πραγματικό και ευρέως χρησιμοποιούμενο, αλλά ανταμείβει τη σωστή προσοχή στη λεπτομέρεια — σωστή καταμέτρηση ημερών, πραγματική υπόσταση πίσω από μια εταιρεία και συντονισμό με τους φορολογικούς κανόνες της τρέχουσας χώρας σας. Δεν είναι υπόθεση «κάν’ το μόνος σου».</p>
<h2>Πώς μπορεί να βοηθήσει το Cyprus Lifestyle</h2>
<p>Το concierge μας μπορεί να σας συστήσει ελεγμένους Κύπριους φορολογικούς συμβούλους, λογιστές και δικηγόρους μετανάστευσης που χειρίζονται ακριβώς αυτές τις κινήσεις, και να σας βοηθήσει να συγκεντρώσετε δύο ή τρεις για να επιλέξετε με σιγουριά.</p>
<p><em>Πρόκειται για γενική ενημέρωση που ισχύει από το 2026, όχι φορολογική συμβουλή· οι κανόνες είναι λεπτομερείς και αλλάζουν — ζητήστε επαγγελματική συμβουλή για την περίπτωσή σας πριν ενεργήσετε.</em></p>`,
      ro: `<p>Ciprul a devenit una dintre cele mai atractive baze din Europa pentru antreprenori, investitori și profesioniști la distanță — nu prin secretomanie, ci printr-un regim clar, reglementat: o jurisdicție UE cu impozite reduse, unde poți deveni rezident fiscal cu doar 60 de zile pe an și unde rezidenții „non-domiciliați” nu plătesc impozit pe dividende și dobânzi dincolo de o contribuție modestă la sănătate. Iată cum funcționează, în 2026.</p>
<h2>Două căi de a deveni rezident fiscal în Cipru</h2>
<p>Calea clasică este <strong>regula celor 183 de zile</strong>: dacă petreci peste 183 de zile în Cipru într-un an calendaristic, ești rezident fiscal, fără alte condiții.</p>
<p><strong>Regula celor 60 de zile</strong> este ceea ce face Ciprul neobișnuit. Te califici într-un an dacă îndeplinești toate cele patru condiții: petreci cel puțin 60 de zile în Cipru; nu petreci mai mult de 183 de zile în nicio altă țară; desfășori o activitate în Cipru, ești angajat al unei companii cipriote sau ești administrator al unei companii rezidente fiscal în Cipru; și menții o locuință permanentă în Cipru, deținută sau închiriată, la un moment dat în cursul anului. Din 2026, cerința anterioară de a nu fi rezident fiscal în altă parte a fost eliminată.</p>
<h2>Statutul non-domiciliat — beneficiul principal</h2>
<p>Un rezident fiscal cipriot „non-domiciliat” este scutit de Contribuția Specială pentru Apărare (SDC), impozitul care altfel s-ar aplica dividendelor, dobânzilor și veniturilor din chirii. Statutul non-dom durează până la 17 ani — ești considerat domiciliat odată ce ai fost rezident 17 din ultimii 20 de ani. Deoarece Ciprul nu percepe oricum impozit pe venit pe dividende, dividendele unui non-dom sunt impozitate efectiv doar prin contribuția la Sistemul General de Sănătate de 2,65%, plafonată la 180.000 € venit pe an. Pentru 2026, SDC pe dividende pentru rezidenții domiciliați este de 5%.</p>
<h2>Și ce nu impozitează Ciprul</h2>
<p>Nu există impozit pe moștenire și nici impozit pe avere. Impozitul pe câștigurile de capital se aplică doar câștigurilor din bunuri imobile situate în Cipru — nu câștigurilor din acțiuni sau alte active. La nivel corporativ, impozitul pe venit a crescut la 15% de la 1 ianuarie 2026 (de la 12,5%) pentru a respecta regulile OCDE privind impozitul minim global, rămânând printre cele mai competitive din UE.</p>
<h2>Ți se potrivește?</h2>
<p>Regimul este real și larg folosit, dar răsplătește atenția la detalii — zile numărate corect, substanță reală în spatele unei companii și coordonare cu regulile fiscale din țara ta actuală. Nu este o treabă de tip „fă-o singur”.</p>
<h2>Cum te poate ajuta Cyprus Lifestyle</h2>
<p>Concierge-ul nostru te poate pune în legătură cu consultanți fiscali, contabili și avocați de imigrare ciprioți verificați, care gestionează exact astfel de mutări, și te ajută să aduni două-trei oferte ca să alegi cu încredere.</p>
<p><em>Acestea sunt informații generale valabile în 2026, nu consultanță fiscală; regulile sunt detaliate și se schimbă — cere consultanță profesională pentru situația ta înainte de a acționa.</em></p>`,
      ar: `<p>أصبحت قبرص من أكثر القواعد جاذبية في أوروبا لروّاد الأعمال والمستثمرين والمهنيين عن بُعد — لا عبر السرية، بل عبر نظام واضح ومقنَّن: ولاية قضائية في الاتحاد الأوروبي بضرائب منخفضة، يمكنك أن تصبح فيها مقيماً ضريبياً بـ60 يوماً فقط سنوياً، وحيث لا يدفع المقيمون «غير المقيمين ضريبياً» (non-dom) ضريبة على الأرباح الموزعة والفوائد سوى مساهمة صحية بسيطة. إليك كيف يعمل فعلاً، اعتباراً من 2026.</p>
<h2>طريقتان لتصبح مقيماً ضريبياً في قبرص</h2>
<p>الطريق الكلاسيكي هو <strong>قاعدة الـ183 يوماً</strong>: إذا أمضيت أكثر من 183 يوماً في قبرص خلال سنة تقويمية، فأنت مقيم ضريبياً دون شروط أخرى.</p>
<p><strong>قاعدة الـ60 يوماً</strong> هي ما يميّز قبرص. تتأهّل في سنة معينة إذا استوفيت الشروط الأربعة جميعاً: تُمضي 60 يوماً على الأقل في قبرص؛ ولا تُمضي أكثر من 183 يوماً في أي دولة أخرى بمفردها؛ وتمارس عملاً في قبرص، أو تعمل لدى شركة قبرصية، أو تكون مديراً في شركة مقيمة ضريبياً في قبرص؛ وتحتفظ بمسكن دائم في قبرص، تمليكاً أو إيجاراً، في وقت ما خلال السنة. واعتباراً من 2026 أُلغي الشرط السابق بألا تكون مقيماً ضريبياً في مكان آخر.</p>
<h2>وضع «غير المقيم ضريبياً» — الميزة الأبرز</h2>
<p>المقيم الضريبي في قبرص الذي يحمل صفة «non-domiciled» مُعفى من مساهمة الدفاع الخاصة (SDC)، وهي الضريبة التي كانت ستُطبَّق على الأرباح الموزعة والفوائد ودخل الإيجار. يستمر وضع non-dom حتى 17 عاماً — إذ تُعدّ ذا موطن ضريبي في قبرص متى أصبحت مقيماً 17 من آخر 20 عاماً. ولأن قبرص لا تفرض أصلاً ضريبة دخل على الأرباح الموزعة، فإن أرباح صاحب وضع non-dom تُخضَع فعلياً فقط لمساهمة النظام الصحي العام بنسبة 2.65%، بسقف دخل قدره 180٬000 يورو سنوياً. وفي 2026 تبلغ SDC على الأرباح الموزعة للمقيمين ذوي الموطن الضريبي 5%.</p>
<h2>وما الذي لا تفرض عليه قبرص ضرائب</h2>
<p>لا توجد ضريبة على الميراث ولا ضريبة على الثروة. وتُطبَّق ضريبة الأرباح الرأسمالية فقط على الأرباح من العقارات الواقعة في قبرص — لا على الأرباح من الأسهم أو الأصول الأخرى. أما على مستوى الشركات، فقد ارتفعت ضريبة الدخل إلى 15% اعتباراً من 1 يناير 2026 (من 12.5%) امتثالاً لقواعد الحد الأدنى العالمي للضريبة لدى منظمة التعاون الاقتصادي، وتظل من الأكثر تنافسية في الاتحاد الأوروبي.</p>
<h2>هل يناسبك؟</h2>
<p>النظام حقيقي وواسع الاستخدام، لكنه يكافئ إتقان التفاصيل — عدّ الأيام بدقة، ووجود جوهر فعلي خلف الشركة، والتنسيق مع القواعد الضريبية في بلدك الحالي. وليس هذا عملاً تؤدّيه بنفسك.</p>
<h2>كيف يساعدك Cyprus Lifestyle</h2>
<p>يمكن لخدمة الكونسيرج لدينا أن تعرّفك على مستشارين ضريبيين ومحاسبين ومحامي هجرة قبارصة موثوقين يتولّون هذه الخطوات بالضبط، وأن تساعدك في جمع عرضين أو ثلاثة لتختار بثقة.</p>
<p><em>هذه معلومات عامة سارية اعتباراً من 2026 وليست استشارة ضريبية؛ القواعد مفصّلة وتتغيّر — احصل على استشارة مهنية لوضعك قبل التصرّف.</em></p>`,
      de: `<p>Zypern ist zu einer der attraktivsten Basen Europas für Unternehmer, Investoren und ortsunabhängige Berufstätige geworden — nicht durch Verschwiegenheit, sondern durch ein klares, gesetzlich geregeltes System: eine EU-Jurisdiktion mit niedrigen Steuern, in der Sie mit nur 60 Tagen im Jahr steuerlich ansässig werden können und in der „non-domiciled“ Ansässige auf Dividenden und Zinsen außer einer geringen Gesundheitsabgabe keine Steuer zahlen. So funktioniert es, Stand 2026.</p>
<h2>Zwei Wege zur Steueransässigkeit in Zypern</h2>
<p>Der klassische Weg ist die <strong>183-Tage-Regel</strong>: Verbringen Sie mehr als 183 Tage im Kalenderjahr in Zypern, sind Sie steuerlich ansässig, ohne weitere Bedingungen.</p>
<p>Die <strong>60-Tage-Regel</strong> macht Zypern besonders. Sie qualifizieren sich in einem Jahr, wenn Sie alle vier Bedingungen erfüllen: Sie verbringen mindestens 60 Tage in Zypern; Sie verbringen nicht mehr als 183 Tage in einem einzigen anderen Land; Sie üben in Zypern eine Geschäftstätigkeit aus, sind bei einem zyprischen Unternehmen angestellt oder Direktor einer in Zypern steuerlich ansässigen Gesellschaft; und Sie unterhalten irgendwann im Jahr einen ständigen Wohnsitz in Zypern, im Eigentum oder gemietet. Seit 2026 ist die frühere Voraussetzung, nirgendwo sonst steuerlich ansässig zu sein, entfallen.</p>
<h2>Der Non-Dom-Status — der zentrale Vorteil</h2>
<p>Ein in Zypern steuerlich Ansässiger mit „non-domiciled“-Status ist vom Special Defence Contribution (SDC) befreit — der Steuer, die sonst auf Dividenden, Zinsen und Mieteinkünfte anfiele. Der Non-Dom-Status gilt bis zu 17 Jahre — als domiziliert gelten Sie, sobald Sie in 17 der letzten 20 Jahre ansässig waren. Da Zypern auf Dividenden ohnehin keine Einkommensteuer erhebt, wird die Dividende eines Non-Dom effektiv nur mit der Abgabe an das Allgemeine Gesundheitssystem von 2,65% belastet, ihrerseits gedeckelt bei 180.000 € Einkommen im Jahr. Für 2026 beträgt der SDC auf Dividenden für domizilierte Ansässige 5%.</p>
<h2>Und was Zypern nicht besteuert</h2>
<p>Es gibt keine Erbschaftsteuer und keine Vermögensteuer. Kapitalertragsteuer fällt nur auf Gewinne aus in Zypern gelegenem unbeweglichem Vermögen an — nicht auf Gewinne aus Aktien oder anderen Vermögenswerten. Auf Unternehmensseite stieg die Ertragsteuer zum 1. Januar 2026 auf 15% (von 12,5%), um die OECD-Regeln zur globalen Mindeststeuer zu erfüllen, und bleibt eine der wettbewerbsfähigeren in der EU.</p>
<h2>Ist es das Richtige für Sie?</h2>
<p>Das System ist echt und weit verbreitet, belohnt aber Sorgfalt im Detail — korrekt gezählte Tage, echte Substanz hinter einer Gesellschaft und Abstimmung mit den Steuerregeln Ihres jetzigen Landes. Das ist kein Do-it-yourself-Projekt.</p>
<h2>Wie Cyprus Lifestyle hilft</h2>
<p>Unser Concierge kann Sie mit geprüften zyprischen Steuerberatern, Buchhaltern und Einwanderungsanwälten zusammenbringen, die genau solche Schritte begleiten, und Ihnen helfen, zwei oder drei einzuholen, damit Sie sicher wählen.</p>
<p><em>Dies sind allgemeine Informationen mit Stand 2026, keine Steuerberatung; die Regeln sind detailliert und ändern sich — holen Sie vor dem Handeln fachlichen Rat für Ihre Lage ein.</em></p>`,
      pl: `<p>Cypr stał się jedną z najatrakcyjniejszych baz w Europie dla przedsiębiorców, inwestorów i profesjonalistów pracujących zdalnie — nie przez tajemnicę, lecz przez jasny, ustawowy system: unijną jurysdykcję o niskich podatkach, w której możesz zostać rezydentem podatkowym już przy 60 dniach w roku i w której rezydenci „non-domiciled” nie płacą podatku od dywidend i odsetek poza skromną składką zdrowotną. Oto jak to działa, według stanu na 2026.</p>
<h2>Dwie drogi do rezydencji podatkowej na Cyprze</h2>
<p>Klasyczna droga to <strong>zasada 183 dni</strong>: jeśli spędzisz ponad 183 dni na Cyprze w roku kalendarzowym, jesteś rezydentem podatkowym, bez dalszych warunków.</p>
<p><strong>Zasada 60 dni</strong> czyni Cypr wyjątkowym. Kwalifikujesz się w danym roku, jeśli spełnisz wszystkie cztery warunki: spędzasz co najmniej 60 dni na Cyprze; nie spędzasz więcej niż 183 dni w żadnym innym pojedynczym kraju; prowadzisz działalność na Cyprze, jesteś zatrudniony w cypryjskiej firmie lub jesteś dyrektorem spółki będącej rezydentem podatkowym Cypru; oraz utrzymujesz stałe miejsce zamieszkania na Cyprze, własne lub wynajmowane, w pewnym momencie w ciągu roku. Od 2026 usunięto wcześniejszy wymóg, by nie być rezydentem podatkowym gdzie indziej.</p>
<h2>Status non-domiciled — główna korzyść</h2>
<p>Cypryjski rezydent podatkowy o statusie „non-domiciled” jest zwolniony ze Specjalnej Składki Obronnej (SDC) — podatku, który w innym razie objąłby dywidendy, odsetki i dochody z najmu. Status non-dom trwa do 17 lat — uznaje się cię za domicylowanego, gdy jesteś rezydentem przez 17 z ostatnich 20 lat. Ponieważ Cypr i tak nie pobiera podatku dochodowego od dywidend, dywidenda osoby non-dom jest faktycznie obciążona tylko składką na Powszechny System Zdrowia w wysokości 2,65%, ograniczoną do 180 000 € dochodu rocznie. Na 2026 SDC od dywidend dla rezydentów domicylowanych wynosi 5%.</p>
<h2>A czego Cypr nie opodatkowuje</h2>
<p>Nie ma podatku od spadków ani podatku od majątku. Podatek od zysków kapitałowych dotyczy wyłącznie zysków z nieruchomości położonych na Cyprze — nie zysków z akcji czy innych aktywów. Po stronie firm podatek dochodowy wzrósł do 15% od 1 stycznia 2026 (z 12,5%), by spełnić zasady globalnego podatku minimalnego OECD, pozostając jednym z bardziej konkurencyjnych w UE.</p>
<h2>Czy to dla ciebie?</h2>
<p>System jest realny i powszechnie stosowany, ale nagradza dbałość o szczegóły — poprawnie policzone dni, realną substancję za spółką i uzgodnienie z zasadami podatkowymi twojego obecnego kraju. To nie jest zadanie „zrób to sam”.</p>
<h2>Jak pomaga Cyprus Lifestyle</h2>
<p>Nasz concierge może polecić sprawdzonych cypryjskich doradców podatkowych, księgowych i prawników imigracyjnych, którzy prowadzą dokładnie takie przeprowadzki, i pomóc zebrać dwie–trzy oferty, byś wybrał z pewnością.</p>
<p><em>To ogólne informacje aktualne na 2026, nie porada podatkowa; zasady są szczegółowe i się zmieniają — przed działaniem zasięgnij profesjonalnej porady dla swojej sytuacji.</em></p>`,
      ru: `<p>Кипр стал одной из самых привлекательных баз в Европе для предпринимателей, инвесторов и удалённых специалистов — не за счёт секретности, а благодаря понятному, законодательно закреплённому режиму: юрисдикции ЕС с низкими налогами, где можно стать налоговым резидентом всего за 60 дней в году и где резиденты со статусом «non-domiciled» не платят налог с дивидендов и процентов сверх скромного взноса на здравоохранение. Вот как это работает по состоянию на 2026 год.</p>
<h2>Два способа стать налоговым резидентом Кипра</h2>
<p>Классический путь — <strong>правило 183 дней</strong>: проведите более 183 дней на Кипре в календарном году, и вы налоговый резидент, без прочих условий.</p>
<p><strong>Правило 60 дней</strong> и делает Кипр особенным. Вы квалифицируетесь в данном году, если выполнены все четыре условия: вы проводите не менее 60 дней на Кипре; не проводите более 183 дней ни в одной другой отдельной стране; ведёте бизнес на Кипре, работаете в кипрской компании или являетесь директором компании — налогового резидента Кипра; и содержите постоянное жильё на Кипре, в собственности или в аренде, в какой-то момент года. С 2026 года прежнее требование не быть налоговым резидентом где-либо ещё отменено.</p>
<h2>Статус non-domiciled — главное преимущество</h2>
<p>Налоговый резидент Кипра со статусом «non-domiciled» освобождён от Специального взноса на оборону (SDC) — налога, который иначе применялся бы к дивидендам, процентам и доходу от аренды. Статус non-dom действует до 17 лет — вы считаетесь домицилированным, как только пробыли резидентом 17 из последних 20 лет. Поскольку Кипр в принципе не облагает дивиденды подоходным налогом, дивиденды non-dom фактически облагаются лишь взносом в Общую систему здравоохранения в 2,65%, который сам ограничен доходом €180 000 в год. На 2026 год SDC с дивидендов для домицилированных резидентов составляет 5%.</p>
<h2>И что Кипр не облагает налогом</h2>
<p>Нет налога на наследство и налога на богатство. Налог на прирост капитала применяется только к прибыли от недвижимости, расположенной на Кипре, — не к прибыли от акций или других активов. На корпоративной стороне ставка налога на прибыль выросла до 15% с 1 января 2026 года (с 12,5%) в соответствии с правилами ОЭСР о глобальном минимальном налоге, оставаясь одной из более конкурентных в ЕС.</p>
<h2>Подходит ли это вам?</h2>
<p>Режим реален и широко используется, но вознаграждает внимание к деталям — правильно посчитанные дни, реальное содержание за компанией и согласование с налоговыми правилами вашей нынешней страны. Это не занятие «сделай сам».</p>
<h2>Чем поможет Cyprus Lifestyle</h2>
<p>Наш консьерж познакомит вас с проверенными кипрскими налоговыми консультантами, бухгалтерами и иммиграционными юристами, которые ведут именно такие переезды, и поможет собрать два-три предложения, чтобы вы выбрали уверенно.</p>
<p><em>Это общая информация по состоянию на 2026 год, а не налоговая консультация; правила детальны и меняются — прежде чем действовать, получите профессиональную консультацию по вашей ситуации.</em></p>`,
    },
  },

  // ── Article 4 — Moving to Cyprus: a relocation checklist ─────────────────────
  {
    slug: 'moving-to-cyprus-relocation-checklist',
    batch: 2,
    category: 'living',
    author_name: 'The Cyprus Lifestyle Desk',
    reading_time_min: 6,
    source_url: 'https://gk-lawfirm.com/publications/moving-to-cyprus/',
    sources: [
      'https://gk-lawfirm.com/publications/moving-to-cyprus/',
      'https://www.mondaq.com/cyprus/general-immigration/1805210/cyprus-yellow-slip-eu-residency-registration-guide-2026',
      'https://www.zenolegal.com/resources/cyprus-gesy-registration-new-residents-2026',
    ],
    tags: {
      en: ['relocation', 'residency', 'living in Cyprus', 'expats'],
      el: ['μετεγκατάσταση', 'διαμονή', 'ζωή στην Κύπρο', 'ομογενείς'],
      ro: ['relocare', 'rezidență', 'viața în Cipru', 'expați'],
      ar: ['انتقال', 'الإقامة', 'العيش في قبرص', 'المغتربون'],
      de: ['Umzug', 'Aufenthalt', 'Leben in Zypern', 'Auswanderer'],
      pl: ['relokacja', 'pobyt', 'życie na Cyprze', 'ekspaci'],
      ru: ['переезд', 'резидентство', 'жизнь на Кипре', 'экспаты'],
    },
    title: {
      en: 'Moving to Cyprus: A Relocation Checklist',
      el: 'Μετεγκατάσταση στην Κύπρο: Μια Λίστα Ελέγχου',
      ro: 'Mutarea în Cipru: o listă de verificare pentru relocare',
      ar: 'الانتقال إلى قبرص: قائمة مرجعية للانتقال',
      de: 'Umzug nach Zypern: eine Checkliste',
      pl: 'Przeprowadzka na Cypr: lista kontrolna',
      ru: 'Переезд на Кипр: контрольный список',
    },
    excerpt: {
      en: 'Residency for EU and non-EU citizens, healthcare, banking and the practical setup — the paperwork to do, in the right order, for the Republic of Cyprus.',
      el: 'Διαμονή για πολίτες ΕΕ και εκτός ΕΕ, υγεία, τραπεζικά και η πρακτική εγκατάσταση — τα χαρτιά με τη σωστή σειρά, για την Κυπριακή Δημοκρατία.',
      ro: 'Rezidența pentru cetățenii UE și non-UE, sănătate, bancă și pașii practici — actele de făcut, în ordinea corectă, pentru Republica Cipru.',
      ar: 'الإقامة لمواطني الاتحاد الأوروبي وغيرهم، والرعاية الصحية، والبنك، والإعداد العملي — الأوراق بالترتيب الصحيح، لجمهورية قبرص.',
      de: 'Aufenthalt für EU- und Nicht-EU-Bürger, Gesundheit, Bank und die praktische Einrichtung — die Papiere in der richtigen Reihenfolge, für die Republik Zypern.',
      pl: 'Pobyt dla obywateli UE i spoza UE, opieka zdrowotna, bank i praktyczne załatwienia — formalności we właściwej kolejności, dla Republiki Cypryjskiej.',
      ru: 'Резидентство для граждан ЕС и не-ЕС, медицина, банк и практические шаги — документы в правильном порядке, для Республики Кипр.',
    },
    summary: {
      en: 'A practical, ordered checklist for relocating to the Republic of Cyprus: residency for EU and non-EU citizens, GESY healthcare, banking, licences, schools and tax.',
      el: 'Μια πρακτική, οργανωμένη λίστα για μετεγκατάσταση στην Κυπριακή Δημοκρατία: διαμονή για ΕΕ και εκτός ΕΕ, υγεία GESY, τραπεζικά, άδειες, σχολεία και φόροι.',
      ro: 'O listă practică și ordonată pentru relocarea în Republica Cipru: rezidență UE și non-UE, sănătate GESY, bancă, permise, școli și taxe.',
      ar: 'قائمة عملية ومرتبة للانتقال إلى جمهورية قبرص: الإقامة لمواطني الاتحاد وغيرهم، ورعاية GESY، والبنك، والرخص، والمدارس، والضرائب.',
      de: 'Eine praktische, geordnete Checkliste für den Umzug in die Republik Zypern: Aufenthalt für EU/Nicht-EU, GESY-Gesundheit, Bank, Führerschein, Schulen und Steuern.',
      pl: 'Praktyczna, uporządkowana lista dla przeprowadzki do Republiki Cypryjskiej: pobyt UE i spoza UE, opieka GESY, bank, prawo jazdy, szkoły i podatki.',
      ru: 'Практический упорядоченный список для переезда в Республику Кипр: резидентство для ЕС и не-ЕС, медицина GESY, банк, права, школы и налоги.',
    },
    seo_title: {
      en: 'Moving to Cyprus 2026: A Relocation Checklist',
      el: 'Μετεγκατάσταση στην Κύπρο 2026: Λίστα Ελέγχου',
      ro: 'Mutarea în Cipru 2026: listă de verificare',
      ar: 'الانتقال إلى قبرص 2026: قائمة مرجعية',
      de: 'Umzug nach Zypern 2026: eine Checkliste',
      pl: 'Przeprowadzka na Cypr 2026: lista kontrolna',
      ru: 'Переезд на Кипр 2026: контрольный список',
    },
    seo_description: {
      en: 'How to relocate to Cyprus: the EU yellow slip and non-EU permits, GESY healthcare registration, banking, driving licence, schools and tax residency.',
      el: 'Πώς να μετεγκατασταθείτε στην Κύπρο: το yellow slip της ΕΕ και άδειες εκτός ΕΕ, εγγραφή GESY, τραπεζικά, δίπλωμα, σχολεία και φορολογική κατοικία.',
      ro: 'Cum să te muți în Cipru: yellow slip pentru UE și permise non-UE, înregistrare GESY, bancă, permis de conducere, școli și rezidență fiscală.',
      ar: 'كيف تنتقل إلى قبرص: البطاقة الصفراء للاتحاد وتصاريح غير الأوروبيين، وتسجيل GESY، والبنك، ورخصة القيادة، والمدارس، والإقامة الضريبية.',
      de: 'Umzug nach Zypern: das EU-Yellow-Slip und Nicht-EU-Genehmigungen, GESY-Anmeldung, Bank, Führerschein, Schulen und Steueransässigkeit.',
      pl: 'Jak przeprowadzić się na Cypr: unijny yellow slip i pozwolenia spoza UE, rejestracja GESY, bank, prawo jazdy, szkoły i rezydencja podatkowa.',
      ru: 'Как переехать на Кипр: жёлтая справка ЕС и разрешения для не-ЕС, регистрация GESY, банк, права, школы и налоговое резидентство.',
    },
    content: {
      en: `<p>Cyprus is one of the easier European countries to move to — an English-speaking EU member with a warm climate and a settled international community — but a smooth relocation still comes down to doing the paperwork in the right order. Here is the practical checklist, for the Republic of Cyprus, as of 2026.</p>
<h2>Your right to stay: residency</h2>
<p>If you are an <strong>EU citizen</strong>, you register rather than apply: within four months of arriving you obtain a registration certificate (the "yellow slip", form MEU1) from the district office of the Civil Registry and Migration Department, showing proof of employment, self-employment, study or sufficient independent means, plus health insurance. The certificate does not expire.</p>
<p>If you are a <strong>non-EU citizen</strong>, the common routes are a temporary residence permit (the "pink slip", renewed yearly, which on its own does not grant the right to work — ideal for those living on foreign pensions or investments), an employment permit tied to a job, one of the permanent-residence categories, or the digital nomad visa for remote workers. Fees are modest — around €70 per family member for the pink slip.</p>
<h2>Healthcare</h2>
<p>Once you hold a valid residence permit you can register with GESY, the General Health System, which gives access to doctors, specialists and hospitals at minimal cost. Many residents keep a private policy alongside it for speed and choice.</p>
<h2>The practical setup</h2>
<p>Open a Cyprus bank account (bring your passport, proof of address and proof of income). If you will work or run a business, register for a social-insurance number and a tax identification code. Exchange your driving licence — an EU licence is straightforward; other licences may need conversion. Families should line up schooling early: state schools teach in Greek, and there is a strong choice of private and international schools teaching in English. Bringing a pet or a car is entirely possible with the right paperwork done in advance.</p>
<h2>Don't forget tax residency</h2>
<p>Living in Cyprus and being tax resident are related but separate steps — Cyprus's 60-day rule and non-domicile regime are a large part of why people move here, and are worth planning deliberately rather than by accident.</p>
<h2>How Cyprus Lifestyle can help</h2>
<p>Tell our concierge where you are moving from and what your household looks like, and we will connect you to vetted relocation lawyers, movers and school advisers, and help you sequence it all so nothing stalls.</p>
<p><em>Requirements and fees are current as of 2026 and can change; confirm the details for your nationality and situation with a licensed Cyprus adviser.</em></p>`,
      el: `<p>Η Κύπρος είναι από τις πιο εύκολες ευρωπαϊκές χώρες για μετεγκατάσταση — αγγλόφωνο μέλος της ΕΕ με ζεστό κλίμα και εδραιωμένη διεθνή κοινότητα — αλλά μια ομαλή μετακόμιση εξαρτάται από το να γίνουν τα χαρτιά με τη σωστή σειρά. Δείτε την πρακτική λίστα ελέγχου, για την Κυπριακή Δημοκρατία, από το 2026.</p>
<h2>Το δικαίωμα διαμονής</h2>
<p>Αν είστε <strong>πολίτης ΕΕ</strong>, εγγράφεστε αντί να υποβάλλετε αίτηση: εντός τεσσάρων μηνών από την άφιξη λαμβάνετε πιστοποιητικό εγγραφής (το «yellow slip», έντυπο MEU1) από το επαρχιακό γραφείο του Τμήματος Αρχείου Πληθυσμού και Μετανάστευσης, με αποδείξεις εργασίας, αυτοαπασχόλησης, σπουδών ή επαρκών ανεξάρτητων πόρων, καθώς και ασφάλεια υγείας. Το πιστοποιητικό δεν λήγει.</p>
<p>Αν είστε <strong>πολίτης εκτός ΕΕ</strong>, οι συνήθεις οδοί είναι η προσωρινή άδεια διαμονής (το «pink slip», ανανεώνεται ετησίως και από μόνη της δεν δίνει δικαίωμα εργασίας — ιδανική για όσους ζουν από ξένες συντάξεις ή επενδύσεις), μια άδεια εργασίας συνδεδεμένη με θέση, μία από τις κατηγορίες μόνιμης διαμονής ή η βίζα ψηφιακού νομάδα για εργαζόμενους εξ αποστάσεως. Τα τέλη είναι μικρά — περίπου €70 ανά μέλος οικογένειας για το pink slip.</p>
<h2>Υγεία</h2>
<p>Μόλις έχετε έγκυρη άδεια διαμονής, μπορείτε να εγγραφείτε στο ΓΕΣΥ (GESY), το Γενικό Σύστημα Υγείας, που δίνει πρόσβαση σε γιατρούς, ειδικούς και νοσοκομεία με ελάχιστο κόστος. Πολλοί κάτοικοι κρατούν παράλληλα ιδιωτική ασφάλεια για ταχύτητα και επιλογές.</p>
<h2>Η πρακτική εγκατάσταση</h2>
<p>Ανοίξτε κυπριακό τραπεζικό λογαριασμό (φέρτε διαβατήριο, αποδεικτικό διεύθυνσης και εισοδήματος). Αν πρόκειται να εργαστείτε ή να κάνετε επιχείρηση, εγγραφείτε για αριθμό κοινωνικών ασφαλίσεων και φορολογικό κωδικό. Αλλάξτε το δίπλωμα οδήγησης — ένα δίπλωμα ΕΕ είναι απλό· άλλα ίσως χρειαστούν μετατροπή. Οι οικογένειες να φροντίσουν έγκαιρα το σχολείο: τα δημόσια διδάσκουν στα ελληνικά, ενώ υπάρχει μεγάλη επιλογή ιδιωτικών και διεθνών σχολείων στα αγγλικά. Το να φέρετε κατοικίδιο ή αυτοκίνητο είναι απολύτως εφικτό με τα σωστά χαρτιά εκ των προτέρων.</p>
<h2>Μην ξεχνάτε τη φορολογική κατοικία</h2>
<p>Το να ζείτε στην Κύπρο και το να είστε φορολογικός κάτοικος είναι συναφή αλλά ξεχωριστά βήματα — ο κανόνας των 60 ημερών και το καθεστώς non-dom είναι μεγάλο μέρος του λόγου που έρχονται εδώ, και αξίζει να σχεδιαστούν σκόπιμα.</p>
<h2>Πώς μπορεί να βοηθήσει το Cyprus Lifestyle</h2>
<p>Πείτε στο concierge μας από πού μετακομίζετε και πώς είναι το νοικοκυριό σας, και θα σας συνδέσουμε με ελεγμένους δικηγόρους μετεγκατάστασης, μεταφορείς και συμβούλους σχολείων, βοηθώντας σας να τα βάλετε σε σειρά ώστε τίποτα να μην κολλήσει.</p>
<p><em>Οι απαιτήσεις και τα τέλη ισχύουν από το 2026 και μπορεί να αλλάξουν· επιβεβαιώστε τις λεπτομέρειες για την υπηκοότητα και την περίπτωσή σας με αδειούχο Κύπριο σύμβουλο.</em></p>`,
      ro: `<p>Ciprul este una dintre cele mai ușoare țări europene în care să te muți — un membru UE vorbitor de engleză, cu climă caldă și o comunitate internațională așezată — dar o relocare fără probleme depinde tot de a face actele în ordinea corectă. Iată lista practică, pentru Republica Cipru, în 2026.</p>
<h2>Dreptul de ședere: rezidența</h2>
<p>Dacă ești <strong>cetățean UE</strong>, te înregistrezi, nu depui cerere: în termen de patru luni de la sosire obții un certificat de înregistrare („yellow slip”, formularul MEU1) de la biroul districtual al Departamentului de Stare Civilă și Migrație, cu dovada angajării, a activității independente, a studiilor sau a unor mijloace suficiente, plus asigurare de sănătate. Certificatul nu expiră.</p>
<p>Dacă ești <strong>cetățean non-UE</strong>, căile obișnuite sunt un permis de ședere temporară („pink slip”, reînnoit anual, care singur nu dă dreptul de muncă — ideal pentru cei care trăiesc din pensii sau investiții străine), un permis de muncă legat de un loc de muncă, una dintre categoriile de rezidență permanentă sau viza de nomad digital pentru cei care lucrează la distanță. Taxele sunt modeste — circa 70 € de membru de familie pentru pink slip.</p>
<h2>Sănătatea</h2>
<p>Odată ce ai un permis de ședere valid, te poți înregistra la GESY, Sistemul General de Sănătate, care oferă acces la medici, specialiști și spitale la un cost minim. Mulți rezidenți păstrează în paralel o poliță privată pentru rapiditate și opțiuni.</p>
<h2>Pașii practici</h2>
<p>Deschide un cont bancar cipriot (adu pașaportul, dovada adresei și a venitului). Dacă vei lucra sau vei avea o afacere, înregistrează-te pentru un număr de asigurări sociale și un cod fiscal. Schimbă-ți permisul de conducere — unul din UE e simplu; altele pot necesita conversie. Familiile ar trebui să rezolve din timp școala: școlile de stat predau în greacă, iar există o ofertă bună de școli private și internaționale în engleză. Aducerea unui animal de companie sau a unei mașini este pe deplin posibilă cu actele făcute din timp.</p>
<h2>Nu uita de rezidența fiscală</h2>
<p>A locui în Cipru și a fi rezident fiscal sunt pași înrudiți, dar diferiți — regula de 60 de zile și regimul non-dom sunt o mare parte din motivul pentru care oamenii se mută aici și merită planificate deliberat.</p>
<h2>Cum te poate ajuta Cyprus Lifestyle</h2>
<p>Spune-i concierge-ului nostru de unde te muți și cum arată gospodăria ta, iar noi te vom pune în legătură cu avocați de relocare, firme de mutări și consilieri școlari verificați, ajutându-te să pui totul în ordine ca nimic să nu se blocheze.</p>
<p><em>Cerințele și taxele sunt valabile în 2026 și se pot schimba; confirmă detaliile pentru cetățenia și situația ta cu un consilier cipriot autorizat.</em></p>`,
      ar: `<p>قبرص من أسهل الدول الأوروبية للانتقال إليها — عضو في الاتحاد الأوروبي يتعامل بالإنجليزية، بمناخ دافئ ومجتمع دولي مستقر — لكن الانتقال السلس يظل رهناً بإنجاز الأوراق بالترتيب الصحيح. إليك القائمة العملية، لجمهورية قبرص، اعتباراً من 2026.</p>
<h2>حقك في الإقامة</h2>
<p>إن كنت <strong>من مواطني الاتحاد الأوروبي</strong>، فأنت تُسجِّل ولا تُقدِّم طلباً: خلال أربعة أشهر من وصولك تحصل على شهادة تسجيل («البطاقة الصفراء»، النموذج MEU1) من المكتب الإقليمي لدائرة السجل المدني والهجرة، مع إثبات عمل أو عمل حر أو دراسة أو موارد كافية، إضافة إلى تأمين صحي. والشهادة لا تنتهي صلاحيتها.</p>
<p>وإن كنت <strong>من خارج الاتحاد الأوروبي</strong>، فالطرق الشائعة هي تصريح إقامة مؤقتة («البطاقة الوردية»، يُجدَّد سنوياً ولا يمنح وحده حق العمل — مثالي لمن يعيشون على معاشات أو استثمارات أجنبية)، أو تصريح عمل مرتبط بوظيفة، أو إحدى فئات الإقامة الدائمة، أو تأشيرة الرحّل الرقميين للعاملين عن بُعد. والرسوم متواضعة — نحو 70 يورو لكل فرد من الأسرة للبطاقة الوردية.</p>
<h2>الرعاية الصحية</h2>
<p>ما إن تحصل على تصريح إقامة ساري المفعول حتى يمكنك التسجيل في GESY، النظام الصحي العام، الذي يتيح الوصول إلى الأطباء والاختصاصيين والمستشفيات بكلفة زهيدة. ويحتفظ كثير من المقيمين بوثيقة تأمين خاصة إلى جانبه للسرعة وسعة الخيار.</p>
<h2>الإعداد العملي</h2>
<p>افتح حساباً مصرفياً قبرصياً (أحضر جواز السفر وإثبات العنوان وإثبات الدخل). وإن كنت ستعمل أو تدير عملاً، سجِّل للحصول على رقم تأمين اجتماعي ورمز تعريف ضريبي. وبدِّل رخصة القيادة — رخصة الاتحاد الأوروبي أمرها بسيط؛ وقد تحتاج غيرها إلى تحويل. وعلى الأسر ترتيب المدرسة مبكراً: المدارس الحكومية تُدرّس باليونانية، وثمة خيار واسع من المدارس الخاصة والدولية بالإنجليزية. وإحضار حيوان أليف أو سيارة ممكن تماماً مع إنجاز الأوراق مسبقاً.</p>
<h2>لا تنسَ الإقامة الضريبية</h2>
<p>العيش في قبرص والإقامة الضريبية خطوتان مترابطتان لكن منفصلتان — قاعدة الـ60 يوماً ونظام non-dom جزء كبير من سبب انتقال الناس إلى هنا، ويستحقان تخطيطاً متعمَّداً لا بالمصادفة.</p>
<h2>كيف يساعدك Cyprus Lifestyle</h2>
<p>أخبر خدمة الكونسيرج لدينا من أين تنتقل وكيف تتكوّن أسرتك، وسنصلك بمحامي انتقال وشركات نقل ومستشاري مدارس موثوقين، ونساعدك في ترتيب كل شيء بالتسلسل كي لا يتعطّل أمر.</p>
<p><em>المتطلبات والرسوم سارية اعتباراً من 2026 وقد تتغيّر؛ تحقّق من التفاصيل الخاصة بجنسيتك ووضعك مع مستشار قبرصي مرخّص.</em></p>`,
      de: `<p>Zypern gehört zu den einfacheren europäischen Ländern für einen Umzug — ein englischsprachiges EU-Mitglied mit warmem Klima und einer etablierten internationalen Gemeinschaft — doch ein reibungsloser Umzug hängt weiterhin davon ab, die Formalitäten in der richtigen Reihenfolge zu erledigen. Hier die praktische Checkliste, für die Republik Zypern, Stand 2026.</p>
<h2>Ihr Aufenthaltsrecht</h2>
<p>Als <strong>EU-Bürger</strong> registrieren Sie sich, statt einen Antrag zu stellen: Innerhalb von vier Monaten nach Ankunft erhalten Sie eine Anmeldebescheinigung (das „Yellow Slip“, Formular MEU1) beim Bezirksbüro der Abteilung für Zivilregister und Migration, mit Nachweis von Beschäftigung, Selbstständigkeit, Studium oder ausreichenden eigenen Mitteln sowie Krankenversicherung. Die Bescheinigung läuft nicht ab.</p>
<p>Als <strong>Nicht-EU-Bürger</strong> sind die üblichen Wege eine befristete Aufenthaltserlaubnis (das „Pink Slip“, jährlich zu erneuern, das für sich allein kein Arbeitsrecht gewährt — ideal für Menschen mit ausländischer Rente oder Kapitaleinkünften), eine an eine Stelle gebundene Arbeitserlaubnis, eine der Kategorien der Daueraufenthaltserlaubnis oder das Digital-Nomad-Visum für Ortsunabhängige. Die Gebühren sind gering — rund 70 € pro Familienmitglied für das Pink Slip.</p>
<h2>Gesundheit</h2>
<p>Sobald Sie eine gültige Aufenthaltserlaubnis haben, können Sie sich bei GESY anmelden, dem Allgemeinen Gesundheitssystem, das Zugang zu Ärzten, Fachärzten und Krankenhäusern zu minimalen Kosten bietet. Viele Ansässige behalten daneben eine private Police für Tempo und Auswahl.</p>
<h2>Die praktische Einrichtung</h2>
<p>Eröffnen Sie ein zyprisches Bankkonto (Reisepass, Adressnachweis und Einkommensnachweis mitbringen). Wenn Sie arbeiten oder ein Unternehmen führen, melden Sie sich für eine Sozialversicherungsnummer und einen Steuercode an. Tauschen Sie Ihren Führerschein um — ein EU-Führerschein ist unkompliziert; andere brauchen unter Umständen eine Umschreibung. Familien sollten die Schule früh regeln: staatliche Schulen unterrichten auf Griechisch, und es gibt eine gute Auswahl an Privat- und internationalen Schulen auf Englisch. Ein Haustier oder Auto mitzubringen ist mit rechtzeitig erledigten Papieren durchaus möglich.</p>
<h2>Vergessen Sie die Steueransässigkeit nicht</h2>
<p>In Zypern zu leben und steuerlich ansässig zu sein sind verwandte, aber getrennte Schritte — die 60-Tage-Regel und das Non-Dom-System sind ein großer Teil des Grundes, warum Menschen herkommen, und sollten bewusst geplant werden.</p>
<h2>Wie Cyprus Lifestyle hilft</h2>
<p>Sagen Sie unserem Concierge, woher Sie ziehen und wie Ihr Haushalt aussieht, und wir bringen Sie mit geprüften Umzugsanwälten, Speditionen und Schulberatern zusammen und helfen Ihnen, alles so zu ordnen, dass nichts ins Stocken gerät.</p>
<p><em>Anforderungen und Gebühren gelten mit Stand 2026 und können sich ändern; bestätigen Sie die Details für Ihre Staatsangehörigkeit und Lage mit einem zugelassenen zyprischen Berater.</em></p>`,
      pl: `<p>Cypr to jeden z łatwiejszych europejskich krajów do przeprowadzki — anglojęzyczny członek UE z ciepłym klimatem i osiadłą społecznością międzynarodową — ale gładka relokacja i tak zależy od załatwienia formalności we właściwej kolejności. Oto praktyczna lista kontrolna, dla Republiki Cypryjskiej, według stanu na 2026.</p>
<h2>Twoje prawo pobytu</h2>
<p>Jeśli jesteś <strong>obywatelem UE</strong>, rejestrujesz się, a nie składasz wniosek: w ciągu czterech miesięcy od przyjazdu otrzymujesz zaświadczenie o rejestracji („yellow slip”, formularz MEU1) w okręgowym biurze Departamentu Rejestru Ludności i Migracji, przedstawiając dowód zatrudnienia, samozatrudnienia, studiów lub wystarczających środków oraz ubezpieczenie zdrowotne. Zaświadczenie nie wygasa.</p>
<p>Jeśli jesteś <strong>obywatelem spoza UE</strong>, typowe drogi to zezwolenie na pobyt czasowy („pink slip”, odnawiane co roku, które samo w sobie nie daje prawa do pracy — idealne dla żyjących z zagranicznych emerytur lub inwestycji), zezwolenie na pracę powiązane z etatem, jedna z kategorii pobytu stałego albo wiza dla cyfrowych nomadów. Opłaty są niewielkie — około 70 € od członka rodziny za pink slip.</p>
<h2>Opieka zdrowotna</h2>
<p>Gdy masz ważne zezwolenie na pobyt, możesz zarejestrować się w GESY, Powszechnym Systemie Zdrowia, który daje dostęp do lekarzy, specjalistów i szpitali za minimalną opłatą. Wielu rezydentów utrzymuje obok tego prywatną polisę dla szybkości i wyboru.</p>
<h2>Praktyczne załatwienia</h2>
<p>Otwórz cypryjskie konto bankowe (weź paszport, dowód adresu i dochodu). Jeśli będziesz pracować lub prowadzić firmę, zarejestruj się po numer ubezpieczenia społecznego i kod podatkowy. Wymień prawo jazdy — unijne jest proste; inne mogą wymagać konwersji. Rodziny powinny wcześnie załatwić szkołę: szkoły państwowe uczą po grecku, a jest szeroki wybór szkół prywatnych i międzynarodowych po angielsku. Sprowadzenie zwierzęcia lub samochodu jest w pełni możliwe przy wcześniej dopełnionych formalnościach.</p>
<h2>Nie zapomnij o rezydencji podatkowej</h2>
<p>Mieszkanie na Cyprze i bycie rezydentem podatkowym to kroki powiązane, ale odrębne — zasada 60 dni i reżim non-dom to w dużej mierze powód, dla którego ludzie się tu przenoszą, i warto je zaplanować świadomie.</p>
<h2>Jak pomaga Cyprus Lifestyle</h2>
<p>Powiedz naszemu concierge, skąd się przeprowadzasz i jak wygląda twoje gospodarstwo domowe, a połączymy cię ze sprawdzonymi prawnikami od relokacji, firmami przeprowadzkowymi i doradcami szkolnymi oraz pomożemy ułożyć wszystko po kolei, by nic nie utknęło.</p>
<p><em>Wymagania i opłaty są aktualne na 2026 i mogą się zmienić; potwierdź szczegóły dla swojego obywatelstwa i sytuacji u licencjonowanego cypryjskiego doradcy.</em></p>`,
      ru: `<p>Кипр — одна из самых удобных для переезда стран Европы: англоязычный член ЕС с тёплым климатом и сложившимся международным сообществом, но гладкий переезд всё равно сводится к тому, чтобы оформить документы в правильном порядке. Вот практический контрольный список для Республики Кипр по состоянию на 2026 год.</p>
<h2>Ваше право на пребывание: резидентство</h2>
<p>Если вы <strong>гражданин ЕС</strong>, вы регистрируетесь, а не подаёте заявление: в течение четырёх месяцев после приезда вы получаете свидетельство о регистрации («жёлтую справку», форма MEU1) в окружном отделении Департамента регистрации населения и миграции, предъявив подтверждение занятости, самозанятости, учёбы или достаточных средств, а также медицинскую страховку. Свидетельство бессрочно.</p>
<p>Если вы <strong>гражданин не из ЕС</strong>, обычные пути — временный вид на жительство («розовая справка», продлевается ежегодно и сам по себе не даёт права на работу — идеален для живущих на зарубежную пенсию или доход от инвестиций), разрешение на работу, привязанное к месту, одна из категорий постоянного вида на жительство или виза цифрового кочевника для удалённых работников. Пошлины скромные — около €70 на члена семьи за розовую справку.</p>
<h2>Медицина</h2>
<p>Как только у вас есть действующий вид на жительство, вы можете зарегистрироваться в GESY, Общей системе здравоохранения, которая даёт доступ к врачам, специалистам и больницам за минимальную плату. Многие резиденты сохраняют рядом частную страховку ради скорости и выбора.</p>
<h2>Практическая настройка</h2>
<p>Откройте кипрский банковский счёт (возьмите паспорт, подтверждение адреса и дохода). Если будете работать или вести бизнес, зарегистрируйтесь для номера социального страхования и налогового кода. Обменяйте водительские права — права ЕС меняются просто; другие могут потребовать конвертации. Семьям стоит заранее решить со школой: государственные школы преподают на греческом, и есть большой выбор частных и международных школ на английском. Привезти питомца или автомобиль вполне возможно при заранее оформленных документах.</p>
<h2>Не забудьте о налоговом резидентстве</h2>
<p>Жить на Кипре и быть налоговым резидентом — связанные, но разные шаги: правило 60 дней и режим non-dom во многом и есть причина, почему сюда переезжают, и их стоит планировать осознанно.</p>
<h2>Чем поможет Cyprus Lifestyle</h2>
<p>Скажите нашему консьержу, откуда вы переезжаете и каков состав вашей семьи, и мы свяжем вас с проверенными юристами по релокации, перевозчиками и консультантами по школам и поможем выстроить всё по порядку, чтобы ничто не застопорилось.</p>
<p><em>Требования и пошлины актуальны на 2026 год и могут измениться; уточните детали для вашего гражданства и ситуации у лицензированного кипрского консультанта.</em></p>`,
    },
  },

  // ── Article 5 — Setting up a company in Cyprus ───────────────────────────────
  {
    slug: 'setting-up-a-company-in-cyprus',
    batch: 2,
    category: 'business',
    author_name: 'The Cyprus Lifestyle Desk',
    reading_time_min: 6,
    source_url: 'https://www.cyprustaxlife.com/learn/corporate-tax-cyprus',
    sources: [
      'https://www.cyprustaxlife.com/learn/corporate-tax-cyprus',
      'https://setupcyprus.com/en/cyprus-company-formation/',
      'https://www.easycorporate.com.cy/blog/cyprus-ip-box',
    ],
    tags: {
      en: ['business', 'company formation', 'tax', 'investment'],
      el: ['επιχειρήσεις', 'ίδρυση εταιρείας', 'φορολογία', 'επένδυση'],
      ro: ['afaceri', 'înființare firmă', 'taxe', 'investiții'],
      ar: ['أعمال', 'تأسيس شركة', 'ضرائب', 'استثمار'],
      de: ['Unternehmen', 'Firmengründung', 'Steuern', 'Investition'],
      pl: ['biznes', 'zakładanie firmy', 'podatki', 'inwestycja'],
      ru: ['бизнес', 'регистрация компании', 'налоги', 'инвестиции'],
    },
    title: {
      en: 'Setting Up a Company in Cyprus',
      el: 'Ίδρυση Εταιρείας στην Κύπρο',
      ro: 'Înființarea unei firme în Cipru',
      ar: 'تأسيس شركة في قبرص',
      de: 'Eine Firma in Zypern gründen',
      pl: 'Zakładanie firmy na Cyprze',
      ru: 'Регистрация компании на Кипре',
    },
    excerpt: {
      en: 'An EU base with a common-law system, treaty access and — even after the 2026 reform — competitive tax. The tax picture, the steps, and why substance matters.',
      el: 'Μια βάση στην ΕΕ με σύστημα common-law, πρόσβαση σε συνθήκες και — ακόμη και μετά τη μεταρρύθμιση του 2026 — ανταγωνιστική φορολογία. Το φορολογικό πλαίσιο, τα βήματα και η σημασία της υπόστασης.',
      ro: 'O bază UE cu sistem de common-law, acces la tratate și — chiar și după reforma din 2026 — impozite competitive. Imaginea fiscală, pașii și de ce contează substanța.',
      ar: 'قاعدة في الاتحاد الأوروبي بنظام القانون العام، ونفاذ إلى المعاهدات، وضرائب تنافسية حتى بعد إصلاح 2026. الصورة الضريبية والخطوات ولماذا يهمّ الجوهر.',
      de: 'Eine EU-Basis mit Common-Law-System, Abkommenszugang und — selbst nach der Reform 2026 — wettbewerbsfähiger Steuer. Das Steuerbild, die Schritte und warum Substanz zählt.',
      pl: 'Baza w UE z systemem common-law, dostępem do traktatów i — nawet po reformie 2026 — konkurencyjnym podatkiem. Obraz podatkowy, kroki i dlaczego liczy się substancja.',
      ru: 'База в ЕС с системой общего права, доступом к договорам и — даже после реформы 2026 — конкурентным налогом. Налоговая картина, шаги и почему важно реальное присутствие.',
    },
    summary: {
      en: 'Setting up a company in Cyprus in 2026: the 15% corporate tax and IP Box, the formation steps and timeline, and why real substance matters for the tax benefits.',
      el: 'Ίδρυση εταιρείας στην Κύπρο το 2026: ο εταιρικός φόρος 15% και το IP Box, τα βήματα και ο χρόνος ίδρυσης, και γιατί η πραγματική υπόσταση μετράει.',
      ro: 'Înființarea unei firme în Cipru în 2026: impozitul pe profit de 15% și IP Box, pașii și durata, și de ce contează substanța reală pentru beneficiile fiscale.',
      ar: 'تأسيس شركة في قبرص عام 2026: ضريبة الشركات 15% ونظام IP Box، وخطوات ومدة التأسيس، ولماذا يهمّ الجوهر الفعلي للمزايا الضريبية.',
      de: 'Firmengründung in Zypern 2026: die 15% Körperschaftsteuer und die IP Box, die Gründungsschritte und -dauer, und warum echte Substanz für die Steuervorteile zählt.',
      pl: 'Zakładanie firmy na Cyprze w 2026: 15% podatek dochodowy i IP Box, kroki i czas rejestracji oraz dlaczego realna substancja liczy się dla korzyści podatkowych.',
      ru: 'Регистрация компании на Кипре в 2026: налог на прибыль 15% и IP Box, шаги и сроки регистрации и почему для налоговых льгот важно реальное присутствие.',
    },
    seo_title: {
      en: 'Setting Up a Company in Cyprus (2026 Guide)',
      el: 'Ίδρυση Εταιρείας στην Κύπρο (Οδηγός 2026)',
      ro: 'Înființarea unei firme în Cipru (Ghid 2026)',
      ar: 'تأسيس شركة في قبرص (دليل 2026)',
      de: 'Firmengründung in Zypern (Leitfaden 2026)',
      pl: 'Zakładanie firmy na Cyprze (przewodnik 2026)',
      ru: 'Регистрация компании на Кипре (гид 2026)',
    },
    seo_description: {
      en: 'How to set up a company in Cyprus in 2026: 15% corporate tax, the IP Box effective rate, formation steps and timeline, and the substance requirements.',
      el: 'Πώς να ιδρύσετε εταιρεία στην Κύπρο το 2026: εταιρικός φόρος 15%, το IP Box, βήματα και χρόνος ίδρυσης, και οι απαιτήσεις υπόστασης.',
      ro: 'Cum înființezi o firmă în Cipru în 2026: impozit pe profit 15%, rata efectivă IP Box, pași și durată și cerințele de substanță.',
      ar: 'كيف تؤسّس شركة في قبرص عام 2026: ضريبة شركات 15%، والمعدل الفعلي لـ IP Box، وخطوات ومدة التأسيس، ومتطلبات الجوهر.',
      de: 'Firmengründung in Zypern 2026: 15% Körperschaftsteuer, der effektive IP-Box-Satz, Gründungsschritte und -dauer sowie die Substanzanforderungen.',
      pl: 'Jak założyć firmę na Cyprze w 2026: 15% podatek dochodowy, efektywna stawka IP Box, kroki i czas oraz wymogi substancji.',
      ru: 'Как открыть компанию на Кипре в 2026: налог на прибыль 15%, эффективная ставка IP Box, шаги и сроки и требования к присутствию.',
    },
    content: {
      en: `<p>For a business that wants a foothold in the European Union, Cyprus is a natural choice: a common-law-based legal system that international lawyers and banks understand, full EU market access, an extensive network of double-tax treaties, and — even after a 2026 reform — one of the more competitive tax settings in the bloc. Here is what setting up actually involves, as of 2026.</p>
<h2>The tax picture</h2>
<p>Corporate income tax rose to <strong>15%</strong> from 1 January 2026 (up from 12.5%), Cyprus's alignment with the OECD global-minimum-tax rules; it remains among the EU's more attractive headline rates. Qualifying intellectual-property income can be taxed far more lightly under the IP Box, whose 80% deduction brings the effective rate to roughly 2.5–3%. The old €350 annual company levy was abolished in 2024. Profits distributed to non-domiciled shareholders are, in turn, very lightly taxed — see our note on non-dom status.</p>
<h2>Forming the company, step by step</h2>
<p>First, a Cyprus lawyer reserves the company name with the Registrar of Companies and prepares the Memorandum and Articles of Association. The company is then incorporated with the Registrar; you will need at least one director, a company secretary, and a registered office address in Cyprus. After incorporation you register for a tax identification code and, where relevant, for VAT, and open a corporate bank account. Straightforward formations are typically completed in around one to three weeks.</p>
<h2>Substance matters</h2>
<p>To be treated as tax resident in Cyprus — and to rely on its treaty network — a company needs its real management and control there: directors who actually decide in Cyprus, proper board governance and a genuine office. Increasingly this is not optional, and a good adviser will build it in from the start rather than bolt it on later.</p>
<h2>How Cyprus Lifestyle can help</h2>
<p>Our concierge can put you in touch with vetted corporate-services firms, accountants and law firms that form and administer companies here every day, and help you gather two or three proposals so you can compare scope and cost honestly.</p>
<p><em>Figures are current as of 2026 and indicative; corporate and tax rules are detailed and change — take professional advice before you incorporate.</em></p>`,
      el: `<p>Για μια επιχείρηση που θέλει βάση στην Ευρωπαϊκή Ένωση, η Κύπρος είναι φυσική επιλογή: ένα νομικό σύστημα βασισμένο στο common-law που κατανοούν διεθνείς δικηγόροι και τράπεζες, πλήρης πρόσβαση στην αγορά της ΕΕ, ένα εκτεταμένο δίκτυο συμβάσεων αποφυγής διπλής φορολογίας και — ακόμη και μετά τη μεταρρύθμιση του 2026 — ένα από τα πιο ανταγωνιστικά φορολογικά περιβάλλοντα στο μπλοκ. Δείτε τι περιλαμβάνει πραγματικά η ίδρυση, από το 2026.</p>
<h2>Το φορολογικό πλαίσιο</h2>
<p>Ο εταιρικός φόρος εισοδήματος αυξήθηκε στο <strong>15%</strong> από την 1η Ιανουαρίου 2026 (από 12,5%), η ευθυγράμμιση της Κύπρου με τους κανόνες παγκόσμιου ελάχιστου φόρου του ΟΟΣΑ· παραμένει από τους πιο ελκυστικούς ονομαστικούς συντελεστές στην ΕΕ. Το εισόδημα από επιλέξιμη πνευματική ιδιοκτησία μπορεί να φορολογείται πολύ ελαφρύτερα με το IP Box, του οποίου η έκπτωση 80% φέρνει τον πραγματικό συντελεστή περίπου στο 2,5–3%. Το παλιό ετήσιο τέλος εταιρείας €350 καταργήθηκε το 2024. Τα κέρδη που διανέμονται σε non-domiciled μετόχους φορολογούνται με τη σειρά τους πολύ ελαφρά — δείτε τη σημείωσή μας για το καθεστώς non-dom.</p>
<h2>Ίδρυση της εταιρείας, βήμα προς βήμα</h2>
<p>Πρώτα, ένας Κύπριος δικηγόρος δεσμεύει την επωνυμία στον Έφορο Εταιρειών και ετοιμάζει το Ιδρυτικό και το Καταστατικό. Έπειτα η εταιρεία συστήνεται στον Έφορο· θα χρειαστείτε τουλάχιστον έναν διευθυντή, γραμματέα εταιρείας και διεύθυνση εγγεγραμμένου γραφείου στην Κύπρο. Μετά τη σύσταση εγγράφεστε για φορολογικό κωδικό και, όπου χρειάζεται, για ΦΠΑ, και ανοίγετε εταιρικό τραπεζικό λογαριασμό. Οι απλές συστάσεις ολοκληρώνονται συνήθως σε περίπου μία έως τρεις εβδομάδες.</p>
<h2>Η υπόσταση μετράει</h2>
<p>Για να θεωρείται φορολογικά κάτοικος Κύπρου — και να στηρίζεται στο δίκτυο συμβάσεων — μια εταιρεία χρειάζεται εκεί την πραγματική διοίκηση και τον έλεγχό της: διευθυντές που όντως αποφασίζουν στην Κύπρο, σωστή εταιρική διακυβέρνηση και ένα πραγματικό γραφείο. Ολοένα και περισσότερο αυτό δεν είναι προαιρετικό, και ένας καλός σύμβουλος θα το εντάξει από την αρχή.</p>
<h2>Πώς μπορεί να βοηθήσει το Cyprus Lifestyle</h2>
<p>Το concierge μας μπορεί να σας φέρει σε επαφή με ελεγμένες εταιρείες εταιρικών υπηρεσιών, λογιστές και δικηγορικά γραφεία που ιδρύουν και διαχειρίζονται εταιρείες εδώ καθημερινά, και να σας βοηθήσει να συγκεντρώσετε δύο ή τρεις προτάσεις για τίμια σύγκριση εύρους και κόστους.</p>
<p><em>Τα στοιχεία ισχύουν από το 2026 και είναι ενδεικτικά· οι εταιρικοί και φορολογικοί κανόνες είναι λεπτομερείς και αλλάζουν — ζητήστε επαγγελματική συμβουλή πριν συστήσετε εταιρεία.</em></p>`,
      ro: `<p>Pentru o afacere care vrea un punct de sprijin în Uniunea Europeană, Ciprul este o alegere firească: un sistem juridic bazat pe common-law pe care avocații și băncile internaționale îl înțeleg, acces deplin la piața UE, o rețea extinsă de tratate de evitare a dublei impuneri și — chiar și după reforma din 2026 — unul dintre cele mai competitive cadre fiscale din bloc. Iată ce presupune de fapt înființarea, în 2026.</p>
<h2>Imaginea fiscală</h2>
<p>Impozitul pe profit a crescut la <strong>15%</strong> de la 1 ianuarie 2026 (de la 12,5%), alinierea Ciprului la regulile OCDE privind impozitul minim global; rămâne printre cele mai atractive rate nominale din UE. Veniturile din proprietate intelectuală eligibilă pot fi impozitate mult mai ușor prin IP Box, a cărui deducere de 80% aduce rata efectivă la circa 2,5–3%. Vechea taxă anuală de 350 € pe firmă a fost abolită în 2024. Profiturile distribuite acționarilor non-domiciliați sunt, la rândul lor, impozitate foarte ușor — vezi nota noastră despre statutul non-dom.</p>
<h2>Înființarea firmei, pas cu pas</h2>
<p>Mai întâi, un avocat cipriot rezervă numele firmei la Registrul Comerțului și pregătește Actul Constitutiv și Statutul. Firma este apoi înregistrată la Registru; vei avea nevoie de cel puțin un administrator, un secretar al firmei și o adresă de sediu social în Cipru. După înființare te înregistrezi pentru un cod fiscal și, unde e cazul, pentru TVA, și deschizi un cont bancar corporativ. Înființările simple se finalizează de obicei în aproximativ una până la trei săptămâni.</p>
<h2>Substanța contează</h2>
<p>Pentru a fi tratată ca rezidentă fiscal în Cipru — și pentru a se baza pe rețeaua de tratate — o firmă are nevoie de management și control real acolo: administratori care decid efectiv în Cipru, o guvernanță corectă a consiliului și un birou real. Tot mai mult acest lucru nu este opțional, iar un consilier bun îl va construi de la început, nu îl va adăuga ulterior.</p>
<h2>Cum te poate ajuta Cyprus Lifestyle</h2>
<p>Concierge-ul nostru te poate pune în legătură cu firme de servicii corporative, contabili și case de avocatură verificate care înființează și administrează firme aici zilnic, și te ajută să aduni două-trei propuneri ca să compari corect aria și costul.</p>
<p><em>Cifrele sunt valabile în 2026 și au caracter orientativ; regulile corporative și fiscale sunt detaliate și se schimbă — cere consultanță profesională înainte de a înființa firma.</em></p>`,
      ar: `<p>للأعمال التي تريد موطئ قدم في الاتحاد الأوروبي، قبرص خيار طبيعي: نظام قانوني قائم على القانون العام يفهمه المحامون والبنوك الدوليون، ونفاذ كامل إلى سوق الاتحاد، وشبكة واسعة من معاهدات تجنّب الازدواج الضريبي، وحتى بعد إصلاح 2026 — واحدة من أكثر البيئات الضريبية تنافسية في التكتّل. إليك ما يتضمّنه التأسيس فعلاً، اعتباراً من 2026.</p>
<h2>الصورة الضريبية</h2>
<p>ارتفعت ضريبة دخل الشركات إلى <strong>15%</strong> اعتباراً من 1 يناير 2026 (من 12.5%)، وهو توافق قبرص مع قواعد الحد الأدنى العالمي للضريبة لدى منظمة التعاون الاقتصادي؛ وتبقى من أكثر المعدلات الاسمية جاذبية في الاتحاد. ويمكن أن يُفرَض على دخل الملكية الفكرية المؤهَّل ضريبة أخفّ بكثير عبر نظام IP Box، الذي يجعل خصمُه البالغ 80% المعدلَ الفعلي نحو 2.5–3%. أُلغيت رسوم الشركة السنوية القديمة البالغة 350 يورو عام 2024. أما الأرباح الموزَّعة على المساهمين من غير المقيمين ضريبياً فتُخضَع بدورها لضريبة خفيفة جداً — راجع ملاحظتنا عن وضع non-dom.</p>
<h2>تأسيس الشركة، خطوة بخطوة</h2>
<p>أولاً، يحجز محامٍ قبرصي اسم الشركة لدى مسجّل الشركات ويُعدّ عقد التأسيس والنظام الأساسي. ثم تُسجَّل الشركة لدى المسجّل؛ ستحتاج إلى مدير واحد على الأقل، وأمين سرّ للشركة، وعنوان مكتب مسجَّل في قبرص. وبعد التأسيس تُسجِّل للحصول على رمز تعريف ضريبي، ولضريبة القيمة المضافة عند الاقتضاء، وتفتح حساباً مصرفياً للشركة. وعادةً ما تُنجَز عمليات التأسيس البسيطة في نحو أسبوع إلى ثلاثة أسابيع.</p>
<h2>الجوهر يهمّ</h2>
<p>لكي تُعامَل الشركة كمقيمة ضريبياً في قبرص — ولتعتمد على شبكة معاهداتها — تحتاج إلى إدارة وسيطرة فعليتين هناك: مديرون يتّخذون القرارات فعلاً في قبرص، وحوكمة سليمة للمجلس، ومكتب حقيقي. وهذا لم يعد اختيارياً على نحو متزايد، والمستشار الجيّد يبنيه من البداية لا يضيفه لاحقاً.</p>
<h2>كيف يساعدك Cyprus Lifestyle</h2>
<p>يمكن لخدمة الكونسيرج لدينا أن تصلك بشركات خدمات مؤسسية ومحاسبين ومكاتب محاماة موثوقين يؤسّسون الشركات ويديرونها هنا يومياً، وأن تساعدك في جمع عرضين أو ثلاثة لمقارنة النطاق والكلفة بأمانة.</p>
<p><em>الأرقام سارية اعتباراً من 2026 وهي إرشادية؛ قواعد الشركات والضرائب مفصّلة وتتغيّر — احصل على استشارة مهنية قبل التأسيس.</em></p>`,
      de: `<p>Für ein Unternehmen, das in der Europäischen Union Fuß fassen will, ist Zypern eine naheliegende Wahl: ein Common-Law-basiertes Rechtssystem, das internationale Anwälte und Banken verstehen, voller EU-Marktzugang, ein umfangreiches Netz von Doppelbesteuerungsabkommen und — selbst nach einer Reform 2026 — eines der wettbewerbsfähigeren Steuerumfelder im Block. So läuft eine Gründung tatsächlich ab, Stand 2026.</p>
<h2>Das Steuerbild</h2>
<p>Die Körperschaftsteuer stieg zum 1. Januar 2026 auf <strong>15%</strong> (von 12,5%), Zyperns Anpassung an die OECD-Regeln zur globalen Mindeststeuer; sie bleibt einer der attraktiveren nominalen Sätze der EU. Einkünfte aus qualifiziertem geistigem Eigentum können über die IP Box weit geringer besteuert werden, deren Abzug von 80% den effektiven Satz auf rund 2,5–3% bringt. Die alte jährliche Firmenabgabe von 350 € wurde 2024 abgeschafft. An non-domiciled Anteilseigner ausgeschüttete Gewinne werden ihrerseits sehr gering besteuert — siehe unsere Anmerkung zum Non-Dom-Status.</p>
<h2>Die Gründung, Schritt für Schritt</h2>
<p>Zuerst reserviert ein zyprischer Anwalt den Firmennamen beim Handelsregister und erstellt die Gründungsurkunde und die Satzung. Anschließend wird die Gesellschaft beim Register eingetragen; Sie brauchen mindestens einen Direktor, einen Company Secretary und eine eingetragene Geschäftsadresse in Zypern. Nach der Gründung melden Sie sich für einen Steuercode und, wo relevant, für die Mehrwertsteuer an und eröffnen ein Firmenkonto. Unkomplizierte Gründungen sind meist in etwa ein bis drei Wochen abgeschlossen.</p>
<h2>Substanz zählt</h2>
<p>Um als in Zypern steuerlich ansässig zu gelten — und sich auf das Abkommensnetz zu stützen — braucht eine Gesellschaft dort ihre tatsächliche Geschäftsleitung und Kontrolle: Direktoren, die wirklich in Zypern entscheiden, eine ordentliche Board-Governance und ein echtes Büro. Zunehmend ist das nicht optional, und ein guter Berater baut es von Anfang an ein, statt es später nachzurüsten.</p>
<h2>Wie Cyprus Lifestyle hilft</h2>
<p>Unser Concierge kann Sie mit geprüften Corporate-Services-Firmen, Buchhaltern und Kanzleien zusammenbringen, die hier täglich Gesellschaften gründen und verwalten, und Ihnen helfen, zwei oder drei Angebote einzuholen, um Umfang und Kosten ehrlich zu vergleichen.</p>
<p><em>Die Angaben gelten mit Stand 2026 und sind Richtwerte; Gesellschafts- und Steuerregeln sind detailliert und ändern sich — holen Sie vor der Gründung fachlichen Rat ein.</em></p>`,
      pl: `<p>Dla firmy, która chce przyczółka w Unii Europejskiej, Cypr to naturalny wybór: system prawny oparty na common-law, który rozumieją międzynarodowi prawnicy i banki, pełny dostęp do rynku UE, rozległa sieć umów o unikaniu podwójnego opodatkowania i — nawet po reformie 2026 — jedno z bardziej konkurencyjnych środowisk podatkowych w bloku. Oto jak naprawdę wygląda założenie firmy, według stanu na 2026.</p>
<h2>Obraz podatkowy</h2>
<p>Podatek dochodowy od firm wzrósł do <strong>15%</strong> od 1 stycznia 2026 (z 12,5%), co jest dostosowaniem Cypru do zasad globalnego podatku minimalnego OECD; pozostaje jedną z bardziej atrakcyjnych stawek nominalnych w UE. Dochód z kwalifikowanej własności intelektualnej może być opodatkowany znacznie lżej dzięki IP Box, którego 80% odliczenie sprowadza stawkę efektywną do około 2,5–3%. Dawną roczną opłatę firmową 350 € zniesiono w 2024. Zyski wypłacane wspólnikom non-domiciled są z kolei opodatkowane bardzo lekko — zobacz naszą notę o statusie non-dom.</p>
<h2>Zakładanie firmy krok po kroku</h2>
<p>Najpierw cypryjski prawnik rezerwuje nazwę firmy w Rejestrze Spółek i przygotowuje Akt Założycielski oraz Statut. Następnie spółkę rejestruje się w Rejestrze; potrzebny jest co najmniej jeden dyrektor, sekretarz spółki i adres siedziby na Cyprze. Po rejestracji rejestrujesz się po kod podatkowy oraz, gdy trzeba, po VAT, i otwierasz firmowe konto bankowe. Proste rejestracje kończą się zwykle w około jeden do trzech tygodni.</p>
<h2>Substancja się liczy</h2>
<p>Aby być traktowaną jako rezydent podatkowy Cypru — i korzystać z sieci traktatów — spółka potrzebuje tam realnego zarządu i kontroli: dyrektorów, którzy faktycznie decydują na Cyprze, właściwego ładu zarządu i prawdziwego biura. Coraz częściej nie jest to opcjonalne, a dobry doradca wbuduje to od początku, zamiast dokładać później.</p>
<h2>Jak pomaga Cyprus Lifestyle</h2>
<p>Nasz concierge może połączyć cię ze sprawdzonymi firmami usług korporacyjnych, księgowymi i kancelariami, które codziennie zakładają i prowadzą tu spółki, oraz pomóc zebrać dwie–trzy oferty, byś uczciwie porównał zakres i koszt.</p>
<p><em>Dane są aktualne na 2026 i mają charakter orientacyjny; zasady korporacyjne i podatkowe są szczegółowe i się zmieniają — przed rejestracją zasięgnij profesjonalnej porady.</em></p>`,
      ru: `<p>Для бизнеса, которому нужен плацдарм в Европейском союзе, Кипр — естественный выбор: правовая система на основе общего права, понятная международным юристам и банкам, полный доступ к рынку ЕС, обширная сеть соглашений об избежании двойного налогообложения и — даже после реформы 2026 года — одна из наиболее конкурентных налоговых сред в блоке. Вот что на деле включает регистрация, по состоянию на 2026 год.</p>
<h2>Налоговая картина</h2>
<p>Налог на прибыль вырос до <strong>15%</strong> с 1 января 2026 года (с 12,5%) — приведение Кипра в соответствие с правилами ОЭСР о глобальном минимальном налоге; он остаётся одной из более привлекательных номинальных ставок в ЕС. Доход от квалифицируемой интеллектуальной собственности может облагаться гораздо легче по режиму IP Box, чей вычет 80% доводит эффективную ставку примерно до 2,5–3%. Прежний ежегодный сбор с компании €350 отменён в 2024 году. Прибыль, распределяемая акционерам со статусом non-dom, в свою очередь облагается очень легко — см. нашу заметку о статусе non-dom.</p>
<h2>Регистрация компании шаг за шагом</h2>
<p>Сначала кипрский юрист резервирует название компании в Регистраторе компаний и готовит Учредительный договор и Устав. Затем компания регистрируется у Регистратора; вам понадобятся как минимум один директор, секретарь компании и адрес зарегистрированного офиса на Кипре. После регистрации вы получаете налоговый код и, где нужно, регистрацию по НДС и открываете корпоративный банковский счёт. Простая регистрация обычно занимает около одной-трёх недель.</p>
<h2>Реальное присутствие важно</h2>
<p>Чтобы считаться налоговым резидентом Кипра — и опираться на сеть его договоров — компании нужны реальное управление и контроль там: директора, которые действительно принимают решения на Кипре, надлежащее корпоративное управление и настоящий офис. Всё чаще это не опция, и хороший консультант выстраивает это с самого начала, а не добавляет потом.</p>
<h2>Чем поможет Cyprus Lifestyle</h2>
<p>Наш консьерж свяжет вас с проверенными фирмами корпоративных услуг, бухгалтерами и юридическими фирмами, которые ежедневно регистрируют и администрируют здесь компании, и поможет собрать два-три предложения, чтобы вы честно сравнили объём и стоимость.</p>
<p><em>Данные актуальны на 2026 год и являются ориентировочными; корпоративные и налоговые правила детальны и меняются — получите профессиональную консультацию до регистрации.</em></p>`,
    },
  },
];

