// instrumentation.ts — Next.js server hook, loaded once per server instance.
//
// onRequestError runs for EVERY unhandled error in a route handler, server component, server
// action or middleware-adjacent render, and writes it to the error_log table (the same sink
// the admin "Analytics → errors" view and error_log_grouped already read). Before this hook
// only the ~7 routes that called logServerError() by hand were visible; now all ~100 are.
//
// Never throws, never blocks the response, never logs query strings (see requestErrorContext).
import type { Instrumentation } from 'next';
import { describeRequestError, isExpectedDigest } from '@/lib/requestErrorContext';

export async function register() {
  // Reserved for server-side SDK initialisation (e.g. Sentry) if/when a DSN is configured.
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // The service-role client and logger are Node-only; skip the Edge runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (isExpectedDigest(err)) return;
  try {
    const { logServerError } = await import('@/lib/monitor.server');
    const { source, context: ctx } = describeRequestError(request, context);
    await logServerError(source, err, ctx);
  } catch { /* the error hook must never throw */ }
};
