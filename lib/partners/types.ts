// lib/partners/types.ts: shared shapes for hand-written partner profiles (a big company with its own long-form page).
// Pure types, no I/O. A profile is CODE, not data: the long texts live in git (reviewed like any other change), the
// directory rows only carry the short facts (name, address, coordinates, a 2-sentence summary per language).
import type { Locale } from '@/lib/locales';

/** The same string in all seven editions. */
export type L7 = Record<Locale, string>;

/** One directory row a profile links to or creates. `coordsPrecision` mirrors directory_listings.coords_precision. */
export type CoordsPrecision = 'exact' | 'geocoded' | 'town';
