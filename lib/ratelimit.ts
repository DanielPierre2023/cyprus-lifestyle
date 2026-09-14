import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Graceful rate limiter. If Upstash is configured (UPSTASH_REDIS_REST_URL/TOKEN)
// it uses a distributed sliding window that holds across serverless instances;
// otherwise it falls back to a best-effort per-instance in-memory window so the
// app still throttles naive floods without any external service.

let distributed: Ratelimit | null | undefined;
function getDistributed(): Ratelimit | null {
  if (distributed !== undefined) return distributed;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  distributed = url && token
    ? new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(5, '60 s'), prefix: 'cl:rl' })
    : null;
  return distributed;
}

const mem = new Map<string, number[]>();
function memoryAllow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (mem.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) { mem.set(key, hits); return false; }
  hits.push(now); mem.set(key, hits);
  if (mem.size > 5000) mem.clear(); // crude cap so the map can't grow unbounded
  return true;
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '0.0.0.0';
}

/** Returns true if the request is allowed, false if it should be throttled. */
export async function rateLimit(req: Request, bucket: string, limit = 5, windowSec = 60): Promise<boolean> {
  const key = `${bucket}:${clientIp(req)}`;
  const rl = getDistributed();
  if (rl) {
    try { const { success } = await rl.limit(key); return success; }
    catch { return true; } // never block on limiter failure
  }
  return memoryAllow(key, limit, windowSec * 1000);
}

/** Honeypot: a hidden field bots fill in. Returns true if the submission looks like spam. */
export function isHoneypot(body: Record<string, unknown>): boolean {
  return typeof body.company === 'string' && body.company.trim().length > 0;
}
