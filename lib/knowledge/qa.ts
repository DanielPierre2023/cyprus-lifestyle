// lib/knowledge/qa.ts
// ============================================================================
// CYPRUS LIFESTYLE — MASTER KNOWLEDGE & INTENT MAP (the spine)
// ----------------------------------------------------------------------------
// One source of truth for the real questions visitors and residents ask, each
// with a practical, priced answer, the on-site page(s) that carry it, the
// related questions we cross-link, and the vendor category we connect them to.
//
// This single file powers:
//   • the /ask concierge (grounded, answers in the visitor's language)
//   • the practical guide pages (Phase 2, /guide/[slug])
//   • the internal cross-link graph
//   • the future conversational chatbot (retrieval + tools)
//
// Answers are the English SOURCE. The concierge model re-expresses them in the
// visitor's language at answer time, so all 7 languages are covered accurately
// without hand-translating the source. Prices are EUR, 2025–26, from research;
// service prices vary, so our standing advice is always "get two or three quotes".
// Republic of Cyprus (south) only.
// ============================================================================

import { DOING_BUSINESS_DOMAINS } from './doing-business';

export type ResStatus = 'live' | 'plan';

export interface QAResource {
  label: string;
  path: string;
  status: ResStatus; // 'live' = deployed route today; 'plan' = guide page to build (Phase 2)
}

export interface QAItem {
  id: string;         // stable slug — also the future guide-page slug
  q: string;          // the real question / intent
  a: string;          // practical answer + advice + prices (plain text, English source)
  resources: QAResource[];
  links: string[];    // ids of related intents (the cross-link graph)
  connect: string[];  // vendor categories we route the person to (the connector)
  source?: string;    // optional external authority URL (e.g. an official government page) for citation / fact-check
}

export interface QADomain {
  id: string;
  group: string;      // taxonomy group key this domain maps to
  num: string;
  title: string;
  tag: string;
  blurb: string;
  color: string;      // CSS var name used on the map/guide pages
  intents: QAItem[];
}

