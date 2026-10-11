// lib/vat/parse.ts
// ============================================================================
// Turn what a buyer typed into a VAT number we can send to VIES. Pure.
//
// The buyer picks a country and may type the number with or without the country prefix, with
// spaces, dots, dashes… ("de 123 456 789", "DE123456789", "123.456.789"). We normalise it, check the
// prefix agrees with the chosen country (Greece's prefix is EL, not GR), and apply only a LENIENT shape check:
// the authority (VIES) decides what is a real number — a strict local regex that wrongly rejected a real
// number would cost a sale.
// ============================================================================
import { EU_VAT_PREFIX, isEuMemberState, vatPrefixOf } from '@/lib/vat/countries';

// Every prefix a buyer might type: the VIES prefixes (…EL for Greece) plus the ISO codes (…GR), because Greek
// buyers naturally write GR. For Greece we accept GR and convert it to EL; anywhere else it is a mismatch.
const PREFIXES = new Set([...Object.values(EU_VAT_PREFIX), ...Object.keys(EU_VAT_PREFIX)]);

/** Upper-case and keep only characters that can occur in an EU VAT number. */
export function normalizeVatInput(raw: string): string {
  return String(raw ?? '').toUpperCase().replace(/[^A-Z0-9+*]/g, '');
}

export type VatParse =
  | { ok: true; prefix: string; number: string; display: string }
  | { ok: false; reason: 'empty' | 'not_eu_country' | 'prefix_mismatch' | 'format' };

export function parseVatForCountry(country: string, raw: string): VatParse {
  const cleaned = normalizeVatInput(raw);
  if (!cleaned) return { ok: false, reason: 'empty' };
  if (!isEuMemberState(country)) return { ok: false, reason: 'not_eu_country' };
  const expected = vatPrefixOf(country)!;

  let number = cleaned;
  const lead = cleaned.slice(0, 2);
  if (lead === expected || (lead === country.toUpperCase() && PREFIXES.has(lead))) {
    number = cleaned.slice(2); // own prefix (EL, or the ISO code GR for Greece)
  } else if (/^[A-Z]{2}/.test(cleaned) && PREFIXES.has(lead)) {
    // typed another member state's prefix (e.g. DE… while the country is France)
    return { ok: false, reason: 'prefix_mismatch' };
  }
  if (!/^[A-Z0-9+*]{2,14}$/.test(number)) return { ok: false, reason: 'format' };
  return { ok: true, prefix: expected, number, display: `${expected}${number}` };
}
