// lib/og/igCard.tsx — the editorial picture of Cyprus Lifestyle: three looks in two shapes.
//   masthead  full-bleed photograph, magazine masthead on top, headline as a cover line     (article with a photo)
//   arch      ivory paper, the photograph in a Mediterranean arch with a gold outline        (food, travel, lifestyle)
//   noir      obsidian, monumental monogram, gold ornament, headline                          (no photograph)
// portrait 1080 x 1350 = the Instagram picture; landscape 1200 x 630 = the Facebook / link-preview card (lib/og/card.tsx).
// Headlines are set in Bodoni Moda (a free Didone, SIL OFL); Greek and Cyrillic fall back to Noto Serif. The Arabic edition
// carries the masthead only (the renderer cannot shape Arabic): its headline travels in the caption / page title.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import type { Locale } from '@/lib/locales';
import { SIZES, fitHeadline, headlineSize, needsSerifFallback, type Format, type Variant } from '@/lib/og/igText';

export { fitHeadline, headlineSize };
export const IG_CARD = SIZES.portrait;

const fontsPromise = (async () => {
  const dir = join(process.cwd(), 'lib', 'og');
  const [noto, b, bi] = await Promise.all([
    readFile(join(dir, 'NotoSerif-static.ttf')),
    readFile(join(dir, 'BodoniModa-500.woff')), readFile(join(dir, 'BodoniModa-500-italic.woff')),
  ]);
  return [
    { name: 'Noto Serif', data: noto, style: 'normal' as const, weight: 600 as const },
    { name: 'Bodoni', data: b, style: 'normal' as const, weight: 500 as const },
    { name: 'Bodoni', data: bi, style: 'italic' as const, weight: 500 as const },
  ];
})();

const GOLD = '#C9A24C', CHAMPAGNE = '#E6D6AE', IVORY = '#F6F1E7', OBSIDIAN = '#0B0E11', INK = '#15130F', GOLD_DEEP = '#9A7A2E';

