// Concierge gold-question suite (roadmap item 05) — the deploy gate for answer
// quality. For a matrix of real questions per language and per intent, it asserts the
// pure retrieval signals the concierge grounds on: language, category, district,
// luxury tier, everyday-category probes, and neighbourhood location. It runs offline
// (no model/DB), so it can gate every push in CI. A regression in intent routing —
// e.g. a dining query resolving to real estate — fails here before it ships.
import { detectLocale, classifyRequest, categoryProbes, extractLocationPhrase } from '@/lib/concierge/brain';
import { eq, ok, report } from './_harness';

const cat = (q: string) => classifyRequest(q).category;
const dist = (q: string) => classifyRequest(q).district;
const tier = (q: string) => classifyRequest(q).tier;

// ── English · core intents ───────────────────────────────────────────────────
eq('EN dining → restaurant', cat('best fish taverna in Paphos'), 'restaurant');
eq('EN dining district', dist('best fish taverna in Paphos'), 'paphos');
eq('EN seafront RESTAURANT is dining, not property (regression guard)', cat('a romantic seafront restaurant in Limassol'), 'restaurant');
eq('EN seafront VILLA is property', cat('a seafront villa in Limassol'), 'realestate');
eq('EN luxury villa → premium tier', tier('I want to buy a luxury villa in Limassol'), 'premium');
eq('EN hotel intent', cat('a family-friendly hotel in Ayia Napa'), 'hotel');
eq('EN "Ayia Napa" → Famagusta district', dist('a family-friendly hotel in Ayia Napa'), 'famagusta');
eq('EN lawyer routes to law, not property', cat('I need a lawyer for buying property'), 'law-firm');
eq('EN plain query → standard tier', tier('a bus ticket to the airport'), 'standard');

// ── English · everyday categories (probe-driven retrieval) ───────────────────
ok('EN pharmacy probe', categoryProbes('pharmacy near Finikoudes').includes('pharmac'));
ok('EN gym probe', categoryProbes('is there a good gym in Larnaca').includes('gym'));
ok('EN vet probe', categoryProbes('a vet in Nicosia').some((p) => ['pet', 'vet', 'animal'].includes(p)));
ok('EN kindergarten probe', categoryProbes('kindergarten in Limassol').includes('nursery'));
ok('EN supermarket probe', categoryProbes('nearest supermarket').includes('supermarket'));
ok('EN hairdresser probe', categoryProbes('a good hairdresser').includes('hair'));

// ── Neighbourhood (radius) ───────────────────────────────────────────────────
eq('"near me" defers to asking', extractLocationPhrase('a pharmacy near me'), null);
eq('postcode captured', extractLocationPhrase('gyms around 6042'), '6042');
eq('named area captured', extractLocationPhrase('cafés near Finikoudes'), 'Finikoudes');

// ── Greek ────────────────────────────────────────────────────────────────────
eq('EL detected', detectLocale('φαρμακείο κοντά μου στη Λάρνακα'), 'el');
eq('EL pharmacy → health', cat('φαρμακείο κοντά μου στη Λάρνακα'), 'health');
eq('EL district (Λάρνακα)', dist('φαρμακείο κοντά μου στη Λάρνακα'), 'larnaca');
eq('EL dining → restaurant', cat('εστιατόριο στη Λεμεσό'), 'restaurant');
eq('EL district (Λεμεσό)', dist('εστιατόριο στη Λεμεσό'), 'limassol');

// ── Russian ──────────────────────────────────────────────────────────────────
eq('RU detected', detectLocale('ресторан у моря в Лимасоле'), 'ru');
eq('RU dining → restaurant', cat('ресторан у моря в Лимасоле'), 'restaurant');
eq('RU district (Лимасол)', dist('ресторан у моря в Лимасоле'), 'limassol');
ok('RU pharmacy probe (аптека)', categoryProbes('аптека рядом').includes('pharmac'));

// ── Arabic ───────────────────────────────────────────────────────────────────
eq('AR detected', detectLocale('مطعم فاخر في ليماسول'), 'ar');
eq('AR dining → restaurant', cat('مطعم فاخر في ليماسول'), 'restaurant');
eq('AR luxury (فاخر) → premium', tier('مطعم فاخر في ليماسول'), 'premium');

// ── German (Latin script → locale via UI, but intent words still match) ──────
eq('DE real estate', cat('Immobilien in Limassol'), 'realestate');
eq('DE car rental', cat('Mietwagen in Paphos'), 'car-rental');
ok('DE pharmacy probe (Apotheke)', categoryProbes('Apotheke in der Nähe').includes('pharmac'));

// ── Polish ───────────────────────────────────────────────────────────────────
eq('PL dining', cat('restauracja w Limassol'), 'restaurant');
eq('PL car rental', cat('wynajem samochodu w Pafos'), 'car-rental');
eq('PL insurance', cat('ubezpieczenie'), 'insurance');

// ── Romanian ─────────────────────────────────────────────────────────────────
eq('RO real estate', cat('apartament in Larnaca'), 'realestate');
eq('RO lawyer', cat('avocat in Nicosia'), 'law-firm');
eq('RO district (Nicosia)', dist('avocat in Nicosia'), 'nicosia');

report('concierge.gold');
