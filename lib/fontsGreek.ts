// lib/fontsGreek.ts - Greek-capable faces for the /el edition ONLY (Increment 6.2). PURE (no Next imports).
//
// Jost, Lora and Bodoni Moda have no Greek glyphs, so Greek text used to fall back to whatever serif/sans the visitor's device has.
// Three FREE Google families have a Greek subset and echo the editorial look:
//   Noto Serif Display -> headings (a high-contrast Didone-like serif, like Bodoni Moda)
//   Noto Serif         -> body text (a quiet text serif, like Lora)
//   Manrope            -> kickers, navigation, UI (a geometric sans, like Jost)
//
// Why plain self-hosted files in /public/fonts/el instead of next/font/google (checked on a real build):
//   - next/font preloads per LAYOUT FILE, not per page value. The one locale layout is shared by all seven editions, so any
//     next/font import (even via import()) made all 5-10 Greek files preload on EVERY page: +130-290 KB for en/de/ro/pl/ru/ar.
//   - next/font also writes the @font-face rules of every unicode-range block (cyrillic, vietnamese ...) into the global CSS:
//     +12.7 KB of CSS on every page, Latin ones included.
// Here the @font-face rules and the preload hints are rendered only when locale === 'el' (app/[locale]/layout.tsx), so every other
// edition receives exactly the same bytes as before. The files are the unmodified Google-served Greek subsets (OFL, see README).
//
// How the faces are used: --sans/--disp/--body keep the Latin face FIRST (Jost / Bodoni Moda / Lora cover Latin letters and
// digits) and the Greek face next. The Latin faces' unicode-range contains no Greek, so the browser takes Greek characters from
// the Greek face and everything else from the brand face - the masthead and numbers look exactly as on the other editions.

export const GREEK_RANGE = 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF';
const DIR = '/fonts/el/';

interface Face { family: string; file: string; style: 'normal' | 'italic'; weight: string; preload: boolean }

/** Only the upright faces are preloaded (what is above the fold); italics are fetched when italic Greek text renders. */
export const GREEK_FACES: readonly Face[] = [
  { family: 'CL Greek Display', file: 'noto-serif-display-greek-normal.woff2', style: 'normal', weight: '400 700', preload: true },
  { family: 'CL Greek Display', file: 'noto-serif-display-greek-italic.woff2', style: 'italic', weight: '400 700', preload: false },
  { family: 'CL Greek Serif',   file: 'noto-serif-greek-normal.woff2',         style: 'normal', weight: '400 700', preload: true },
  { family: 'CL Greek Serif',   file: 'noto-serif-greek-italic.woff2',         style: 'italic', weight: '400 700', preload: false },
  { family: 'CL Greek Sans',    file: 'manrope-greek-normal.woff2',            style: 'normal', weight: '300 700', preload: true },
];

/** hrefs to <link rel="preload" as="font"> on /el. */
export const greekPreloadHrefs = (): string[] => GREEK_FACES.filter((f) => f.preload).map((f) => DIR + f.file);

/** The complete, el-only stylesheet: the @font-face rules plus the three font stacks. */
export function greekFontCss(): string {
  const faces = GREEK_FACES.map((f) =>
    `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${f.weight};font-display:swap;` +
    `src:url(${DIR + f.file}) format("woff2");unicode-range:${GREEK_RANGE}}`,
  ).join('');
  const stacks =
    'html[lang="el"]{' +
    '--sans:var(--font-jost),"Jost","CL Greek Sans","Futura",system-ui,sans-serif;' +
    '--disp:var(--font-bodoni),"Bodoni Moda","CL Greek Display","Didot",var(--font-lora),Georgia,serif;' +
    '--body:var(--font-lora),"Lora","CL Greek Serif",Georgia,"Times New Roman",serif}';
  return faces + stacks;
}