const mono = (s: number, color = IVORY, ring = 2) => (
  <div style={{ width: s, height: s, borderRadius: s, border: `${ring}px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: Math.round(s * 0.37), letterSpacing: 2, fontFamily: 'Noto Serif' }}>CL</div>
);
const ornament = (w = 120, align: 'center' | 'flex-start' = 'center') => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: align }}>
    <div style={{ width: w, height: 1, backgroundColor: GOLD, display: 'flex' }} />
    <div style={{ width: 12, height: 12, backgroundColor: GOLD, transform: 'rotate(45deg)', display: 'flex' }} />
    <div style={{ width: w, height: 1, backgroundColor: GOLD, display: 'flex' }} />
  </div>
);
// Capitals in Greek are written without accents (ΤΡΑΠΕΖΙ, not ΤΡΑΠΈΖΙ): toLocaleUpperCase('el') does that.
const caps = (text: string, size: number, spacing: number, color: string, extra: Record<string, string | number> = {}) => (
  <div style={{ color, fontSize: size, letterSpacing: spacing, fontFamily: 'Noto Serif', display: 'flex', ...extra }}>{/[\u0370-\u03FF]/.test(text) ? text.toLocaleUpperCase('el') : text.toUpperCase()}</div>
);

export interface EditorialOptions {
  variant: Variant; format: Format; title: string; kicker?: string; locale: Locale;
  /** The photograph already cropped to photoBox(variant, format); null for the noir look. */
  photo?: Buffer | null;
}

export async function editorialImage(o: EditorialOptions) {
  const fonts = await fontsPromise;
  const { format } = o;
  const { width: W, height: H } = SIZES[format];
  const rtl = o.locale === 'ar';
  const title = fitHeadline(o.title, format === 'portrait' ? 120 : 100);
  const size = headlineSize(title, o.variant, format);
  const headFont = needsSerifFallback(title) ? 'Noto Serif' : 'Bodoni';
  // A kicker that only repeats the brand adds nothing next to the wordmark.
  const kicker = /^cyprus\s+lifestyle$/i.test((o.kicker || '').trim()) ? '' : (o.kicker || '').trim();
  const photo = o.photo ? `data:image/jpeg;base64,${o.photo.toString('base64')}` : null;
  const variant: Variant = !photo && o.variant !== 'noir' ? 'noir' : o.variant;
  const P = format === 'portrait';

  const headline = (color: string, align: 'center' | 'flex-start', maxWidth: number) => rtl ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align }}>{caps('The Arabic Edition', P ? 28 : 20, P ? 10 : 7, color === INK ? GOLD_DEEP : GOLD)}</div>
  ) : (
    <div style={{ color, fontSize: size, lineHeight: 1.07, fontFamily: headFont, maxWidth, display: 'flex', textAlign: align === 'center' ? 'center' : 'left', justifyContent: align }}>{title}</div>
  );

  let tree: JSX.Element;

  if (variant === 'masthead') {
    tree = (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: OBSIDIAN }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={photo!} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', backgroundImage: P
          ? 'linear-gradient(180deg, rgba(11,14,17,0.78) 0%, rgba(11,14,17,0.12) 26%, rgba(11,14,17,0.18) 52%, rgba(11,14,17,0.96) 100%)'
          : 'linear-gradient(180deg, rgba(11,14,17,0.90) 0%, rgba(11,14,17,0.58) 26%, rgba(11,14,17,0.50) 48%, rgba(11,14,17,0.96) 100%)' }} />
        <div style={{ position: 'absolute', top: P ? 36 : 22, left: P ? 36 : 22, width: W - (P ? 72 : 44), height: H - (P ? 72 : 44), display: 'flex', border: '1px solid rgba(230,214,174,0.6)' }} />
        {P ? (
          <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '78px 80px 92px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {mono(74)}
              <div style={{ color: IVORY, fontSize: 92, letterSpacing: 16, fontFamily: 'Bodoni', marginTop: 26, display: 'flex' }}>CYPRUS</div>
              {caps('Lifestyle', 30, 30, CHAMPAGNE, { marginTop: 6, marginLeft: 30 })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {kicker && !rtl ? caps(kicker, 28, 10, GOLD, { marginBottom: 26 }) : null}
              {headline(IVORY, 'center', 880)}
              <div style={{ display: 'flex', marginTop: 40 }}>{ornament(120)}</div>
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 64px 56px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              {mono(58)}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: IVORY, fontSize: 42, letterSpacing: 12, fontFamily: 'Bodoni', display: 'flex', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>CYPRUS</div>
                {caps('Lifestyle', 15, 21, IVORY, { marginTop: 2, textShadow: '0 2px 10px rgba(0,0,0,0.7)' })}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {kicker && !rtl ? caps(kicker, 19, 8, GOLD, { marginBottom: 16 }) : null}
              {headline(IVORY, 'flex-start', 1040)}
              <div style={{ display: 'flex', marginTop: 24 }}>{ornament(46, 'flex-start')}</div>
            </div>
          </div>
        )}
      </div>
    );
  } else if (variant === 'arch') {
    const aw = P ? 700 : 340, ah = P ? 780 : 500, pad = P ? 18 : 12;
    const archWindow = (
      <div style={{ display: 'flex', position: 'relative', width: aw + pad * 2, height: ah + pad * 2, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: aw + pad * 2, height: ah + pad * 2, display: 'flex', border: `2px solid ${GOLD}`, borderTopLeftRadius: (aw + pad * 2) / 2, borderTopRightRadius: (aw + pad * 2) / 2 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={photo!} width={aw} height={ah} style={{ width: aw, height: ah, objectFit: 'cover', borderTopLeftRadius: aw / 2, borderTopRightRadius: aw / 2 }} />
      </div>
    );
    tree = P ? (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: IVORY, flexDirection: 'column', alignItems: 'center', padding: '70px 80px' }}>
        <div style={{ position: 'absolute', top: 30, left: 30, width: W - 60, height: H - 60, display: 'flex', border: `1px solid ${GOLD}` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>{mono(58, INK)}{caps('Cyprus Lifestyle', 30, 14, INK)}</div>
        <div style={{ display: 'flex', marginTop: 46 }}>{archWindow}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 40 }}>
          {kicker && !rtl ? caps(kicker, 24, 10, GOLD_DEEP, { marginBottom: 18 }) : null}
          {headline(INK, 'center', 860)}
        </div>
      </div>
    ) : (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: IVORY, alignItems: 'center', padding: '0 64px' }}>
        <div style={{ position: 'absolute', top: 18, left: 18, width: W - 36, height: H - 36, display: 'flex', border: `1px solid ${GOLD}` }} />
        <div style={{ display: 'flex' }}>{archWindow}</div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: H - 130, marginLeft: 58, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>{mono(50, INK)}{caps('Cyprus Lifestyle', 22, 11, INK)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {kicker && !rtl ? caps(kicker, 18, 8, GOLD_DEEP, { marginBottom: 14 }) : null}
            {headline(INK, 'flex-start', 560)}
            <div style={{ display: 'flex', marginTop: 24 }}>{ornament(40, 'flex-start')}</div>
          </div>
          {caps('The Island, At Its Best', 15, 7, GOLD_DEEP)}
        </div>
      </div>
    );
  } else {
    tree = P ? (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: OBSIDIAN }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(201,162,76,0.30) 0%, rgba(11,14,17,0) 58%)' }} />
        <div style={{ position: 'absolute', top: 36, left: 36, width: W - 72, height: H - 72, display: 'flex', border: `1px solid ${GOLD}` }} />
        <div style={{ position: 'absolute', top: 52, left: 52, width: W - 104, height: H - 104, display: 'flex', border: '1px solid rgba(201,162,76,0.35)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '104px 100px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 200, height: 200, borderRadius: 200, border: `3px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: IVORY, fontSize: 84, letterSpacing: 4, fontFamily: 'Noto Serif' }}>CL</div>
            {caps('Cyprus Lifestyle', 40, 20, IVORY, { marginTop: 38, marginLeft: 20 })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {ornament(110)}
            {kicker && !rtl ? <div style={{ color: GOLD, fontSize: 40, fontFamily: needsSerifFallback(kicker) ? 'Noto Serif' : 'Bodoni', fontStyle: needsSerifFallback(kicker) ? 'normal' : 'italic', marginTop: 34, marginBottom: 26, display: 'flex' }}>{kicker}</div> : <div style={{ display: 'flex', height: 34 }} />}
            {headline(IVORY, 'center', 840)}
          </div>
          {caps('The Island, At Its Best', 22, 9, CHAMPAGNE)}
        </div>
      </div>
    ) : (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: OBSIDIAN, alignItems: 'center', padding: '0 78px' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', backgroundImage: 'radial-gradient(ellipse at 22% 50%, rgba(201,162,76,0.26) 0%, rgba(11,14,17,0) 55%)' }} />
        <div style={{ position: 'absolute', top: 20, left: 20, width: W - 40, height: H - 40, display: 'flex', border: `1px solid ${GOLD}` }} />
        <div style={{ position: 'absolute', top: 32, left: 32, width: W - 64, height: H - 64, display: 'flex', border: '1px solid rgba(201,162,76,0.35)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300 }}>
          <div style={{ width: 168, height: 168, borderRadius: 168, border: `3px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: IVORY, fontSize: 70, letterSpacing: 3, fontFamily: 'Noto Serif' }}>CL</div>
          {caps('Cyprus', 20, 12, IVORY, { marginTop: 28, marginLeft: 12 })}
          {caps('Lifestyle', 20, 12, IVORY, { marginTop: 6, marginLeft: 12 })}
        </div>
        <div style={{ width: 1, height: 330, backgroundColor: 'rgba(201,162,76,0.6)', display: 'flex', margin: '0 56px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
          {kicker && !rtl ? <div style={{ color: GOLD, fontSize: 26, fontFamily: needsSerifFallback(kicker) ? 'Noto Serif' : 'Bodoni', fontStyle: needsSerifFallback(kicker) ? 'normal' : 'italic', marginBottom: 16, display: 'flex' }}>{kicker}</div> : null}
          {headline(IVORY, 'flex-start', 640)}
          <div style={{ display: 'flex', marginTop: 26 }}>{ornament(46, 'flex-start')}</div>
        </div>
      </div>
    );
  }

  return new ImageResponse(tree, { width: W, height: H, fonts });
}

/** The Instagram picture (4:5). */
export const igCardImage = (o: Omit<EditorialOptions, 'format'>) => editorialImage({ ...o, format: 'portrait' });
