// lib/monitor.server.ts — server-only error sink (roadmap item 03).
// Wraps reportError() (console + optional Sentry) and ALSO persists to the
// error_log table so failures are visible in the admin panel without paying for
// a third-party service. Kept separate from lib/monitor.ts because that module is
// imported by client error boundaries — supabaseAdmin (service role) must never be
// bundled into the client. Logging is strictly best-effort: it never throws and
// never blocks the caller.
import 'server-only';
import { reportError } from '@/lib/monitor';
import { supabaseAdmin } from '@/lib/supabase/admin';

// A stable grouping key: source + a normalised message with volatile bits
// (uuids, numbers, quoted values) collapsed, so the same problem groups together
// in error_log_grouped even when ids/counts differ.
export function fingerprint(source: string, message: string): string {
  const norm = (message || '')
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<id>')
    .replace(/\b\d[\d.,:]*\b/g, '<n>')
    .replace(/["'`].*?["'`]/g, '<v>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  return `${source}:${norm}`;
}

export async function logServerError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
  level: 'error' | 'warn' = 'error',
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  // 1) console + optional Sentry (existing behaviour, unchanged).
  try { await reportError(error, { source, ...(context || {}) }); } catch { /* ignore */ }
  // 2) durable DB sink — best-effort; a logging failure must never surface.
  try {
    await supabaseAdmin().from('error_log').insert({
      level,
      source,
      message: message.slice(0, 500),
      fingerprint: fingerprint(source, message),
      detail: { ...(context || {}), ...(stack ? { stack: stack.slice(0, 4000) } : {}) },
    });
  } catch { /* never let logging throw */ }
}
