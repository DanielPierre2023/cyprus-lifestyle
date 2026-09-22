-- 0100_seed_articles.sql
-- Roadmap item 16: bulk multilingual content sprint — batch 1.
-- GENERATED from scripts/seed/articles.data.mjs by scripts/seed/gen-articles-sql.mjs.
-- Do not edit by hand; edit the data file and regenerate. Each article is UPSERTed on
-- its slug, so this migration is idempotent (re-running updates in place, never
-- duplicates) and edits to the source re-apply. All seven languages are populated so
-- no locale falls back to English. Additive.

insert into public.blog_posts (
  slug, status, category, author_name, reading_time_min, word_count, published_at, source_url, sources, tags, title_en, excerpt_en, summary_en, seo_title_en, seo_description_en, content_en, tags_en, title_el, excerpt_el, summary_el, seo_title_el, seo_description_el, content_el, tags_el, title_ro, excerpt_ro, summary_ro, seo_title_ro, seo_description_ro, content_ro, tags_ro, title_ar, excerpt_ar, summary_ar, seo_title_ar, seo_description_ar, content_ar, tags_ar, title_de, excerpt_de, summary_de, seo_title_de, seo_description_de, content_de, tags_de, title_pl, excerpt_pl, summary_pl, seo_title_pl, seo_description_pl, content_pl, tags_pl, title_ru, excerpt_ru, summary_ru, seo_title_ru, seo_description_ru, content_ru, tags_ru
) values (
  $cl$buying-property-in-cyprus-foreigner-guide$cl$,
  $cl$published$cl$,
  $cl$property$cl$,
  $cl$The Cyprus Lifestyle Desk$cl$,
  6,
  509,
  now(),
  $cl$https://research.cy/guides/buying-process.html$cl$,
  array[$cl$https://research.cy/guides/buying-process.html$cl$, $cl$https://realcy.app/guides/property-taxes-2026/$cl$, $cl$https://globallawexperts.com/cyprus-real-estate-tax-changes-2026/$cl$]::text[],
  array[$cl$property$cl$, $cl$buying property$cl$, $cl$relocation$cl$, $cl$investment$cl$]::text[],
  $cl$Buying Property in Cyprus as a Foreigner: The 2026 Guide$cl$,
  $cl$Who may buy, the permit for non-EU buyers, the step-by-step process, and the taxes and fees to budget for — clearly, for the Republic of Cyprus.$cl$,
  $cl$A clear, current guide to buying a home in the Republic of Cyprus as a foreigner: eligibility, the non-EU permit, the legal process and the 2026 taxes and fees.$cl$,
  $cl$Buying Property in Cyprus as a Foreigner (2026 Guide)$cl$,
  $cl$Who can buy, the non-EU permit, the legal process, and 2026 VAT, transfer fees and stamp duty for buying a home in the Republic of Cyprus.$cl$,
  $cl$<p>The Republic of Cyprus has drawn homeowners and investors for decades: an English-speaking, EU legal system, a Mediterranean climate that runs from spring to late autumn, and a property market that spans seafront apartments in Limassol, villas above Paphos and stone houses in the hill villages. Buying here as a foreigner is straightforward — provided you go about it in the right order.</p>
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
<p><em>Figures are current as of 2026 and indicative; always confirm the exact rules and costs with a licensed Cyprus lawyer before you commit.</em></p>$cl$,
  array[$cl$property$cl$, $cl$buying property$cl$, $cl$relocation$cl$, $cl$investment$cl$]::text[],
  $cl$Αγορά Ακινήτου στην Κύπρο για Ξένους: Ο Οδηγός 2026$cl$,
  $cl$Ποιοι μπορούν να αγοράσουν, η άδεια για αγοραστές εκτός ΕΕ, η διαδικασία βήμα προς βήμα, και οι φόροι και τα έξοδα — καθαρά, για την Κυπριακή Δημοκρατία.$cl$,
  $cl$Ένας καθαρός, επίκαιρος οδηγός για την αγορά κατοικίας στην Κυπριακή Δημοκρατία ως ξένος: επιλεξιμότητα, άδεια εκτός ΕΕ, νομική διαδικασία και φόροι/έξοδα 2026.$cl$,
  $cl$Αγορά Ακινήτου στην Κύπρο για Ξένους (Οδηγός 2026)$cl$,
  $cl$Ποιοι αγοράζουν, η άδεια εκτός ΕΕ, η νομική διαδικασία και ΦΠΑ, μεταβιβαστικά και χαρτόσημο 2026 για αγορά κατοικίας στην Κυπριακή Δημοκρατία.$cl$,
  $cl$<p>Η Κυπριακή Δημοκρατία προσελκύει ιδιοκτήτες και επενδυτές εδώ και δεκαετίες: αγγλόφωνο, ευρωπαϊκό νομικό σύστημα, μεσογειακό κλίμα από την άνοιξη ως το τέλος του φθινοπώρου, και μια αγορά ακινήτων που εκτείνεται από παραθαλάσσια διαμερίσματα στη Λεμεσό ως βίλες πάνω από την Πάφο και πέτρινα σπίτια στα ορεινά χωριά. Η αγορά εδώ ως ξένος είναι απλή — αρκεί να ακολουθήσετε τη σωστή σειρά.</p>
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
<p><em>Τα στοιχεία ισχύουν από το 2026 και είναι ενδεικτικά· επιβεβαιώνετε πάντα τους ακριβείς κανόνες και το κόστος με αδειούχο Κύπριο δικηγόρο.</em></p>$cl$,
  array[$cl$ακίνητα$cl$, $cl$αγορά ακινήτου$cl$, $cl$μετεγκατάσταση$cl$, $cl$επένδυση$cl$]::text[],
  $cl$Cumpărarea unei proprietăți în Cipru ca străin: Ghidul 2026$cl$,
  $cl$Cine poate cumpăra, permisul pentru cumpărătorii din afara UE, procesul pas cu pas și taxele de luat în calcul — clar, pentru Republica Cipru.$cl$,
  $cl$Un ghid clar și actual pentru cumpărarea unei locuințe în Republica Cipru ca străin: eligibilitate, permisul non-UE, procesul juridic și taxele din 2026.$cl$,
  $cl$Cumpărarea unei proprietăți în Cipru ca străin (Ghid 2026)$cl$,
  $cl$Cine poate cumpăra, permisul non-UE, procesul juridic și TVA, taxele de transfer și timbrul în 2026 pentru o locuință în Republica Cipru.$cl$,
  $cl$<p>Republica Cipru atrage de decenii proprietari și investitori: un sistem juridic european, vorbitor de engleză, o climă mediteraneană care ține din primăvară până toamna târziu și o piață imobiliară care merge de la apartamente pe faleza din Limassol la vile deasupra orașului Paphos și case de piatră în satele de deal. Cumpărarea aici ca străin este simplă — dacă procedezi în ordinea corectă.</p>
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
<p><em>Cifrele sunt valabile în 2026 și au caracter orientativ; confirmă întotdeauna regulile și costurile exacte cu un avocat cipriot autorizat.</em></p>$cl$,
  array[$cl$imobiliare$cl$, $cl$cumpărare locuință$cl$, $cl$relocare$cl$, $cl$investiții$cl$]::text[],
  $cl$شراء عقار في قبرص للأجانب: دليل 2026$cl$,
  $cl$من يحق له الشراء، وتصريح المشترين من خارج الاتحاد الأوروبي، والخطوات بالتفصيل، والضرائب والرسوم — بوضوح، لجمهورية قبرص.$cl$,
  $cl$دليل واضح ومحدَّث لشراء منزل في جمهورية قبرص كأجنبي: الأهلية، وتصريح غير الأوروبيين، والإجراءات القانونية، وضرائب ورسوم 2026.$cl$,
  $cl$شراء عقار في قبرص للأجانب (دليل 2026)$cl$,
  $cl$من يستطيع الشراء، وتصريح غير الأوروبيين، والإجراءات القانونية، وضريبة القيمة المضافة ورسوم النقل والطوابع لعام 2026 في جمهورية قبرص.$cl$,
  $cl$<p>تجذب جمهورية قبرص المالكين والمستثمرين منذ عقود: نظام قانوني أوروبي يتعامل بالإنجليزية، ومناخ متوسطي يمتد من الربيع إلى أواخر الخريف، وسوق عقاري يتنوع من شقق على الواجهة البحرية في ليماسول إلى فيلات تطل على بافوس وبيوت حجرية في القرى الجبلية. الشراء هنا كأجنبي أمر مباشر — شرط أن تسير بالترتيب الصحيح.</p>
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
<p><em>الأرقام سارية اعتباراً من 2026 وهي إرشادية؛ تحقّق دائماً من القواعد والتكاليف الدقيقة مع محامٍ قبرصي مرخّص قبل الالتزام.</em></p>$cl$,
  array[$cl$عقارات$cl$, $cl$شراء عقار$cl$, $cl$انتقال$cl$, $cl$استثمار$cl$]::text[],
  $cl$Immobilienkauf in Zypern als Ausländer: Der Leitfaden 2026$cl$,
  $cl$Wer kaufen darf, die Genehmigung für Käufer aus Nicht-EU-Ländern, der Ablauf Schritt für Schritt sowie Steuern und Gebühren — klar, für die Republik Zypern.$cl$,
  $cl$Ein klarer, aktueller Leitfaden zum Immobilienkauf in der Republik Zypern als Ausländer: Voraussetzungen, Nicht-EU-Genehmigung, Rechtsablauf und Steuern 2026.$cl$,
  $cl$Immobilienkauf in Zypern als Ausländer (Leitfaden 2026)$cl$,
  $cl$Wer kaufen darf, die Nicht-EU-Genehmigung, der Rechtsablauf sowie MwSt., Übertragungsgebühren und Stempelsteuer 2026 in der Republik Zypern.$cl$,
  $cl$<p>Die Republik Zypern zieht seit Jahrzehnten Eigentümer und Investoren an: ein englischsprachiges EU-Rechtssystem, ein mediterranes Klima vom Frühjahr bis in den späten Herbst und ein Immobilienmarkt, der von Wohnungen am Meer in Limassol über Villen oberhalb von Paphos bis zu Steinhäusern in den Bergdörfern reicht. Der Kauf als Ausländer ist unkompliziert — sofern man in der richtigen Reihenfolge vorgeht.</p>
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
<p><em>Die Angaben gelten mit Stand 2026 und sind Richtwerte; bestätigen Sie die genauen Regeln und Kosten stets mit einem zugelassenen zyprischen Anwalt.</em></p>$cl$,
  array[$cl$Immobilien$cl$, $cl$Immobilienkauf$cl$, $cl$Umzug$cl$, $cl$Investition$cl$]::text[],
  $cl$Zakup nieruchomości na Cyprze przez obcokrajowca: Przewodnik 2026$cl$,
  $cl$Kto może kupić, zezwolenie dla nabywców spoza UE, proces krok po kroku oraz podatki i opłaty — jasno, dla Republiki Cypryjskiej.$cl$,
  $cl$Przejrzysty, aktualny przewodnik po zakupie domu w Republice Cypryjskiej przez obcokrajowca: uprawnienia, zezwolenie spoza UE, proces prawny i podatki 2026.$cl$,
  $cl$Zakup nieruchomości na Cyprze przez obcokrajowca (2026)$cl$,
  $cl$Kto może kupić, zezwolenie spoza UE, proces prawny oraz VAT, opłaty transferowe i skarbowa w 2026 przy zakupie domu w Republice Cypryjskiej.$cl$,
  $cl$<p>Republika Cypryjska od dziesięcioleci przyciąga właścicieli i inwestorów: anglojęzyczny, unijny system prawny, śródziemnomorski klimat od wiosny do późnej jesieni oraz rynek nieruchomości od apartamentów przy morzu w Limassol, przez wille nad Pafos, po kamienne domy w górskich wioskach. Zakup tutaj jako obcokrajowiec jest prosty — o ile robi się to we właściwej kolejności.</p>
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
<p><em>Dane są aktualne na 2026 i mają charakter orientacyjny; zawsze potwierdź dokładne zasady i koszty u licencjonowanego cypryjskiego prawnika.</em></p>$cl$,
  array[$cl$nieruchomości$cl$, $cl$zakup nieruchomości$cl$, $cl$relokacja$cl$, $cl$inwestycja$cl$]::text[],
  $cl$Покупка недвижимости на Кипре иностранцем: гид 2026$cl$,
  $cl$Кто может покупать, разрешение для покупателей из-за пределов ЕС, пошаговый процесс, налоги и сборы — понятно, для Республики Кипр.$cl$,
  $cl$Понятный актуальный гид по покупке жилья в Республике Кипр иностранцем: право на покупку, разрешение для не-граждан ЕС, юридический процесс и налоги 2026.$cl$,
  $cl$Покупка недвижимости на Кипре иностранцем (гид 2026)$cl$,
  $cl$Кто может купить, разрешение для не-ЕС, юридический процесс, НДС, сборы за передачу и гербовый сбор 2026 в Республике Кипр.$cl$,
  $cl$<p>Республика Кипр десятилетиями привлекает владельцев и инвесторов: англоязычная правовая система ЕС, средиземноморский климат с весны до поздней осени и рынок недвижимости — от квартир у моря в Лимасоле до вилл над Пафосом и каменных домов в горных деревнях. Покупка здесь иностранцем проста — если действовать в правильном порядке.</p>
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
<p><em>Данные актуальны на 2026 год и являются ориентировочными; всегда уточняйте точные правила и расходы у лицензированного кипрского юриста.</em></p>$cl$,
  array[$cl$недвижимость$cl$, $cl$покупка недвижимости$cl$, $cl$переезд$cl$, $cl$инвестиции$cl$]::text[]
)
on conflict (slug) do update set
  status = excluded.status,
  category = excluded.category,
  author_name = excluded.author_name,
  reading_time_min = excluded.reading_time_min,
  word_count = excluded.word_count,
  published_at = excluded.published_at,
  source_url = excluded.source_url,
  sources = excluded.sources,
  tags = excluded.tags,
  title_en = excluded.title_en,
  excerpt_en = excluded.excerpt_en,
  summary_en = excluded.summary_en,
  seo_title_en = excluded.seo_title_en,
  seo_description_en = excluded.seo_description_en,
  content_en = excluded.content_en,
  tags_en = excluded.tags_en,
  title_el = excluded.title_el,
  excerpt_el = excluded.excerpt_el,
  summary_el = excluded.summary_el,
  seo_title_el = excluded.seo_title_el,
  seo_description_el = excluded.seo_description_el,
  content_el = excluded.content_el,
  tags_el = excluded.tags_el,
  title_ro = excluded.title_ro,
  excerpt_ro = excluded.excerpt_ro,
  summary_ro = excluded.summary_ro,
  seo_title_ro = excluded.seo_title_ro,
  seo_description_ro = excluded.seo_description_ro,
  content_ro = excluded.content_ro,
  tags_ro = excluded.tags_ro,
  title_ar = excluded.title_ar,
  excerpt_ar = excluded.excerpt_ar,
  summary_ar = excluded.summary_ar,
  seo_title_ar = excluded.seo_title_ar,
  seo_description_ar = excluded.seo_description_ar,
  content_ar = excluded.content_ar,
  tags_ar = excluded.tags_ar,
  title_de = excluded.title_de,
  excerpt_de = excluded.excerpt_de,
  summary_de = excluded.summary_de,
  seo_title_de = excluded.seo_title_de,
  seo_description_de = excluded.seo_description_de,
  content_de = excluded.content_de,
  tags_de = excluded.tags_de,
  title_pl = excluded.title_pl,
  excerpt_pl = excluded.excerpt_pl,
  summary_pl = excluded.summary_pl,
  seo_title_pl = excluded.seo_title_pl,
  seo_description_pl = excluded.seo_description_pl,
  content_pl = excluded.content_pl,
  tags_pl = excluded.tags_pl,
  title_ru = excluded.title_ru,
  excerpt_ru = excluded.excerpt_ru,
  summary_ru = excluded.summary_ru,
  seo_title_ru = excluded.seo_title_ru,
  seo_description_ru = excluded.seo_description_ru,
  content_ru = excluded.content_ru,
  tags_ru = excluded.tags_ru,
  updated_at = now();

insert into public.blog_posts (
  slug, status, category, author_name, reading_time_min, word_count, published_at, source_url, sources, tags, title_en, excerpt_en, summary_en, seo_title_en, seo_description_en, content_en, tags_en, title_el, excerpt_el, summary_el, seo_title_el, seo_description_el, content_el, tags_el, title_ro, excerpt_ro, summary_ro, seo_title_ro, seo_description_ro, content_ro, tags_ro, title_ar, excerpt_ar, summary_ar, seo_title_ar, seo_description_ar, content_ar, tags_ar, title_de, excerpt_de, summary_de, seo_title_de, seo_description_de, content_de, tags_de, title_pl, excerpt_pl, summary_pl, seo_title_pl, seo_description_pl, content_pl, tags_pl, title_ru, excerpt_ru, summary_ru, seo_title_ru, seo_description_ru, content_ru, tags_ru
) values (
  $cl$best-time-to-visit-cyprus$cl$,
  $cl$published$cl$,
  $cl$travel$cl$,
  $cl$The Cyprus Lifestyle Desk$cl$,
  5,
  426,
  now(),
  $cl$https://www.22places.com/best-time-to-visit-cyprus/$cl$,
  array[$cl$https://www.22places.com/best-time-to-visit-cyprus/$cl$, $cl$https://www.audleytravel.com/cyprus/best-time-to-visit$cl$]::text[],
  array[$cl$travel$cl$, $cl$when to visit$cl$, $cl$weather$cl$, $cl$beaches$cl$]::text[],
  $cl$The Best Time to Visit Cyprus$cl$,
  $cl$Summer sun, the shoulder-season sweet spot, or a mild green winter — how to choose the right month for the Cyprus you want.$cl$,
  $cl$When to go to Cyprus, season by season: summer heat, the spring and autumn sweet spot, sea temperatures, and a mild green winter for villages and hiking.$cl$,
  $cl$The Best Time to Visit Cyprus (Season by Season)$cl$,
  $cl$Season-by-season guide to visiting Cyprus: summer heat, the spring/autumn sweet spot, sea temperatures and a mild green winter.$cl$,
  $cl$<p>There is no wrong time to come to the Republic of Cyprus — only the right time for the trip you have in mind. The island runs warm and sunny for much of the year, so the real question is whether you are chasing the sea, a quieter table, or the green mountains.</p>
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
<p><em>Temperatures are typical seasonal ranges, not guarantees; check the forecast close to your dates.</em></p>$cl$,
  array[$cl$travel$cl$, $cl$when to visit$cl$, $cl$weather$cl$, $cl$beaches$cl$]::text[],
  $cl$Η Καλύτερη Εποχή για να Επισκεφθείτε την Κύπρο$cl$,
  $cl$Καλοκαιρινός ήλιος, η ιδανική ενδιάμεση εποχή ή ένας ήπιος, καταπράσινος χειμώνας — πώς να διαλέξετε τον σωστό μήνα.$cl$,
  $cl$Πότε να πάτε στην Κύπρο, εποχή προς εποχή: καλοκαιρινή ζέστη, η ιδανική άνοιξη και φθινόπωρο, θερμοκρασίες θάλασσας και ήπιος χειμώνας για χωριά και πεζοπορία.$cl$,
  $cl$Η Καλύτερη Εποχή για την Κύπρο (Εποχή προς Εποχή)$cl$,
  $cl$Οδηγός εποχής προς εποχή για την Κύπρο: καλοκαιρινή ζέστη, ιδανική άνοιξη/φθινόπωρο, θερμοκρασίες θάλασσας και ήπιος χειμώνας.$cl$,
  $cl$<p>Δεν υπάρχει λάθος εποχή για να έρθετε στην Κυπριακή Δημοκρατία — μόνο η σωστή εποχή για το ταξίδι που έχετε στο μυαλό σας. Το νησί είναι ζεστό και ηλιόλουστο μεγάλο μέρος του χρόνου, οπότε το πραγματικό ερώτημα είναι αν κυνηγάτε τη θάλασσα, ένα πιο ήσυχο τραπέζι ή τα πράσινα βουνά.</p>
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
<p><em>Οι θερμοκρασίες είναι τυπικά εποχικά εύρη, όχι εγγυήσεις· ελέγξτε την πρόγνωση κοντά στις ημερομηνίες σας.</em></p>$cl$,
  array[$cl$ταξίδι$cl$, $cl$πότε να επισκεφθείτε$cl$, $cl$καιρός$cl$, $cl$παραλίες$cl$]::text[],
  $cl$Cel mai bun moment pentru a vizita Ciprul$cl$,
  $cl$Soarele verii, perioada perfectă de tranziție sau o iarnă blândă și verde — cum alegi luna potrivită pentru Ciprul dorit.$cl$,
  $cl$Când să mergi în Cipru, sezon cu sezon: căldura verii, perioada ideală de primăvară și toamnă, temperatura mării și o iarnă blândă pentru sate și drumeții.$cl$,
  $cl$Cel mai bun moment pentru a vizita Ciprul (pe sezoane)$cl$,
  $cl$Ghid pe sezoane pentru Cipru: căldura verii, perioada ideală primăvară/toamnă, temperatura mării și o iarnă blândă.$cl$,
  $cl$<p>Nu există un moment nepotrivit pentru a veni în Republica Cipru — există doar momentul potrivit pentru călătoria la care te gândești. Insula e caldă și însorită mare parte din an, așa că întrebarea reală e dacă urmărești marea, o masă mai liniștită sau munții verzi.</p>
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
<p><em>Temperaturile sunt intervale sezoniere tipice, nu garanții; verifică prognoza aproape de datele tale.</em></p>$cl$,
  array[$cl$călătorie$cl$, $cl$când să vizitezi$cl$, $cl$vreme$cl$, $cl$plaje$cl$]::text[],
  $cl$أفضل وقت لزيارة قبرص$cl$,
  $cl$شمس الصيف، أو فترة الذروة المعتدلة بين المواسم، أو شتاء لطيف أخضر — كيف تختار الشهر المناسب لقبرص التي تريدها.$cl$,
  $cl$متى تزور قبرص، موسماً بموسم: حرّ الصيف، وأفضل أوقات الربيع والخريف، ودرجات حرارة البحر، وشتاء لطيف للقرى والمشي.$cl$,
  $cl$أفضل وقت لزيارة قبرص (موسماً بموسم)$cl$,
  $cl$دليل موسمي لزيارة قبرص: حرّ الصيف، وأفضل أوقات الربيع والخريف، ودرجات حرارة البحر، وشتاء لطيف.$cl$,
  $cl$<p>لا يوجد وقت خاطئ لزيارة جمهورية قبرص — بل الوقت المناسب للرحلة التي تفكّر فيها. الجزيرة دافئة ومشمسة معظم العام، فالسؤال الحقيقي هو: هل تسعى إلى البحر، أم إلى طاولة أهدأ، أم إلى الجبال الخضراء؟</p>
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
<p><em>درجات الحرارة نطاقات موسمية معتادة وليست ضمانات؛ راجع توقعات الطقس قرب موعد سفرك.</em></p>$cl$,
  array[$cl$سفر$cl$, $cl$أفضل وقت للزيارة$cl$, $cl$الطقس$cl$, $cl$الشواطئ$cl$]::text[],
  $cl$Die beste Reisezeit für Zypern$cl$,
  $cl$Sommersonne, die ideale Nebensaison oder ein milder, grüner Winter — so wählen Sie den richtigen Monat.$cl$,
  $cl$Wann nach Zypern, Saison für Saison: Sommerhitze, die ideale Zeit im Frühjahr und Herbst, Wassertemperaturen und ein milder Winter für Dörfer und Wandern.$cl$,
  $cl$Die beste Reisezeit für Zypern (Saison für Saison)$cl$,
  $cl$Saisonaler Leitfaden für Zypern: Sommerhitze, ideale Zeit im Frühjahr/Herbst, Wassertemperaturen und milder Winter.$cl$,
  $cl$<p>Es gibt keine falsche Zeit für die Republik Zypern — nur die richtige Zeit für die Reise, die Ihnen vorschwebt. Die Insel ist einen Großteil des Jahres warm und sonnig, die eigentliche Frage ist also, ob Sie das Meer, einen ruhigeren Tisch oder die grünen Berge suchen.</p>
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
<p><em>Die Temperaturen sind typische saisonale Bereiche, keine Garantien; prüfen Sie die Vorhersage kurz vor Ihren Terminen.</em></p>$cl$,
  array[$cl$Reise$cl$, $cl$beste Reisezeit$cl$, $cl$Wetter$cl$, $cl$Strände$cl$]::text[],
  $cl$Najlepszy czas na wyjazd na Cypr$cl$,
  $cl$Letnie słońce, idealny sezon przejściowy albo łagodna, zielona zima — jak wybrać właściwy miesiąc.$cl$,
  $cl$Kiedy jechać na Cypr, sezon po sezonie: letni upał, idealna wiosna i jesień, temperatura morza oraz łagodna zima na wioski i wędrówki.$cl$,
  $cl$Najlepszy czas na Cypr (sezon po sezonie)$cl$,
  $cl$Sezonowy przewodnik po Cyprze: letni upał, idealna wiosna/jesień, temperatura morza i łagodna zima.$cl$,
  $cl$<p>Nie ma złego czasu na przyjazd do Republiki Cypryjskiej — jest tylko właściwy czas na podróż, o której myślisz. Wyspa jest ciepła i słoneczna przez większość roku, więc prawdziwe pytanie brzmi: gonisz za morzem, spokojniejszym stolikiem czy zielonymi górami?</p>
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
<p><em>Temperatury to typowe zakresy sezonowe, a nie gwarancje; sprawdź prognozę blisko swoich dat.</em></p>$cl$,
  array[$cl$podróże$cl$, $cl$kiedy jechać$cl$, $cl$pogoda$cl$, $cl$plaże$cl$]::text[],
  $cl$Лучшее время для поездки на Кипр$cl$,
  $cl$Летнее солнце, идеальный межсезонный период или мягкая зелёная зима — как выбрать нужный месяц.$cl$,
  $cl$Когда ехать на Кипр, сезон за сезоном: летняя жара, идеальные весна и осень, температура моря и мягкая зима для деревень и походов.$cl$,
  $cl$Лучшее время для поездки на Кипр (по сезонам)$cl$,
  $cl$Посезонный гид по Кипру: летняя жара, идеальные весна и осень, температура моря и мягкая зима.$cl$,
  $cl$<p>Неудачного времени для поездки в Республику Кипр не бывает — есть лишь подходящее время для той поездки, о которой вы думаете. Остров тёплый и солнечный большую часть года, поэтому вопрос в том, за чем вы едете: за морем, за спокойным ужином или за зелёными горами.</p>
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
<p><em>Температуры — это типичные сезонные диапазоны, а не гарантии; уточните прогноз ближе к вашим датам.</em></p>$cl$,
  array[$cl$путешествия$cl$, $cl$когда ехать$cl$, $cl$погода$cl$, $cl$пляжи$cl$]::text[]
)
on conflict (slug) do update set
  status = excluded.status,
  category = excluded.category,
  author_name = excluded.author_name,
  reading_time_min = excluded.reading_time_min,
  word_count = excluded.word_count,
  published_at = excluded.published_at,
  source_url = excluded.source_url,
  sources = excluded.sources,
  tags = excluded.tags,
  title_en = excluded.title_en,
  excerpt_en = excluded.excerpt_en,
  summary_en = excluded.summary_en,
  seo_title_en = excluded.seo_title_en,
  seo_description_en = excluded.seo_description_en,
  content_en = excluded.content_en,
  tags_en = excluded.tags_en,
  title_el = excluded.title_el,
  excerpt_el = excluded.excerpt_el,
  summary_el = excluded.summary_el,
  seo_title_el = excluded.seo_title_el,
  seo_description_el = excluded.seo_description_el,
  content_el = excluded.content_el,
  tags_el = excluded.tags_el,
  title_ro = excluded.title_ro,
  excerpt_ro = excluded.excerpt_ro,
  summary_ro = excluded.summary_ro,
  seo_title_ro = excluded.seo_title_ro,
  seo_description_ro = excluded.seo_description_ro,
  content_ro = excluded.content_ro,
  tags_ro = excluded.tags_ro,
  title_ar = excluded.title_ar,
  excerpt_ar = excluded.excerpt_ar,
  summary_ar = excluded.summary_ar,
  seo_title_ar = excluded.seo_title_ar,
  seo_description_ar = excluded.seo_description_ar,
  content_ar = excluded.content_ar,
  tags_ar = excluded.tags_ar,
  title_de = excluded.title_de,
  excerpt_de = excluded.excerpt_de,
  summary_de = excluded.summary_de,
  seo_title_de = excluded.seo_title_de,
  seo_description_de = excluded.seo_description_de,
  content_de = excluded.content_de,
  tags_de = excluded.tags_de,
  title_pl = excluded.title_pl,
  excerpt_pl = excluded.excerpt_pl,
  summary_pl = excluded.summary_pl,
  seo_title_pl = excluded.seo_title_pl,
  seo_description_pl = excluded.seo_description_pl,
  content_pl = excluded.content_pl,
  tags_pl = excluded.tags_pl,
  title_ru = excluded.title_ru,
  excerpt_ru = excluded.excerpt_ru,
  summary_ru = excluded.summary_ru,
  seo_title_ru = excluded.seo_title_ru,
  seo_description_ru = excluded.seo_description_ru,
  content_ru = excluded.content_ru,
  tags_ru = excluded.tags_ru,
  updated_at = now();

-- report
select 'seed_articles' as check,
       (select count(*) from public.blog_posts where slug in ('buying-property-in-cyprus-foreigner-guide', 'best-time-to-visit-cyprus')) as articles,
       (select count(*) from public.blog_posts
          where slug in ('buying-property-in-cyprus-foreigner-guide', 'best-time-to-visit-cyprus')
            and content_en is not null and content_el is not null and content_ro is not null
            and content_ar is not null and content_de is not null and content_pl is not null
            and content_ru is not null) as all_seven_langs;
