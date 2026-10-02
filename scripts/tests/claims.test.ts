// Claim-to-own — pure-logic suite for lib/directory/claims.ts.
// Covers the security-critical bits that must not regress: the honest-verification
// CHANNEL DECISION (never send a secret to an address the claimant merely typed),
// website-domain matching (incl. generic-host exclusion), and the secret helpers
// (sha256 hashing, crypto-random token/OTP). DB-touching functions are integration
// concerns and are exercised in the smoke tests, not here.
import { sha256, newToken, newOtp, chooseClaimMethod, domainMatchesWebsite } from '@/lib/directory/claims';
import { ok, eq, report } from './_harness';

// ── sha256 (secrets are stored hashed) ───────────────────────────────────────
eq('sha256 is the known hex of "abc"', sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
ok('sha256 is 64 hex chars', /^[0-9a-f]{64}$/.test(sha256('whatever')));
ok('sha256 is deterministic', sha256('x') === sha256('x'));
ok('sha256 differs for different inputs', sha256('a') !== sha256('b'));

// ── token / OTP generators (must be unguessable + correctly shaped) ───────────
const tkA = newToken(), tkB = newToken();
ok('token is URL-safe base64url', /^[A-Za-z0-9_-]+$/.test(tkA));
ok('token is long (>=40 chars)', tkA.length >= 40);
ok('two tokens differ (random)', tkA !== tkB);
ok('otp is exactly 6 digits', /^[0-9]{6}$/.test(newOtp()));
ok('otp preserves leading zeros (padded)', newOtp().length === 6);

// ── channel decision: priority order (strongest proof first) ──────────────────
// 1) On-file email ALWAYS wins — even when a domain match AND phone+SMS also exist.
eq('on-file email wins over everything',
  chooseClaimMethod({ onfileEmail: 'owner@acme.com', listingUrl: 'https://acme.com', onfilePhone: '+35799000000', claimantEmail: 'me@acme.com', smsReady: true }),
  'onfile_email');

// 2) No on-file email, claimant domain matches the website host → domain_email.
eq('domain match when no on-file email',
  chooseClaimMethod({ onfileEmail: '', listingUrl: 'https://www.acme.com', onfilePhone: '', claimantEmail: 'me@acme.com', smsReady: false }),
  'domain_email');

// 3) Domain would "match" a GENERIC/social host → rejected → falls through (manual here).
eq('generic host (facebook) never satisfies a domain match',
  chooseClaimMethod({ onfileEmail: '', listingUrl: 'https://facebook.com/acme', onfilePhone: '', claimantEmail: 'me@facebook.com', smsReady: false }),
  'manual');

// 4) No on-file email, no domain match, SMS ready AND phone on file → phone_otp.
eq('phone OTP when SMS configured + phone on file',
  chooseClaimMethod({ onfileEmail: '', listingUrl: null, onfilePhone: '+35799123456', claimantEmail: 'me@gmail.com', smsReady: true }),
  'phone_otp');

// 5) Phone channel is SKIPPED cleanly when SMS is not configured.
eq('no SMS provider → phone channel skipped → manual',
  chooseClaimMethod({ onfileEmail: '', listingUrl: null, onfilePhone: '+35799123456', claimantEmail: 'me@gmail.com', smsReady: false }),
  'manual');

// 6) SMS ready but NO phone on file → manual (nothing to text).
eq('SMS ready but no phone on file → manual',
  chooseClaimMethod({ onfileEmail: '', listingUrl: null, onfilePhone: '', claimantEmail: 'me@gmail.com', smsReady: true }),
  'manual');

// 7) THE anti-abuse floor: no proof at all → manual (never "send to typed email").
eq('no on-file email, no domain match, no phone/SMS → manual (never domain_email to a typed address)',
  chooseClaimMethod({ onfileEmail: '', listingUrl: 'https://acme.com', onfilePhone: '', claimantEmail: 'stranger@evil.com', smsReady: false }),
  'manual');

// 8) Empty claimant email can never produce an email channel.
eq('empty claimant email → manual',
  chooseClaimMethod({ onfileEmail: '', listingUrl: 'https://acme.com', onfilePhone: '', claimantEmail: '', smsReady: false }),
  'manual');

// ── domainMatchesWebsite (the heart of channel 2) ─────────────────────────────
ok('exact host match (with www + path)', domainMatchesWebsite('a@acme.com', 'https://www.acme.com/contact'));
ok('http scheme host match', domainMatchesWebsite('a@acme.com', 'http://acme.com'));
ok('subdomain email matches apex site', domainMatchesWebsite('a@mail.acme.com', 'https://acme.com'));
ok('email apex matches subdomain site', domainMatchesWebsite('a@acme.com', 'https://shop.acme.com'));
ok('different domain does NOT match', !domainMatchesWebsite('a@other.com', 'https://acme.com'));
ok('free-mail claimant does NOT match a real site', !domainMatchesWebsite('a@gmail.com', 'https://acme.com'));
ok('generic site host is excluded', !domainMatchesWebsite('a@facebook.com', 'https://facebook.com'));
ok('no website → no match', !domainMatchesWebsite('a@acme.com', null));
ok('invalid claimant email → no match', !domainMatchesWebsite('not-an-email', 'https://acme.com'));
ok('lookalike domain (acme.com vs acme.com.cy) does NOT match', !domainMatchesWebsite('a@acme.com', 'https://acme.com.cy'));

report('directory.claims');
