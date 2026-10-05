// Article HTML sanitiser — blocks script injection, keeps real editorial markup intact.
import { sanitizeArticleHtml as clean } from '@/lib/sanitizeHtml';
import { eq, ok, report } from './_harness';

// Legit editorial markup survives byte-for-byte.
const good = '<h2>The marina</h2><p>A <strong>quiet</strong> <em>harbour</em> — see <a href="/directory/g/restaurants">our guide</a> and <a href="https://example.com/x" title="t">source</a>.</p><ul><li>One</li><li>Two</li></ul><blockquote>Quote</blockquote>';
eq('editorial markup preserved', clean(good), good);
ok('root-relative links preserved', clean('<a href="/ask">x</a>').includes('href="/ask"'));
ok('mailto and tel preserved', clean('<a href="mailto:a@b.cy">m</a><a href="tel:+35725000000">t</a>').includes('mailto:a@b.cy') && clean('<a href="tel:+35725000000">t</a>').includes('tel:'));

// Script and event handlers are gone.
ok('script tag and its code removed', !/script|alert/.test(clean('<p>a</p><script>alert(1)</script>')));
ok('onerror handler removed', !/onerror|alert/.test(clean('<img src="https://x.cy/a.jpg" onerror="alert(1)">')));
ok('onclick removed', !/onclick/.test(clean('<p onclick="x()">hi</p>')));
ok('javascript: href removed', !/javascript:/i.test(clean('<a href="javascript:alert(1)">x</a>')));
ok('obfuscated javascript: href removed', !/javascript:/i.test(clean('<a href="  JaVaScRiPt:alert(1)">x</a>')) && !/javascript/i.test(clean('<a href="java&#115;cript:alert(1)">x</a>')));
ok('data: URL image removed', !/data:/i.test(clean('<img src="data:text/html;base64,PHNjcmlwdD4=">')));
ok('iframe removed with content', !/iframe|evil/.test(clean('<iframe src="https://evil.example"></iframe><p>ok</p>')));
ok('style tag removed', !/style|display/.test(clean('<style>body{display:none}</style><p>ok</p>')));
ok('inline style attribute removed', !/style=/.test(clean('<p style="position:fixed;inset:0">x</p>')));
ok('svg onload removed', !/svg|onload|alert/.test(clean('<svg onload="alert(1)"></svg><p>x</p>')));
ok('form / input removed', !/<form|<input/.test(clean('<form action="https://evil"><input name="pw"></form>')));
ok('protocol-relative URL removed', !clean('<a href="//evil.example/x">x</a>').includes('//evil.example'));

// Link hardening.
ok('target=_blank gets rel noopener', /rel="noopener noreferrer"/.test(clean('<a href="https://x.cy" target="_blank">x</a>')));
ok('odd target values dropped', !/target=/.test(clean('<a href="https://x.cy" target="_top">x</a>')));
ok('images lazy-load', /loading="lazy"/.test(clean('<img src="https://x.cy/a.jpg" alt="a">')));

// Robustness.
eq('null → empty string', clean(null), '');
eq('undefined → empty string', clean(undefined), '');
eq('non-string → empty string', clean(42), '');
eq('empty → empty', clean(''), '');
ok('unclosed tags do not throw', typeof clean('<p><strong>open') === 'string');

report('sanitize-html');
