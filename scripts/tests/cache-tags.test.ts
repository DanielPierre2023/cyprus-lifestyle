// Tag-based revalidation vocabulary (lib/cache/tags.ts): the exact tags an edit must
// invalidate, locale scoping, and rejection of unsafe input.
import { base, withLocale, parseChange, changesFromWebhook, tagsForChange, cleanLocales, MAX_TAGS_PER_CALL } from '../../lib/cache/tags';
import { eq, ok, report } from './_harness';

eq('withLocale pairs base and @locale', withLocale('article:x', 'de'), ['article:x', 'article:x@de']);
eq('dir(null) is the catch-all', base.dir(null), 'dir:all');
eq('dir(type)', base.dir('winery'), 'dir:winery');

// article publish/edit -> its page, the home feed, its category - in all locales (base tags)
eq('article tags', tagsForChange({ kind: 'article', slug: 'a-b', category: 'property' }), ['article:a-b', 'home', 'cat:property']);
eq('article without category', tagsForChange({ kind: 'article', slug: 'a-b' }), ['article:a-b', 'home']);
// one translation -> only that locale's tags
eq('single-locale scope', tagsForChange({ kind: 'article', slug: 'a-b', category: 'style', locales: ['de'] }), ['article:a-b@de', 'home@de', 'cat:style@de']);
eq('two locales', tagsForChange({ kind: 'article', slug: 's', locales: ['de', 'pl'] }), ['article:s@de', 'article:s@pl', 'home@de', 'home@pl']);
eq('listing tags', tagsForChange({ kind: 'listing', slug: 'oenou', type: 'winery' }), ['listing:oenou', 'dir:winery']);
eq('listing unknown type -> catch-all', tagsForChange({ kind: 'listing', slug: 'x' }), ['listing:x', 'dir:all']);
eq('event tags', tagsForChange({ kind: 'event', slug: 'jazz' }), ['event:jazz', 'events']);

// a cached read carries the base + locale twin, so both invalidation shapes hit it
const read = withLocale(base.article('a-b'), 'de');
ok('all-locale invalidation hits the read', tagsForChange({ kind: 'article', slug: 'a-b' }).some((t) => read.includes(t)));
ok('de-only invalidation hits the de read', tagsForChange({ kind: 'article', slug: 'a-b', locales: ['de'] }).some((t) => read.includes(t)));
ok('pl-only invalidation misses the de read', !tagsForChange({ kind: 'article', slug: 'a-b', locales: ['pl'] }).some((t) => read.includes(t)));
ok('other article never hit', !tagsForChange({ kind: 'article', slug: 'other' }).some((t) => t.startsWith('article:a-b')));

// parseChange - untrusted input
eq('valid article', parseChange({ kind: 'article', slug: 'x1', category: 'style' }), { kind: 'article', slug: 'x1', category: 'style' });
eq('unsafe slug rejected', parseChange({ kind: 'article', slug: '../etc' }), null);
eq('slug with space rejected', parseChange({ kind: 'article', slug: 'a b' }), null);
eq('unknown kind rejected', parseChange({ kind: 'user', slug: 'x' }), null);
eq('non-object rejected', parseChange('x'), null);
eq('unsafe category dropped (not fatal)', parseChange({ kind: 'article', slug: 'x', category: 'a/b' }), { kind: 'article', slug: 'x' });
eq('unknown locales dropped', cleanLocales(['de', 'xx', 'de', 5]), ['de']);
eq('locales kept on change', parseChange({ kind: 'event', slug: 'e', locales: ['ar', 'zz'] }), { kind: 'event', slug: 'e', locales: ['ar'] });
ok('tag cap respected', tagsForChange({ kind: 'article', slug: 's', category: 'c', locales: ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] }).length <= MAX_TAGS_PER_CALL);

// Supabase Database Webhook payloads
eq('webhook blog_posts', changesFromWebhook({ type: 'UPDATE', table: 'blog_posts', record: { slug: 'n', category: 'style' }, old_record: { slug: 'n', category: 'style' } }),
  [{ kind: 'article', slug: 'n', category: 'style' }, { kind: 'article', slug: 'n', category: 'style' }]);
const moved = changesFromWebhook({ type: 'UPDATE', table: 'blog_posts', record: { slug: 'n', category: 'property' }, old_record: { slug: 'n', category: 'style' } });
const movedTags = new Set(moved.flatMap(tagsForChange));
ok('moving category refreshes BOTH categories', movedTags.has('cat:property') && movedTags.has('cat:style'));
eq('webhook directory', changesFromWebhook({ table: 'directory_listings', record: { slug: 'l', type: 'hotel' } }), [{ kind: 'listing', slug: 'l', type: 'hotel' }]);
eq('webhook events', changesFromWebhook({ table: 'events', record: { slug: 'e' } }), [{ kind: 'event', slug: 'e' }]);
eq('webhook other table ignored', changesFromWebhook({ table: 'profiles', record: { slug: 'x' } }), []);
eq('webhook garbage', changesFromWebhook(null), []);
eq('webhook DELETE uses old_record', changesFromWebhook({ type: 'DELETE', table: 'blog_posts', record: null, old_record: { slug: 'gone', category: 'style' } }), [{ kind: 'article', slug: 'gone', category: 'style' }]);

report('cache-tags');
