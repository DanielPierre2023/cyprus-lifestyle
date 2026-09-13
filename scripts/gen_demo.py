# Generates supabase/demo_content.sql — 12 published demo articles across every
# category, each in EN/EL/RO/AR, with cover photos. Run: python3 scripts/gen_demo.py
import io, os

IMG = "https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=1400&q=80"
def img(i): return IMG.format(id=i)

# Each article: slug, category, editor(author slug), county, breaking, image, and
# per-language {t:title, e:excerpt, s:summary, b:[paragraphs], g:[tags]}
A = []

A.append(dict(slug="limassol-marina-towers", category="property", editor="property-desk", county="limassol", breaking=True,
  image=img("1512917774080-9991f1c4c750"),
  en=dict(t="Limassol's marina towers redraw the skyline",
    e="The city's seafront is becoming an address, and the numbers are following the view.",
    s="A new generation of waterfront towers has turned Limassol's marina into the island's most sought-after postcode.",
    b=["Ten years ago the Limassol seafront was a working coastline. Today it is a row of glass towers with berths at their feet, and apartments that change hands before the concrete has cured. The marina has done what no masterplan could: it has given the city a centre of gravity.",
       "What the buyers are paying for is not square metres but a way of living, morning swims, an evening walk to dinner, a boat within sight of the bedroom. The premium is real, and for now it shows no sign of softening."],
    g=["limassol","marina","real estate"]),
  el=dict(t="Οι πύργοι της μαρίνας Λεμεσού αλλάζουν τον ορίζοντα",
    e="Το παραλιακό μέτωπο της πόλης γίνεται διεύθυνση, και οι τιμές ακολουθούν τη θέα.",
    s="Μια νέα γενιά παραθαλάσσιων πύργων έκανε τη μαρίνα Λεμεσού την πιο περιζήτητη περιοχή του νησιού.",
    b=["Πριν από δέκα χρόνια το παραλιακό μέτωπο της Λεμεσού ήταν μια ακτή εργασίας. Σήμερα είναι μια σειρά από γυάλινους πύργους με αγκυροβόλια στα πόδια τους, και διαμερίσματα που αλλάζουν χέρια πριν στεγνώσει το μπετόν. Η μαρίνα έδωσε στην πόλη ένα κέντρο βάρους.",
       "Αυτό που πληρώνουν οι αγοραστές δεν είναι τετραγωνικά αλλά ένας τρόπος ζωής: πρωινές βουτιές, βραδινός περίπατος για δείπνο, ένα σκάφος μέσα στο οπτικό πεδίο. Το υπερτίμημα είναι υπαρκτό και προς το παρόν δεν δείχνει σημάδια υποχώρησης."],
    g=["λεμεσός","μαρίνα","ακίνητα"]),
  ro=dict(t="Turnurile marinei din Limassol redesenează orizontul",
    e="Faleza orașului devine o adresă, iar prețurile urmează priveliștea.",
    s="O nouă generație de turnuri pe malul mării a transformat marina din Limassol în cea mai căutată zonă a insulei.",
    b=["Acum zece ani, faleza din Limassol era o coastă de lucru. Astăzi este un șir de turnuri de sticlă cu dane la picioarele lor și apartamente care își schimbă proprietarul înainte să se usuce betonul. Marina a dat orașului un centru de greutate.",
       "Ceea ce plătesc cumpărătorii nu sunt metrii pătrați, ci un mod de a trăi: înot dimineața, o plimbare până la cină seara, o barcă la vedere din dormitor. Prima de preț este reală și, deocamdată, nu dă semne de scădere."],
    g=["limassol","marina","imobiliare"]),
  ar=dict(t="أبراج مارينا ليماسول تعيد رسم أفق المدينة",
    e="واجهة المدينة البحرية تتحوّل إلى عنوان، والأسعار تتبع الإطلالة.",
    s="جيل جديد من الأبراج المطلة على البحر جعل مارينا ليماسول أكثر المناطق طلبًا في الجزيرة.",
    b=["قبل عشر سنوات كانت واجهة ليماسول ساحلًا عاملًا. اليوم هي صفٌّ من الأبراج الزجاجية ترسو القوارب عند أقدامها، وشققٌ تنتقل ملكيتها قبل أن يجفّ الإسمنت. لقد منحت المارينا المدينة مركز ثقلها.",
       "ما يدفع المشترون ثمنه ليس الأمتار بل نمط حياة: سباحة الصباح، ونزهة مسائية إلى العشاء، وقارب على مرأى من غرفة النوم. العلاوة السعرية حقيقية، ولا تُظهر حتى الآن أي تراجع."],
    g=["ليماسول","مارينا","عقارات"])))

