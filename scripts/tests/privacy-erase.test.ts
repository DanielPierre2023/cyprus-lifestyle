// DSAR erasure — the pure email validation/normalisation/masking (roadmap item 15).
// The destructive purge itself is one SQL function (migration 0098), verified on
// Postgres; here we lock down the guards that decide whether an erasure may run and
// how the subject is shown in the audit log (masked, never plaintext).
import { normalizeEmail, isErasableEmail, maskEmail } from '@/lib/privacy/erase';
import { eq, ok, report } from './_harness';

// normalizeEmail — trim + lowercase.
eq('normalize trims + lowercases', normalizeEmail('  Daniel.Test@Example.COM '), 'daniel.test@example.com');
eq('normalize null-safe', normalizeEmail(undefined as unknown as string), '');

// isErasableEmail — a real address only.
ok('valid email', isErasableEmail('a@b.co'));
ok('valid mixed case', isErasableEmail('  Daniel.Test@Example.com '));
ok('reject no @', !isErasableEmail('not-an-email'));
ok('reject @ at start', !isErasableEmail('@example.com'));
ok('reject @ at end', !isErasableEmail('daniel@'));
ok('reject empty', !isErasableEmail(''));
ok('reject too short', !isErasableEmail('a@'));
ok('reject whitespace inside', !isErasableEmail('dan iel@example.com'));

// maskEmail — first char + domain, no plaintext local part.
eq('mask typical', maskEmail('daniel.test@example.com'), 'd***@example.com');
eq('mask uppercase', maskEmail('AB@X.io'), 'a***@x.io');
eq('mask invalid → ***', maskEmail('nope'), '***');

report('privacy.erase');
