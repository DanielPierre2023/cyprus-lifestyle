// authorJsonLd (pure): Person for a named editor, Organization for a house desk, and nothing
// that is not in the authors table.
import { authorJsonLd } from '@/lib/seo/authorJsonLd';
import { articleJsonLd } from '@/lib/seo';
import { eq, ok, report } from './_harness';

const person = authorJsonLd({ locale: 'en', slug: 'christiana-pavlou', name: 'Christiana Pavlou', title: 'Culture & Society Editor', bio: 'Follows Cyprus culture and society.', editorKey: null, socialX: null });
eq('named editor is a Person', person['@type'], 'Person');
eq('Person name comes from the row', person.name, 'Christiana Pavlou');
eq('Person jobTitle comes from the row', person.jobTitle, 'Culture & Society Editor');
eq('Person url is the author page', person.url, 'https://cypruslifestyle.eu/author/christiana-pavlou');
ok('Person works for the site organisation', (person.worksFor as { '@id': string })['@id'].endsWith('/#organization'));
ok('no sameAs when the row has no social profile', person.sameAs === undefined);
ok('no image, email or address is invented', !('image' in person) && !('email' in person) && !('address' in person));

const de = authorJsonLd({ locale: 'de', slug: 'elena-georgiou', name: 'Elena Georgiou', title: null, bio: null, editorKey: null });
eq('locale prefix on the url', de.url, 'https://cypruslifestyle.eu/de/author/elena-georgiou');
ok('missing title and bio stay absent', de.jobTitle === undefined && de.description === undefined);

eq('X handle becomes a profile url', (authorJsonLd({ locale: 'en', slug: 'a', name: 'A', socialX: '@elena_g' }).sameAs as string[])[0], 'https://x.com/elena_g');
eq('full url is kept', (authorJsonLd({ locale: 'en', slug: 'a', name: 'A', socialX: 'https://x.com/elena_g' }).sameAs as string[])[0], 'https://x.com/elena_g');
ok('a junk handle is dropped', authorJsonLd({ locale: 'en', slug: 'a', name: 'A', socialX: 'not a handle!' }).sameAs === undefined);

const desk = authorJsonLd({ locale: 'en', slug: 'cyprus-desk', name: 'The Cyprus Desk', title: 'Cyprus & Politics', bio: 'The house desk.', editorKey: 'cyprus' });
eq('a house desk stays an Organization', desk['@type'], 'Organization');
ok('desk is parented to the publisher', (desk.parentOrganization as { '@id': string })['@id'].endsWith('/#organization'));

// The article byline points at the same url as the profile page.
const art = articleJsonLd({ locale: 'en', slug: 's', title: 'T', author: 'Christiana Pavlou', authorSlug: 'christiana-pavlou' });
eq('article byline is a Person with the profile url', [(art.author as { '@type': string })['@type'], (art.author as { url: string }).url], ['Person', person.url]);
const deskArt = articleJsonLd({ locale: 'en', slug: 's', title: 'T', author: 'The Cyprus Lifestyle Desk', authorSlug: null });
eq('an article without an author row falls back to the Organization', (deskArt.author as { '@type': string })['@type'], 'Organization');

report('author-jsonld.pure');