A.append(dict(slug="byzantine-gold-nicosia", category="culture", editor="culture-desk", county="nicosia", breaking=False,
  image=img("1503095396549-807759245b35"),
  en=dict(t="Byzantine gold returns to Nicosia",
    e="A quiet homecoming for icons that spent decades abroad.",
    s="A landmark exhibition brings looted Byzantine treasures back to the capital, and asks what belonging means.",
    b=["The icons arrived without ceremony, in crates, under guard. For decades they had travelled the auction rooms of three continents; now they hang again a few kilometres from where they were made. The gold has not dimmed.",
       "The exhibition is careful not to be triumphant. It is, instead, a meditation on loss and return, on what a small island keeps and what it lets go. The crowds have been silent, which is its own kind of applause."],
    g=["nicosia","heritage","art"]),
  el=dict(t="Ο βυζαντινός χρυσός επιστρέφει στη Λευκωσία",
    e="Μια σιωπηλή επιστροφή για εικόνες που πέρασαν δεκαετίες στο εξωτερικό.",
    s="Μια σημαντική έκθεση φέρνει πίσω στην πρωτεύουσα βυζαντινούς θησαυρούς και ρωτά τι σημαίνει να ανήκεις.",
    b=["Οι εικόνες έφτασαν χωρίς τελετές, σε κιβώτια, υπό φύλαξη. Για δεκαετίες ταξίδεψαν στους οίκους δημοπρασιών τριών ηπείρων· τώρα κρέμονται ξανά λίγα χιλιόμετρα από εκεί που φτιάχτηκαν. Ο χρυσός δεν έχει θαμπώσει.",
       "Η έκθεση προσέχει να μην είναι θριαμβευτική. Είναι, αντίθετα, ένας στοχασμός για την απώλεια και την επιστροφή, για το τι κρατά ένα μικρό νησί και τι αφήνει. Το πλήθος στέκεται σιωπηλό, που είναι το δικό του χειροκρότημα."],
    g=["λευκωσία","κληρονομιά","τέχνη"]),
  ro=dict(t="Aurul bizantin se întoarce la Nicosia",
    e="O revenire tăcută pentru icoane care au petrecut decenii în străinătate.",
    s="O expoziție de referință readuce în capitală comori bizantine și întreabă ce înseamnă apartenența.",
    b=["Icoanele au sosit fără ceremonie, în lăzi, sub pază. Decenii la rând au străbătut casele de licitații de pe trei continente; acum atârnă din nou la câțiva kilometri de locul unde au fost create. Aurul nu s-a stins.",
       "Expoziția are grijă să nu fie triumfalistă. Este, în schimb, o meditație asupra pierderii și a întoarcerii, asupra a ceea ce păstrează o insulă mică și a ceea ce lasă să plece. Mulțimea a stat tăcută, ceea ce este propriul ei aplauz."],
    g=["nicosia","patrimoniu","artă"]),
  ar=dict(t="الذهب البيزنطي يعود إلى نيقوسيا",
    e="عودة هادئة لأيقونات قضت عقودًا في الخارج.",
    s="معرض بارز يعيد إلى العاصمة كنوزًا بيزنطية، ويسأل عن معنى الانتماء.",
    b=["وصلت الأيقونات بلا احتفال، في صناديق، تحت الحراسة. طوال عقود جابت قاعات المزادات في ثلاث قارات؛ والآن تُعلَّق من جديد على بُعد كيلومترات من حيث صُنعت. لم يخفت الذهب.",
       "يحرص المعرض على ألا يكون احتفاليًا. هو بالأحرى تأمّل في الفقد والعودة، وفيما تحتفظ به جزيرة صغيرة وما تتركه يمضي. وقف الجمهور صامتًا، وهو تصفيقٌ من نوع خاص."],
    g=["نيقوسيا","تراث","فن"])))

A.append(dict(slug="funds-choosing-limassol", category="business", editor="business-desk", county="limassol", breaking=False,
  image=img("1486406146926-c627a92ad1ab"),
  en=dict(t="Why the funds are choosing Limassol",
    e="A tax regime, a time zone and a marina walk are quietly moving capital south-east.",
    s="Fund managers explain why a Mediterranean island keeps appearing on their relocation shortlists.",
    b=["The pitch is unglamorous and effective: a competitive tax residency, English-language courts, a workforce that speaks three languages before lunch, and a flight map that reaches London, the Gulf and Athens with ease. For a mid-sized fund, the maths is simple.",
       "What the spreadsheets miss is the softer draw, the sense that work and life can share a coastline. That is harder to model, and, several managers admit, the reason the meeting turned into a move."],
    g=["business","funds","tax"]),
  el=dict(t="Γιατί τα επενδυτικά ταμεία επιλέγουν τη Λεμεσό",
    e="Ένα φορολογικό καθεστώς, μια ζώνη ώρας και μια βόλτα στη μαρίνα μετακινούν κεφάλαια.",
    s="Διαχειριστές κεφαλαίων εξηγούν γιατί ένα νησί της Μεσογείου εμφανίζεται συνεχώς στις λίστες μετεγκατάστασής τους.",
    b=["Το επιχείρημα είναι λιτό και αποτελεσματικό: ανταγωνιστική φορολογική κατοικία, δικαστήρια στα αγγλικά, εργατικό δυναμικό που μιλά τρεις γλώσσες πριν το μεσημέρι, και πτήσεις που φτάνουν εύκολα Λονδίνο, Κόλπο και Αθήνα. Για ένα μεσαίο ταμείο, τα μαθηματικά είναι απλά.",
       "Αυτό που δεν πιάνουν τα λογιστικά φύλλα είναι η πιο ήπια έλξη: η αίσθηση ότι δουλειά και ζωή μοιράζονται μια ακτή. Αυτό δύσκολα μοντελοποιείται και, όπως παραδέχονται αρκετοί, είναι ο λόγος που η συνάντηση έγινε μετακόμιση."],
    g=["οικονομία","κεφάλαια","φορολογία"]),
  ro=dict(t="De ce aleg fondurile orașul Limassol",
    e="Un regim fiscal, un fus orar și o plimbare pe marina mută discret capitalul spre sud-est.",
    s="Administratori de fonduri explică de ce o insulă mediteraneeană apare mereu pe listele lor de relocare.",
    b=["Argumentul este sobru și eficient: o rezidență fiscală competitivă, instanțe în limba engleză, o forță de muncă ce vorbește trei limbi până la prânz și o hartă a zborurilor care ajunge ușor la Londra, în Golf și la Atena. Pentru un fond mediu, calculul este simplu.",
       "Ceea ce ratează tabelele este atracția mai subtilă: sentimentul că munca și viața pot împărți un țărm. Acest lucru se modelează greu și, recunosc câțiva administratori, este motivul pentru care întâlnirea s-a transformat în mutare."],
    g=["afaceri","fonduri","fiscalitate"]),
  ar=dict(t="لماذا تختار الصناديق مدينة ليماسول",
    e="نظام ضريبي، ومنطقة زمنية، ونزهة على المارينا تنقل رؤوس الأموال بهدوء نحو الجنوب الشرقي.",
    s="مديرو صناديق يشرحون لماذا تظهر جزيرة متوسطية دائمًا على قوائم انتقالهم.",
    b=["العرض بسيط وفعّال: إقامة ضريبية تنافسية، ومحاكم باللغة الإنجليزية، وقوة عمل تتحدث ثلاث لغات قبل الظهيرة، وخريطة رحلات تصل بسهولة إلى لندن والخليج وأثينا. بالنسبة لصندوق متوسط الحجم، الحساب بسيط.",
       "ما تغفله الجداول هو الجاذبية الأنعم: الإحساس بأن العمل والحياة يمكن أن يتشاركا ساحلًا واحدًا. هذا أصعب على النمذجة، ويعترف عدة مديرين بأنه سبب تحوّل الاجتماع إلى انتقال."],
    g=["أعمال","صناديق","ضرائب"])))

