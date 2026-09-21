// Saved items / trip plan logic (roadmap item 10). Pure.
import { normalizeKind, sanitizeSlug, isSaveAction, savedBlock } from '@/lib/concierge/saved';
import { eq, ok, report } from './_harness';

eq('trip kind kept', normalizeKind('trip'), 'trip');
eq('saved kind kept', normalizeKind('saved'), 'saved');
eq('unknown → saved', normalizeKind('garbage'), 'saved');
eq('missing → saved', normalizeKind(undefined), 'saved');

eq('slug trimmed', sanitizeSlug('  villa-x  '), 'villa-x');
ok('slug capped', sanitizeSlug('x'.repeat(500)).length <= 200);

ok('add is a valid action', isSaveAction('add'));
ok('remove is a valid action', isSaveAction('remove'));
ok('other is not', !isSaveAction('delete'));

eq('empty saved → no block', savedBlock([]), '');
const block = savedBlock([
  { slug: 'villa-x', kind: 'trip', name: 'Villa X', district: 'Paphos' },
  { slug: 'cafe-y', kind: 'saved', name: 'Cafe Y', district: 'Larnaca' },
]);
ok('block has a trip section', block.includes('Trip plan'));
ok('block has a saved section', block.includes('Saved'));
ok('block references the name', block.includes('Villa X'));
ok('block invites arranging', /arrange|book/i.test(block));

report('concierge.saved');
