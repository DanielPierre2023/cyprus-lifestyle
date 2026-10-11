// lib/requestErrorContext.ts
// Pure helpers for the global request-error hook (instrumentation.ts). Kept separate and
// import-free so they are unit-testable. The key rule: an error record must NEVER carry the
// query string — URLs in this app can contain secrets (?key=…, restore tokens, OAuth codes).

/** Path only: drops ?query and #fragment, caps the length. */
export function safePath(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  return s.split('?')[0].split('#')[0].slice(0, 300);
}

/** Errors that are expected control flow, not faults (Next signals these via digest). */
export function isExpectedDigest(err: unknown): boolean {
  const d = (err as { digest?: unknown } | null)?.digest;
  return typeof d === 'string' && (d.startsWith('NEXT_REDIRECT') || d === 'NEXT_NOT_FOUND' || d.startsWith('NEXT_HTTP_ERROR_FALLBACK'));
}

export interface RequestErrorContext {
  routerKind?: string; routePath?: string; routeType?: string; renderSource?: string; revalidateReason?: string;
}

/** Source label + sanitized context for logServerError. */
export function describeRequestError(
  request: { path?: string; method?: string },
  context: RequestErrorContext,
): { source: string; context: Record<string, unknown> } {
  return {
    source: `next:${context.routeType || 'unknown'}`,
    context: {
      path: safePath(request.path),
      method: request.method || undefined,
      route: context.routePath,
      router: context.routerKind,
      render: context.renderSource,
    },
  };
}