A.append(dict(slug="two-days-akamas", category="escapes", editor="escapes-desk", county="paphos", breaking=False,
  image=img("1441974231531-c6227db76b6e"),
  en=dict(t="Two days in the Akamas, done properly",
    e="The island's last wild peninsula, at the pace it deserves.",
    s="A slow itinerary for the Akamas: sea caves at dawn, a long lunch, and a road that ends at the light.",
    b=["Most visitors see the Akamas from the back of a jeep, in a cloud of dust and an hour. That is a mistake. The peninsula rewards the slow, the ones who arrive by boat at first light and let the sea caves fill with colour before anyone else is awake.",
       "By afternoon the road narrows to a track, the track to a path, and the path to nothing at all but thyme and the sea. There is a lighthouse at the end, and the good sense to turn back before dark."],
    g=["akamas","travel","nature"]),
  el=dict(t="Δύο μέρες στον Ακάμα, όπως του αξίζει",
    e="Η τελευταία άγρια χερσόνησος του νησιού, στον ρυθμό που της αρμόζει.",
    s="Ένα αργό δρομολόγιο για τον Ακάμα: θαλάσσιες σπηλιές την αυγή, ένα μακρύ γεύμα, κι ένας δρόμος που τελειώνει στο φως.",
    b=["Οι περισσότεροι βλέπουν τον Ακάμα από το πίσω κάθισμα ενός τζιπ, μέσα σε σύννεφο σκόνης και σε μία ώρα. Είναι λάθος. Η χερσόνησος ανταμείβει τους αργούς, όσους φτάνουν με βάρκα με το πρώτο φως και αφήνουν τις θαλασσοσπηλιές να γεμίσουν χρώμα πριν ξυπνήσει κανείς άλλος.",
       "Το απόγευμα ο δρόμος στενεύει σε μονοπάτι, το μονοπάτι σε ατραπό, κι η ατραπός σε τίποτα παρά θυμάρι και θάλασσα. Στο τέλος υπάρχει ένας φάρος, και η σύνεση να γυρίσεις πριν σκοτεινιάσει."],
    g=["ακάμας","ταξίδι","φύση"]),
  ro=dict(t="Două zile în Akamas, făcute cum trebuie",
    e="Ultima peninsulă sălbatică a insulei, în ritmul pe care îl merită.",
    s="Un itinerar lent pentru Akamas: peșteri marine în zori, un prânz lung și un drum care se termină în lumină.",
    b=["Cei mai mulți văd Akamas de pe bancheta din spate a unui jeep, într-un nor de praf și într-o oră. Este o greșeală. Peninsula răsplătește pe cei fără grabă, cei care sosesc cu barca în prima lumină și lasă peșterile marine să se umple de culoare înainte să se trezească altcineva.",
       "După-amiaza drumul se îngustează într-o cărare, cărarea într-o potecă, iar poteca în nimic altceva decât cimbrișor și mare. La capăt este un far și înțelepciunea de a te întoarce înainte de căderea nopții."],
    g=["akamas","călătorie","natură"]),
  ar=dict(t="يومان في أكاماس، كما ينبغي",
    e="آخر شبه جزيرة برّية في الجزيرة، على الإيقاع الذي تستحقه.",
    s="برنامج متمهّل لأكاماس: كهوف بحرية عند الفجر، وغداء طويل، وطريق ينتهي عند النور.",
    b=["يرى معظم الزوّار أكاماس من المقعد الخلفي لسيارة دفع رباعي، في غيمة غبار وخلال ساعة. هذا خطأ. تكافئ شبه الجزيرة المتمهّلين، أولئك الذين يصلون بالقارب مع أول ضوء ويتركون الكهوف البحرية تمتلئ باللون قبل أن يستيقظ أحد.",
       "بحلول العصر يضيق الطريق إلى درب، والدرب إلى ممرّ، والممرّ إلى لا شيء سوى الزعتر والبحر. في النهاية منارة، وحكمةُ العودة قبل حلول الظلام."],
    g=["أكاماس","سفر","طبيعة"])))

A.append(dict(slug="republic-economic-turn", category="cyprus", editor="cyprus-desk", county="nicosia", breaking=False,
  image=img("1519677100203-a0e668c92439"),
  en=dict(t="The Republic's quiet economic turn",
    e="Growth is back, and this time the government wants it to last.",
    s="After a decade of recovery, Cyprus is trying to trade quick wins for durable ones.",
    b=["The headline numbers are good, and the ministers know better than to say so too loudly. Cyprus has learned that a boom announced is a boom already spent. The turn this time is toward the unglamorous work of institutions, courts, energy, the grid.",
       "Whether the discipline holds is the open question. The island has grown before and forgotten why. This time, at least, the conversation is about the next decade rather than the next quarter."],
    g=["cyprus","economy","politics"]),
  el=dict(t="Η σιωπηλή οικονομική στροφή της Δημοκρατίας",
    e="Η ανάπτυξη επέστρεψε, και αυτή τη φορά η κυβέρνηση τη θέλει να κρατήσει.",
    s="Μετά από μια δεκαετία ανάκαμψης, η Κύπρος προσπαθεί να ανταλλάξει τα γρήγορα κέρδη με τα διαρκή.",
    b=["Οι αριθμοί είναι καλοί, και οι υπουργοί ξέρουν να μην το λένε πολύ δυνατά. Η Κύπρος έμαθε ότι μια άνθηση που ανακοινώνεται είναι ήδη ξοδεμένη. Η στροφή τώρα είναι προς τη μη εντυπωσιακή δουλειά των θεσμών: δικαιοσύνη, ενέργεια, δίκτυο.",
       "Το αν θα κρατήσει η πειθαρχία είναι το ανοιχτό ερώτημα. Το νησί έχει αναπτυχθεί ξανά και έχει ξεχάσει το γιατί. Αυτή τη φορά, τουλάχιστον, η συζήτηση αφορά την επόμενη δεκαετία κι όχι το επόμενο τρίμηνο."],
    g=["κύπρος","οικονομία","πολιτική"]),
  ro=dict(t="Cotitura economică tăcută a Republicii",
    e="Creșterea a revenit, iar de data aceasta guvernul o vrea durabilă.",
    s="După un deceniu de redresare, Ciprul încearcă să schimbe câștigurile rapide cu unele durabile.",
    b=["Cifrele principale sunt bune, iar miniștrii știu să nu o spună prea tare. Ciprul a învățat că un avânt anunțat este deja cheltuit. Cotitura de acum este spre munca lipsită de strălucire a instituțiilor: justiție, energie, rețea.",
       "Dacă disciplina rezistă este întrebarea deschisă. Insula a mai crescut și a uitat de ce. De data aceasta, cel puțin, discuția este despre deceniul următor, nu despre trimestrul următor."],
    g=["cipru","economie","politică"]),
  ar=dict(t="التحوّل الاقتصادي الهادئ للجمهورية",
    e="عاد النمو، وهذه المرّة تريده الحكومة أن يدوم.",
    s="بعد عقد من التعافي، تحاول قبرص استبدال المكاسب السريعة بأخرى دائمة.",
    b=["الأرقام الرئيسية جيدة، ويعرف الوزراء ألا يقولوا ذلك بصوت عالٍ. تعلّمت قبرص أن ازدهارًا يُعلَن هو ازدهار أُنفق سلفًا. التحوّل هذه المرة نحو العمل غير البرّاق للمؤسسات: القضاء والطاقة والشبكة.",
       "وهل تصمد هذه الانضباطية؟ هذا هو السؤال المفتوح. نمت الجزيرة من قبل ونسيت السبب. لكن هذه المرة، على الأقل، الحديث عن العقد المقبل لا عن الربع المقبل."],
    g=["قبرص","اقتصاد","سياسة"])))

