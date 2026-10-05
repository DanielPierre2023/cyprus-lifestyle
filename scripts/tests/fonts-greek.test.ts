// Greek fonts (lib/fontsGreek.ts): the /el-only stylesheet and preload list, and that the files they name really exist.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GREEK_FACES, GREEK_RANGE, greekFontCss, greekPreloadHrefs } from '../../lib/fontsGreek';
import { eq, ok, report } from './_harness';

const css = greekFontCss();
eq('five faces: display n+i, serif n+i, sans n', GREEK_FACES.length, 5);
ok('every @font-face is restricted to the Greek unicode-range', (css.match(/@font-face/g) || []).length === 5 && (css.match(/unicode-range:U\+0370-0377/g) || []).length === 5);
ok('range excludes Basic Latin (so Latin pages/glyphs never pull these files)', !/U\+00|U\+0041|U\+0020/.test(GREEK_RANGE));
ok('font-display swap everywhere', (css.match(/font-display:swap/g) || []).length === 5);
ok('stacks keep the brand face first, Greek next', /--disp:var\(--font-bodoni\),"Bodoni Moda","CL Greek Display"/.test(css) && /--body:var\(--font-lora\),"Lora","CL Greek Serif"/.test(css) && /--sans:var\(--font-jost\),"Jost","CL Greek Sans"/.test(css));
ok('stacks apply to html[lang="el"] only', css.endsWith('}') && css.includes('html[lang="el"]{') && !/^\s*:root/.test(css));

const hrefs = greekPreloadHrefs();
eq('only the three upright faces are preloaded', hrefs.length, 3);
ok('no italic is preloaded', hrefs.every((h) => !h.includes('italic')));

let preloadBytes = 0;
for (const f of GREEK_FACES) {
  const p = join(process.cwd(), 'public', 'fonts', 'el', f.file);
  ok(`${f.file} exists`, existsSync(p));
  if (existsSync(p) && hrefs.includes('/fonts/el/' + f.file)) preloadBytes += statSync(p).size;
}
ok('preloaded Greek bytes stay under 70 KB', preloadBytes > 0 && preloadBytes < 70 * 1024);

report('fonts-greek');
