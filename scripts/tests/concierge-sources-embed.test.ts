// Increment 2.1 — embedding documents + the re-embed plan (pure; no API call is ever made).
import { articleDoc, eventDoc, activityDoc, planEmbeds, chunk, tokensOf, hashText } from '@/lib/concierge/embedSources';
import { eq, ok, report } from './_harness';

const a = articleDoc({ slug: 'troodos', title_en: 'Troodos', title_de: 'Troodos-Dörfer', title_ru: 'Троодос', category: 'travel', tags_en: ['hiking'], excerpt_en: 'Walk', content_en: '<p>Body text</p>' });
ok('article doc built', !!a);
ok('every locale title embedded', !!a && a.text.includes('Troodos-Dörfer') && a.text.includes('Троодос'));
ok('html stripped from body', !!a && !a.text.includes('<p>'));
eq('hash is deterministic', a?.hash, hashText(a?.text || ''));
eq('article without title rejected', articleDoc({ slug: 'x' }), null);

const e1 = eventDoc({ slug: 'jazz', title_en: 'Jazz', starts_at: '2026-10-10T10:00:00Z' });
const e2 = eventDoc({ slug: 'jazz', title_en: 'Jazz', starts_at: '2026-11-11T10:00:00Z' });
eq('event hash ignores dates (a reschedule must not force a re-embed)', e1?.hash, e2?.hash);

const act = activityDoc({ external_id: '9', title: 'Boat trip', kind: 'boat', summary: 'Sea', town: 'Latchi', tags: ['family'] });
ok('activity doc keyed by external_id', act?.ref === '9' && act?.source === 'activity');
eq('activity without id rejected', activityDoc({ title: 'x' }), null);

const docs = [a!, e1!, act!];
eq('first run embeds everything', planEmbeds(docs, new Map()).length, 3);
eq('unchanged → nothing to embed', planEmbeds(docs, new Map(docs.map((d) => [`${d.source}:${d.ref}`, d.hash]))).length, 0);
const changed = new Map(docs.map((d) => [`${d.source}:${d.ref}`, d.hash]));
changed.set('article:troodos', 'old');
eq('only the changed doc is re-embedded', planEmbeds(docs, changed).map((d) => d.ref), ['troodos']);
eq('force re-embeds all', planEmbeds(docs, changed, true).length, 3);
eq('chunk', chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
ok('token estimate positive', tokensOf(docs) > 0);
report('concierge-sources-embed');
