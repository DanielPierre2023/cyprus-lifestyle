// antiAi (pure) — coverage for the DE·PL·RU extension and the burstiness signal,
// plus an EN regression guard so the original four editions keep their behaviour.
// Pure: no network/DB, no top-level await. Run via the suite harness.
import {
  humanizeText, humanizeHtml, scoreAiTells, burstiness,
  stripDashes, deShoutTitle, scrubLexicon, type Lang,
} from '@/lib/antiAi';
import { eq, ok, report } from './_harness';

const hasTell = (r: ReturnType<typeof scoreAiTells>, key: string): boolean => r.tells.some((t) => t.key === key);

// ── German ───────────────────────────────────────────────────────────────────────
eq('de lexicon: „im Herzen von" → „im Zentrum von"',
  humanizeText('Ein Café im Herzen von Nikosia.', 'de'),
  'Ein Café im Zentrum von Nikosia.');
eq('de lexicon: „nahtlos" → „reibungslos"',
  humanizeText('Die Altstadt ist nahtlos angebunden.', 'de'),
  'Die Altstadt ist reibungslos angebunden.');
eq('de filler dropped + next word re-capitalised',
  humanizeText('Zudem ist die Stadt schön.', 'de'),
  'Ist die Stadt schön.');
{
  const r = scoreAiTells({ content: 'Das Museum spielt eine entscheidende Rolle — ein wahres Zeugnis für die Kultur.', lang: 'de' });
  ok('de scoreAiTells flags AI sentence (not clean)', r.level !== 'clean');
  ok('de scoreAiTells flags the role calque', hasTell(r, 'de_role'));
  ok('de scoreAiTells flags the em dash', hasTell(r, 'em_dash'));
}

// ── Polish ───────────────────────────────────────────────────────────────────────
eq('pl lexicon: „w sercu" → „w centrum"',
  humanizeText('To miasto w sercu wyspy.', 'pl'),
  'To miasto w centrum wyspy.');
eq('pl lexicon: „odgrywa kluczową rolę" → gender-neutral',
  humanizeText('Zamek odgrywa kluczową rolę w regionie.', 'pl'),
  'Zamek ma kluczowe znaczenie w regionie.');
eq('pl filler dropped + next word re-capitalised',
  humanizeText('Ponadto miasto jest piękne.', 'pl'),
  'Miasto jest piękne.');
{
  const r = scoreAiTells({ content: 'Zamek odgrywa kluczową rolę — to prawdziwa skarbnica historii.', lang: 'pl' });
  ok('pl scoreAiTells flags AI sentence (not clean)', r.level !== 'clean');
  ok('pl scoreAiTells flags the role calque', hasTell(r, 'pl_role'));
  ok('pl scoreAiTells flags the em dash', hasTell(r, 'em_dash'));
}

// ── Russian (Cyrillic — no ASCII \b) ──────────────────────────────────────────────
eq('ru lexicon: „в сердце" → „в центре"',
  humanizeText('Отель в сердце города.', 'ru'),
  'Отель в центре города.');
eq('ru lexicon: „играет ключевую роль" → gender-neutral',
  humanizeText('Музей играет ключевую роль здесь.', 'ru'),
  'Музей имеет ключевое значение здесь.');
eq('ru lexicon: seamless adjective declines with gender',
  humanizeText('Это бесшовная интеграция сервисов.', 'ru'),
  'Это гладкая интеграция сервисов.');
eq('ru filler dropped + next word re-capitalised',
  humanizeText('Кроме того, город прекрасен.', 'ru'),
  'Город прекрасен.');
{
  const r = scoreAiTells({ content: 'Музей играет ключевую роль — это настоящая сокровищница.', lang: 'ru' });
  ok('ru scoreAiTells flags AI sentence (not clean)', r.level !== 'clean');
  ok('ru scoreAiTells flags the role calque', hasTell(r, 'ru_role'));
  ok('ru scoreAiTells flags the em dash', hasTell(r, 'em_dash'));
}

// ── Burstiness (language-neutral) ─────────────────────────────────────────────────
const UNIFORM = 'The team met on Monday to plan. They set three goals for the week. Each member took one task to do. The work went well for two days. They shared updates every single afternoon. The plan came together by the weekend.';
const VARIED = 'Yes. The committee reviewed the annual budget report in considerable depth over several long sessions. It worked. They then asked the finance lead a single pointed question about next year. No. After a short break the group agreed on a revised figure and moved on today.';
ok('burstiness: uniform prose reads as uniform', burstiness(UNIFORM).uniform === true);
ok('burstiness: varied prose does not', burstiness(VARIED).uniform === false);
ok('burstiness: uniform CV is below the varied CV', burstiness(UNIFORM).sentenceCV < burstiness(VARIED).sentenceCV);
{
  const u = scoreAiTells({ content: UNIFORM, lang: 'en' });
  const v = scoreAiTells({ content: VARIED, lang: 'en' });
  ok('burstiness: uniform paragraph flags low_burstiness', hasTell(u, 'low_burstiness'));
  ok('burstiness: varied paragraph does not flag it', !hasTell(v, 'low_burstiness'));
  ok('burstiness: uniform paragraph scores higher than varied', u.score > v.score);
  ok('burstiness: report exposes the additive burstiness field', !!u.burstiness && u.burstiness.uniform === true);
}

// ── EN regression — original behaviour must be unchanged ───────────────────────────
eq('en regression: „boasts" → „has"',
  humanizeText('The city boasts great weather.', 'en'),
  'The city has great weather.');
eq('en regression: „a myriad of" → „many" (case preserved)',
  humanizeText('A myriad of options exist.', 'en'),
  'Many options exist.');
eq('en regression: em dash → comma (stripDashes)',
  humanizeText('Rome — the city.', 'en'),
  'Rome, the city.');
eq('en regression: stripDashes is unchanged', stripDashes('a — b'), 'a, b');
eq('en regression: scrubLexicon is unchanged', scrubLexicon('The city boasts.', 'en'), 'The city has.');
{
  const clean = scoreAiTells({ content: 'The city has nice weather.', lang: 'en' });
  eq('en regression: clean text scores 0', clean.score, 0);
  eq('en regression: clean text level', clean.level, 'clean');
  eq('en regression: clean text has no tells', clean.tells, []);
  const ai = scoreAiTells({ content: 'This city boasts a myriad of things and plays a crucial role.', lang: 'en' });
  ok('en regression: AI text still not clean', ai.level !== 'clean');
  ok('en regression: en lexicon detector still fires', hasTell(ai, 'en_lexicon'));
  ok('en regression: en role detector still fires', hasTell(ai, 'en_role'));
}

// ── Public API + HTML mode reach the new languages ────────────────────────────────
eq('humanizeHtml transforms text nodes for a new language',
  humanizeHtml('<p>Ein Café im Herzen von Nikosia.</p>', 'de'),
  '<p>Ein Café im Zentrum von Nikosia.</p>');
ok('deShoutTitle stays callable (API preserved)', typeof deShoutTitle('CYPRUS NEWS TODAY') === 'string');
// Type-level guard: all seven editions are assignable to Lang.
const ALL_LANGS: Lang[] = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
ok('type Lang covers all seven editions', ALL_LANGS.length === 7);

report('antiAi.pure');