const BASE_QA_DOMAINS: QADomain[] = [
  {
    id: 'plan', group: 'mobility', num: '01', title: 'Plan & Arrive', tag: 'Plan', color: '--d1',
    blurb: 'The first questions of any trip — when to come, where to base, and how to move around.',
    intents: [
      { id: 'when-to-visit',
        q: 'When should I visit Cyprus, and can I swim in a given month?',
        a: 'Cyprus is warm, dry and swimmable roughly May to mid-November; the sea peaks in August–September at about 27°C. May, June, October and early November are gloriously swimmable with lighter crowds and lower prices. Winter is mild and green — made for villages and hiking rather than the beach, and evenings cool quickly from October, so pack a light jacket.',
        resources: [{ label: 'When to visit (climate month by month)', path: '/when-to-visit', status: 'live' }],
        links: ['best-beaches', 'hiking-troodos'], connect: ['Hotels', 'Transfers', 'Tour operators'] },
      { id: 'getting-around',
        q: 'Do I need a car in Cyprus, or can I manage without one?',
        a: 'On the coast you can live on taxis and your feet; for villages, the Troodos mountains and the Akamas you really need a car or a guided tour. Ride-hailing apps that work here are Bolt, CabCY and nTaxi (Uber and Yandex do not operate in Cyprus). Intercity buses are cheap (about €1.50 in town, €7 day pass) but sparse and slow between towns. Driving is on the left.',
        resources: [{ label: 'Getting around & mobility', path: '/directory/g/mobility', status: 'live' }],
        links: ['which-town', 'villages-day-trip'], connect: ['Car hire', 'Taxi', 'Private transfer', 'Car sharing'] },
      { id: 'which-town',
        q: 'Which town or area should I base myself in?',
        a: 'Paphos suits families, expats and a calmer pace with great archaeology; Ayia Napa and Protaras are for beaches and nightlife; Limassol is cosmopolitan, luxury-leaning, with the marina and casino; Larnaca is airport-close, authentic and the best value; Nicosia is the real working capital for culture and shopping.',
        resources: [{ label: 'Browse the directory by district', path: '/directory', status: 'live' }],
        links: ['getting-around', 'buy-property'], connect: ['Hotels', 'Apartments', 'Estate agents'] },
      { id: 'airport-transfer',
        q: 'How do I get from Larnaca or Paphos airport to my resort?',
        a: 'Pre-book a private transfer or use a taxi app. As a rough guide by taxi: Larnaca to Ayia Napa about €55–70, Paphos airport to Paphos hotels about €20–30, Larnaca to Limassol about €70–85. Scheduled shuttles (e.g. Kapnos) are cheaper; always confirm the fare before you set off.',
        resources: [{ label: 'Transfers & taxis', path: '/directory/g/mobility', status: 'live' }],
        links: ['getting-around'], connect: ['Private transfer', 'Taxi', 'Shuttle'] },
      { id: 'daily-budget',
        q: 'How much should I budget per day in Cyprus?',
        a: 'Very roughly, per person and excluding flights and car hire: budget €60–90/day, mid-range €120–180, comfortable €250+. Meze dinners, wine and booked activities are the swing factors — mountain villages and tavernas cost far less than the Limassol marina.',
        resources: [{ label: 'Ask the concierge for a tailored plan', path: '/ask', status: 'live' }],
        links: ['best-restaurants', 'watersports-prices'], connect: ['Restaurants', 'Tours'] },
      { id: 'safe-family',
        q: 'Is Cyprus safe and family-friendly?',
        a: 'Yes — it is one of the safest countries in the EU, English is spoken almost everywhere, and it is built for families with shallow Blue-Flag beaches, waterparks and short drives. The single emergency number is 112.',
        resources: [{ label: 'Ask the concierge', path: '/ask', status: 'live' }],
        links: ['emergencies', 'family-beaches'], connect: ['Clinics', 'Family attractions'] },
    ],
  },
  {
    id: 'sea', group: 'nature', num: '02', title: 'Sea & Nature', tag: 'Sea & Nature', color: '--d2',
    blurb: 'Why most people come — beaches, snorkelling, the Akamas and Troodos.',
    intents: [
      { id: 'best-beaches',
        q: 'What are the best beaches near my town?',
        a: 'Ayia Napa has Nissi and Makronissos; Protaras has Fig Tree Bay and Konnos; Paphos has Coral Bay and wild Lara (turtles); Larnaca has Finikoudes and Mackenzie. Most are Blue Flag with fine sand and gentle entry; sunbeds run about €2.50 each.',
        resources: [{ label: 'Beaches in the directory', path: '/directory/beach', status: 'live' }, { label: 'Best-of beach guides', path: '/best', status: 'live' }],
        links: ['snorkelling', 'family-beaches'], connect: ['Beach bars', 'Watersports concessions'] },
      { id: 'snorkelling',
        q: 'Where can I snorkel in Cyprus?',
        a: 'Green Bay in Protaras is shallow, sheltered and the best for beginners and kids (sunken statues, seahorses). Cape Greco and Konnos have turtles and groupers; the Akamas Blue Lagoon is gin-clear but reached by boat; and MUSAN, the underwater sculpture park off Ayia Napa, is snorkel-friendly at 10 m. Mask and snorkel rent for about €5–10 a day; watch boat traffic and stay inside the swim zone.',
        resources: [{ label: 'Snorkelling guide', path: '/guide/snorkelling', status: 'plan' }, { label: 'Beaches & watersports', path: '/directory/g/nature', status: 'live' }],
        links: ['scuba-diving', 'boat-trips'], connect: ['Dive centres', 'Boat trips', 'Gear rental'] },
      { id: 'hiking-troodos',
        q: 'What are the best hikes and nature trails?',
        a: 'In the Troodos, the Atalante and Artemis loops circle Mt Olympus, with Caledonia Falls and Millomeris waterfalls nearby; on the Akamas, walk the Aphrodite Nature Trail and the dramatic Avakas Gorge. Go in spring or autumn, start early and carry water — summer midday heat is punishing.',
        resources: [{ label: 'Troodos trail guides', path: '/guide/hiking-troodos', status: 'plan' }, { label: 'Nature & the outdoors', path: '/directory/g/nature', status: 'live' }],
        links: ['villages-day-trip', 'birdwatching'], connect: ['Mountain guides', 'Agrotourism stays', 'Jeep safaris'] },
      { id: 'turtles',
        q: 'Where can I see turtles in Cyprus?',
        a: 'Lara Bay on the Akamas is a protected loggerhead and green-turtle nesting beach — visit respectfully, with no lights and no driving on the sand at night. You can also spot them snorkelling at Cape Greco. Nesting season runs roughly June to September.',
        resources: [{ label: 'Akamas & nature guide', path: '/guide/akamas', status: 'plan' }, { label: 'Nature & the outdoors', path: '/directory/g/nature', status: 'live' }],
        links: ['hiking-troodos', 'quad-jeep-safari'], connect: ['Eco tours', 'Jeep safaris'] },
      { id: 'birdwatching',
        q: 'Where and when can I go birdwatching?',
        a: 'Cyprus sits on a major migration flyway. The best sites are the Akamas, the Akrotiri salt lake and wetlands (flamingos in winter), and Cape Greco. Peak passage is spring (March–May) and autumn (September–October), when specialist guided tours run.',
        resources: [{ label: 'Birdwatching calendar', path: '/guide/birdwatching', status: 'plan' }, { label: 'Nature & the outdoors', path: '/directory/g/nature', status: 'live' }],
        links: ['hiking-troodos'], connect: ['Birding guides', 'Agrotourism stays'] },
    ],
  },
  {
    id: 'do', group: 'nature', num: '03', title: 'Activities & Experiences', tag: 'Activities', color: '--d3',
    blurb: 'What people book once they arrive — the highest-value connector category.',
    intents: [
      { id: 'scuba-diving',
        q: 'Is the Zenobia wreck worth it, and can a beginner dive it? Where can I try scuba?',
        a: 'The Zenobia off Larnaca is a genuine world-top-five wreck — a 172 m ferry on her side, upper hull at 16–18 m, decks stepping down to 42 m. It is for certified divers only; beginners should do a Discover Scuba session in sheltered Green Bay first (about €75–100, age 10+), then come back Advanced-certified. A two-dive Zenobia trip runs from about €185. Dive with a PADI 5-star centre, carry dive-accident insurance (DAN Europe is the standard, as travel policies often exclude diving), and leave 18–24 hours between your last dive and flying.',
        resources: [{ label: 'Scuba diving guide & dive centres', path: '/guide/scuba-diving', status: 'plan' }, { label: 'Activities & the outdoors', path: '/directory/g/nature', status: 'live' }],
        links: ['snorkelling', 'boat-trips'], connect: ['PADI dive centres', 'Dive insurance'] },
      { id: 'watersports-prices',
        q: 'How much is a banana boat, jet ski or parasailing?',
        a: 'A banana or ringo ride is about €10–15; a jet ski is about €40–50 for 15 minutes or €90 for 30 (18+, no licence on beach hire); parasailing is about €40–60. The best-run set-ups are at Nissi (Ayia Napa) and Konnos (Protaras). Agree price and duration first, and check your travel insurance covers motorised watersports — many exclude jet ski and flyboard.',
        resources: [{ label: 'Watersports operators', path: '/directory/g/nature', status: 'live' }],
        links: ['best-beaches', 'boat-trips'], connect: ['Watersports operators'] },
      { id: 'boat-trips',
        q: 'What is the best Blue Lagoon boat trip and what does it cost?',
        a: 'The Latchi and Paphos cruises to the Akamas Blue Lagoon are the unmissable one: from €15 for a mini-cruise, about €20 for sunset with a BBQ, €29–39 for day trips with hotel pickup, and private charters from €460. Go in the morning for calm water. In Ayia Napa, family pirate cruises are about €45 adult and party catamarans about €60.',
        resources: [{ label: 'Boat trips & cruises guide', path: '/guide/boat-trips', status: 'plan' }, { label: 'Activities & the outdoors', path: '/directory/g/nature', status: 'live' }],
        links: ['snorkelling', 'best-beaches'], connect: ['Cruise operators', 'Boat charters'] },
      { id: 'quad-jeep-safari',
        q: 'Where can I do a quad-bike or jeep safari in the Akamas?',
        a: 'Expect about €77–82 per person for 3–6 hours; combining Lara Bay, Avakas Gorge and the Blue Lagoon in one day is the best-value adventure on the island. Reputable operators score 4.6–4.8 on review sites — book early in your trip.',
        resources: [{ label: 'Adventure operators', path: '/directory/g/nature', status: 'live' }],
        links: ['turtles', 'hiking-troodos'], connect: ['Safari operators'] },
      { id: 'waterparks',
        q: 'Which is the best waterpark and what are the ticket prices?',
        a: 'WaterWorld in Ayia Napa is Greek-mythology themed and one of Europe’s largest at about €49 adult and €32 child; Aphrodite in Paphos is €36 and €20; Fasouri Watermania in Limassol is about €35. The season runs roughly May to October — don’t drive across the island for one.',
        resources: [{ label: 'Family attractions', path: '/directory/g/nature', status: 'live' }],
        links: ['safe-family', 'family-beaches'], connect: ['Waterparks', 'Family attractions'] },
      { id: 'wine-halloumi-day',
        q: 'Can I do a wine tour or halloumi-making day from my resort?',
        a: 'Yes — small-group tours run about €116–139 door-to-door through the Krasochoria wine villages and the Commandaria route, or as a hands-on halloumi and anari day. Book one with hotel pickup so everyone can taste; it is the single most Cypriot soft experience.',
        resources: [{ label: 'Wine & experiences guide', path: '/guide/wine-tours', status: 'plan' }, { label: 'Food & drink directory', path: '/directory/g/food', status: 'live' }],
        links: ['taste-wine', 'villages-day-trip'], connect: ['Wineries', 'Tour operators', 'Cookery schools'] },
      { id: 'paragliding',
        q: 'Where can I go tandem paragliding and how much is it?',
        a: 'It is a smaller scene: tandem flights run near the Episkopi and Kourion cliffs and the Troodos, roughly €90–150 (confirm at booking), with 15–20 minutes of airtime, ages about 12–70 and weight limits. It is entirely weather-dependent, so book early in your stay to keep re-book days, and check your insurance covers tandem paragliding.',
        resources: [{ label: 'Adventure operators', path: '/directory/g/nature', status: 'live' }],
        links: ['quad-jeep-safari'], connect: ['Paragliding operators'] },
      { id: 'golf',
        q: 'Where can I play golf in Cyprus?',
        a: 'The main courses are Aphrodite Hills (PGA National), Elea (Nick Faldo), Minthis and Secret Valley, with green fees of about €60–180 and a buggy usually extra. The best golf season is autumn to spring — play shoulder-season for the rates and the weather.',
        resources: [{ label: 'Luxury & leisure', path: '/luxury', status: 'live' }],
        links: ['which-town'], connect: ['Golf clubs', 'Luxury hotels'] },
      { id: 'nightlife',
        q: 'Where is the best nightlife in Cyprus — the bars, clubs and party areas?',
        a: 'The island splits by mood. Ayia Napa is the party capital — the Square packs the big clubs and bars and peaks June–September, while the harbour is glossier for cocktails; neighbouring Protaras is calmer. Limassol is the year-round, grown-up scene: the old town’s bar quarter, the marina and the coastal strip, with beach clubs in summer. Paphos centres on Bar Street in Kato Paphos, and Nicosia has a genuinely local scene around Ledra and the old town. Reckon on about €6–12 a drink in a bar, more in a club. Tell the concierge your town and the vibe — big night out, cocktails with a view, or where the locals actually go — and we’ll point you to the right area and, where we can, a table.',
        resources: [{ label: 'Ask the concierge', path: '/ask', status: 'live' }],
        links: ['best-beaches', 'which-town', 'fine-dining'], connect: ['Bars', 'Clubs', 'Beach bars'],
        source: 'https://www.visitcyprus.com' },
    ],
  },
  {
    id: 'villages', group: 'culture', num: '04', title: 'Villages, Culture & Faith', tag: 'Villages & Faith', color: '--d4',
    blurb: 'The soul of the island and our biggest differentiator versus generic beach content.',
    intents: [
      { id: 'villages-day-trip',
        q: 'Which Troodos village is best for a day trip from my town?',
        a: 'Omodos is a cobbled wine village with a monastery; Kakopetria has a medieval old town and trout tavernas; Kalopanayiotis has thermal springs and is a UN Best Village; Lofou and Lania are beautifully restored stone villages; Pedoulas is known for cherries; Fikardou is a near-abandoned protected monument. Choose by theme — wine, crafts, hiking or cool-in-summer — and by which town you are driving from.',
        resources: [{ label: 'Villages hub', path: '/guide/villages', status: 'plan' }, { label: 'Directory by district', path: '/directory', status: 'live' }],
        links: ['stay-stone-house', 'mountain-taverna'], connect: ['Agrotourism stays', 'Tavernas', 'Wineries'] },
      { id: 'painted-churches',
        q: 'How do I actually get inside the UNESCO painted churches?',
        a: 'There are ten painted Byzantine churches in the Troodos with world-class 11th–16th-century frescoes. The catch tourists hit is that many are kept locked and opened by a village keyholder — dress modestly, expect no-flash or no-photo rules, and leave a small donation. Plan a self-drive loop through Solea, Marathasa and Pitsilia and ask in the village for the keyholder.',
        resources: [{ label: 'Painted-churches how-to', path: '/guide/painted-churches', status: 'plan' }, { label: 'Culture & heritage', path: '/directory/g/culture', status: 'live' }],
        links: ['villages-day-trip', 'monastery-etiquette'], connect: ['Guides', 'Agrotourism stays'] },
      { id: 'monastery-etiquette',
        q: 'Can women visit Stavrovouni? What is the monastery dress code?',
        a: 'Stavrovouni admits men only (the Athonite rule) and allows no photography. Elsewhere the rule is modest dress — shoulders and knees covered, wraps often provided — plus quiet, no flash, and many monasteries close 12:00–13:00 and in the afternoon. Knowing this in advance saves a wasted drive.',
        resources: [{ label: 'Monasteries & pilgrimage guide', path: '/guide/monasteries', status: 'plan' }, { label: 'Culture & heritage', path: '/directory/g/culture', status: 'live' }],
        links: ['orthodox-liturgy', 'painted-churches'], connect: ['Guides'] },
      { id: 'orthodox-liturgy',
        q: 'Where can Orthodox visitors attend liturgy and go on pilgrimage?',
        a: 'The great pilgrimage sites are Kykkos (the richest monastery, with an icon attributed to St Luke and Makarios’s tomb nearby), Machairas and Stavrovouni (a relic of the True Cross). There is a Russian church of St Nicholas in Limassol and a Romanian Orthodox community in Nicosia — a natural route for our Russian, Romanian and Greek audiences.',
        resources: [{ label: 'Monasteries & pilgrimage guide', path: '/guide/monasteries', status: 'plan' }, { label: 'Culture & heritage', path: '/directory/g/culture', status: 'live' }],
        links: ['monastery-etiquette', 'market-russian', 'market-romanian'], connect: ['Churches', 'Guides', 'Transfers'] },
      { id: 'stay-stone-house',
        q: 'Can I stay in a traditional stone house (agrotourism)?',
        a: 'Yes — the official Cyprus Agrotourism network has 150+ restored stone houses with modern comforts. Budget about €60–150 a night for a standard house, or €150–400+ for boutique places such as Casale Panayiotis in Kalopanayiotis. It is authentic, year-round, and spreads spending into the villages — the portal’s natural commercial core.',
        resources: [{ label: 'Agrotourism directory', path: '/guide/agrotourism', status: 'plan' }, { label: 'Places to stay', path: '/directory/g/stays', status: 'live' }],
        links: ['villages-day-trip', 'renovate-village-house'], connect: ['Agrotourism guesthouses', 'Wineries', 'Tavernas'] },
      { id: 'festivals',
        q: 'What festivals are on during my dates?',
        a: 'The signatures are the Limassol Wine Festival (late September to early October), Kataklysmos (the uniquely Cypriot flood festival, in June), the Agros Rose Festival (May), the Limassol Carnival (February–March) and Orthodox Easter, plus village panigyria all summer. We surface these as a what’s-on calendar by region and interest.',
        resources: [{ label: 'Events & agenda', path: '/agenda', status: 'live' }],
        links: ['orthodox-liturgy', 'taste-wine'], connect: ['Event organisers', 'Wineries'] },
      { id: 'mountain-taverna',
        q: 'Where is the best authentic taverna in the mountains?',
        a: 'Village meze and kleftiko (slow-baked lamb) beat any coastal tourist trap — think Lofou, Kakopetria and Omodos, and Psilo Dendro in Platres for trout. Go where the car park has local plates rather than coaches.',
        resources: [{ label: 'Restaurants in the directory', path: '/directory/restaurant', status: 'live' }],
        links: ['villages-day-trip', 'what-is-meze'], connect: ['Tavernas', 'Meze houses'] },
      { id: 'cypriot-culture',
        q: 'What is Cypriot culture like — the traditions, customs and way of life?',
        a: 'Cypriot culture is Greek-speaking and Greek Orthodox at its core — warm, family-centred and unhurried (‘siga siga’, slowly-slowly). The defining trait is philoxenia, hospitality: expect to be fed generously and made to feel welcome. Daily life runs on coffee — the thick Cyprus coffee in a village kafeneio — and long shared meze meals; name days often matter more than birthdays; and Orthodox Easter is the biggest event of the year, ahead of Christmas. Traditions worth catching are the summer village panigyria (feast-day festivals), Kataklysmos (the uniquely Cypriot Festival of the Flood at Pentecost), and crafts such as Lefkara lace, filigree silver and Kornos pottery. English is very widely spoken, so visitors slot in easily — a little respect for church etiquette and a willingness to sit and eat go a long way.',
        resources: [{ label: 'Villages, culture & faith', path: '/directory/g/culture', status: 'live' }],
        links: ['festivals', 'villages-day-trip', 'painted-churches', 'what-is-meze'], connect: ['Cultural tours', 'Guides'],
        source: 'https://www.visitcyprus.com' },
      { id: 'museums',
        q: 'Which museums are worth visiting in Cyprus?',
        a: 'Nicosia holds the heavyweights: the Cyprus Museum (the island’s great archaeological collection, from Neolithic figurines to Roman statuary), the A.G. Leventis Gallery (European and Cypriot art) and the Leventis Municipal Museum (the city’s own story). Larnaca has the Pierides Museum, one of the oldest private antiquities collections, plus its district archaeological museum; Limassol has an archaeological museum and the medieval-castle museum; and Ayia Napa’s Thalassa museum tells the story of the sea. Most charge only a few euros and close on certain days or public holidays, so check times before you go. Tell the concierge your town and your interest — antiquities, fine art or maritime — and we’ll steer you.',
        resources: [{ label: 'Culture & heritage', path: '/directory/g/culture', status: 'live' }],
        links: ['archaeological-sites', 'painted-churches', 'villages-day-trip'], connect: ['Museums', 'Guides'],
        source: 'https://www.visitcyprus.com' },
      { id: 'archaeological-sites',
        q: 'Which archaeological and ancient sites should I see in Cyprus?',
        a: 'Cyprus has three UNESCO World Heritage sites: the Paphos Archaeological Park (the Roman villa mosaics of the House of Dionysos, with the Tombs of the Kings nearby), the Choirokoitia Neolithic settlement between Larnaca and Limassol (circular stone dwellings from the 7th millennium BC), and the ten Painted Churches of the Troodos. Beyond them, don’t miss Kourion near Limassol — a spectacular Greco-Roman city with a clifftop theatre still used for summer performances — plus ancient Amathus, the Kition ruins in Larnaca and the wider Nea Paphos site. Wear a hat and carry water; sites open early and some close mid-afternoon in summer. A licensed guide brings them alive — tell the concierge which area you’re in and we’ll arrange one.',
        resources: [{ label: 'Culture & heritage', path: '/directory/g/culture', status: 'live' }],
        links: ['museums', 'painted-churches', 'villages-day-trip'], connect: ['Guides', 'Tour operators'],
        source: 'https://whc.unesco.org/en/statesparties/cy' },
      { id: 'theatre-arts',
        q: 'What is the theatre, live performance and arts scene like in Cyprus?',
        a: 'Cyprus has a lively performing-arts calendar. Limassol’s Rialto Theatre and the Pattihio are the main year-round stages for drama, concerts and dance; Nicosia has the national theatre (THOC) and municipal venues; and Paphos has the Markideio. The magic is in summer, when ancient venues come alive: the Paphos Aphrodite Festival stages grand opera against the medieval castle each September, and the clifftop Greco-Roman theatre at Kourion hosts Shakespeare and classical drama under the stars. Much of the spoken theatre is in Greek, but opera, dance, music and the festivals cross any language. Tell the concierge your dates and we’ll surface what’s on — see also our events agenda.',
        resources: [{ label: 'Events & agenda', path: '/agenda', status: 'live' }, { label: 'Culture & heritage', path: '/directory/g/culture', status: 'live' }],
        links: ['festivals', 'museums', 'villages-day-trip'], connect: ['Theatres', 'Event organisers'],
        source: 'https://www.visitcyprus.com' },
    ],
  },
  {
    id: 'food', group: 'food', num: '05', title: 'Food & Drink', tag: 'Food & Drink', color: '--d5',
    blurb: 'Daily-use content and a dense connector category — every restaurant, winery and producer is a potential member.',
    intents: [
      { id: 'what-is-meze',
        q: 'What is meze, and what should I order?',
        a: 'Meze is a long parade of small dishes — you don’t order mains. Expect halloumi, olives, tahini and dips, grilled sheftalia and souvla, kleftiko and fresh fish. Ask for fish-meze or meat-meze, arrive hungry and pace yourself: 15–30 dishes is normal, at about €20–30 a head.',
        resources: [{ label: 'Cypriot food guide', path: '/guide/cypriot-food', status: 'plan' }, { label: 'Restaurants in the directory', path: '/directory/restaurant', status: 'live' }],
        links: ['best-restaurants', 'mountain-taverna'], connect: ['Restaurants', 'Tavernas'] },
      { id: 'best-restaurants',
        q: 'What are the best restaurants near me?',
        a: 'We curate by more than star-rating: fish meze on the coast, meat meze in the hills, and the new-wave Cypriot kitchens of Limassol and Nicosia. Filter the directory by district, price and occasion.',
        resources: [{ label: 'Restaurants in the directory', path: '/directory/restaurant', status: 'live' }, { label: 'Best-of dining guides', path: '/best', status: 'live' }],
        links: ['what-is-meze', 'diets'], connect: ['Restaurants'] },
      { id: 'taste-wine',
        q: 'Where can I taste Cyprus wine?',
        a: 'Head to the Krasochoria (the Limassol wine villages) and the Commandaria route. Boutique names worth the drive include Zambartas, Tsiakkas, Vlassides, Kyperounda, Vouni Panayia and Vasilikon; the signature grapes are Xynisteri (white) and Maratheftiko (red), plus the ancient sweet Commandaria. Tastings run €8–42, full tours €116–139.',
        resources: [{ label: 'Wine guide', path: '/guide/wine-tours', status: 'plan' }, { label: 'Food & drink directory', path: '/directory/g/food', status: 'live' }],
        links: ['wine-halloumi-day', 'villages-day-trip'], connect: ['Wineries', 'Tour operators'] },
      { id: 'diets',
        q: 'Are there vegetarian, halal or kosher options?',
        a: 'Meze is naturally vegetarian-friendly (ask for the vegetarian meze). Halal dining and hotels cluster in Limassol and Nicosia, and kosher provision is growing with the Israeli market. We flag dietary options on listings.',
        resources: [{ label: 'Restaurants in the directory', path: '/directory/restaurant', status: 'live' }],
        links: ['market-israeli', 'market-arab'], connect: ['Restaurants', 'Hotels'] },
      { id: 'fine-dining',
        q: 'Where do I find fine dining or a special-occasion dinner in Cyprus?',
        a: 'Cyprus has a genuine fine-dining scene, strongest in Limassol — the marina, the luxury seafront hotels and a wave of modern Cypriot kitchens — with polished tables in Nicosia and a handful in Paphos and Ayia Napa. Expect refined takes on the island’s own ingredients (fresh sea bass and fish, wild greens, aged halloumi, the sweet Commandaria) alongside strong Mediterranean and international rooms. A tasting menu with wine runs roughly €70–150 a head; in summer, book ahead and ask for a terrace or a sea-view table. Tell the concierge the occasion — an anniversary, a business dinner, a view — and the district, and we’ll match you to a verified restaurant and arrange the booking if you’d like.',
        resources: [{ label: 'Restaurants in the directory', path: '/directory/restaurant', status: 'live' }, { label: 'Best-of dining guides', path: '/best', status: 'live' }],
        links: ['best-restaurants', 'what-is-meze', 'taste-wine'], connect: ['Restaurants', 'Private chefs'],
        source: 'https://www.visitcyprus.com' },
    ],
  },
  {
    id: 'property', group: 'realestate', num: '06', title: 'Property & Home', tag: 'Property & Home', color: '--d6',
    blurb: 'High-value, high-intent, and the gateway to the professional and trade connector categories.',
    intents: [
      { id: 'buy-property',
        q: 'Should I buy property in Cyprus, and what about title deeds?',
        a: 'Use an independent lawyer (not the developer’s) and confirm the title deed is clean and transferable before you pay — historically the number-one pitfall. From 1 January 2026 stamp duty on property is abolished, and a reduced 5% VAT applies to a qualifying first home (capped by size and value). Non-EU buyers need routine Council of Ministers permission.',
        resources: [{ label: 'Buying-property guide', path: '/guide/buying-property', status: 'plan' }, { label: 'Property & real estate', path: '/directory/g/realestate', status: 'live' }],
        links: ['get-residency', 'find-lawyer'], connect: ['Property lawyers', 'Estate agents'] },
      { id: 'build-house',
        q: 'How much does it cost to build a house in Cyprus?',
        a: 'Ballpark €1,200–2,000+ per m² depending on spec and finish, plus land, an architect (about 8–12% of the build), permits and utility connections; allow 12–18 months. Get a fixed-price contract with stage payments tied to milestones.',
        resources: [{ label: 'Building guide', path: '/guide/building-a-house', status: 'plan' }, { label: 'Property & real estate', path: '/directory/g/realestate', status: 'live' }],
        links: ['renovate-village-house', 'solar-panels'], connect: ['Architects', 'Builders', 'Civil engineers'] },
      { id: 'renting',
        q: 'What is typical for a long-term rental?',
        a: 'Rough monthly ranges for a two-bed: Paphos and Larnaca €800–1,300, Limassol €1,300–2,200+, Nicosia €900–1,400 — Limassol is by far the priciest. Expect one month’s deposit, a written contract and to register it. Bazaraki is the main listings site.',
        resources: [{ label: 'Renting guide', path: '/guide/renting', status: 'plan' }, { label: 'Property & real estate', path: '/directory/g/realestate', status: 'live' }],
        links: ['which-town', 'cost-of-living'], connect: ['Estate agents', 'Landlords'] },
      { id: 'furnish',
        q: 'How do I furnish a place — where do I buy furniture and appliances?',
        a: 'IKEA (Nicosia and Limassol, with island-wide delivery), JYSK, Superhome Center and local showrooms cover new; Bazaraki is huge for quality second-hand. Time big buys around the sales and factor in delivery and assembly.',
        resources: [{ label: 'Home & retail directory', path: '/directory/g/retail', status: 'live' }],
        links: ['renting', 'movers'], connect: ['Furniture stores', 'Appliance stores', 'Removals'] },
      { id: 'solar-panels',
        q: 'Should I install solar panels — is it worth it?',
        a: 'Usually yes given the sun, but note the 2026 shift from net-metering to net-billing — you are credited at a wholesale rate for exports — so size the system to what you use by day and consider a battery. Government grants recur, so check the current round, and get two or three installer quotes.',
        resources: [{ label: 'Solar guide', path: '/guide/solar-panels', status: 'plan' }, { label: 'Home services', path: '/directory/g/services', status: 'live' }],
        links: ['build-house', 'ac-service'], connect: ['Solar installers', 'Electricians'] },
      { id: 'pool',
        q: 'How much to build a pool, or to keep one clean?',
        a: 'A built pool runs from roughly €25,000–45,000+. Ongoing maintenance is about €115–145 a month for a standard 8×4 m pool (twice-weekly visits in summer), from about €190 a month for premium villa service, plus €25–40 a month for chemicals. Recovering a neglected green pool starts around €200.',
        resources: [{ label: 'Pool services in the directory', path: '/directory/g/services', status: 'live' }],
        links: ['build-house', 'find-tradesperson'], connect: ['Pool builders', 'Pool maintenance'] },
      { id: 'renovate-village-house',
        q: 'Can I renovate an old village house?',
        a: 'Yes, and it is encouraged — agrotourism restoration grants exist for traditional stone houses in designated villages. Use a builder experienced in heritage work (traditional roofs, stone, lime); it is how a ruin becomes a bookable stay.',
        resources: [{ label: 'Renovation & agrotourism', path: '/guide/agrotourism', status: 'plan' }, { label: 'Property & real estate', path: '/directory/g/realestate', status: 'live' }],
        links: ['stay-stone-house', 'build-house'], connect: ['Heritage builders', 'Architects'] },
    ],
  },
  {
    id: 'services', group: 'services', num: '07', title: 'Everyday Services & How-To', tag: 'Everyday Services', color: '--d7',
    blurb: 'The "find me someone to…" engine — the most repeatable connector value. Prices vary, so our advice is always: get two or three quotes.',
    intents: [
      { id: 'find-tradesperson',
        q: 'How do I find a reliable plumber, electrician or handyman?',
        a: 'Discovery in Cyprus runs through Bazaraki, Anymaster, FIX.CY, local Facebook and expat groups, and word of mouth. Expect a call-out fee plus an hourly rate; always get two or three quotes and ask for photos of past work. Our vetted directory is the trusted alternative to the Facebook scramble.',
        resources: [{ label: 'Home & everyday services', path: '/directory/g/services', status: 'live' }],
        links: ['appliance-repair', 'house-cleaning'], connect: ['Plumbers', 'Electricians', 'Handymen'] },
      { id: 'pool-cleaning',
        q: 'Who cleans my pool, and how much does it cost?',
        a: 'A pool service is about €115–145 a month for a standard pool (twice-weekly in summer, weekly in winter), from about €190 a month for premium villa care, plus €25–40 a month for chemicals. A one-off green-pool recovery starts around €200. Many advertise on Bazaraki’s property-maintenance section — we curate the reliable ones.',
        resources: [{ label: 'Pool services', path: '/directory/g/services', status: 'live' }],
        links: ['pool', 'ac-service'], connect: ['Pool maintenance'] },
      { id: 'appliance-repair',
        q: 'Who can repair my washing machine, fridge or appliance?',
        a: 'Independent repair techs and brand service agents both operate; expect a call-out or diagnostic fee plus parts. For an out-of-warranty machine, compare the quote against a replacement before committing. Find them via Bazaraki, Anymaster and local groups.',
        resources: [{ label: 'Home & everyday services', path: '/directory/g/services', status: 'live' }],
        links: ['find-tradesperson', 'furnish'], connect: ['Appliance repair', 'Electricians'] },
      { id: 'ac-service',
        q: 'Who services or installs my air-conditioning, and what does it cost?',
        a: 'A basic split-unit install is about €150–300 in labour (the unit itself is €400–1,100), with extras for core-drilling and piping. Book an annual service and clean before summer to keep it efficient; running one hard-worked unit costs roughly €40–55 a month.',
        resources: [{ label: 'AC & home services', path: '/directory/g/services', status: 'live' }],
        links: ['solar-panels', 'find-tradesperson'], connect: ['AC installers', 'AC service'] },
      { id: 'house-cleaning',
        q: 'What are house-cleaning rates?',
        a: 'Independent cleaners charge about €7–12 an hour (Paphos at the lower end, Limassol higher); agencies charge €12–18. Most set a 3–4 hour minimum per visit, and ironing, ovens and high windows are usually extra. Find them via Bazaraki, Anymaster and expat groups.',
        resources: [{ label: 'Cleaning services', path: '/directory/g/services', status: 'live' }],
        links: ['find-tradesperson', 'movers'], connect: ['Cleaners', 'Cleaning agencies'] },
      { id: 'pest-control',
        q: 'Who does pest control — mosquitoes, ants, snakes?',
        a: 'Licensed firms handle mosquito fogging, cockroaches, ants and the occasional snake call, typically as a per-treatment fee with seasonal contracts available. Get a quote for your property size; summer mosquito treatment is the common ask.',
        resources: [{ label: 'Home & everyday services', path: '/directory/g/services', status: 'live' }],
        links: ['gardening', 'find-tradesperson'], connect: ['Pest control'] },
      { id: 'movers',
        q: 'Where do I find movers or a man with a van?',
        a: 'Options run from a single man-with-a-van for a few boxes to full home removals with packing. Price depends on distance, volume and floors — get an in-person or video quote. Cross-town moves are cheap; furniture assembly is often an add-on.',
        resources: [{ label: 'Removals in the directory', path: '/directory/g/services', status: 'live' }],
        links: ['furnish', 'house-cleaning'], connect: ['Removals', 'Man-with-a-van'] },
      { id: 'gardening',
        q: 'Who does gardening and landscaping?',
        a: 'You can arrange regular garden maintenance (mowing, irrigation, pruning) on a monthly plan, or one-off landscaping and drought planting. Irrigation know-how matters in the Cyprus summer — ask about smart timers and greywater.',
        resources: [{ label: 'Home & everyday services', path: '/directory/g/services', status: 'live' }],
        links: ['pool', 'pest-control'], connect: ['Gardeners', 'Landscapers'] },
      { id: 'car-mot',
        q: 'How much is a car MOT and how often is it needed?',
        a: 'The MOT (roadworthiness test) is about €35–40, the same island-wide, and is required every two years once a car is four years old (new cars are exempt for four years). Book it before it lapses — driving without a valid MOT means fines.',
        resources: [{ label: 'Auto & mobility directory', path: '/directory/g/mobility', status: 'live' }],
        links: ['getting-around', 'import-pet-car'], connect: ['Garages', 'MOT centres'] },
      { id: 'childcare-eldercare',
        q: 'Where do I find childcare, a nanny or elderly care?',
        a: 'Nurseries, registered childminders and live-in or visiting carers are all available; live-in care is common and often arranged privately or via agencies. Check registration, references and the contract. We build a vetted care directory rather than leaving families to Facebook.',
        resources: [{ label: 'Care & everyday services', path: '/directory/g/services', status: 'live' }],
        links: ['schools', 'english-doctor'], connect: ['Childcare', 'Care agencies'] },
    ],
  },
  {
    id: 'living', group: 'community', num: '08', title: 'Moving & Living', tag: 'Moving & Living', color: '--d8',
    blurb: 'The relocation backbone — residency, tax, healthcare, schools, banking. Where our multilingual markets convert into residents.',
    intents: [
      { id: 'get-residency',
        q: 'How do I get residency in Cyprus (EU vs non-EU)?',
        a: 'EU citizens register for the MEU1 "Yellow Slip" — straightforward. Non-EU routes are Permanent Residency by investment (the "€300,000 route"), Category F (steady overseas income) or the digital-nomad visa. Note the citizenship-by-investment "golden passport" was permanently abolished in 2020 — do not rely on it.',
        resources: [{ label: 'Residency guide', path: '/guide/residency', status: 'plan' }, { label: 'Professional services', path: '/directory/g/professional', status: 'live' }],
        links: ['non-dom', 'buy-property'], connect: ['Immigration lawyers'] },
      { id: 'non-dom',
        q: 'What is non-dom, and why is the tax so low?',
        a: 'The non-dom regime gives 17 years of 0% tax on dividends and interest (only a capped 2.65% health levy) and no tax on most foreign income — an effective rate of about 5% or less for many. It is the single biggest draw for relocating founders and investors; pair it with a Cyprus company for the full picture.',
        resources: [{ label: 'Tax & non-dom guide', path: '/guide/non-dom-tax', status: 'plan' }, { label: 'Professional services', path: '/directory/g/professional', status: 'live' }],
        links: ['form-company', 'get-residency'], connect: ['Tax advisers', 'Accountants'] },
      { id: 'healthcare',
        q: 'Healthcare — GESY or private?',
        a: 'GESY is the national health system (contributions-based, covering residents including many expats). Most people also use private clinics and hospitals for speed and choice; English is universal in private care and Russian-speaking doctors are common in Limassol. We list English- and Russian-speaking practices and their GESY or private status.',
        resources: [{ label: 'Health & medical directory', path: '/directory/g/health', status: 'live' }],
        links: ['english-doctor', 'emergencies'], connect: ['Clinics', 'Hospitals', 'GPs'] },
      { id: 'schools',
        q: 'What are the school options — international, Russian, Romanian?',
        a: 'There are strong English-medium international schools in every city, Russian schools in Limassol (LITC, MORFOSIS), a Romanian school in Paphos, and the Greek state system. Fees and waitlists vary, so apply early — schooling is a decisive factor for relocating families.',
        resources: [{ label: 'Schools guide', path: '/guide/schools', status: 'plan' }, { label: 'Community & services', path: '/directory/g/community', status: 'live' }],
        links: ['market-russian', 'market-romanian'], connect: ['Schools', 'Tutors'] },
      { id: 'banking',
        q: 'Can I open a bank account in Cyprus?',
        a: 'Yes, but expect compliance and KYC (proof of address, source of funds) — it is more involved than before 2018. Local banks (Bank of Cyprus, Hellenic) cover substance; fintechs (Revolut, Wise) cover day-to-day. A local lawyer or accountant smooths a company or non-resident account.',
        resources: [{ label: 'Banking guide', path: '/guide/banking', status: 'plan' }, { label: 'Professional services', path: '/directory/g/professional', status: 'live' }],
        links: ['form-company', 'non-dom'], connect: ['Banks', 'Accountants'] },
      { id: 'cost-of-living',
        q: 'What is the cost of living in Cyprus?',
        a: 'It is below Western-European capitals but rising, and Limassol is markedly pricier than Paphos, Larnaca or Nicosia — rent is the swing factor and utilities spike with summer AC. A couple lives comfortably on far less than in London or Munich, especially inland.',
        resources: [{ label: 'Cost-of-living guide', path: '/guide/cost-of-living', status: 'plan' }, { label: 'Browse the directory', path: '/directory', status: 'live' }],
        links: ['renting', 'which-town'], connect: ['Estate agents'] },
      { id: 'import-pet-car',
        q: 'How do I import my pet or my car?',
        a: 'Pets follow EU pet-passport rules — microchip and rabies vaccination make it straightforward from the EU. Cars can be imported, but budget for registration, roadworthiness and taxes, and remember Cyprus drives on the left (RHD cars fit right in) — it is often simpler to buy locally.',
        resources: [{ label: 'Relocation logistics', path: '/guide/moving-logistics', status: 'plan' }, { label: 'Mobility & auto', path: '/directory/g/mobility', status: 'live' }],
        links: ['getting-around', 'car-mot'], connect: ['Pet relocation', 'Car importers', 'Customs agents'] },
      { id: 'state-of-cyprus',
        q: 'What is the current situation in Cyprus — the economy, safety and general mood, and is it a good time to be here?',
        a: 'Cyprus (the Republic, in the south) is a stable EU and eurozone member and one of the safest countries in the EU — the single emergency number is 112. As of 2026 it is one of the EU’s strongest economies, growing at roughly three times the EU average (about 3% a year), with unemployment near 4% and every major agency rating it investment-grade (S&P and Fitch A-, Moody’s A3, DBRS A). Inflation is moderate but the cost of living is rising, and Limassol is markedly pricier than Paphos, Larnaca or Nicosia. The mood is confident and outward-looking — tourism, shipping, tech and financial services are all strong — and day to day it feels relaxed, welcoming and easy for English-speakers. These are 2026 figures and they move, so for anything decision-critical check the latest from the Central Bank of Cyprus or a current news source.',
        resources: [{ label: 'Ask the concierge', path: '/ask', status: 'live' }],
        links: ['cost-of-living', 'investing-in-cyprus', 'get-residency', 'safe-family'], connect: [],
        source: 'https://cyprus-mail.com/2026/08/26/cyprus-economy-expands-at-three-times-eu-average-as-rating-reviews-loom' },
    ],
  },
  {
    id: 'business', group: 'professional', num: '09', title: 'Business & Money', tag: 'Business & Money', color: '--d9',
    blurb: 'The B2B connector — company formation, professionals, expansion. High fee-value; the vertical businesses most want to be found in.',
    intents: [
      { id: 'form-company',
        q: 'How do I form a company in Cyprus, and what does it cost?',
        a: 'A Cyprus Ltd is the standard vehicle — formation runs roughly €1,000–2,500 through a lawyer or accountant, plus annual accounting and audit. As of 2026 corporate tax is 15% (up from 12.5%) and the €350 annual company levy is abolished. Pair it with the non-dom regime for the headline low effective rate.',
        resources: [{ label: 'Company-formation guide', path: '/guide/company-formation', status: 'plan' }, { label: 'Professional services', path: '/directory/g/professional', status: 'live' }],
        links: ['non-dom', 'find-accountant'], connect: ['Corporate lawyers', 'Accountants', 'Company-service providers'] },
      { id: 'find-accountant',
        q: 'How do I find a good accountant or lawyer, and what are typical fees?',
        a: 'The professional layer is deep and English-speaking. Ask for fixed fees or clear hourly rates up front, references in your sector, and a language match (Russian, Greek, English). We build a vetted professional directory so people stop relying on "who does everyone use?".',
        resources: [{ label: 'Professional directory', path: '/directory/g/professional', status: 'live' }],
        links: ['form-company', 'buy-property'], connect: ['Accountants', 'Lawyers', 'Auditors'] },
      { id: 'expand-business',
        q: 'How do I expand my business or find local partners?',
        a: 'Cyprus punches above its weight in shipping, fintech, IT and services — Limassol has a dense tech scene. The routes in are the chambers of commerce, sector networking and our B2B directory. Connecting suppliers, partners and clients is the platform’s core promise.',
        resources: [{ label: 'Business directory', path: '/directory/g/professional', status: 'live' }, { label: 'Advertise & partner with us', path: '/advertise', status: 'live' }],
        links: ['banking', 'find-accountant'], connect: ['B2B suppliers', 'Consultants', 'Chambers'] },
      { id: 'business-banking',
        q: 'What are the banking and payment options for a business?',
        a: 'Use local banks for substance and EMIs or fintechs (Revolut Business, Wise) for fast multi-currency. Expect thorough onboarding — a clean corporate structure and a local accountant make it far smoother.',
        resources: [{ label: 'Banking guide', path: '/guide/banking', status: 'plan' }, { label: 'Professional services', path: '/directory/g/professional', status: 'live' }],
        links: ['banking', 'form-company'], connect: ['Banks', 'EMIs', 'Accountants'] },
      { id: 'vat-employer',
        q: 'What are the VAT and employer obligations?',
        a: 'VAT is 19% standard, with reduced 9%, 5% and 0% bands for specific goods and services. Employers register for social insurance and GESY and run PAYE; an accountant handles the filings, so factor this into any hiring plan.',
        resources: [{ label: 'Business tax guide', path: '/guide/business-tax', status: 'plan' }, { label: 'Professional services', path: '/directory/g/professional', status: 'live' }],
        links: ['find-accountant', 'non-dom'], connect: ['Accountants', 'Payroll providers'] },
      { id: 'investing-in-cyprus',
        q: 'Is Cyprus a good place to invest, and how do foreigners get started?',
        a: 'Cyprus is a genuine investment hub, not just a holiday island — its strengths are ship management (one of the EU’s largest fleets), financial and professional services, a fast-growing Limassol tech scene, tourism and hospitality, real estate, and energy (offshore gas and solar). Foreigners usually come in one of four ways: buying property (often paired with the €300,000 Permanent Residency route); forming a Cyprus company and pairing it with the non-dom regime; investing through regulated Cyprus funds (AIFs); or direct real-estate development. The tax backdrop is the real draw — corporate tax is 15% from 2026, non-doms pay 0% on dividends and interest (only a capped health levy), plus a 2.5% IP box and 60+ double-tax treaties. Always use an independent Cyprus lawyer and a licensed adviser, do proper due diligence on any project or fund, and note the citizenship-by-investment ‘golden passport’ was abolished in 2020 — investment buys residency, not a passport.',
        resources: [{ label: 'Professional & investment services', path: '/directory/g/professional', status: 'live' }],
        links: ['non-dom', 'form-company', 'buy-property', 'get-residency'], connect: ['Investment advisers', 'Fund administrators', 'Corporate lawyers', 'Estate agents'],
        source: 'https://www.investcyprus.org.cy' },
    ],
  },
  {
    id: 'gifts', group: 'retail', num: '10', title: 'Shopping & Gifts', tag: 'Shopping & Gifts', color: '--d10',
    blurb: 'High-margin, story-rich, and a direct line to artisans and jewellers — the connector at its most premium.',
    intents: [
      { id: 'engagement-ring',
        q: 'Where do I buy an engagement ring — and can I claim the VAT back?',
        a: 'The jewellery districts of Limassol and Nicosia hold the diamond specialists and bench jewellers who make custom 18k settings. Insist on the Assay Office hallmark (750 = 18k, 585 = 14k, 925 silver) and a GIA or IGI certificate for the stone. VAT is 19%, and non-EU visitors can reclaim it at the airport.',
        resources: [{ label: 'Gifts & jewellery guide', path: '/guide/gifts-jewellery', status: 'plan' }, { label: 'Shopping directory', path: '/directory/g/retail', status: 'live' }],
        links: ['authentic-gifts'], connect: ['Jewellers', 'Bespoke goldsmiths'] },
      { id: 'authentic-gifts',
        q: 'What authentic Cypriot gifts should I take home?',
        a: 'The four that say Cyprus and travel well: Geroskipou loukoumi (Cyprus delight), a half-bottle of Commandaria, hallmarked Lefkara filigree silver or lace, and vacuum-packed halloumi. Also zivania, carob products, Kornos pottery and copperware. Buy in the villages from the maker — and check the back of Lefkara lace is as neat as the front.',
        resources: [{ label: 'Authentic gifts guide', path: '/guide/authentic-gifts', status: 'plan' }, { label: 'Shopping directory', path: '/directory/g/retail', status: 'live' }],
        links: ['engagement-ring', 'villages-day-trip'], connect: ['Artisans', 'Village shops', 'Wineries'] },
      { id: 'where-to-shop',
        q: 'Where do I buy furniture, electronics or groceries?',
        a: 'Malls and big-box stores ring every city (Nicosia and Limassol have the largest); Bazaraki dominates second-hand for everything from sofas to cars. For gourmet Cypriot hampers, local delis and producers ship island-wide.',
        resources: [{ label: 'Shopping directory', path: '/directory/g/retail', status: 'live' }],
        links: ['furnish'], connect: ['Retailers', 'Malls', 'Delis'] },
      { id: 'flowers-gifts',
        q: 'How do I send flowers or a gift?',
        a: 'Use a Cyprus florist directly for same-day city delivery (bouquets about €25–60) rather than a global middleman that just re-brokers the order. Gourmet hampers run about €30–100.',
        resources: [{ label: 'Shopping directory', path: '/directory/g/retail', status: 'live' }],
        links: ['authentic-gifts'], connect: ['Florists', 'Gift shops'] },
      { id: 'fashion-shopping',
        q: 'Where is the best fashion shopping and the designer boutiques in Cyprus?',
        a: 'For designer fashion, Nicosia’s Stasikratous Street is the island’s luxury row — international labels and Cypriot designers side by side — with more along Makariou Avenue. Limassol is the other fashion hub, with boutiques around the marina and the big malls; every city has a modern mall for high-street brands (the Nicosia Mall and Mall of Cyprus, MyMall Limassol, Kings Avenue in Paphos). Non-EU visitors can reclaim VAT on qualifying purchases at the airport. For something local, look for Cypriot designers and handmade Lefkara lace and filigree silver. Tell the concierge your style and budget and we’ll point you to the right street or boutique.',
        resources: [{ label: 'Shopping directory', path: '/directory/g/retail', status: 'live' }],
        links: ['engagement-ring', 'authentic-gifts', 'where-to-shop'], connect: ['Boutiques', 'Designer stores', 'Malls'],
        source: 'https://www.visitcyprus.com' },
    ],
  },
  {
    id: 'health', group: 'health', num: '11', title: 'Health & Family', tag: 'Health & Family', color: '--d11',
    blurb: 'Trust-critical, high-anxiety questions. Getting these right builds the credibility the whole portal trades on.',
    intents: [
      { id: 'emergencies',
        q: 'What is the emergency number, and where is the nearest hospital or police?',
        a: 'In any emergency dial 112 — it is free from any phone, has English-speaking operators, and reaches ambulance, fire and police at once (199 is an older local number for the same services). For non-urgent police matters, call 1460. Every district has a general hospital with a 24-hour A&E. Tell me your town, neighbourhood or postcode and I will give you the nearest hospital or pharmacy with its address and phone; for police, 112 (or 1460 for non-urgent matters) is the fastest route. For anything serious, call 112 first, then head to A&E.',
        resources: [{ label: 'Health & medical directory', path: '/directory/g/health', status: 'live' }],
        links: ['night-pharmacy', 'urgent-help', 'english-doctor', 'safe-family'], connect: ['Hospitals', 'Pharmacies'],
        source: 'https://www.visitcyprus.com/useful-info/health-safety/' },
      { id: 'english-doctor',
        q: 'Where do I find an English- or Russian-speaking doctor or dentist?',
        a: 'They are widely available, especially English in Paphos and Russian in Limassol. Private consultations are quick and reasonably priced, and most GPs, dentists and specialists list their languages. We surface language and GESY/private status on each listing.',
        resources: [{ label: 'Doctors & clinics directory', path: '/directory/g/health', status: 'live' }],
        links: ['healthcare', 'childcare-eldercare'], connect: ['GPs', 'Dentists', 'Specialists'] },
      { id: 'pharmacies',
        q: 'How do pharmacies and prescriptions work?',
        a: 'Pharmacists are highly trained and can advise on minor ailments, and many medicines sold over the counter elsewhere are available here too. Bring a doctor’s note for controlled medicines; duty pharmacies cover nights and holidays.',
        resources: [{ label: 'Health & medical directory', path: '/directory/g/health', status: 'live' }],
        links: ['emergencies', 'night-pharmacy'], connect: ['Pharmacies'] },
      { id: 'night-pharmacy',
        q: 'How do I find a pharmacy open now — at night or on a holiday?',
        a: 'A pharmacy is always open somewhere: they run a rotating night-and-holiday duty roster. Find the current on-duty pharmacy at cypruspharmacy.com, or by phone — 11892 (directory), or your district duty line (premium-rate): Nicosia 90 901 412, Limassol 90 901 415, Larnaca 90 901 414, Paphos 90 901 416, Famagusta 90 901 413. Tell me your area and I will also list the nearest pharmacies from the directory.',
        resources: [{ label: 'Pharmacies directory', path: '/directory/g/health', status: 'live' }],
        links: ['emergencies', 'pharmacies', 'urgent-help'], connect: ['Pharmacies'],
        source: 'https://www.visitcyprus.com/useful-info/health-safety/' },
      { id: 'urgent-help',
        q: 'Is there an on-call doctor line or urgent medical help outside hours?',
        a: 'For a doctor at weekends or on public holidays, call 17000 (or +357 22017000). For anything life-threatening, always dial 112 first — it dispatches an ambulance and connects police and fire. Ask me for your nearest 24-hour A&E and a duty pharmacy and I will pull them for your area so you have them saved before you need them.',
        resources: [{ label: 'Health & medical directory', path: '/directory/g/health', status: 'live' }],
        links: ['emergencies', 'night-pharmacy', 'english-doctor'], connect: ['Hospitals', 'GPs'],
        source: 'https://www.visitcyprus.com/useful-info/health-safety/' },
      { id: 'family-beaches',
        q: 'What can we do with the kids?',
        a: 'Beyond the beaches: waterparks (WaterWorld, Aphrodite, Fasouri), the Blue Lagoon boat day, donkey and farm parks, Paphos Zoo, and gentle Troodos picnics. Most beaches are shallow and Blue-Flag — ideal for young families.',
        resources: [{ label: 'Family attractions', path: '/directory/g/nature', status: 'live' }],
        links: ['best-beaches', 'waterparks'], connect: ['Family attractions', 'Tour operators'] },
    ],
  },
];

