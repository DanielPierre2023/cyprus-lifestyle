// Fixtures for the per-language AI-tell detectors (scripts/tests/antiAi-langs.test.ts).
// Each language has two AI-sounding paragraphs (the cliché-and-connective house style a
// language model falls into) and two human-sounding ones (specific, uneven, reported).
// The human paragraphs are original reportage-style text written for this test; names
// and figures are invented. The AI paragraphs were written to be realistic, not to be
// the weakest possible examples. Written without a native editor: see NATIVE REVIEW in
// lib/antiAiLang.ts. Paragraphs are separated by blank lines, like the quality scan sees them.
import type { Lang } from '@/lib/antiAi';

export interface LangFixtures { ai: string[]; human: string[] }

export const FIXTURES: Record<Lang, LangFixtures> = {
  en: {
    ai: [
      `Nestled in the heart of Limassol, the newly opened marina boasts a vibrant tapestry of dining, shopping and leisure experiences. Whether you're a seasoned sailor or a curious visitor, there is something for everyone to enjoy here. The development plays a crucial role in the city's evolving landscape, serving as a testament to its commitment to excellence. Moreover, the promenade seamlessly blends modern design with Mediterranean charm.

In conclusion, Limassol Marina is not only a destination but also a lifestyle, and it remains a must-visit for anyone exploring Cyprus.`,
      `In today's fast-paced world, buying property in Cyprus is more than just an investment, it's a journey of discovery. The island boasts a rich cultural heritage and a stunning coastline that attracts buyers from across the globe. It is important to note that the market plays a pivotal role in the national economy. Additionally, investors can unlock a plethora of opportunities, from seamless residency programmes to cutting-edge developments.

Ultimately, the future looks bright for those who navigate the landscape with care. Look no further than Paphos for a hidden gem that truly offers it all.`,
    ],
    human: [
      `The harbour at Latchi smells of diesel and grilled octopus by half past eleven. Andreas Charalambous has been fishing here since 1987, and he is not impressed by the new café on the quay, which charges €9 for a frappé. "They came for the sunsets," he says, "and left the boats."

Three of the eleven trawlers that worked this stretch in 2010 are still afloat. The rest were sold or cut up for scrap. He mends a net with a wooden needle that was his father's. It takes him two hours. The mackerel will be gone by October anyway.`,
      `Nicosia's buffer zone is two kilometres from the office where I am typing this. Last Tuesday I walked it. The Ledra Street crossing opened in 2008, and since then the queue at passport control has shrunk from forty minutes to about four.

A shopkeeper on the Turkish Cypriot side sold me a bag of lokum for 3 euros and then, unprompted, told me what he thought of the new customs rules. It was not polite. Nothing about the checkpoint feels permanent now, which is the strange part. People simply cross.`,
    ],
  },
  de: {
    ai: [
      `Im Herzen von Limassol gelegen, bietet die neue Marina eine breite Palette von gastronomischen und kulturellen Erlebnissen. Ob Sie ein erfahrener Segler oder ein neugieriger Besucher sind, hier finden Sie garantiert etwas für jeden Geschmack. Darüber hinaus spielt die Promenade eine entscheidende Rolle für das städtische Leben und ist ein wahres Zeugnis für den Anspruch der Stadt. Zudem verbindet das Viertel nahtlos moderne Architektur mit mediterranem Charme.

Es ist wichtig zu beachten, dass die Marina nicht nur ein Ziel, sondern auch ein Lebensgefühl ist. Zusammenfassend lässt sich sagen, dass Limassol eine verborgene Perle ist, die kein Besucher verpassen sollte.`,
      `In der heutigen schnelllebigen Welt ist der Immobilienkauf auf Zypern mehr als nur eine Investition. Die Insel besticht durch ein atemberaubendes Küstenpanorama, eine einzigartige Kultur und eine vielfältige Gastronomie. Entdecken Sie eine Vielzahl von Möglichkeiten, die von modernen Apartments bis zu malerischen Dorfhäusern reichen. Außerdem spielt das Steuersystem eine wichtige Rolle für ausländische Käufer. Des Weiteren unterstreicht die stabile Nachfrage die Bedeutung des Marktes.

Fazit: Zypern ist ein Paradies für Anleger, die auf der Suche nach einem Fest für die Sinne sind.`,
    ],
    human: [
      `Um halb sechs morgens riecht der Hafen von Latchi nach Diesel und Fisch. Andreas Charalambous flickt ein Netz, mit einer Holznadel, die schon seinem Vater gehörte. Elf Trawler fischten hier noch 2010, drei sind übrig.

Die anderen wurden verkauft oder verschrottet. Das neue Café an der Mole nimmt 9 Euro für einen Frappé, und Andreas findet das nicht komisch. „Die Leute kommen wegen des Sonnenuntergangs“, sagt er, „die Boote sehen sie gar nicht.“ Zwei Stunden braucht er für das Netz. Im Oktober ist die Makrele ohnehin weg.`,
      `Die Grüne Linie in Nikosia ist keine Linie, sondern ein Gewirr aus Sandsäcken, Gassen und rostigen Fässern. Ich bin sie an einem Dienstag im September abgegangen. Seit 2008 ist der Übergang an der Ledra-Straße offen. Früher stand man vierzig Minuten an, heute vier.

Ein Händler auf der türkisch-zyprischen Seite verkaufte mir eine Tüte Lokum für 3 Euro und erzählte, ohne gefragt zu werden, was er von den neuen Zollregeln hält. Höflich war es nicht. Dauerhaft wirkt hier nichts mehr.`,
    ],
  },
  el: {
    ai: [
      `Στην καρδιά της Λεμεσού, η νέα μαρίνα αποτελεί ένα πραγματικό στολίδι που προσφέρει ένα ευρύ φάσμα εμπειριών. Είτε είστε έμπειρος ναυτικός είτε περίεργος επισκέπτης, θα βρείτε κάτι για κάθε γούστο. Επιπλέον, ο περίπατος διαδραματίζει καθοριστικό ρόλο στην αστική ζωή και αποτελεί απόδειξη της φιλοδοξίας της πόλης. Παράλληλα, η περιοχή συνδυάζει αρμονικά τη σύγχρονη αρχιτεκτονική με τη μεσογειακή γοητεία.

Συνολικά, η μαρίνα δεν είναι απλώς ένας προορισμός, αλλά ένας τρόπος ζωής, ένα κρυμμένο διαμάντι που αξίζει να ανακαλύψετε.`,
      `Σε έναν κόσμο που αλλάζει διαρκώς, η αγορά ακινήτου στην Κύπρο αποτελεί κάτι παραπάνω από μια επένδυση. Το νησί διαθέτει μια μαγευτική ακτογραμμή, μια μοναδική κουλτούρα και μια πανδαισία γεύσεων. Ανακαλύψτε μια πληθώρα επιλογών, από σύγχρονα διαμερίσματα έως γραφικά χωριάτικα σπίτια. Επιπροσθέτως, το φορολογικό σύστημα διαδραματίζει σημαντικό ρόλο για τους ξένους αγοραστές και αποτελεί αναμφίβολα ισχυρό κίνητρο.

Εν κατακλείδι, η Κύπρος αποτελεί έναν παράδεισο για επενδυτές που αναζητούν ένα ταξίδι στον χρόνο.`,
    ],
    human: [
      `Στο λιμάνι του Λατσιού μυρίζει πετρέλαιο και ψημένο χταπόδι από τις έντεκα το πρωί. Ο Ανδρέας Χαραλάμπους ψαρεύει εδώ από το 1987 και δεν εντυπωσιάζεται από το καινούργιο καφέ στην προβλήτα, όπου ο φραπές κοστίζει 9 ευρώ. «Ήρθαν για το ηλιοβασίλεμα», λέει, «και ξέχασαν τα καΐκια».

Από τις έντεκα μηχανότρατες που δούλευαν εδώ το 2010 έμειναν τρεις. Τις υπόλοιπες τις πούλησαν ή τις έκαναν σίδερα. Μπαλώνει ένα δίχτυ με τη βελόνα του πατέρα του. Θέλει δύο ώρες. Το σκουμπρί, έτσι κι αλλιώς, θα έχει φύγει τον Οκτώβριο.`,
      `Η νεκρή ζώνη της Λευκωσίας απέχει δύο χιλιόμετρα από το γραφείο όπου γράφω. Την περπάτησα την περασμένη Τρίτη. Το οδόφραγμα της οδού Λήδρας άνοιξε το 2008 και από τότε η ουρά στον έλεγχο διαβατηρίων έπεσε από σαράντα λεπτά σε τέσσερα.

Ένας μαγαζάτορας στο βόρειο τμήμα μου πούλησε μια σακουλίτσα λουκούμι για τρία ευρώ και, χωρίς να τον ρωτήσω, μου είπε τι πιστεύει για τους νέους τελωνειακούς κανόνες. Δεν ήταν ευγενικό. Τίποτα στο οδόφραγμα δεν μοιάζει πια μόνιμο, κι αυτό είναι το περίεργο. Οι άνθρωποι απλώς περνούν.`,
    ],
  },
  pl: {
    ai: [
      `W sercu Limassol znajduje się nowa marina, która oferuje szeroką gamę doznań kulinarnych i kulturalnych. Niezależnie od tego, czy jesteś doświadczonym żeglarzem, czy ciekawskim turystą, znajdziesz tu coś dla siebie. Co więcej, promenada odgrywa kluczową rolę w życiu miasta i stanowi dowód jego ambicji. Ponadto dzielnica harmonijnie łączy nowoczesną architekturę ze śródziemnomorskim urokiem.

Podsumowując, marina to nie tylko miejsce, ale także styl życia, prawdziwa ukryta perła, którą warto odkryć.`,
      `W dzisiejszym szybko zmieniającym się świecie zakup nieruchomości na Cyprze to coś więcej niż inwestycja. Wyspa może poszczycić się malowniczym wybrzeżem, niepowtarzalną kulturą i bogatym dziedzictwem. Odkryj mnóstwo możliwości, od nowoczesnych apartamentów po urokliwe wiejskie domy. Dodatkowo system podatkowy odgrywa istotną rolę dla zagranicznych kupujących. Warto zauważyć, że rynek stale się rozwija.

Reasumując, Cypr to raj dla inwestorów, którzy szukają uczty dla zmysłów.`,
    ],
    human: [
      `Port w Latchi o jedenastej pachnie ropą i grillowaną ośmiornicą. Andreas Charalambous łowi tu od 1987 roku i nie robi na nim wrażenia nowa kawiarnia na nabrzeżu, gdzie frappé kosztuje 9 euro. „Przyjechali dla zachodu słońca”, mówi, „a łodzie zostawili”.

Z jedenastu trawlerów, które pracowały tu w 2010 roku, zostały trzy. Resztę sprzedano albo pocięto na złom. Naprawia sieć drewnianą igłą po ojcu. Zajmie mu to dwie godziny. Makrela i tak zniknie w październiku.`,
      `Strefa buforowa w Nikozji leży dwa kilometry od biura, w którym piszę ten tekst. Przeszedłem ją we wtorek. Przejście na ulicy Ledra otwarto w 2008 roku, a kolejka do kontroli paszportowej skróciła się od tamtej pory z czterdziestu minut do czterech.

Sprzedawca z tureckiej części miasta wsunął mi torebkę lokum za 3 euro i, nie pytany, powiedział, co myśli o nowych przepisach celnych. Grzeczne to nie było. Nic na tym przejściu nie wygląda już na stałe, i to jest w tym najdziwniejsze. Ludzie po prostu przechodzą.`,
    ],
  },
  ro: {
    ai: [
      `În inima orașului Limassol, noua marină oferă o gamă largă de experiențe culinare și culturale. Fie că ești un navigator experimentat sau un vizitator curios, vei găsi aici ceva pentru fiecare. Mai mult, faleza joacă un rol crucial în viața orașului și este o mărturie a ambiției sale. De asemenea, cartierul îmbină armonios arhitectura modernă cu farmecul mediteraneean.

În concluzie, marina nu este doar o destinație, ci și un stil de viață, o comoară ascunsă care merită descoperită.`,
      `Într-o lume în continuă schimbare, achiziția unei proprietăți în Cipru este mai mult decât o investiție. Insula se mândrește cu un litoral pitoresc, o cultură inedită și un patrimoniu bogat. Descoperă o multitudine de opțiuni, de la apartamente moderne la case de sat de neuitat. În plus, sistemul fiscal joacă un rol important pentru cumpărătorii străini. Merită menționat că piața se dezvoltă constant.

Pe scurt, Cipru este un paradis pentru investitori care caută un festin pentru simțuri.`,
    ],
    human: [
      `Portul din Latchi miroase a motorină și a caracatiță la grătar de pe la unsprezece. Andreas Charalambous pescuiește aici din 1987 și nu-l impresionează cafeneaua nouă de pe chei, unde frappé-ul costă 9 euro. „Au venit pentru apus”, spune el, „și au uitat de bărci.”

Din cele unsprezece traulere care lucrau aici în 2010 au rămas trei. Restul au fost vândute sau tăiate la fier vechi. Cârpește o plasă cu acul de lemn al tatălui său. Îi iau două ore. Oricum, macroul pleacă în octombrie.`,
      `Zona tampon din Nicosia e la doi kilometri de biroul în care scriu. Am străbătut-o marți. Punctul de trecere de pe strada Ledra s-a deschis în 2008, iar coada de la controlul pașapoartelor a scăzut de atunci de la patruzeci de minute la patru.

Un negustor din partea turco-cipriotă mi-a vândut o pungă de rahat cu 3 euro și, fără să-l întreb, mi-a spus ce crede despre noile reguli vamale. Nu a fost politicos. Nimic la punctul acela nu mai pare definitiv, și asta e partea ciudată. Oamenii pur și simplu trec.`,
    ],
  },
  ru: {
    ai: [
      `В самом сердце Лимасола расположена новая марина, которая предлагает широкий спектр гастрономических и культурных впечатлений. Независимо от того, являетесь ли вы опытным яхтсменом или любознательным гостем, здесь вы найдёте что-то для каждого. Более того, набережная играет ключевую роль в жизни города и является свидетельством его амбиций. Кроме того, район гармонично сочетает современную архитектуру со средиземноморским шармом.

Подводя итог, марина не просто место, а образ жизни, настоящая скрытая жемчужина, которую стоит открыть.`,
      `В современном быстро меняющемся мире покупка недвижимости на Кипре это больше, чем просто инвестиция. Остров может похвастаться живописным побережьем, уникальной культурой и богатым наследием. Откройте для себя множество возможностей, от современных апартаментов до колоритных деревенских домов. Стоит отметить, что налоговая система играет важную роль для иностранных покупателей. Таким образом, рынок является привлекательным.

В целом, Кипр это рай для инвесторов, которые ищут праздник для чувств.`,
    ],
    human: [
      `В порту Латчи с одиннадцати утра пахнет соляркой и жареным осьминогом. Андреас Харалампус ловит здесь рыбу с 1987 года, и новое кафе на причале его не впечатляет: фраппе там стоит 9 евро. «Приехали ради заката», говорит он, «а лодки не заметили».

Из одиннадцати траулеров, что работали здесь в 2010 году, остались три. Остальные продали или порезали на металл. Он чинит сеть деревянной иглой, которая осталась от отца. На это уйдёт два часа. Скумбрия всё равно уйдёт в октябре.`,
      `Буферная зона в Никосии в двух километрах от офиса, где я пишу этот текст. Во вторник я прошёл её пешком. Переход на улице Ледра открыли в 2008 году, и очередь на паспортном контроле с тех пор сократилась с сорока минут до четырёх.

Торговец с турецко-кипрской стороны продал мне пакетик лукума за 3 евро и, хотя я не спрашивал, рассказал, что думает о новых таможенных правилах. Вежливо это не было. Ничто на этом переходе больше не выглядит постоянным, и это самое странное. Люди просто идут.`,
    ],
  },
  ar: {
    ai: [
      `في قلب مدينة ليماسول، تقدم المارينا الجديدة مجموعة واسعة من التجارب الغذائية والثقافية. سواء كنت بحارا متمرسا أو زائرا فضوليا، ستجد هنا ما يناسب كل الأذواق. علاوة على ذلك، تلعب الواجهة البحرية دورا محوريا في حياة المدينة وتشكل دليلا على طموحها. كما تجمع المنطقة بانسجام تام بين العمارة الحديثة والسحر المتوسطي.

في الختام، ليست المارينا مجرد وجهة بل أسلوب حياة، وهي جوهرة مخفية تستحق الاكتشاف.`,
      `في عالم سريع التغير، يعد شراء عقار في قبرص أكثر من مجرد استثمار. تزخر الجزيرة بسواحل ساحرة وثقافة فريدة وتراث ثقافي غني. اكتشف سحر مجموعة متنوعة من الخيارات، من الشقق الحديثة إلى بيوت القرى الخلابة. من الجدير بالذكر أن النظام الضريبي يلعب دورا مهما للمشترين الأجانب. بالإضافة إلى ذلك، يعتبر السوق جذابا بلا شك.

خلاصة القول، قبرص جنة للمستثمرين الباحثين عن وليمة للحواس.`,
    ],
    human: [
      `تفوح من ميناء لاتشي رائحة السولار والأخطبوط المشوي منذ الحادية عشرة صباحا. يصطاد أندرياس خارالامبوس هنا منذ عام 1987، ولا يعجبه المقهى الجديد على الرصيف، حيث يباع كوب الفرابيه بتسعة يوروهات. يقول: «جاؤوا من أجل الغروب ونسوا القوارب».

من بين أحد عشر مركب صيد كانت تعمل هنا عام 2010، بقيت ثلاثة. بيعت البقية أو قطعت خردة. يرتق شبكة بإبرة خشبية ورثها عن أبيه. سيستغرق ذلك ساعتين. وعلى أي حال سيرحل السكومبري في أكتوبر.`,
      `المنطقة العازلة في نيقوسيا تبعد كيلومترين عن المكتب الذي أكتب منه. مشيتها يوم الثلاثاء. فُتح معبر شارع ليدرا عام 2008، ومنذ ذلك الحين تقلص طابور جوازات السفر من أربعين دقيقة إلى أربع.

باعني تاجر من الجانب القبرصي التركي كيسا من الراحة بثلاثة يوروهات، وحدثني دون أن أسأله عن رأيه في قواعد الجمارك الجديدة. لم يكن مهذبا. لا شيء في المعبر يبدو دائما بعد الآن، وهذا هو الغريب. الناس يعبرون وحسب.`,
    ],
  },
};

