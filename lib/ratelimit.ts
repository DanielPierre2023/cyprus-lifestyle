import 'server-only';
import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Graceful rate limiter. If Upstash is configured (UPSTASH_REDIS_REST_URL/TOKEN)
// it uses a distributed sliding window that holds across serverless instances;
// otherwise it falls back to a best-effort per-instance in-memory window so the
// app still throttles naive floods without any external service.

// One Redis client, reused across buckets.
let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

// One Ratelimit per (limit, window) so each bucket gets the limit the CALLER asked for.
// The previous version hard-coded slidingWindow(5, '60 s') once and reused it for every
// bucket, so with Upstash configured EVERY endpoint was throttled at 5/60s regardless of
// the arguments passed (e.g. the concierge route asks for 12/60s but silently got 5).
const limiters = new Map<string, Ratelimit>();
function getDistributed(limit: number, windowSec: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const key = `${limit}:${windowSec}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(limit, `${windowSec} s` as Duration), prefix: 'cl:rl' });
    limiters.set(key, rl);
  }
  return rl;
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
  const rl = getDistributed(limit, windowSec);
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
