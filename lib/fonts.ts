// lib/fonts.ts — the site's web fonts, on a diet (Phase 6.1).
//
// Measured on the 2026-10-05 production compile: EVERY page of EVERY locale preloaded
// 21 font files = 650 KB (Amiri + Aref Ruqaa, the Arabic faces, alone were 354 KB and are
// never used outside /ar). Facts about next/font/google that make the fix small:
//   - `subsets` controls ONLY which files are <link rel=preload>ed. The @font-face rules for
//     every unicode-range block Google serves (latin-ext, cyrillic, vietnamese ...) are
//     emitted regardless, with unicode-range, so a browser still fetches Cyrillic / Polish /
//     Romanian glyph files on demand - just not up front on pages that never use them.
//   - `preload: false` drops the preload hints entirely (the faces still work).
// So:
//   1. Latin faces (Bodoni Moda, Jost, Lora): preload the `latin` subset only. The ru / pl / ro
//      editions fetch their extra block lazily the first time those glyphs render.
//   2. Arabic faces (Amiri, Aref Ruqaa): preload:false - never preloaded, fetched only on /ar
//      where Arabic text is actually rendered.
//   3. Weights are no longer enumerated for the variable faces (one range rule per style
//      instead of 3-4 near-identical rules; same woff2 files).
// The CSS variable names are unchanged (--font-bodoni, --font-jost, --font-lora,
// --font-amiri, --font-aref), so globals.css is untouched.
import { Bodoni_Moda, Jost, Lora, Amiri, Aref_Ruqaa } from 'next/font/google';

const bodoni = Bodoni_Moda({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-bodoni', display: 'swap' });
const jost = Jost({ subsets: ['latin'], variable: '--font-jost', display: 'swap' });
const lora = Lora({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-lora', display: 'swap' });
// Amiri / Aref Ruqaa have no variable build on Google Fonts: static weights, no preload.
const amiri = Amiri({ subsets: ['arabic', 'latin'], weight: ['400', '700'], variable: '--font-amiri', display: 'swap', preload: false });
const arefRuqaa = Aref_Ruqaa({ subsets: ['arabic', 'latin'], weight: ['400', '700'], variable: '--font-aref', display: 'swap', preload: false });

/** className for <html>: declares the font CSS variables. */
export const fontClassNames = `${bodoni.variable} ${jost.variable} ${lora.variable} ${amiri.variable} ${arefRuqaa.variable}`;
