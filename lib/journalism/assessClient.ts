// lib/journalism/assessClient.ts — the style check as a service, client side.
//
// WHY: a Supabase edge function may use two seconds of computing per call (waiting for the model does not count). The voice engine's
// detectors alone use about 0.2 s per language on their first use (the regular expressions are compiled then), 1.9 s for one article in
// seven languages: a run could be stopped half way. So the edge function does not carry the engine. It sends each edition to the website
// (app/api/desk/assess), which runs the SAME judge (lib/journalism/assess.ts) where nothing limits computing time.
//
// Pure: fetch, setTimeout, AbortSignal and Date only. It must not import the engine (that would put it back into the edge bundle);
// a test checks that the generated edge function carries no voice scorer.
import type { Assessment, AssessCtx } from './pipeline';
import type { Lang } from './languages';

export const ASSESS_PATH = '/api/desk/assess';

export interface RemoteAssessOptions {
  /** The website's base URL (SITE_URL), e.g. https://cypruslifestyle.eu */
  siteUrl: string;
  /** The shared secret (ENRICH_SECRET), sent in the x-enrich-key header and never written to a log or an error. */
  secret: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Absolute time (same clock as `now`) after which no attempt is started. */
  deadlineAt?: number;
  /** Attempts per call (default 3). */
  attempts?: number;
  /** Time limit per attempt in ms (default 20,000). */
  timeoutMs?: number;
}

/** The website's answer, checked: a reply that is not an assessment is never trusted. */
export function parseAssessment(v: unknown): Assessment | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.score !== 'number' || !Number.isFinite(o.score) || typeof o.ok !== 'boolean' || !Array.isArray(o.tells)) return null;
  const tells = o.tells.filter((t): t is Record<string, unknown> => !!t && typeof t === 'object' && typeof (t as { key?: unknown }).key === 'string');
  return { score: o.score, ok: o.ok, high: Number(o.high) || 0, words: Number(o.words) || 0, tells: tells as unknown as Assessment['tells'] };
}

/** Nothing is configured: the caller refuses to start, so no model call is wasted on an article that cannot be judged. */
export function assessConfigError(siteUrl: string, secret: string): string | null {
  if (!/^https?:\/\/[^\s/]+/i.test(siteUrl.trim())) return 'SITE_URL is not set (the website the style check runs on)';
  if (!secret.trim()) return 'ENRICH_SECRET is not set (the shared secret for the style check)';
  return null;
}

const fatal = (message: string): Error => Object.assign(new Error(message), { fatal: true });

/**
 * Returns a function with the shape of the pipeline's `assess` dependency. Network trouble and 5xx answers are retried; a refused secret
 * (401/403), a missing route (404) or a rejected request (400/413) are not, because trying again cannot change the answer.
 */
export function remoteAssess(o: RemoteAssessOptions): (html: string, lang: Lang, ctx: AssessCtx) => Promise<Assessment> {
  const doFetch = o.fetch ?? fetch;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = o.now ?? Date.now;
  const attempts = Math.max(1, o.attempts ?? 3);
  const perAttempt = o.timeoutMs ?? 20_000;
  const url = `${o.siteUrl.trim().replace(/\/+$/, '')}${ASSESS_PATH}`;
  return async (html, lang, ctx) => {
    let last = 'no answer';
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const left = o.deadlineAt === undefined ? Infinity : o.deadlineAt - now();
      if (left < 3_000) throw new Error(`style check: out of time (${last})`);
      try {
        const res = await doFetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-enrich-key': o.secret },
          body: JSON.stringify({ html, lang, title: ctx.title, category: ctx.category, articleType: ctx.articleType }),
          signal: AbortSignal.timeout(Math.max(1_000, Math.min(perAttempt, left - 1_000))),
        });
        if (res.ok) {
          const a = parseAssessment(await res.json().catch(() => null));
          if (a) return a;
          last = 'the answer was not an assessment';
        } else if (res.status === 401 || res.status === 403) {
          throw fatal(`style check refused (HTTP ${res.status}): ENRICH_SECRET differs between Supabase and the website`);
        } else if (res.status === 404) {
          throw fatal('style check not found (HTTP 404): the website has not been updated yet (route /api/desk/assess)');
        } else if (res.status === 400 || res.status === 413) {
          throw fatal(`style check rejected the request (HTTP ${res.status})`);
        } else {
          last = `HTTP ${res.status}`;
        }
      } catch (e) {
        if ((e as { fatal?: boolean }).fatal) throw e;
        const err = e as Error;
        last = err.name === 'TimeoutError' || /timed? ?out|abort/i.test(err.message) ? 'no answer in time' : String(err.message || err).slice(0, 120);
      }
      if (attempt < attempts) await sleep(attempt === 1 ? 600 : 1_500);
    }
    throw new Error(`style check unavailable: ${last}`);
  };
}