A.append(dict(slug="commandaria-oldest-wine", category="table", editor="table-desk", county="limassol", breaking=False,
  image=img("1510812431401-41d2bd2722f3"),
  en=dict(t="Commandaria, the oldest named wine, finds a new table",
    e="A sweet wine older than most countries is being poured by a younger crowd.",
    s="On the slopes above Limassol, a new generation is coaxing Commandaria out of the dessert course.",
    b=["It is, by fair claim, the oldest named wine still made: pressed on these slopes when the knights held the island, sweet and amber and freighted with history. For decades it was a wine you were given, not one you chose.",
       "That is changing. A handful of young winemakers are drying the grapes a little less, ageing a little longer, and pouring it against cheese and slow-cooked lamb rather than only cake. The past, it turns out, takes well to a new glass."],
    g=["wine","gastronomy","commandaria"]),
  el=dict(t="Η Κουμανδαρία, το αρχαιότερο επώνυμο κρασί, βρίσκει νέο τραπέζι",
    e="Ένα γλυκό κρασί αρχαιότερο από τις περισσότερες χώρες σερβίρεται από νεότερη παρέα.",
    s="Στις πλαγιές πάνω από τη Λεμεσό, μια νέα γενιά βγάζει την Κουμανδαρία από το επιδόρπιο.",
    b=["Είναι, δικαίως, το αρχαιότερο επώνυμο κρασί που φτιάχνεται ακόμη: πατημένο σε αυτές τις πλαγιές όταν οι ιππότες κρατούσαν το νησί, γλυκό, κεχριμπαρένιο, φορτωμένο ιστορία. Για δεκαετίες ήταν κρασί που σου πρόσφεραν, όχι που διάλεγες.",
       "Αυτό αλλάζει. Λίγοι νέοι οινοποιοί λιάζουν τα σταφύλια λιγότερο, παλαιώνουν περισσότερο, και το σερβίρουν με τυρί και αρνί σιγομαγειρεμένο, όχι μόνο με γλυκό. Το παρελθόν, τελικά, δέχεται καλά ένα νέο ποτήρι."],
    g=["κρασί","γαστρονομία","κουμανδαρία"]),
  ro=dict(t="Commandaria, cel mai vechi vin cu nume, își găsește o masă nouă",
    e="Un vin dulce mai vechi decât majoritatea țărilor este turnat de o generație mai tânără.",
    s="Pe pantele de deasupra orașului Limassol, o nouă generație scoate Commandaria din desert.",
    b=["Este, pe bună dreptate, cel mai vechi vin cu nume încă produs: presat pe aceste pante pe când cavalerii stăpâneau insula, dulce, chihlimbariu, încărcat de istorie. Decenii la rând a fost un vin pe care îl primeai, nu unul pe care îl alegeai.",
       "Asta se schimbă. Câțiva vinificatori tineri usucă strugurii ceva mai puțin, îl învechesc ceva mai mult și îl toarnă lângă brânză și miel gătit încet, nu doar lângă tort. Trecutul, se pare, primește bine un pahar nou."],
    g=["vin","gastronomie","commandaria"]),
  ar=dict(t="الكومانداريا، أقدم نبيذ يحمل اسمًا، يجد مائدة جديدة",
    e="نبيذٌ حلو أقدم من معظم الدول يقدّمه جيلٌ أصغر سنًّا.",
    s="على المنحدرات فوق ليماسول، يُخرج جيلٌ جديد الكومانداريا من طبق الحلوى.",
    b=["هو، بحقّ، أقدم نبيذ يحمل اسمًا لا يزال يُصنع: عُصر على هذه المنحدرات حين كان الفرسان يحكمون الجزيرة، حلوٌ كهرماني مُثقلٌ بالتاريخ. لعقود كان نبيذًا يُقدَّم لك، لا نبيذًا تختاره.",
       "وهذا يتغيّر. حفنة من صنّاع النبيذ الشباب يجفّفون العنب أقلّ قليلًا، ويعتّقونه أطول قليلًا، ويقدّمونه مع الجبن ولحم الضأن المطهوّ ببطء لا مع الكعك وحده. الماضي، كما يتبيّن، يتقبّل كأسًا جديدة."],
    g=["نبيذ","فن الطهي","كومانداريا"])))

