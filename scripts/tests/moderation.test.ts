// Moderation console — pure-logic suite for lib/directory/moderation.ts.
// Covers the action normalisers (reject anything not in the allow-list) and the
// proposed_value coercers that turn a directory_listing_edits jsonb value into the
// text / URL-array the approve path applies to the listing. The DB apply/list
// functions are integration concerns (service-role I/O) and are not exercised here.
import {
  normalizeEditAction, normalizeReviewAction, listingUrl,
  coerceDescription, coercePhotos,
} from '@/lib/directory/moderation';
import { ok, eq, report } from './_harness';

// ── action normalisers ────────────────────────────────────────────────────────
eq('approve normalises', normalizeEditAction('approve'), 'approve');
eq('reject normalises', normalizeEditAction('reject'), 'reject');
eq('unknown edit action → null', normalizeEditAction('delete'), null);
eq('empty edit action → null', normalizeEditAction(''), null);
eq('non-string edit action → null', normalizeEditAction(42), null);

eq('save normalises', normalizeReviewAction('save'), 'save');
eq('requeue normalises', normalizeReviewAction('requeue'), 'requeue');
eq('skip normalises', normalizeReviewAction('skip'), 'skip');
eq('unknown review action → null', normalizeReviewAction('publish'), null);
eq('non-string review action → null', normalizeReviewAction(null), null);

// ── listingUrl ────────────────────────────────────────────────────────────────
eq('listingUrl with type', listingUrl('restaurant', 'blue-lagoon'), '/directory/restaurant/blue-lagoon');
eq('listingUrl without type', listingUrl(null, 'blue-lagoon'), '/directory/blue-lagoon');
eq('listingUrl empty type', listingUrl('', 'x'), '/directory/x');

// ── coerceDescription ─────────────────────────────────────────────────────────
eq('plain string passes through', coerceDescription('A family-run taverna in Paphos.'), 'A family-run taverna in Paphos.');
eq('trims whitespace', coerceDescription('  hello  '), 'hello');
eq('double-encoded JSON string is unwrapped', coerceDescription('"a quoted blurb"'), 'a quoted blurb');
eq('null → empty', coerceDescription(null), '');
eq('undefined → empty', coerceDescription(undefined), '');
eq('number coerced to string', coerceDescription(123), '123');

// ── coercePhotos ──────────────────────────────────────────────────────────────
eq('array of urls', coercePhotos(['https://a.com/1.jpg', 'https://a.com/2.jpg']),
  ['https://a.com/1.jpg', 'https://a.com/2.jpg']);
eq('dedupes + trims', coercePhotos([' https://a.com/1.jpg ', 'https://a.com/1.jpg']), ['https://a.com/1.jpg']);
eq('drops empties', coercePhotos(['', '  ', 'https://a.com/x.jpg']), ['https://a.com/x.jpg']);
eq('stringified JSON array is parsed', coercePhotos('["https://a.com/1.jpg"]'), ['https://a.com/1.jpg']);
eq('non-array string → empty', coercePhotos('not json'), []);
eq('null → empty array', coercePhotos(null), []);
ok('object → empty array', coercePhotos({ a: 1 }).length === 0);

report('moderation.pure');
