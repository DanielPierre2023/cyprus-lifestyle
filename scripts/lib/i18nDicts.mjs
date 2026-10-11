// scripts/lib/i18nDicts.mjs — static scan of the TypeScript source for INLINE locale
// dictionaries (object literals keyed by locale code, e.g. `{ en: {...}, el: {...} }`) and
// the pure comparison logic behind scripts/check-i18n-dicts.mjs. No translation, no network:
// it only parses source with the TypeScript compiler API that is already a dev dependency.
//
// A "dictionary" is any object literal with at least MIN_LOCALE_KEYS properties whose names
// are locale codes. It is a GAP when some of the seven locales are absent, and a SHAPE
// problem when the value objects of the present locales do not share the reference locale's
// keys / {placeholders}. Admin code is exempt by policy (docs/CTO-DUE-DILIGENCE section 2.5).
import { createRequire } from 'node:module';
// Loaded through createRequire (not a static import) so the test runner's esbuild bundle leaves the
// TypeScript compiler in node_modules instead of inlining ~9 MB of it into the suite.
const nodeRequire = createRequire(import.meta.url);
const ts = nodeRequire('typescript');

export const LOCALES = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
export const MIN_LOCALE_KEYS = 3;
export const EXEMPT = [/(^|\/)admin(\/|$)/, /\.test\.tsx?$/, /(^|\/)tests?\//, /\(panel\)/];

export const isExempt = (file) => EXEMPT.some((rx) => rx.test(file.replace(/\\/g, '/')));

const propName = (p) => {
  if (!p.name) return null;
  if (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) return p.name.text;
  return null;
};

// Nearest enclosing declaration name, so a dictionary has a line-independent identity.
function ownerName(node) {
  const parts = [];
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) { parts.unshift(n.name.text); break; }
    if ((ts.isPropertyAssignment(n) || ts.isPropertyDeclaration(n)) && propName(n)) parts.unshift(propName(n));
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name && ts.isIdentifier(n.name)) { parts.unshift(`${n.name.text}()`); break; }
  }
  return parts.join('.') || '(anonymous)';
}

// Overlay dictionaries (e.g. knowledge/*.i18n.ts) deliberately omit `en`: English is the source
// text living elsewhere. A dictionary with the six other locales is therefore complete.
function missingLocales(byLocale) {
  const miss = LOCALES.filter((l) => !byLocale.has(l));
  const others = LOCALES.filter((l) => l !== 'en');
  if (miss.length === 1 && miss[0] === 'en' && others.every((l) => byLocale.has(l))) return [];
  return miss;
}

const phs = (s) => (String(s).match(/\{[^}]+\}/g) || []).sort().join('|');

