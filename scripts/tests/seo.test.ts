// SEO pure-logic suite — the deterministic, DB-free helpers added for the
// technical-SEO pass: the <title> clamp, the NewsArticle `speakable` /
// `author.sameAs` additions, the WebSite SearchAction, and the image-sitemap
// output. Everything here is synchronous (no top-level await); the model/DB
// paths are integration and live elsewhere.
import {
  clampSeoTitle,
  articleJsonLd,
  orgJsonLd,
  SITE_NAME,
} from '@/lib/seo';
import { urlsetXml, type UrlEntry } from '@/lib/seo/sitemap';
import { eq, ok, report } from './_harness';

// ── clampSeoTitle ─────────────────────────────────────────────────────────────
// Fits within budget → branded form "<title> · <brand>".
const shortTitle = 'A Day in Paphos';
eq('clamp adds brand when it fits', clampSeoTitle(shortTitle), `${shortTitle} · ${SITE_NAME}`);
ok('branded form stays within 60', clampSeoTitle(shortTitle).length <= 60);

// Title fits but the branded form would overflow → bare title, no brand suffix.
const midTitle = 'A'.repeat(45); // 45 + " · Cyprus Lifestyle" (19) = 64 > 60
eq('clamp drops brand when branded overflows', clampSeoTitle(midTitle), midTitle);
ok('bare title is within 60', clampSeoTitle(midTitle).length <= 60);
ok('bare title carries no brand separator', !clampSeoTitle(midTitle).includes('·'));

// Over-long title → hard-trimmed to max.
const longTitle = 'A'.repeat(80);
ok('very long title clamped to <=max (default 60)', clampSeoTitle(longTitle).length <= 60);
ok('very long title clamped to custom max', clampSeoTitle(longTitle, SITE_NAME, 30).length <= 30);
ok('clamp tidies trailing whitespace', !/\s$/.test(clampSeoTitle('word '.repeat(20))));
eq('clamp on empty input yields the bare brand line', clampSeoTitle(''), ` · ${SITE_NAME}`);

// ── articleJsonLd: speakable + author.sameAs ────────────────────────────────────
const artBase = articleJsonLd({
  locale: 'en', slug: 'hello-cyprus', title: 'Hello Cyprus',
  author: 'Jane Doe', authorSlug: 'jane-doe',
}) as Record<string, any>;
eq('articleJsonLd is a NewsArticle', artBase['@type'], 'NewsArticle');
ok('articleJsonLd includes speakable', artBase.speakable?.['@type'] === 'SpeakableSpecification');
eq('speakable targets h1 + .dek', artBase.speakable?.cssSelector, ['h1', '.dek']);
ok('author has no sameAs without input', artBase.author?.sameAs === undefined);

const artSame = articleJsonLd({
  locale: 'en', slug: 'hello-cyprus', title: 'Hello Cyprus',
  author: 'Jane Doe', authorSlug: 'jane-doe',
  authorSameAs: ['https://www.linkedin.com/in/jane-doe', 'https://x.com/janedoe'],
}) as Record<string, any>;
ok('author.sameAs present when provided', Array.isArray(artSame.author?.sameAs));
ok('author.sameAs carries the given profiles', artSame.author?.sameAs?.includes('https://www.linkedin.com/in/jane-doe'));
ok('article with authorSameAs still has speakable', artSame.speakable?.['@type'] === 'SpeakableSpecification');

// ── orgJsonLd: WebSite SearchAction ─────────────────────────────────────────────
const org = orgJsonLd() as Record<string, any>;
const graph = (org['@graph'] as Record<string, any>[]) || [];
const site = graph.find((n) => n['@type'] === 'WebSite');
ok('orgJsonLd exposes a WebSite node', !!site);
ok('WebSite has a SearchAction', site?.potentialAction?.['@type'] === 'SearchAction');
ok('SearchAction target uses search_term_string', /q=\{search_term_string\}/.test(site?.potentialAction?.target || ''));
eq('SearchAction query-input is well-formed', site?.potentialAction?.['query-input'], 'required name=search_term_string');

// ── image sitemap: urlXml / urlsetXml ───────────────────────────────────────────
const withImg: UrlEntry[] = [{ path: '/article/hello', image: 'https://cypruslifestyle.eu/img/hello.jpg' }];
const xml = urlsetXml(withImg);
ok('urlset declares the image namespace', xml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
ok('url emits <image:image>', xml.includes('<image:image>'));
ok('url emits <image:loc> with the image url', xml.includes('<image:loc>https://cypruslifestyle.eu/img/hello.jpg</image:loc>'));
ok('hreflang alternates remain intact alongside the image', xml.includes('rel="alternate"') && xml.includes('hreflang="x-default"'));

const noImg = urlsetXml([{ path: '/article/plain' }]);
ok('no image → no <image:image> tag', !noImg.includes('<image:image>'));

const escaped = urlsetXml([{ path: '/x', image: 'https://cypruslifestyle.eu/a?b=1&c=2' }]);
ok('image loc is XML-escaped', escaped.includes('<image:loc>https://cypruslifestyle.eu/a?b=1&amp;c=2</image:loc>'));

report('seo.pure');