A.append(dict(slug="paphos-townhouse-restored", category="property", editor="property-desk", county="paphos", breaking=False,
  image=img("1600585154340-be6161a56a0c"),
  en=dict(t="At home with a restored Paphos townhouse",
    e="Behind a plain stone facade, a careful argument for keeping the old walls.",
    s="A couple's five-year restoration in old Paphos makes the case for patience over demolition.",
    b=["From the lane it gives nothing away: a stone facade, a worn door, a number. Inside, five years of patient work have opened a courtyard to the sky and set new steel beside old limestone without either apologising for the other.",
       "The owners resisted every temptation to flatten and start again. What they kept, the crooked stair, the deep window seats, the smell of the stone after rain, is exactly what no new build can buy."],
    g=["paphos","architecture","interiors"]),
  el=dict(t="Στο σπίτι, ένα αναστηλωμένο αρχοντικό της Πάφου",
    e="Πίσω από μια λιτή πέτρινη πρόσοψη, ένα προσεκτικό επιχείρημα υπέρ των παλιών τοίχων.",
    s="Η πενταετής αναστήλωση ενός ζευγαριού στην παλιά Πάφο υποστηρίζει την υπομονή έναντι της κατεδάφισης.",
    b=["Από το σοκάκι δεν προδίδει τίποτα: πέτρινη πρόσοψη, φθαρμένη πόρτα, ένας αριθμός. Μέσα, πέντε χρόνια υπομονετικής δουλειάς άνοιξαν μια αυλή στον ουρανό κι έβαλαν νέο χάλυβα δίπλα σε παλιό ασβεστόλιθο, χωρίς κανένα να ζητά συγγνώμη από το άλλο.",
       "Οι ιδιοκτήτες αντιστάθηκαν σε κάθε πειρασμό να τα ισοπεδώσουν όλα και να ξεκινήσουν από την αρχή. Αυτό που κράτησαν, τη στραβή σκάλα, τα βαθιά περβάζια, τη μυρωδιά της πέτρας μετά τη βροχή, είναι ακριβώς ό,τι δεν αγοράζει καμία νέα κατασκευή."],
    g=["πάφος","αρχιτεκτονική","εσωτερικά"]),
  ro=dict(t="Acasă, într-o casă restaurată din Paphos",
    e="În spatele unei fațade simple de piatră, un argument atent pentru păstrarea zidurilor vechi.",
    s="Restaurarea de cinci ani a unui cuplu în vechiul Paphos pledează pentru răbdare în locul demolării.",
    b=["Dinspre alee nu trădează nimic: o fațadă de piatră, o ușă tocită, un număr. Înăuntru, cinci ani de muncă răbdătoare au deschis o curte spre cer și au așezat oțel nou lângă calcar vechi, fără ca vreunul să se scuze față de celălalt.",
       "Proprietarii au rezistat oricărei tentații de a rade totul și a lua de la capăt. Ceea ce au păstrat, scara strâmbă, pervazurile adânci, mirosul pietrei după ploaie, este exact ceea ce nicio construcție nouă nu poate cumpăra."],
    g=["paphos","arhitectură","interioare"]),
  ar=dict(t="في البيت، منزلٌ مُرمَّم في بافوس القديمة",
    e="خلف واجهة حجرية بسيطة، حجّةٌ متأنّية للإبقاء على الجدران القديمة.",
    s="ترميمٌ استغرق خمس سنوات لزوجين في بافوس القديمة ينتصر للصبر على الهدم.",
    b=["من الزقاق لا يُفصح عن شيء: واجهة حجرية، وباب مهترئ، ورقم. في الداخل، فتحت خمس سنوات من العمل الصبور فناءً نحو السماء، ووضعت فولاذًا جديدًا إلى جانب حجر جيري قديم، دون أن يعتذر أحدهما للآخر.",
       "قاوم المالكان كل إغراء بالهدم والبدء من جديد. ما أبقياه، الدرج المائل، ومقاعد النوافذ العميقة، ورائحة الحجر بعد المطر، هو تحديدًا ما لا يشتريه أي بناء جديد."],
    g=["بافوس","عمارة","تصميم داخلي"])))

A.append(dict(slug="aphrodite-myth-retold", category="culture", editor="culture-desk", county="paphos", breaking=False,
  image=img("1518998053901-5348d3961a04"),
  en=dict(t="The Aphrodite myth, retold for a sceptical age",
    e="The goddess was born from this sea. A new show asks what we still want from her.",
    s="A contemporary exhibition in Paphos reclaims Aphrodite from the postcard and the package tour.",
    b=["She has been reduced to a rock and a rite, a place where couples pose and buses idle. The new show in Paphos wants her back, not as a tourist stop but as an idea: desire, and the trouble it causes, made local.",
       "The artists are unsentimental. There is beauty in the rooms, but also unease, the sense that a myth this old is not decoration but a mirror. You leave less sure of the postcard, and more interested in the sea it was taken from."],
    g=["paphos","art","mythology"]),
  el=dict(t="Ο μύθος της Αφροδίτης, ξαναειπωμένος για μια εποχή σκεπτικισμού",
    e="Η θεά γεννήθηκε από αυτή τη θάλασσα. Μια νέα έκθεση ρωτά τι θέλουμε ακόμη από εκείνη.",
    s="Μια σύγχρονη έκθεση στην Πάφο διεκδικεί την Αφροδίτη πίσω από την καρτ ποστάλ και το οργανωμένο ταξίδι.",
    b=["Έχει καταντήσει ένας βράχος κι ένα έθιμο, ένα μέρος όπου ποζάρουν ζευγάρια και περιμένουν τα λεωφορεία. Η νέα έκθεση στην Πάφο τη θέλει πίσω, όχι ως τουριστική στάση αλλά ως ιδέα: την επιθυμία, και τον μπελά που φέρνει, ντόπια.",
       "Οι καλλιτέχνες δεν είναι συναισθηματικοί. Υπάρχει ομορφιά στις αίθουσες, μα και μια ανησυχία, η αίσθηση ότι ένας τόσο παλιός μύθος δεν είναι διακόσμηση αλλά καθρέφτης. Φεύγεις λιγότερο σίγουρος για την καρτ ποστάλ και πιο περίεργος για τη θάλασσα από όπου τραβήχτηκε."],
    g=["πάφος","τέχνη","μυθολογία"]),
  ro=dict(t="Mitul Afroditei, repovestit pentru o epocă sceptică",
    e="Zeița s-a născut din această mare. O nouă expoziție întreabă ce mai vrem de la ea.",
    s="O expoziție contemporană din Paphos o recuperează pe Afrodita din cartea poștală și din circuitul turistic.",
    b=["A fost redusă la o stâncă și un ritual, un loc unde cuplurile pozează și autocarele așteaptă. Noua expoziție din Paphos o vrea înapoi, nu ca oprire turistică, ci ca idee: dorința și necazul pe care îl aduce, făcute locale.",
       "Artiștii nu sunt sentimentali. Există frumusețe în săli, dar și neliniște, senzația că un mit atât de vechi nu este decor, ci oglindă. Pleci mai puțin sigur de cartea poștală și mai interesat de marea din care a fost făcută."],
    g=["paphos","artă","mitologie"]),
  ar=dict(t="أسطورة أفروديت، تُروى من جديد لعصرٍ متشكّك",
    e="وُلدت الإلهة من هذا البحر. معرضٌ جديد يسأل ماذا نريد منها بعد.",
    s="معرضٌ معاصر في بافوس يستعيد أفروديت من البطاقة البريدية والرحلة المنظّمة.",
    b=["اختُزلت إلى صخرة وطقس، ومكانٍ يتصوّر فيه العشّاق وتنتظر الحافلات. المعرض الجديد في بافوس يريدها أن تعود، لا محطةً سياحية بل فكرة: الرغبة، وما تجرّه من متاعب، بنكهةٍ محلية.",
       "الفنانون بلا عاطفية زائدة. في القاعات جمال، لكن أيضًا قلق، وإحساسٌ بأن أسطورة بهذا القِدم ليست زينة بل مرآة. تغادر أقلّ يقينًا بالبطاقة البريدية، وأكثر فضولًا حيال البحر الذي التُقطت منه."],
    g=["بافوس","فن","أساطير"])))