// Leaf strings of a value node: { path -> text } for string literals / templates without ${}.
function leaves(node, prefix = '', out = {}) {
  if (!node) return out;
  if (ts.isStringLiteralLike(node)) { out[prefix] = node.text; return out; }
  if (ts.isNoSubstitutionTemplateLiteral(node)) { out[prefix] = node.text; return out; }
  if (ts.isObjectLiteralExpression(node)) {
    for (const p of node.properties) {
      const k = ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) ? propName(p) : null;
      if (k != null && ts.isPropertyAssignment(p)) leaves(p.initializer, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (ts.isArrayLiteralExpression(node)) {
    node.elements.forEach((e, i) => leaves(e, `${prefix}[${i}]`, out));
  } else out[prefix] = null; // non-literal value (call, identifier, template with holes)
  return out;
}

/** Scan one source file → dictionaries found. */
export function scanSource(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = [];
  const seen = new Map();
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const byLocale = new Map();
      for (const p of node.properties) {
        const k = ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) ? propName(p) : null;
        if (k && LOCALES.includes(k)) byLocale.set(k, ts.isPropertyAssignment(p) ? p.initializer : p.name);
      }
      if (byLocale.size >= MIN_LOCALE_KEYS) {
        const base = `${file}#${ownerName(node)}`;
        const n = (seen.get(base) || 0) + 1; seen.set(base, n);
        const present = LOCALES.filter((l) => byLocale.has(l));
        const ref = byLocale.has('en') ? 'en' : present[0];
        const refLeaves = leaves(byLocale.get(ref));
        // A reference that is not an inline literal (identifier, call…) cannot be compared structurally.
        const refOpaque = Object.keys(refLeaves).length === 1 && refLeaves[''] === null;
        const shape = {}; // locale -> { missing:[], extra:[], placeholder:[], empty:[] }
        const sameAsEn = {}; // locale -> count of leaves identical to the reference (suspected untranslated)
        let leafCount = 0;
        for (const l of present) {
          const lv = leaves(byLocale.get(l));
          if (l === ref) { leafCount = Object.keys(lv).length; continue; }
          if (refOpaque || (Object.keys(lv).length === 1 && lv[''] === null)) continue;
          const s = { missing: [], extra: [], placeholder: [], empty: [] };
          for (const k of Object.keys(refLeaves)) if (!(k in lv)) s.missing.push(k);
          for (const k of Object.keys(lv)) if (!(k in refLeaves)) s.extra.push(k);
          let same = 0;
          for (const [k, v] of Object.entries(lv)) {
            if (typeof v !== 'string') continue;
            if (v.trim() === '') s.empty.push(k);
            const r = refLeaves[k];
            if (typeof r === 'string') {
              if (phs(v) !== phs(r)) s.placeholder.push(k);
              if (v === r && /\p{L}{4,}/u.test(v)) same++;
            }
          }
          if (s.missing.length || s.extra.length || s.placeholder.length || s.empty.length) shape[l] = s;
          if (same) sameAsEn[l] = same;
        }
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        found.push({
          id: n > 1 ? `${base}#${n}` : base, file, line, present, ref, leafCount,
          missing: missingLocales(byLocale), shape, sameAsEn,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/**
 * Compare a scan with the committed baseline of KNOWN gaps (a ratchet: the build fails only
 * on NEW or WORSE gaps, so today's backlog never blocks CI but cannot grow).
 * baseline: { [id]: { missing?: string[], shape?: { [locale]: string[] /* kinds *\/ } } }
 */
export function compareToBaseline(dicts, baseline) {
  const problems = [];
  const improvable = [];
  for (const d of dicts) {
    const b = baseline[d.id] || {};
    const baseMissing = new Set(b.missing || []);
    const newMissing = d.missing.filter((l) => !baseMissing.has(l));
    if (newMissing.length) problems.push(`${d.id} (${d.file}:${d.line}): missing locale(s) ${newMissing.join(', ')}`);
    const fixed = [...baseMissing].filter((l) => !d.missing.includes(l));
    if (fixed.length) improvable.push(`${d.id}: ${fixed.join(', ')} now present — remove from baseline`);
    for (const [l, s] of Object.entries(d.shape)) {
      const known = new Set((b.shape || {})[l] || []);
      for (const kind of ['missing', 'extra', 'placeholder', 'empty']) {
        if (s[kind].length && !known.has(kind)) problems.push(`${d.id} (${d.file}:${d.line}): ${l} has ${kind} key(s) ${s[kind].slice(0, 4).join(', ')}${s[kind].length > 4 ? '…' : ''}`);
      }
    }
  }
  const ids = new Set(dicts.map((d) => d.id));
  for (const id of Object.keys(baseline)) if (!ids.has(id)) improvable.push(`${id}: dictionary no longer found — remove from baseline`);
  return { problems, improvable };
}

/** Build the baseline object that would make the current scan pass. */
export function makeBaseline(dicts) {
  const out = {};
  for (const d of dicts) {
    const shape = {};
    for (const [l, s] of Object.entries(d.shape)) {
      const kinds = ['missing', 'extra', 'placeholder', 'empty'].filter((k) => s[k].length);
      if (kinds.length) shape[l] = kinds;
    }
    if (d.missing.length || Object.keys(shape).length) out[d.id] = { ...(d.missing.length ? { missing: d.missing } : {}), ...(Object.keys(shape).length ? { shape } : {}) };
  }
  return out;
}

/** Per-locale summary rows for the gap table. */
export function summarise(dicts) {
  return LOCALES.map((l) => ({
    locale: l,
    dictionaries: dicts.length,
    missing: dicts.filter((d) => d.missing.includes(l)).length,
    shapeProblems: dicts.filter((d) => d.shape[l]).length,
    sameAsReference: dicts.reduce((a, d) => a + (d.sameAsEn[l] || 0), 0),
  }));
}
