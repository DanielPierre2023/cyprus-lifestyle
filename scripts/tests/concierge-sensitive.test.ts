// Sensitive kinds of business the concierge does not volunteer — pure helpers (lib/concierge/sensitive.ts). Offline, deterministic.
import { isSensitive, asksForSensitive, SENSITIVE_SUBTYPES } from '@/lib/concierge/sensitive';
import { eq, ok, report } from './_harness';

// ── isSensitive ──────────────────────────────────────────────────────────────
ok('sex shop subtype is sensitive', isSensitive({ subtype: 'sex-shops', name: "Lover's Boutique" }));
ok('betting agency is sensitive', isSensitive({ subtype: 'betting-agencies', name: 'Novibet' }));
ok('casino is sensitive', isSensitive({ subtype: 'casino', name: 'King Billy Casino' }));
ok('lottery shop is sensitive', isSensitive({ subtype: 'lottery-shops', name: 'OPAP' }));
ok('escort agency is sensitive', isSensitive({ subtype: 'escort-agencies', name: 'VIP Escorts' }));
ok('a restaurant is not sensitive', !isSensitive({ subtype: 'restaurants', name: 'Zya Cafe' }));
ok('no subtype is not sensitive', !isSensitive({ subtype: null, name: 'Anything' }) && !isSensitive({ name: 'Anything' }));
ok('mixed subtype: gun shop by name is sensitive', isSensitive({ subtype: 'gaming-guns-and-equipment', name: 'PREMIUM GUN STORE' }));
ok('mixed subtype: airgun hunting centre is sensitive', isSensitive({ subtype: 'gaming-guns-and-equipment', name: 'Airgun Hunting Center Cyprus' }));
ok('mixed subtype: Greek guns name is sensitive', isSensitive({ subtype: 'gaming-guns-and-equipment', name: 'Ο ΚΟΣΜΟΣ ΤΩΝ ΟΠΛΩΝ' }));
ok('mixed subtype: a board-game shop is not sensitive', !isSensitive({ subtype: 'gaming-guns-and-equipment', name: 'The Mind Games' }));
ok('mixed subtype: a fantasy shop is not sensitive', !isSensitive({ subtype: 'gaming-guns-and-equipment', name: 'Isengard Fantasy Shop' }));
ok('video-game club (subtype gaming) is not sensitive', !isSensitive({ subtype: 'gaming', name: 'GGWP Gaming Club' }));
ok('every listed subtype is a plain slug', [...SENSITIVE_SUBTYPES].every((s) => /^[a-z-]+$/.test(s)));

// ── asksForSensitive: the guest asks for that kind of business ───────────────
ok('en: casino', asksForSensitive('Is there a casino in Limassol?'));
ok('en: betting shop', asksForSensitive('where can I place a bet near Paphos'));
ok('en: bookmaker', asksForSensitive('Any bookmakers in Nicosia?'));
ok('en: sex shop (two words)', asksForSensitive('I need an adult shop in Ayia Napa'));
ok('en: gun shop', asksForSensitive('a gun store in Larnaca please'));
ok('en: lottery', asksForSensitive('Where can I buy lottery tickets?'));
ok('de: Casino', asksForSensitive('Gibt es ein Casino in Limassol?'));
ok('de: Wettbüro', asksForSensitive('Wo finde ich ein Wettbüro in Nikosia?'));
ok('de: Glücksspiel', asksForSensitive('Glücksspiel auf Zypern, was ist erlaubt?'));
ok('de: Waffengeschäft (compound)', asksForSensitive('ein Waffengeschäft in Paphos'));
ok('el: καζίνο', asksForSensitive('Υπάρχει καζίνο στη Λεμεσό;'));
ok('el: στοιχήματα', asksForSensitive('πού μπορώ να βάλω στοίχημα'));
ok('pl: kasyno', asksForSensitive('Czy jest kasyno w Limassol?'));
ok('pl: bukmacher (inflected)', asksForSensitive('zakłady bukmacherskie w Larnace'));
ok('ro: cazinou', asksForSensitive('Există un cazinou în Limassol?'));
ok('ro: pariuri', asksForSensitive('unde pot face pariuri sportive'));
ok('ru: казино', asksForSensitive('Есть ли казино в Лимассоле?'));
ok('ru: ставки (inflected)', asksForSensitive('где сделать ставки на спорт'));
ok('ru: оружие', asksForSensitive('магазин, где продают оружие'));
ok('ar: كازينو', asksForSensitive('هل يوجد كازينو في ليماسول؟'));
ok('ar: with the article (الكازينو)', asksForSensitive('أين الكازينو في نيقوسيا'));
ok('ar: قمار', asksForSensitive('أماكن القمار في قبرص'));

// ── asksForSensitive: ordinary questions must not lift the filter ────────────
ok('"better" is not "bet"', !asksForSensitive('Which beach is better for kids?'));
ok('plain restaurant question', !asksForSensitive('What is the best Italian restaurant in Limassol?'));
ok('a hotel question', !asksForSensitive('Adults-only hotel in Ayia Napa with a spa'));
ok('"bronze" is not "bron"', !asksForSensitive('bronze sculptures in Nicosia'));
ok('German hair salon', !asksForSensitive('Ein guter Friseur in Larnaka bitte'));
ok('Polish hair salon (zakład)', !asksForSensitive('zakład fryzjerski w Limassol'));
ok('Greek pharmacy', !asksForSensitive('φαρμακείο στη Λάρνακα'));
ok('Russian restaurant', !asksForSensitive('хороший ресторан в Пафосе'));
ok('Arabic restaurant', !asksForSensitive('مطعم جيد في ليماسول'));
eq('empty question', asksForSensitive(''), false);

report('concierge.sensitive');
