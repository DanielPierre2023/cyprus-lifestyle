// Honeypot (spam trap) — regression suite. Two things used to be wrong:
//   1. The server treated a non-empty `company` as a bot, but `company` is a REAL, visible
//      field on the advertise quote form — so every genuine lead that filled in a company
//      name was silently dropped (the UI still said "thank you", nothing was recorded).
//   2. The forms and the server disagreed on the trap's name (the advertise form's trap
//      was `website`, which nothing ever checked).
// Here: (a) the pure check, (b) a static wiring guard so form ↔ server cannot drift again.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isHoneypot } from '@/lib/ratelimit';
import { HONEYPOT_FIELD } from '@/lib/honeypot';
import { ok, report } from './_harness';

// ── (a) isHoneypot behaviour ─────────────────────────────────────────────────────────
ok('filled trap → bot', isHoneypot({ [HONEYPOT_FIELD]: 'http://spam.example' }));
ok('trap is trimmed: spaces only → human', !isHoneypot({ [HONEYPOT_FIELD]: '   ' }));
ok('empty trap → human', !isHoneypot({ [HONEYPOT_FIELD]: '' }));
ok('absent trap → human', !isHoneypot({ name: 'Ada', email: 'ada@example.com' }));
ok('empty body → human', !isHoneypot({}));
ok('trap wins even when every real field is valid', isHoneypot({ name: 'Ada', email: 'ada@example.com', company: 'Acme Ltd', [HONEYPOT_FIELD]: 'x' }));

// THE regression: the advertise quote form genuinely collects `company`.
ok('a REAL company value is not a honeypot trigger', !isHoneypot({ name: 'Ada', email: 'ada@example.com', company: 'Acme Ltd' }));
ok('real company + empty trap → human (what a normal advertiser submits)', !isHoneypot({ company: 'Acme Ltd', [HONEYPOT_FIELD]: '' }));
ok('legacy trap names no longer trigger (company / website)', !isHoneypot({ company: 'x', website: 'y' }));

// The trap name must never be something a browser/password manager autofills.
const AUTOFILLED = ['company', 'website', 'email', 'name', 'url', 'phone', 'address', 'organization'];
ok('trap name is not an autofill-prone name', !AUTOFILLED.includes(HONEYPOT_FIELD.toLowerCase().replace(/^_+/, '')));

// ── (b) wiring guard: every public form renders + sends the SAME trap the server checks ──
const root = process.cwd(); // `npm test` runs from the repo root
const src = (p: string): string => { try { return readFileSync(join(root, p), 'utf8'); } catch { return ''; } };

const FORMS = [
  'components/AdvertiseFunnel.tsx',
  'components/EnquiryForm.tsx',
  'components/ContactForm.tsx',
  'components/NewsletterSignup.tsx',
  'components/CommentSection.tsx',
];
for (const f of FORMS) {
  const s = src(f);
  ok(`${f}: readable`, s.length > 0);
  ok(`${f}: renders the shared hidden <HoneypotField>`, /<HoneypotField\b/.test(s));
  ok(`${f}: sends the trap under the shared HONEYPOT_FIELD name`, /\[HONEYPOT_FIELD\]\s*:/.test(s));
}

// Only the advertise form has a real `company` field — and it must stay intact and un-trapped.
const adv = src('components/AdvertiseFunnel.tsx');
ok('advertise form still collects the real company value', /placeholder=\{d\.fCompany\}\s+value=\{f\.company\}/.test(adv));
ok('advertise form dropped the dead `website` trap', !/website\s*:\s*''/.test(adv) && !/f\.website/.test(adv));
for (const f of FORMS.filter((x) => !x.endsWith('AdvertiseFunnel.tsx'))) {
  ok(`${f}: does not use \`company\` as its trap`, !/\bcompany\b/i.test(src(f)));
}

// The hidden input itself: named from the shared constant, unreachable, hidden from AT/autofill.
const hpc = src('components/HoneypotField.tsx').replace(/^\s*\/\/.*$/gm, ''); // code only — the header comment explains why -9999px is avoided
ok('HoneypotField: name comes from the shared constant', /name=\{HONEYPOT_FIELD\}/.test(hpc));
ok('HoneypotField: tabindex -1, autocomplete off, aria-hidden', /tabIndex=\{-1\}/.test(hpc) && /autoComplete="off"/.test(hpc) && /aria-hidden="true"/.test(hpc));
ok('HoneypotField: visually hidden without an off-screen offset (RTL-safe)', /clip: 'rect\(0 0 0 0\)'/.test(hpc) && !/-9999/.test(hpc));

// Server side: the check reads the shared constant (never a real form field) and the
// advertise lead route still persists the real company.
const rl = src('lib/ratelimit.ts');
ok('isHoneypot reads the shared constant', /body\[HONEYPOT_FIELD\]/.test(rl));
ok('isHoneypot no longer reads body.company', !/body\.company/.test(rl));
const lead = src('app/api/advertise/lead/route.ts');
ok('advertise lead route checks the honeypot', /isHoneypot\(body\)/.test(lead));
ok('advertise lead route still stores the real company', /insert\(\{[^}]*\bcompany\b/.test(lead));

report('honeypot.wiring');
