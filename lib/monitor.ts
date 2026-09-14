// Lightweight error reporting. Always logs (visible in Vercel logs); additionally
// sends to Sentry when NEXT_PUBLIC_SENTRY_DSN is set. The Sentry SDK is loaded
// lazily so it costs nothing until a DSN is configured. Works on client + server.
let sentryReady: Promise<typeof import('@sentry/nextjs') | null> | null = null;

function loadSentry() {
  if (sentryReady) return sentryReady;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) { sentryReady = Promise.resolve(null); return sentryReady; }
  sentryReady = import('@sentry/nextjs')
    .then((S) => { try { S.init({ dsn, tracesSampleRate: 0 }); } catch { /* already initialised */ } return S; })
    .catch(() => null);
  return sentryReady;
}

export async function reportError(error: unknown, context?: Record<string, unknown>) {
  console.error('[monitor]', context ? JSON.stringify(context) : '', error);
  const S = await loadSentry();
  try { S?.captureException?.(error, context ? { extra: context } : undefined); } catch { /* ignore */ }
}