// Edge cases that are NOT AI: ordinary human prose that happens to use one stock
// connective or one hype adjective. These must stay at 'low' or better (score <= 15).
export const HUMAN_EDGE: Record<Lang, string> = {
  en: `Paphos airport was never meant to handle this much. Moreover, the car park floods when it rains, and the bus to town runs once an hour. The old terminal, built in 1982 for a million passengers a year, now sees nearly four million. A stunning sunrise over the runway does not help the queue at gate three.`,
  de: `Der Flughafen Paphos war nie für so viele Menschen gedacht. Darüber hinaus läuft der Parkplatz bei Regen voll, und der Bus in die Stadt fährt einmal pro Stunde. Das alte Terminal, 1982 für eine Million Fluggäste gebaut, fertigt heute fast vier Millionen ab. Der atemberaubende Sonnenaufgang über der Piste ändert nichts an der Schlange an Gate drei.`,
  el: `Το αεροδρόμιο της Πάφου δεν σχεδιάστηκε ποτέ για τόσο κόσμο. Επιπλέον, το πάρκινγκ πλημμυρίζει όταν βρέχει και το λεωφορείο για την πόλη περνά μία φορά την ώρα. Το παλιό τερματικό, χτισμένο το 1982 για ένα εκατομμύριο επιβάτες τον χρόνο, εξυπηρετεί σήμερα σχεδόν τέσσερα. Η μαγευτική ανατολή πάνω από τον διάδρομο δεν κόβει την ουρά στην πύλη τρία.`,
  pl: `Lotnisko w Pafos nigdy nie miało obsługiwać tylu ludzi. Ponadto parking zalewa się, gdy pada, a autobus do miasta jeździ raz na godzinę. Stary terminal, zbudowany w 1982 roku na milion pasażerów rocznie, obsługuje dziś prawie cztery miliony. Malowniczy wschód słońca nad pasem nie skróci kolejki przy bramce trzeciej.`,
  ro: `Aeroportul din Paphos n-a fost gândit niciodată pentru atâta lume. În plus, parcarea se inundă când plouă, iar autobuzul spre oraș trece o dată pe oră. Terminalul vechi, construit în 1982 pentru un milion de pasageri pe an, trece acum de patru milioane. Un răsărit pitoresc deasupra pistei nu scurtează coada de la poarta trei.`,
  ru: `Аэропорт Пафоса никогда не рассчитывали на столько людей. Кроме того, парковка заливается, когда идёт дождь, а автобус до города ходит раз в час. Старый терминал, построенный в 1982 году на миллион пассажиров в год, обслуживает теперь почти четыре миллиона. Живописный рассвет над полосой очередь у третьего выхода не сократит.`,
  ar: `لم يصمم مطار بافوس يوما لاستيعاب هذا العدد من الناس. علاوة على ذلك، يفيض موقف السيارات عند المطر، ويمر الحافلة إلى المدينة مرة كل ساعة. المبنى القديم، الذي شيد عام 1982 لمليون مسافر في السنة، يستقبل اليوم قرابة أربعة ملايين. شروق الشمس الساحر فوق المدرج لا يقصر الطابور عند البوابة الثالثة.`,
};