A.append(dict(slug="ayia-napa-out-of-season", category="cyprus", editor="cyprus-desk", county="famagusta", breaking=False,
  image=img("1509233725247-49e657c54213"),
  en=dict(t="Ayia Napa, out of season",
    e="When the clubs close, another town steps forward.",
    s="Beyond the summer reputation, off-season Ayia Napa reveals a quieter, older character.",
    b=["The reputation arrives before you do: neon, noise, the long summer of the young. But come in November and the same streets belong to fishermen and grandmothers, to a monastery courtyard and a sea the colour of glass.",
       "There is a case, quietly gaining supporters, that this is the real town, and the summer merely its loud cousin. The restaurants that stay open know it. So, increasingly, do the visitors who plan around the crowds rather than with them."],
    g=["famagusta","travel","cyprus"]),
  el=dict(t="Αγία Νάπα, εκτός σεζόν",
    e="Όταν κλείνουν τα κλαμπ, εμφανίζεται μια άλλη πόλη.",
    s="Πέρα από τη φήμη του καλοκαιριού, η Αγία Νάπα εκτός σεζόν αποκαλύπτει έναν πιο ήσυχο, παλιό χαρακτήρα.",
    b=["Η φήμη φτάνει πριν από σένα: νέον, φασαρία, το μακρύ καλοκαίρι των νέων. Έλα όμως τον Νοέμβριο και οι ίδιοι δρόμοι ανήκουν σε ψαράδες και γιαγιάδες, σε μια αυλή μοναστηριού και σε μια θάλασσα στο χρώμα του γυαλιού.",
       "Υπάρχει μια άποψη, που κερδίζει σιωπηλά υποστηρικτές, ότι αυτή είναι η αληθινή πόλη και το καλοκαίρι απλώς ο θορυβώδης ξάδερφός της. Τα εστιατόρια που μένουν ανοιχτά το ξέρουν. Το ίδιο, όλο και περισσότερο, κι οι επισκέπτες που σχεδιάζουν γύρω από το πλήθος κι όχι μαζί του."],
    g=["αμμόχωστος","ταξίδι","κύπρος"]),
  ro=dict(t="Ayia Napa, în afara sezonului",
    e="Când se închid cluburile, apare un alt oraș.",
    s="Dincolo de reputația verii, Ayia Napa în extrasezon dezvăluie un caracter mai liniștit și mai vechi.",
    b=["Reputația ajunge înaintea ta: neon, zgomot, vara lungă a tinerilor. Dar vino în noiembrie și aceleași străzi aparțin pescarilor și bunicilor, unei curți de mănăstire și unei mări de culoarea sticlei.",
       "Există o părere, care câștigă discret adepți, că acesta este orașul adevărat, iar vara doar vărul lui gălăgios. Restaurantele care rămân deschise o știu. La fel, tot mai mult, și vizitatorii care își fac planuri în jurul mulțimii, nu împreună cu ea."],
    g=["famagusta","călătorie","cipru"]),
  ar=dict(t="آيا نابا، خارج الموسم",
    e="حين تُغلق النوادي، تتقدّم مدينةٌ أخرى.",
    s="خلف سمعة الصيف، تكشف آيا نابا خارج الموسم عن طابعٍ أهدأ وأعرق.",
    b=["تسبقك السمعة: النيون، والضجيج، وصيف الشباب الطويل. لكن تعالَ في نوفمبر، وستجد الشوارع نفسها لصيّادي السمك والجدّات، ولفناء ديرٍ، ولبحرٍ بلون الزجاج.",
       "ثمة رأيٌ يكسب مؤيّدين بهدوء: أن هذه هي المدينة الحقيقية، وأن الصيف مجرّد ابن عمّها الصاخب. المطاعم التي تبقى مفتوحة تعرف ذلك، وكذلك، بازدياد، الزوّار الذين يخطّطون حول الزحام لا معه."],
    g=["فاماغوستا","سفر","قبرص"])))

