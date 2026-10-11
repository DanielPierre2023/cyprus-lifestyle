// lib/auth/webhookSignature.ts
// ============================================================================
// Pure verification of Meta (WhatsApp Cloud API) webhook signatures. Meta signs the
// RAW request body with the app secret (HMAC-SHA256) and sends it as
//   X-Hub-Signature-256: sha256=<hex>
// The raw bytes must be used — re-serialising parsed JSON changes them.
// ============================================================================
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyMetaSignature(rawBody: string, header: string | null | undefined, appSecret: string): boolean {
  if (!appSecret || !header) return false;
  const m = /^sha256=([0-9a-fA-F]{64})$/.exec(header.trim());
  if (!m) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest();
  const given = Buffer.from(m[1], 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
