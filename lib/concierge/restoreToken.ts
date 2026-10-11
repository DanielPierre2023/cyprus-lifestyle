// lib/concierge/restoreToken.ts
// Pure helpers for the email-verified membership restore flow (no I/O, no server-only
// so they are unit-testable). The emailed token is a bearer secret: 32 random bytes,
// base64url. Only its SHA-256 hash is ever stored.
import { createHash, randomBytes } from 'node:crypto';

export const RESTORE_TOKEN_BYTES = 32;
export const RESTORE_TTL_MS = 30 * 60 * 1000;
/** Max restore emails per member per rolling hour (silent cap; the response never changes). */
export const RESTORE_MAX_PER_HOUR = 3;

// 32 bytes → 43 base64url chars (no padding).
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const isPlausibleRestoreToken = (t: unknown): t is string => typeof t === 'string' && TOKEN_RE.test(t);

export function generateRestoreToken(): string {
  return randomBytes(RESTORE_TOKEN_BYTES).toString('base64url');
}

export function hashRestoreToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function restoreExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESTORE_TTL_MS);
}

export function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 254) : '';
}
export const isPlausibleEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/** Escape LIKE wildcards so an ilike() on an address is an exact (case-insensitive) match. */
export const escapeLike = (s: string) => s.replace(/([\\%_])/g, '\\$1');

export type RestoreOutcome = 'restored' | 'invalid' | 'expired' | 'error';
