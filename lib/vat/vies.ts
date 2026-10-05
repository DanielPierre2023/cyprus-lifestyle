// lib/vat/vies.ts
// ============================================================================
// Client for the European Commission's VIES VAT-number validation service (public, free, no key).
//
// Why this exists: Stripe checks only the FORMAT of a VAT number and applies the reverse charge on format
// alone ("regardless of the government verification result"). A made-up but well-formed number would therefore
// remove the VAT. The supplier is the one liable, so we verify against VIES BEFORE creating the checkout and
// attach the number to the Stripe customer only when VIES confirms it.
//
// Endpoint: POST {base}/check-vat-number  { countryCode, vatNumber [, requesterMemberStateCode, requesterNumber] }
//   valid     → { valid:true,  requestIdentifier, name, address }
//   invalid   → { valid:false }                              (HTTP 200)
//   problem   → { actionSucceed:false, errorWrappers:[{ error:'INVALID_INPUT' | 'MS_UNAVAILABLE' | 'TIMEOUT' | … }] }
// When the SELLER's own VAT number is supplied as the requester (env VIES_REQUESTER_VAT), VIES returns a
// consultation number (requestIdentifier) — the audit evidence that the number was checked on that date.
//
// Safety: this function NEVER throws. Anything that is not an explicit "valid"/"invalid" answer is
// 'unavailable' — and 'unavailable' must never be treated as valid (the caller charges VAT instead).
// ============================================================================

export type ViesStatus = 'valid' | 'invalid' | 'unavailable';

export interface ViesResult {
  status: ViesStatus;
  name?: string;
  address?: string;
  requestId?: string;
  checkedAt: string;
  detail?: string;
}

const DEFAULT_BASE = 'https://ec.europa.eu/taxation_customs/vies/rest-api';
const NONE = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s && s !== '---' ? s : undefined; // VIES uses "---" for "not disclosed"
};

import { EU_VAT_PREFIX } from '@/lib/vat/countries';

const EU_PREFIXES = new Set(Object.values(EU_VAT_PREFIX));

/** "CY12345678Z" → { code:'CY', number:'12345678Z' } for the requester fields; null if unusable. */
export function parseRequester(raw: string | undefined | null): { code: string; number: string } | null {
  const s = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9+*]/g, '');
  const m = /^([A-Z]{2})([A-Z0-9+*]{2,14})$/.exec(s);
  return m && EU_PREFIXES.has(m[1]) ? { code: m[1], number: m[2] } : null; // must start with a real EU VAT prefix
}

/** Map a raw VIES reply to our three outcomes. Pure — unit-tested against real captured replies. */
export function interpretViesResponse(httpStatus: number, body: unknown): Omit<ViesResult, 'checkedAt'> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  const wrappers = Array.isArray(b.errorWrappers) ? (b.errorWrappers as Record<string, unknown>[]) : [];
  if (wrappers.length) {
    const err = String(wrappers[0]?.error || 'UNKNOWN');
    // INVALID_INPUT = the service rejected the country/number as unusable → the number cannot be valid.
    if (err === 'INVALID_INPUT') return { status: 'invalid', detail: err };
    return { status: 'unavailable', detail: err };
  }
  if (httpStatus < 200 || httpStatus >= 300) return { status: 'unavailable', detail: `http_${httpStatus}` };

  // Both the POST shape (`valid`) and the GET shape (`isValid` + `userError`) are understood.
  const valid = typeof b.valid === 'boolean' ? b.valid : typeof b.isValid === 'boolean' ? b.isValid : null;
  const userError = typeof b.userError === 'string' ? b.userError : undefined;
  if (valid === true) {
    return { status: 'valid', name: NONE(b.name), address: NONE(b.address), requestId: NONE(b.requestIdentifier) };
  }
  if (valid === false) {
    if (userError && userError !== 'INVALID') return { status: 'unavailable', detail: userError };
    return { status: 'invalid', detail: userError };
  }
  return { status: 'unavailable', detail: 'unrecognised_response' };
}

export interface ViesOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  requester?: { code: string; number: string } | null;
  baseUrl?: string;
  now?: () => Date;
}

/** Ask VIES whether `prefix` + `number` (prefix = VIES country code, e.g. EL for Greece) is a valid VAT number. */
export async function checkVatNumber(prefix: string, number: string, opts: ViesOptions = {}): Promise<ViesResult> {
  const now = opts.now ?? (() => new Date());
  const checkedAt = now().toISOString();
  const base = (opts.baseUrl || process.env.VIES_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const requester = opts.requester !== undefined ? opts.requester : parseRequester(process.env.VIES_REQUESTER_VAT);
  const payload: Record<string, string> = { countryCode: prefix, vatNumber: number };
  if (requester) { payload.requesterMemberStateCode = requester.code; payload.requesterNumber = requester.number; }

  try {
    const res = await (opts.fetchImpl ?? fetch)(`${base}/check-vat-number`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    const body = await res.json().catch(() => null);
    return { ...interpretViesResponse(res.status, body), checkedAt };
  } catch (e) {
    return { status: 'unavailable', detail: (e as Error).name === 'TimeoutError' ? 'timeout' : 'network_error', checkedAt };
  }
}
