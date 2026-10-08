// The piece never names its sources, in any of the seven languages; people and institutions as actors stay allowed.
import { scoreVoice } from '@/lib/voice/score';
import { tellCompileErrors } from '@/lib/voice/tells';
import { ok, report } from './_harness';

const has = (lang: string, body: string, key: string) => scoreVoice({ title: 't', body, lang, desk: 'news' as never }).tells.some((t) => t.key === key);
const LANGS = ['en', 'de', 'el', 'pl', 'ro', 'ru', 'ar'] as const;
for (const l of LANGS) ok(`${l}: attribution detectors compile`, tellCompileErrors(l).length === 0);

ok('en: outlet named as the origin of a fact', has('en', '<p>Cyprus Mail reported in 2014 that the project runs for 53 years.</p>', 'source_outlet'));
ok('en: consultancy named', has('en', '<p>PwC puts Limassol at 41% of the island\'s transaction value.</p>', 'source_outlet'));
ok('en: according to', has('en', '<p>The harbour opened in 2014, according to the operator.</p>', 'source_attribution'));
ok('en: writer talks about the research', has('en', '<p>I found no later confirmation that work has begun.</p>', 'source_meta') && has('en', '<p>The sources differ on the height.</p>', 'source_meta'));
ok('en: an actor in the story is allowed', !['source_outlet', 'source_attribution', 'source_meta'].some((k) => has('en', '<p>The council approved the basements in March 2024. Mayor Yiannis Armeftis said the scheme would add 300 public parking spaces.</p>', k)));
ok('de: laut / zufolge', has('de', '<p>Der Hafen wurde 2014 eröffnet, laut den Betreibern.</p>', 'source_attribution') && has('de', '<p>Dem Bericht zufolge dauert der Vertrag 53 Jahre.</p>', 'source_attribution'));
ok('pl: według', has('pl', '<p>Według portalu port otwarto w 2014 roku.</p>', 'source_attribution'));
ok('ro: potrivit', has('ro', '<p>Potrivit presei, portul s-a deschis în 2014.</p>', 'source_attribution'));
ok('ro: "conform legii" is law, not a source', !has('ro', '<p>Conform legii, clădirea nu poate depăși 25 de etaje.</p>', 'source_attribution'));
ok('ru: согласно a report, but not a law', has('ru', '<p>Согласно отчёту оператора, порт открылся в 2014 году.</p>', 'source_attribution') && !has('ru', '<p>Согласно закону, башня не может быть выше 25 этажей.</p>', 'source_attribution'));
ok('pl: "według stanu na" is a date, not a source', !has('pl', '<p>Stawki podano według stanu na 2026 rok.</p>', 'source_attribution'));
ok('ar: "depending on" is not a source', !has('ar', '<p>تختلف المدة بحسب الموسم.</p>', 'source_attribution'));
ok('ru: по данным', has('ru', '<p>По данным компании, порт открылся в 2014 году.</p>', 'source_attribution'));
ok('el: σύμφωνα με', has('el', '<p>Σύμφωνα με τον δήμο, το λιμάνι άνοιξε το 2014.</p>', 'source_attribution'));
ok('ar: بحسب', has('ar', '<p>بحسب تقرير للشركة، افتتحت المرسى عام 2014.</p>', 'source_attribution'));
ok('ru/el/ar outlets', has('ru', '<p>Об этом пишет Рейтер.</p>', 'source_outlet') && has('el', '<p>Το γράφει η Βικιπαίδεια.</p>', 'source_outlet') && has('ar', '<p>نشرت رويترز الخبر.</p>', 'source_outlet'));
report('voice.attribution');
