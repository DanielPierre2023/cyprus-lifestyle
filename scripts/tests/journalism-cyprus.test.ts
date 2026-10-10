// The Cyprus connection of a story comes from the source, never from the model's general knowledge: the gate that decides, the guard that
// finds a Cypriot place an edition names without the material naming it, and the outlets that count as Cypriot. The old desk let a
// Guardian travel piece through with "New York costs more than Cyprus" because the model had written an island angle by itself.
import { isCyprusOutlet, cyprusEntitiesIn, countCyprusMentions, groundCyprus, inventedCyprusMentions } from '@/lib/journalism/cyprusGround';
import { parseFactCore, type FactCore } from '@/lib/journalism/factCore';
import { eq, ok, report } from './_harness';

const base = (over: Record<string, unknown> = {}): FactCore => parseFactCore(JSON.stringify({
  category: 'cyprus', subcategory: 'regional', district: 'national', source_lang: 'en', cyprus_angle: false, cyprus_basis: 'none', cyprus_evidence: 'none', cyprus_hook: 'none',
  story_type: 'news', complexity: 'routine', flags: [], headline_fact: 'x', confirmed_facts: [{ fact: 'Something happened.', evidence: 'Something happened here' }], attributed_claims: [], allegations: [], unverified: [], direct_quotes: [], dates: [], numbers: [], entities: [], open_questions: [], conflicts: [], ...over,
})).core!;
const src = (title: string, text: string) => [{ label: 'A', title, text }];

// ── the outlets ──────────────────────────────────────────────────────────────────────────────────────────────────
ok('the Cypriot outlets are recognised, with or without www and in subdomains', ['https://cyprus-mail.com/2026/09/28/x', 'https://www.philenews.com/oikonomia/kypros/article/1', 'https://in-cyprus.philenews.com/a', 'https://www.sigmalive.com/news/x', 'https://politis.com.cy/a', 'https://www.financialmirror.com/x'].every((u) => isCyprusOutlet(u)));
ok('any .cy domain and any host with "cyprus" in it counts', isCyprusOutlet('https://news.example.com.cy/a') && isCyprusOutlet('https://my-cyprus-blog.org/post'));
ok('the international outlets do not', !['https://www.theguardian.com/travel/x', 'https://www.vogue.com/x', 'https://www.bbc.co.uk/news'].some((u) => isCyprusOutlet(u)));
ok('a setting can add a host; junk is not an outlet', isCyprusOutlet('https://news.mylocal.example/x', ['mylocal.example']) && !isCyprusOutlet('not a url') && !isCyprusOutlet('') && !isCyprusOutlet(null));

// ── the island and its places, in the seven languages ────────────────────────────────────────────────────────────
eq('the island in every language of the desk', ['Cyprus', 'Cypriot banks', 'Zypern', 'Cipru', 'Κύπρος', 'ΚΥΠΡΟΣ', 'Кипр', 'قبرص', 'Cyprze'].map((t) => [...cyprusEntitiesIn(`${t} is mentioned.`)]), Array(9).fill(['island']));
eq('the towns, whatever the language', [
  ['Limassol', 'Λεμεσός', 'Лимассол', 'Lemesos', 'ليماسول'].map((t) => [...cyprusEntitiesIn(`in ${t} today`)].join()),
  ['Nicosia', 'Λευκωσία', 'Никосия', 'Nikosia', 'Nikozja'].map((t) => [...cyprusEntitiesIn(`in ${t} today`)].join()),
  ['Paphos', 'Πάφος', 'Pafos'].map((t) => [...cyprusEntitiesIn(`in ${t} today`)].join()),
  ['Ayia Napa', 'Αγία Νάπα'].map((t) => [...cyprusEntitiesIn(`in ${t} today`)].join()),
], [Array(5).fill('limassol'), Array(5).fill('nicosia'), Array(3).fill('paphos'), Array(2).fill('ayia-napa')]);
eq('a cypress is a tree, "pathos" is not Paphos, and a Russian "пафос" is not a town', [cyprusEntitiesIn('the cypress trees of Italy').size, cyprusEntitiesIn('Πάθος και λύπη').size, cyprusEntitiesIn('это был пафос речи').size], [0, 0, 0]);
eq('ordinary words that merely begin like a village are not places: Greek "weighs", "colossal", "idler", Polish "jetty"', ['Ο ταξιδιώτης ζυγίζει τις επιλογές', 'ένα κολοσσιαίο έργο', 'ένας ακαμάτης στο καφενείο', 'Na pomoście stał rybak', 'Mr Sotiras arrived late', 'Er ist ein Erimit'].map((t) => cyprusEntitiesIn(t).size), [0, 0, 0, 0, 0, 0]);
eq('...while the villages themselves still are, in every form the table lists', ['Ζύγι', 'Κολοσσίου Κολοσσι', 'Pomos', 'Ακάμας', 'στον Ακάμα', 'Zygi', 'Kouklia', 'Κούκλια'].map((t) => [...cyprusEntitiesIn(`στο ${t} σήμερα`)].length > 0), [true, true, true, true, true, true, true, true]);
eq('villages and regions that outlets name without the island are places too', ['Latchi', 'Pissouri', 'Λάτσι', 'Kakopetria', 'Coral Bay'].map((t) => [...cyprusEntitiesIn(`the harbour of ${t} was busy`)].length), [1, 1, 1, 1, 1]);
eq('mentions are counted (island and places)', [countCyprusMentions('Cyprus. Limassol is in Cyprus.'), countCyprusMentions('Nothing here.')], [3, 0]);

