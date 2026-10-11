// Owner decision (5.2): show every page in every edition; a missing translation falls back to English.
import { pick, pickList } from '../../lib/queries';
import { localizedIntent, localizedDomain } from '../../lib/knowledge/qa.i18n';
import { localizedMarket } from '../../lib/knowledge/markets.i18n';
import { alternatesFor } from '../../lib/seo';
import { LOCALES } from '../../lib/locales';
import { eq, ok, report } from './_harness';

const row = { title_en: 'Wine route', title_el: '', title_ro: '   ', title_ar: null, title_de: 'Weinroute', summary_en: 'S' };
eq('empty el -> English', pick(row, 'title', 'el'), 'Wine route');
eq('whitespace ro -> English', pick(row, 'title', 'ro'), 'Wine route');
eq('null ar -> English', pick(row, 'title', 'ar'), 'Wine route');
eq('missing column pl -> English', pick(row, 'title', 'pl'), 'Wine route');
eq('real translation wins', pick(row, 'title', 'de'), 'Weinroute');
eq('nothing at all -> empty string', pick(row, 'content', 'ru'), '');
eq('summary fallback', pick(row, 'summary', 'ru'), 'S');
eq('empty localised tag array -> English tags', pickList({ tags_en: ['a'], tags_el: [] }, 'tags', 'el'), ['a']);
eq('null tag array -> English tags', pickList({ tags_en: ['a'], tags_el: null }, 'tags', 'el'), ['a']);
eq('real localised tags win', pickList({ tags_en: ['a'], tags_el: ['β'] }, 'tags', 'el'), ['β']);
eq('no tags anywhere -> []', pickList({}, 'tags', 'el'), []);

// knowledge base: unknown id / gap -> English, never empty
for (const l of LOCALES) {
  const i = localizedIntent('__no_such_intent__', l);
  ok(`${l}: unknown intent does not throw`, typeof i.q === 'string' && typeof i.a === 'string');
  ok(`${l}: unknown domain does not throw`, typeof localizedDomain('__nope__', l).title === 'string');
  ok(`${l}: unknown market does not throw`, typeof localizedMarket('__nope__', l).title === 'string');
}

// SEO: every page self-canonicals and lists all editions + x-default (no noindex gate)
const alt = alternatesFor('el', '/agenda/some-event');
eq('canonical is the page itself', alt.canonical.endsWith('/el/agenda/some-event'), true);
eq('hreflang lists all 7 editions + x-default', Object.keys(alt.languages).sort(), [...LOCALES, 'x-default'].sort());
report('english-fallback');
