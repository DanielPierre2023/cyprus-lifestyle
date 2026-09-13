// Cron/authorization helpers for the API routes.
// Vercel Cron calls our endpoints with `Authorization: Bearer $CRON_SECRET`.
import 'server-only';
import { NextRequest } from 'next/server';

export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  // Vercel Cron sends the Bearer; also accept the x-cron-secret header for manual runs.
  return token === secret || req.headers.get('x-cron-secret') === secret;
}