// ── the gate ─────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const g = groundCyprus({ core: base(), sources: src('Cyprus unveils a VAT package', 'The cabinet approved it.'), originCyprus: false });
  eq('the island in the title: grounded on its own', [g.grounded, g.via], [true, 'named']);
  const g2 = groundCyprus({ core: base(), sources: src('Marina fees', 'The Limassol marina will raise fees. Berth holders in Limassol are unhappy.'), originCyprus: false });
  eq('named twice in the text: grounded', [g2.grounded, g2.via], [true, 'named']);
  const g3 = groundCyprus({ core: base(), sources: src('Southern Europe tourism', 'Spain, Italy, Greece and Cyprus all saw more visitors this summer, while the numbers in Portugal fell slightly after a long hot season.'), originCyprus: false });
  eq('named once in a list and no angle from the editor: NOT a Cyprus story', g3.grounded, false);
  const g4 = groundCyprus({ core: base({ cyprus_angle: true, cyprus_basis: 'named', cyprus_evidence: 'Cyprus all saw more visitors this summer', cyprus_hook: 'Cyprus saw more visitors' }), sources: src('Southern Europe tourism', 'Spain, Italy, Greece and Cyprus all saw more visitors this summer, while the numbers in Portugal fell.'), originCyprus: false });
  eq('named once, but the editor points at the passage and it names the island: grounded', [g4.grounded, g4.via, g4.kind], [true, 'evidenced', 'named']);
  const el = src('Μέτρα κατά της ακρίβειας', 'Το υπουργικό συμβούλιο ενέκρινε μέτρα 70 εκατ. ευρώ για ψωμί και γάλα.');
  const g5 = groundCyprus({ core: base({ cyprus_angle: true, cyprus_basis: 'institution', cyprus_evidence: 'Το υπουργικό συμβούλιο ενέκρινε μέτρα 70 εκατ. ευρώ', cyprus_hook: 'The Cypriot cabinet approved a package' }), sources: el, originCyprus: true });
  eq('a Cypriot outlet and a passage that is really in the source (no Cypriot word in it): grounded by evidence', [g5.grounded, g5.via, g5.kind], [true, 'evidenced', 'institution']);
  const g6 = groundCyprus({ core: base({ cyprus_angle: true, cyprus_basis: 'institution', cyprus_evidence: 'Το υπουργικό συμβούλιο ενέκρινε μέτρα 70 εκατ. ευρώ', cyprus_hook: 'The Cypriot cabinet approved a package' }), sources: el, originCyprus: false });
  eq('the same passage from an international outlet is not enough', g6.grounded, false);
  const g7 = groundCyprus({ core: base({ cyprus_angle: true, cyprus_basis: 'institution', cyprus_evidence: 'Το υπουργικό συμβούλιο ενέκρινε ένα μέτρο που δεν υπάρχει', cyprus_hook: 'x' }), sources: el, originCyprus: true });
  eq('a passage that is not in the source is worthless, even from a Cypriot outlet', g7.grounded, false);
  const g8 = groundCyprus({ core: base({ cyprus_angle: true, cyprus_basis: 'none', cyprus_evidence: '', cyprus_hook: 'Cyprus is a shipping hub, so this matters here' }), sources: src('Panama Canal cuts crossings', 'Panama\'s canal authority is preparing a third reduction in daily crossings as drought depletes the lake. Shipping lines are rerouting.'), originCyprus: false });
  eq('an angle from general knowledge, with no passage (the Panama canal story): not grounded', g8.grounded, false);
  eq('the sentence the writers get: the editor\'s own, else a plain default; nothing when there is no connection', [g.statement, g4.statement, g8.statement], ['the source itself places the story in Cyprus', 'Cyprus saw more visitors', '']);
}

// ── the guard for a finished edition ─────────────────────────────────────────────────────────────────────────────
{
  const known = 'The Limassol marina will raise berth fees. Berth holders are unhappy.';
  const names = (text: string, grounded = true) => inventedCyprusMentions(text, known, grounded).map((m) => m.id);
  eq('the place the material names, in the edition\'s own language, is not an invention', names('Η μαρίνα της Λεμεσού αυξάνει τα τέλη.'), []);
  eq('a place the material does not name is flagged, with its sentence', inventedCyprusMentions('The fees rise. Paphos has the same problem.', known, true).map((m) => [m.id, m.sentence]), [['paphos', 'Paphos has the same problem.']]);
  eq('the island itself is allowed when the story is grounded in Cyprus', names('Cyprus has a busy season. Die Gebühren steigen.'), []);
  eq('...and not when it is not (a story the gate should have stopped)', names('For an economy like the Cypriot one, the effect is large.', false), ['island']);
  eq('a town the material does not name is flagged even when the island is fine', names('Larnaca marina fees are lower, and Cyprus has more berths.'), ['larnaca']);
  eq('each place is reported once', names('Paphos is lovely. Paphos is old.'), ['paphos']);
  eq('an edition that names nothing from the island is clean', names('The marina raises fees on 1 March.'), []);
}

report('journalism-cyprus');
