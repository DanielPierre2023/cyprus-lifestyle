// Image strategy (lib/imageVariants.ts + lib/imageLoader.ts): which source gets which URL.
// Nothing here may ever produce a /_next/image URL (Hobby: 5,000 transformations / month).
import { LADDER, pickWidth, splitStorageUrl, variantPath, isRasterPath, imageMode, urlForWidth, isVariantPath } from '../../lib/imageVariants';
import imageLoader from '../../lib/imageLoader';
import { eq, ok, report } from './_harness';

const S = 'https://abc.supabase.co/storage/v1/object/public/blog-images';

eq('ladder', [...LADDER], [480, 960, 1440]);
eq('pickWidth rounds up', [pickWidth(100), pickWidth(480), pickWidth(481), pickWidth(960), pickWidth(1200), pickWidth(3840)], [480, 480, 960, 960, 1440, 1440]);
eq('splitStorageUrl', splitStorageUrl(`${S}/ai-covers/1-x.png`), { origin: 'https://abc.supabase.co', bucket: 'blog-images', path: 'ai-covers/1-x.png' });
eq('non-storage url', splitStorageUrl('https://example.com/a.png'), null);
eq('garbage url', splitStorageUrl('not a url'), null);
eq('variantPath', variantPath('ai-covers/1-x.png', 960), '_v/ai-covers/1-x-960.webp');
eq('variantPath no ext', variantPath('a/b', 480), '_v/a/b-480.webp');
ok('isVariantPath', isVariantPath('_v/a-480.webp') && !isVariantPath('a/_v/x.png'));
ok('raster only', isRasterPath('a.JPG') && isRasterPath('a.webp') && !isRasterPath('a.svg') && !isRasterPath('a.gif'));

// modes
eq('supabase original, flag off -> plain (today\'s behaviour)', imageMode(`${S}/a.png`, false), 'plain');
eq('supabase original, flag on -> variant', imageMode(`${S}/a.png`, true), 'variant');
eq('svg never variant', imageMode(`${S}/a.svg`, true), 'plain');
eq('already a variant -> plain', imageMode(`${S}/_v/a-960.webp`, true), 'plain');
eq('unsplash always resizable', imageMode('https://images.unsplash.com/photo-1?ixid=x&w=1080', false), 'unsplash');
eq('picsum seed', imageMode('https://picsum.photos/seed/cyprus/1200/800', false), 'picsum');
eq('third-party -> plain', imageMode('https://cdn.other.com/x.jpg', true), 'plain');
eq('relative -> plain', imageMode('/brand/x.png', true), 'plain');

// URLs
eq('variant url', urlForWidth(`${S}/ai-covers/1-x.png`, 700, 75, true), `${S}/_v/ai-covers/1-x-960.webp`);
eq('flag off leaves src untouched', urlForWidth(`${S}/ai-covers/1-x.png`, 700, 75, false), `${S}/ai-covers/1-x.png`);
const u = new URL(urlForWidth('https://images.unsplash.com/photo-1?ixid=x&w=1080&q=80', 1000, 75, false));
eq('unsplash w/q/auto', [u.searchParams.get('w'), u.searchParams.get('q'), u.searchParams.get('auto'), u.searchParams.get('ixid')], ['1440', '75', 'format', 'x']);
eq('unsplash width capped to ladder', new URL(urlForWidth('https://images.unsplash.com/p', 3840)).searchParams.get('w'), '1440');
eq('picsum keeps ratio, shrinks', urlForWidth('https://picsum.photos/seed/cyprus/1200/800', 480), 'https://picsum.photos/seed/cyprus/480/320');
eq('picsum never enlarged', urlForWidth('https://picsum.photos/seed/c/300/200', 1440), 'https://picsum.photos/seed/c/300/200');
eq('other host untouched', urlForWidth('https://cdn.other.com/x.jpg', 480, 75, true), 'https://cdn.other.com/x.jpg');

// loader (the next/image entry point)
ok('loader never returns /_next/image', ![`${S}/a.png`, 'https://images.unsplash.com/p', 'https://picsum.photos/seed/a/10/10', '/x.png'].some((src) => imageLoader({ src, width: 640 }).includes('/_next/image')));
eq('loader relative passthrough', imageLoader({ src: '/brand/x.png', width: 640 }), '/brand/x.png');

report('image-variants');