// The lifestyle/relocation spine (above) plus the official government-sourced
// "Doing Business" and "Licences & Regulated Professions" domains. Keeping them in
// one QA_DOMAINS means retrieval, grounding, embeddings and the guide graph all
// pick them up automatically.
export const QA_DOMAINS: QADomain[] = [...BASE_QA_DOMAINS, ...DOING_BUSINESS_DOMAINS];

// ---------------------------------------------------------------------------
// Derived indexes & helpers
// ---------------------------------------------------------------------------

export interface QAHit { item: QAItem; domain: QADomain; }

export const ALL_INTENTS: QAHit[] = QA_DOMAINS.flatMap((d) => d.intents.map((item) => ({ item, domain: d })));

export const QA_INDEX: Record<string, QAHit> = Object.fromEntries(ALL_INTENTS.map((h) => [h.item.id, h]));

export function getIntent(id: string): QAHit | undefined {
  return QA_INDEX[id];
}

/** Canonical on-site URL for an intent's practical guide page. */
export const guideHref = (id: string): string => `/guide/${id}`;

/** Only the resources safe to link right now (deployed routes). */
export function liveResources(item: QAItem): QAResource[] {
  return item.resources.filter((r) => r.status === 'live');
}

const STOP = new Set(['the', 'and', 'for', 'are', 'can', 'you', 'your', 'with', 'what', 'where', 'how', 'much', 'does', 'from', 'near', 'they', 'this', 'that', 'about', 'into', 'want', 'need', 'find', 'good', 'best', 'have', 'get', 'a', 'to', 'in', 'of', 'is', 'it', 'my', 'i', 'me', 'do', 'on', 'or', 'an', 'at', 'be']);

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * Lightweight retrieval over the knowledge base — scores each intent by how many
 * query tokens it matches across its question, answer, connector categories and
 * domain title. Returns the best `max` matches. This is the retrieval step behind
 * the grounded concierge (and, later, the chatbot).
 */