A.append(dict(slug="shipping-new-flag", category="business", editor="business-desk", county="limassol", breaking=False,
  image=img("1494412574643-ff11b0a5c1c3"),
  en=dict(t="Shipping's new flag flies from Limassol",
    e="A quiet maritime capital is getting louder, and greener.",
    s="Cyprus's shipping cluster is betting that cleaner fuel and smarter software keep the fleet in port.",
    b=["The island has long punched above its weight at sea: one of the largest ship-management centres in Europe runs from a few streets in Limassol. The question now is not size but direction, and the direction is decarbonisation.",
       "The firms that move first, on fuel, on data, on the unglamorous business of retrofitting old hulls, expect to keep the flag flying here for another generation. The ones that wait may find the sea has moved on without them."],
    g=["shipping","business","limassol"]),
  el=dict(t="Η νέα σημαία της ναυτιλίας κυματίζει από τη Λεμεσό",
    e="Μια ήσυχη ναυτιλιακή πρωτεύουσα δυναμώνει, και γίνεται πιο πράσινη.",
    s="Το ναυτιλιακό σύμπλεγμα της Κύπρου ποντάρει ότι καθαρότερα καύσιμα και εξυπνότερο λογισμικό θα κρατήσουν τον στόλο στο λιμάνι.",
    b=["Το νησί από καιρό ξεπερνά το μέγεθός του στη θάλασσα: ένα από τα μεγαλύτερα κέντρα διαχείρισης πλοίων στην Ευρώπη λειτουργεί από λίγους δρόμους της Λεμεσού. Το ερώτημα τώρα δεν είναι το μέγεθος αλλά η κατεύθυνση, κι η κατεύθυνση είναι η απανθρακοποίηση.",
       "Οι εταιρείες που κινούνται πρώτες, στα καύσιμα, στα δεδομένα, στη μη εντυπωσιακή δουλειά της μετασκευής παλιών σκαριών, προσδοκούν να κρατήσουν τη σημαία εδώ για μια ακόμη γενιά. Όσες περιμένουν ίσως βρουν ότι η θάλασσα προχώρησε χωρίς αυτές."],
    g=["ναυτιλία","οικονομία","λεμεσός"]),
  ro=dict(t="Noul pavilion al transportului maritim flutură din Limassol",
    e="O capitală maritimă discretă devine mai puternică și mai verde.",
    s="Clusterul maritim al Ciprului pariază că un combustibil mai curat și un software mai inteligent țin flota în port.",
    b=["Insula lovește de mult peste greutatea ei pe mare: unul dintre cele mai mari centre de management naval din Europa funcționează de pe câteva străzi din Limassol. Întrebarea acum nu este mărimea, ci direcția, iar direcția este decarbonizarea.",
       "Firmele care se mișcă primele, la combustibil, la date, la munca lipsită de strălucire de a moderniza coci vechi, se așteaptă să mențină pavilionul aici încă o generație. Cele care așteaptă ar putea descoperi că marea a mers mai departe fără ele."],
    g=["maritim","afaceri","limassol"]),
  ar=dict(t="راية الشحن الجديدة ترفرف من ليماسول",
    e="عاصمةٌ بحرية هادئة ترتفع نبرتها، وتزداد اخضرارًا.",
    s="يراهن التجمّع البحري في قبرص على أن الوقود الأنظف والبرمجيات الأذكى تُبقي الأسطول في الميناء.",
    b=["طالما تجاوزت الجزيرة حجمها في البحر: يُدار أحد أكبر مراكز إدارة السفن في أوروبا من بضعة شوارع في ليماسول. السؤال الآن ليس الحجم بل الاتجاه، والاتجاه هو خفض الكربون.",
       "الشركات التي تتحرّك أولًا، في الوقود، وفي البيانات، وفي العمل غير البرّاق لتحديث الأبدان القديمة، تتوقّع أن تُبقي الراية هنا جيلًا آخر. أما من ينتظر فقد يجد أن البحر مضى من دونه."],
    g=["شحن","أعمال","ليماسول"])))

A.append(dict(slug="new-architecture-cypriot-coast", category="property", editor="property-desk", county="limassol", breaking=False,
  image=img("1613490493576-7fde63acd811"),
  en=dict(t="The new architecture of the Cypriot coast",
    e="Less marble, more shade. The island's best new houses are learning from the old ones.",
    s="A generation of architects is trading the show-home villa for something cooler, in every sense.",
    b=["For a while the coast filled with white boxes and blue pools, houses built for the photograph rather than the climate. The best new work is quieter: deep eaves, thick walls, courtyards that move air the way a village house always did.",
       "The lesson, it seems, was here all along. The finest of the new houses look less like a brochure and more like they grew from the hillside, which is exactly the point, and exactly the luxury."],
    g=["architecture","design","coast"]),
  el=dict(t="Η νέα αρχιτεκτονική της κυπριακής ακτής",
    e="Λιγότερο μάρμαρο, περισσότερη σκιά. Τα καλύτερα νέα σπίτια μαθαίνουν από τα παλιά.",
    s="Μια γενιά αρχιτεκτόνων ανταλλάσσει τη βίλα-βιτρίνα με κάτι πιο δροσερό, με κάθε έννοια.",
    b=["Για ένα διάστημα η ακτή γέμισε λευκά κουτιά και μπλε πισίνες, σπίτια φτιαγμένα για τη φωτογραφία κι όχι για το κλίμα. Η καλύτερη νέα δουλειά είναι πιο ήσυχη: βαθιά γείσα, χοντροί τοίχοι, αυλές που κινούν τον αέρα όπως πάντα έκανε ένα χωριάτικο σπίτι.",
       "Το μάθημα, φαίνεται, ήταν εδώ από την αρχή. Τα ωραιότερα από τα νέα σπίτια μοιάζουν λιγότερο με μπροσούρα και περισσότερο σαν να φύτρωσαν από την πλαγιά, που είναι ακριβώς το ζητούμενο, κι ακριβώς η πολυτέλεια."],
    g=["αρχιτεκτονική","σχεδιασμός","ακτή"]),
  ro=dict(t="Noua arhitectură a coastei cipriote",
    e="Mai puțin marmură, mai multă umbră. Cele mai bune case noi învață de la cele vechi.",
    s="O generație de arhitecți schimbă vila-vitrină cu ceva mai răcoros, în toate sensurile.",
    b=["O vreme, coasta s-a umplut de cutii albe și piscine albastre, case construite pentru fotografie, nu pentru climă. Cea mai bună lucrare nouă este mai discretă: streașini adânci, ziduri groase, curți care mișcă aerul așa cum a făcut-o mereu o casă de sat.",
       "Lecția, se pare, a fost aici dintotdeauna. Cele mai frumoase dintre casele noi seamănă mai puțin cu o broșură și mai mult a fi crescut din coasta dealului, ceea ce este exact scopul și exact luxul."],
    g=["arhitectură","design","coastă"]),
  ar=dict(t="العمارة الجديدة للساحل القبرصي",
    e="رخامٌ أقل، وظلٌّ أكثر. أفضل البيوت الجديدة تتعلّم من القديمة.",
    s="جيلٌ من المعماريين يستبدل فيلا الاستعراض بشيءٍ أبرد، بكل المعاني.",
    b=["لبعض الوقت امتلأ الساحل بصناديق بيضاء وبِرَك زرقاء، بيوتٌ بُنيت للصورة لا للمناخ. أما أفضل الأعمال الجديدة فأهدأ: أفاريز عميقة، وجدران سميكة، وأفنية تحرّك الهواء كما فعل بيت القرية دائمًا.",
       "الدرس، كما يبدو، كان هنا طوال الوقت. أجمل البيوت الجديدة تشبه الكرّاسة أقل، وتبدو وكأنها نبتت من سفح التل أكثر، وهذا تحديدًا هو المقصد، وهذا تحديدًا هو الترف."],
    g=["عمارة","تصميم","ساحل"])))

