// Global request-error hook helpers — no query strings (secrets) in error records.
import { safePath, isExpectedDigest, describeRequestError } from '@/lib/requestErrorContext';
import { eq, ok, report } from './_harness';

eq('query string removed', safePath('/api/concierge/embed?key=abc123secret&force=1'), '/api/concierge/embed'); // secret-scan:ignore
eq('fragment removed', safePath('/membership?restore=tok#x'), '/membership');
eq('plain path untouched', safePath('/el/directory/restaurant/foo'), '/el/directory/restaurant/foo');
eq('non-string → empty', safePath(undefined), '');
eq('length capped at 300', safePath('/' + 'a'.repeat(500)).length, 300);

ok('redirect digest is expected', isExpectedDigest({ digest: 'NEXT_REDIRECT;replace;/x;307;' }));
ok('not-found digest is expected', isExpectedDigest({ digest: 'NEXT_NOT_FOUND' }));
ok('http fallback digest is expected', isExpectedDigest({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }));
ok('ordinary error is not expected', !isExpectedDigest(new Error('boom')));
ok('numeric digest is not expected', !isExpectedDigest({ digest: '12345' }));
ok('null is not expected', !isExpectedDigest(null));

{
  const d = describeRequestError({ path: '/api/x?key=SECRETVALUE', method: 'POST' }, { routeType: 'route', routePath: '/api/x', routerKind: 'App Router' });
  eq('source labelled by route type', d.source, 'next:route');
  ok('context has no secret', !JSON.stringify(d.context).includes('SECRETVALUE'));
  eq('context path/method/route', [d.context.path, d.context.method, d.context.route], ['/api/x', 'POST', '/api/x']);
}
eq('unknown route type', describeRequestError({}, {}).source, 'next:unknown');

report('request-error-context');
