// scripts/lib/secrets.mjs — pure credential-detection rules (no I/O), shared by
// scripts/check-secrets.mjs (the CI gate) and its unit test.

// [name, regex]. Each regex must match only the secret-looking part of a line.
export const RULES = [
  ['Stripe live/restricted key', /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/],
  ['Stripe webhook secret', /\bwhsec_[A-Za-z0-9]{20,}/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI API key', /\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}/],
  ['Resend API key', /\bre_[A-Za-z0-9]{20,}_?[A-Za-z0-9]{8,}/],
  ['Private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  // The leak that happened here: a real secret pasted into a URL query string in a doc.
  ['Secret in URL (?key= / ?secret= / ?token=)', /[?&](?:key|secret|token|apikey|api_key)=(?![<$%{]|eyJ|PASTE|YOUR|SECRET|TOKEN|KEY|REDACTED|xxx|\.\.\.|[A-Z_]{4,}\b|\w{0,11}(?:\s|$|&|["'`)]))[A-Za-z0-9._~-]{12,}/],
];

// A JWT is a credential here only if it is a Supabase-style key (carries a `role` claim such as
// service_role / anon / authenticated). Other JWTs — e.g. the short-lived signed download links
// that export tools hand out — carry only an `exp` and are not reusable credentials.
const JWT_RE = /\beyJ[A-Za-z0-9_-]{15,}\.(eyJ[A-Za-z0-9_-]{15,})\.[A-Za-z0-9_-]{15,}/g;
function jwtRole(payloadB64) {
  try {
    const b = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(Buffer.from(b + '='.repeat((4 - (b.length % 4)) % 4), 'base64').toString('utf8'));
    return typeof claims.role === 'string' ? claims.role : null;
  } catch { return null; }
}

// A line carrying the marker `secret-scan:ignore` is skipped — for fake values in tests/docs.
export function scanText(text) {
  const hits = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.length > 4000) return; // minified / data blobs
    if (line.includes('secret-scan:ignore')) return; // deliberate fake value (tests, docs)
    for (const m of line.matchAll(JWT_RE)) {
      const role = jwtRole(m[1]);
      if (role) hits.push({ line: i + 1, rule: `Supabase key (role=${role})`, sample: 'eyJ…(' + m[0].length + ' chars)' });
    }
    for (const [name, re] of RULES) {
      const m = re.exec(line);
      if (m) hits.push({ line: i + 1, rule: name, sample: m[0].slice(0, 6) + '…(' + m[0].length + ' chars)' });
    }
  });
  return hits;
}
