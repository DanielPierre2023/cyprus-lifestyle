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

// ── latestUserText ──────────────────────────────────────────────────────────
eq('picks the last user message', latestUserText([
  { role: 'user', content: 'first' },
  { role: 'assistant', content: 'reply' },
  { role: 'user', content: 'second' },
]), 'second');

report('brain.pure');
