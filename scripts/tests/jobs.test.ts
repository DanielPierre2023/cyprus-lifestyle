// Job handler registry (roadmap item 01). The queue's runtime semantics (claim,
// backoff, dead-letter, SKIP LOCKED) are proven at the SQL layer; here we just check
// the in-process registry that maps a job kind to its handler.
import { registerJob, registeredKinds } from '@/lib/jobs';
import { ok, eq, report } from './_harness';

// Built-in safe handlers are always present.
ok('noop is registered', registeredKinds().includes('noop'));
ok('housekeeping is registered', registeredKinds().includes('housekeeping'));

// Registering a new kind makes it dispatchable.
const before = registeredKinds().length;
registerJob('enrich_listing', async () => { /* test */ });
ok('registerJob adds the kind', registeredKinds().includes('enrich_listing'));
eq('registry grew by one', registeredKinds().length, before + 1);

// Re-registering the same kind replaces, does not duplicate.
registerJob('enrich_listing', async () => { /* replacement */ });
eq('re-register does not duplicate', registeredKinds().filter((k) => k === 'enrich_listing').length, 1);

report('jobs.registry');