export function retrieveKnowledge(query: string, max = 6): QAHit[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const scored = ALL_INTENTS.map((h) => {
    const q = h.item.q.toLowerCase();
    const a = h.item.a.toLowerCase();
    const connect = h.item.connect.join(' ').toLowerCase();
    const title = (h.domain.title + ' ' + h.domain.tag).toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (q.includes(t)) score += 5;         // question match is strongest
      if (connect.includes(t)) score += 4;   // "plumber", "lawyer", "jeweller"…
      if (title.includes(t)) score += 2;
      if (a.includes(t)) score += 1;
      if (h.item.id.includes(t)) score += 3;
    }
    return { h, score };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.h);
}

/** Compact shape handed to the concierge edge function as grounding. */
export interface ConciergeKnowledge {
  id: string;
  q: string;
  a: string;
  res: { l: string; p: string }[]; // live resources only (label, path)
  connect: string[];
  source?: string; // official authority URL (e.g. a government page) for citation
}

export function compactForConcierge(hits: QAHit[]): ConciergeKnowledge[] {
  return hits.map(({ item }) => ({
    id: item.id,
    q: item.q,
    a: item.a,
    res: liveResources(item).map((r) => ({ l: r.label, p: r.path })),
    connect: item.connect,
    ...(item.source ? { source: item.source } : {}),
  }));
}

export const QA_STATS = {
  domains: QA_DOMAINS.length,
  intents: ALL_INTENTS.length,
  connectors: new Set(ALL_INTENTS.flatMap((h) => h.item.connect)).size,
};
