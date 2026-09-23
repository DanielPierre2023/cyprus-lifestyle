// Concierge retrieval — the pure, safety-relevant helpers that decide what the
// concierge looks for and in which language. These gate grounding, so they matter.
import { detectLocale, classifyRequest, extractLocationPhrase, categoryProbes, latestUserText } from '@/lib/concierge/brain';
import { eq, ok, report } from './_harness';

// ── detectLocale (script-based: ar/el/ru, else en) ──────────────────────────
eq('detect Arabic', detectLocale('مرحبا، أبحث عن مطعم'), 'ar');
eq('detect Greek', detectLocale('Γεια σας, ψάχνω εστιατόριο'), 'el');
eq('detect Russian', detectLocale('Здравствуйте, ищу ресторан'), 'ru');
eq('Latin text → en (German has no distinct script)', detectLocale('Ich suche ein Restaurant'), 'en');

// ── classifyRequest tier (luxuryIntent) ─────────────────────────────────────
eq('luxury villa → premium tier', classifyRequest('I want to buy a luxury villa in Limassol').tier, 'premium');
eq('plain query → standard tier', classifyRequest('a bus timetable to the airport').tier, 'standard');
eq('district is detected and lowercased', classifyRequest('a luxury villa in Limassol').district, 'limassol');

// ── extractLocationPhrase (neighbourhood radius) ────────────────────────────
eq('"near me" → null (ask for a place)', extractLocationPhrase('a good gym near me'), null);
eq('4-digit postcode is picked up', extractLocationPhrase('what pharmacies are around 6042?'), '6042');
eq('"near <place>" → the place', extractLocationPhrase('pharmacies near Finikoudes'), 'Finikoudes');
eq('"in <place>" → the place', extractLocationPhrase('restaurants in Aradippou'), 'Aradippou');
eq('no location keyword → null', extractLocationPhrase('hello there, how are you'), null);

// ── categoryProbes (everyday-category retrieval, multilingual) ───────────────
ok('gym → gym/fitness probes', categoryProbes('is there a gym nearby').includes('gym'));
ok('Greek pharmacy → pharmac probe', categoryProbes('φαρμακείο κοντά μου').includes('pharmac'));
ok('Russian vet → pet/vet probe', categoryProbes('ветеринар рядом').some((p) => ['pet', 'vet', 'animal'].includes(p)));
ok('German bakery → baker probe', categoryProbes('gibt es eine Bäckerei').includes('baker'));
eq('unrelated query → no probes', categoryProbes('what is the weather like'), []);

// ── home-trade categories from the bulk import (multilingual) ────────────────
ok('EN air conditioning → condition probe', categoryProbes('I need air conditioning repair').includes('condition'));
ok('RO aer condiționat → condition probe', categoryProbes('reparator pentru aerul condiționat în pila').includes('condition'));
ok('EL κλιματισμός → condition probe', categoryProbes('τεχνικός για κλιματισμό').includes('condition'));
ok('DE Klimaanlage → condition probe', categoryProbes('Techniker für die Klimaanlage').includes('condition'));
ok('RU кондиционер → condition probe', categoryProbes('ремонт кондиционера').includes('condition'));
ok('electrician → electric probe', categoryProbes('am nevoie de un electrician').includes('electric'));
ok('plumber → plumb probe', categoryProbes('a plumber please').includes('plumb'));

// ── Larnaca villages map to the district ────────────────────────────────────
eq('Pila → larnaca', classifyRequest('reparator aer condiționat în pila').district, 'larnaca');
eq('Pyla → larnaca', classifyRequest('an electrician in Pyla').district, 'larnaca');
eq('Oroklini → larnaca', classifyRequest('a plumber in Oroklini').district, 'larnaca');
// villages across all five districts
eq('Lakatamia → nicosia', classifyRequest('air conditioning in Lakatamia').district, 'nicosia');
eq('Ypsonas → limassol', classifyRequest('an electrician in Ypsonas').district, 'limassol');
eq('Peyia → paphos', classifyRequest('a plumber in Peyia').district, 'paphos');
eq('Geroskipou → paphos', classifyRequest('air conditioning in Geroskipou').district, 'paphos');
eq('Frenaros → famagusta', classifyRequest('an electrician in Frenaros').district, 'famagusta');
eq('Paralimni → famagusta', classifyRequest('a plumber in Paralimni').district, 'famagusta');

// ── latestUserText ──────────────────────────────────────────────────────────
eq('picks the last user message', latestUserText([
  { role: 'user', content: 'first' },
  { role: 'assistant', content: 'reply' },
  { role: 'user', content: 'second' },
]), 'second');

report('brain.pure');