A.append(dict(slug="open-air-opera-season", category="culture", editor="culture-desk", county="limassol", breaking=False,
  image=img("1507924538820-ede94a04019d"),
  en=dict(t="A season of open-air opera",
    e="Under a warm sky and a ruined arch, the island finds its stage.",
    s="From ancient theatres to castle courtyards, Cyprus's summer opera season is quietly world-class.",
    b=["There is a particular magic to an aria sung where the acoustics were designed two thousand years ago. The island's summer season leans on that magic, staging opera in ancient theatres and castle courtyards with the sea for a backdrop.",
       "The programming has grown braver, the singers more serious, the audiences more mixed. What began as a pleasant evening out is becoming a reason to fly in. The stone, it turns out, still knows how to hold a note."],
    g=["music","opera","culture"]),
  el=dict(t="Μια σεζόν υπαίθριας όπερας",
    e="Κάτω από έναν ζεστό ουρανό και μια ερειπωμένη αψίδα, το νησί βρίσκει τη σκηνή του.",
    s="Από αρχαία θέατρα ως αυλές κάστρων, η καλοκαιρινή σεζόν όπερας της Κύπρου είναι σιωπηλά παγκόσμιας κλάσης.",
    b=["Υπάρχει μια ιδιαίτερη μαγεία σε μιαν άρια που τραγουδιέται εκεί όπου η ακουστική σχεδιάστηκε πριν από δύο χιλιάδες χρόνια. Η καλοκαιρινή σεζόν του νησιού στηρίζεται σε αυτή τη μαγεία, ανεβάζοντας όπερα σε αρχαία θέατρα κι αυλές κάστρων, με φόντο τη θάλασσα.",
       "Το πρόγραμμα έγινε πιο τολμηρό, οι τραγουδιστές πιο σοβαροί, το κοινό πιο ανάμεικτο. Αυτό που ξεκίνησε ως μια ευχάριστη βραδιά γίνεται λόγος να πετάξεις ως εδώ. Η πέτρα, τελικά, ξέρει ακόμη να κρατά μια νότα."],
    g=["μουσική","όπερα","πολιτισμός"]),
  ro=dict(t="Un sezon de operă în aer liber",
    e="Sub un cer cald și o arcadă în ruină, insula își găsește scena.",
    s="De la teatre antice la curți de castel, sezonul de operă de vară al Ciprului este discret de clasă mondială.",
    b=["Există o magie aparte într-o arie cântată acolo unde acustica a fost gândită acum două mii de ani. Sezonul de vară al insulei se sprijină pe această magie, punând în scenă operă în teatre antice și curți de castel, cu marea pe fundal.",
       "Programul a devenit mai îndrăzneț, cântăreții mai serioși, publicul mai divers. Ceea ce a început ca o seară plăcută devine un motiv de a veni cu avionul. Piatra, se pare, încă știe să țină o notă."],
    g=["muzică","operă","cultură"]),
  ar=dict(t="موسمٌ من الأوبرا في الهواء الطلق",
    e="تحت سماءٍ دافئة وقوسٍ متهدّم، تجد الجزيرة مسرحها.",
    s="من المسارح القديمة إلى أفنية القلاع، موسم الأوبرا الصيفي في قبرص عالميّ المستوى بهدوء.",
    b=["ثمة سحرٌ خاص في أغنيةٍ تُنشَد حيث صُمّم الصدى قبل ألفَي عام. يتّكئ الموسم الصيفي للجزيرة على هذا السحر، فيقدّم الأوبرا في مسارح قديمة وأفنية قلاع، والبحرُ خلفية.",
       "صار البرنامج أجرأ، والمغنّون أكثر جدّية، والجمهور أكثر تنوّعًا. ما بدأ أمسيةً لطيفة يغدو سببًا لركوب الطائرة. الحجر، كما يتبيّن، لا يزال يعرف كيف يحفظ نغمة."],
    g=["موسيقى","أوبرا","ثقافة"])))

# ── emit SQL ──────────────────────────────────────────────────────────────────
def q(s):  # single string literal
    return "'" + str(s).replace("'", "''") + "'"
def arr(xs):
    return "array[" + ",".join(q(x) for x in xs) + "]::text[]"
def body(paras):
    return "".join(f"<p>{p}</p>" for p in paras)

LANGS = ["en", "el", "ro", "ar"]
out = io.StringIO()
out.write("-- Cyprus Lifestyle — demo content (12 published articles, EN/EL/RO/AR, with photos).\n")
out.write("-- Run in the Supabase SQL Editor AFTER schema_all.sql. Re-runnable (upserts by slug).\n")
out.write("-- Placeholder photos are Unsplash URLs; swap for licensed Cyprus imagery any time.\n\n")

for i, a in enumerate(A):
    cols = []
    vals = []
    def add(c, v):
        cols.append(c); vals.append(v)
    add("slug", q(a["slug"]))
    for L in LANGS:
        d = a[L]
        add(f"title_{L}", q(d["t"]))
        add(f"excerpt_{L}", q(d["e"]))
        add(f"summary_{L}", q(d["s"]))
        add(f"content_{L}", q(body(d["b"])))
        add(f"tags_{L}", arr(d["g"]))
    add("category", q(a["category"]))
    add("county", q(a["county"]))
    add("author_name", "(select coalesce(name_en,slug) from public.authors where slug=%s)" % q(a["editor"]))
    add("author_id", "(select id from public.authors where slug=%s)" % q(a["editor"]))
    add("ai_editor", q(a["editor"].replace("-desk", "")))
    add("cover_image", q(a["image"]))
    add("cover_image_credit", q("Photo: Unsplash"))
    add("status", q("published"))
    add("is_breaking", "true" if a["breaking"] else "false")
    add("reading_time_min", "3")
    add("word_count", str(sum(len(p.split()) for p in a["en"]["b"])))
    add("published_at", "now() - interval '%d hours'" % (i * 6))
    collist = ", ".join(cols)
    vallist = ", ".join(vals)
    out.write(f"insert into public.blog_posts ({collist})\nvalues ({vallist})\n")
    out.write("on conflict (slug) do update set status='published', is_breaking=excluded.is_breaking, "
              "cover_image=excluded.cover_image, published_at=excluded.published_at;\n\n")

os.makedirs("supabase", exist_ok=True)
open("supabase/demo_content.sql", "w", encoding="utf-8").write(out.getvalue())
print("wrote supabase/demo_content.sql:", len(out.getvalue()), "bytes,", len(A), "articles")
