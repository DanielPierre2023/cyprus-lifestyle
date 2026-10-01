// lib/honeypot.ts — the single source of truth for the spam-trap field name.
//
// Deliberately free of `server-only`: BOTH the API-side check (isHoneypot in
// lib/ratelimit.ts) and the public forms (components/HoneypotField.tsx) import this
// one constant, so the trap and the check can never drift apart again.
//
// Why `_gotcha` and NOT `company`: `company` is a REAL, visible field on the
// advertise quote form — using it as the trap made the server silently discard every
// genuine lead that filled in a company name (and still answer "ok"). `company` is also
// a name browsers and password managers autofill from the visitor's profile, which
// would trip the trap for real people. `_gotcha` is not a name any real form uses and
// no autofill heuristic matches it. (Avoid `website`, `email`, `name`, `url` for the
// same autofill reason.)
export const HONEYPOT_FIELD = '_gotcha';
