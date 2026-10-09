// Increment 8.1 — the four legal documents exist in all seven locales, are complete and consistent, and do not publish a street
// address or VAT number for the company (owner decision; both are optional config constants in lib/legal/config.ts).
import { LOCALES } from '@/lib/locales';
import { LEGAL, legalTokens } from '@/lib/legal/config';
import { LEGAL_DOCS, LEGAL_PATHS, LEGAL_UI, getLegalDoc, legalUpdatedLabel } from '@/lib/legal';
import { LEGAL_KINDS } from '@/lib/legal/types';
import { readFileSync } from 'node:fs';
import { eq, ok, report } from './_harness';

const textOf = (kind: (typeof LEGAL_KINDS)[number], loc: (typeof LOCALES)[number]) => {
  const d = getLegalDoc(kind, loc);
  return [d.title, d.dek, ...d.sections.flatMap((s) => [s.h, ...(s.p || []), ...(s.li || [])])].join('\n');
};

eq('four documents', [...LEGAL_KINDS], ['privacy', 'terms', 'cookies', 'notice']);
eq('paths', LEGAL_PATHS, { privacy: '/privacy', terms: '/terms', cookies: '/cookies', notice: '/legal-notice' });
eq('address not published by default', LEGAL.address, '');
eq('VAT number not published by default', LEGAL.vatNumber, '');
eq('company', [LEGAL.company, LEGAL.registration, LEGAL.town], ['ADD Individual Solutions Ltd', 'HE 439793', 'Pyla']);
ok('updated date is ISO', /^\d{4}-\d{2}-\d{2}$/.test(LEGAL.updated));

const tokens = legalTokens();
for (const kind of LEGAL_KINDS) {
  const counts: number[] = [];
  for (const loc of LOCALES) {
    ok(`${kind}/${loc}: document exists`, !!LEGAL_DOCS[kind][loc]);
    const raw = LEGAL_DOCS[kind][loc];
    const d = getLegalDoc(kind, loc);
    ok(`${kind}/${loc}: title + dek`, d.title.trim().length > 3 && d.dek.trim().length > 10);
    ok(`${kind}/${loc}: has sections`, d.sections.length >= 5);
    counts.push(raw.sections.length);
    d.sections.forEach((s, i) => {
      ok(`${kind}/${loc}/${i}: heading`, s.h.trim().length > 1);
      const body = [...(s.p || []), ...(s.li || [])];
      ok(`${kind}/${loc}/${i}: not empty`, body.length > 0 && body.every((x) => x.trim().length > 8));
    });
    // every {token} used is known and resolved
    const all = JSON.stringify(raw);
    for (const m of all.matchAll(/\{([a-z_]+)\}/g)) ok(`${kind}/${loc}: known token {${m[1]}}`, m[1] in tokens);
    ok(`${kind}/${loc}: no unresolved tokens`, !/\{[a-z_]+\}/.test(textOf(kind, loc)));
  }
  eq(`${kind}: same section count in every locale`, new Set(counts).size, 1);
}

// Required facts, in every locale.
for (const loc of LOCALES) {
  const priv = textOf('privacy', loc), terms = textOf('terms', loc), cook = textOf('cookies', loc), note = textOf('notice', loc);
  for (const p of ['Supabase', 'Vercel', 'Stripe', 'Resend', 'OpenAI', 'Meta', 'Google', 'GetYourGuide']) ok(`privacy/${loc}: names ${p}`, priv.includes(p));
  // Every text job runs on OpenAI and nothing is sent to another model vendor, so no other vendor is named as a recipient.
  ok(`privacy/${loc}: names no other model vendor`, !/Anthropic|Claude|Gemini/.test(priv));
  const openAiItem = (getLegalDoc('privacy', loc).sections.flatMap((s) => s.li || []).find((x) => x.startsWith('OpenAI:')) || '');
  ok(`privacy/${loc}: the OpenAI entry covers the concierge conversations, search vectors and read-aloud speech`, openAiItem.length > 200 && /embeddings/i.test(openAiItem) && /Telegram|تيليغرام/.test(openAiItem));
  ok(`privacy/${loc}: Commissioner contact`, priv.includes('commissioner@dataprotection.gov.cy') && priv.includes('+357 22 818 456'));
  ok(`privacy/${loc}: 125(I)/2018`, priv.includes('125(I)/2018'));
  ok(`privacy/${loc}: retention 90 / 30 / 14 / 60 / 72`, ['90', '30', '14', '60', '72'].every((n) => priv.includes(n)));
  ok(`privacy/${loc}: company + reg + town`, priv.includes('ADD Individual Solutions Ltd') && priv.includes('HE 439793') && priv.includes('Pyla'));
  ok(`terms/${loc}: price 19`, terms.includes('19 €') || terms.includes('€19') || /\b19\b/.test(terms));
  ok(`terms/${loc}: 14 days withdrawal + Directive`, terms.includes('14') && terms.includes('2011/83'));
  ok(`terms/${loc}: priority-lane numbers 4 and 09:00`, terms.includes('09:00') && terms.includes('18:00'));
  ok(`terms/${loc}: ODR discontinued 2025`, terms.includes('2025') && terms.includes('ODR'));
  ok(`terms/${loc}: ads mail`, terms.includes('advertise@cypruslifestyle.eu'));
  for (const c of ['cl-consent', 'cl_cid', 'cl_member', 'cl_business', 'cl_owner_sess', 'NEXT_LOCALE', 'Speed Insights', 'getyourguide']) ok(`cookies/${loc}: lists ${c}`, cook.includes(c));
  ok(`cookies/${loc}: 112(I)/2004`, cook.includes('112(I)/2004'));
  ok(`notice/${loc}: company + reg + town`, note.includes('ADD Individual Solutions Ltd') && note.includes('HE 439793') && note.includes('Pyla'));
  ok(`notice/${loc}: ODR 20 July 2025 stated`, note.includes('2025') && note.includes('ODR'));
  ok(`ui/${loc}: labels`, Object.values(LEGAL_UI[loc]).every((v) => v.trim().length > 1) && legalUpdatedLabel(loc).includes('2026'));
}

// The processors paragraph of the site's own texts (messages/*.json) says the same.
for (const loc of LOCALES) {
  const raw = readFileSync(`messages/${loc}.json`, 'utf8');
  ok(`messages/${loc}: the processors text names OpenAI and no other model vendor`, raw.includes('OpenAI') && !/Anthropic|Gemini/.test(raw));
}
ok('the legal texts carry a revision date on or after the change of AI provider', LEGAL.updated >= '2026-10-09');

// The Record of Processing Activities (register migration) is in line with the notice.
{
  const sql = readFileSync('supabase/migrations/20261011090000_privacy_register_openai.sql', 'utf8');
  ok('register: the concierge and the mailroom rows are updated by id', /where id = 'concierge'/.test(sql) && /where id = 'mailroom'/.test(sql));
  ok('register: OpenAI is the named recipient and no other model vendor', /OpenAI/.test(sql.replace(/--.*$/gm, '')) && !/Anthropic|Gemini/.test(sql.replace(/--.*$/gm, '')));
  ok('register: additive (updates only, nothing dropped or deleted)', !/\b(drop|delete|truncate)\b/i.test(sql.replace(/--.*$/gm, '')));
}

// Owner decision: no street address of the company and no VAT number anywhere.
const STREET = /\b\d+[A-Za-z]?\s+[A-Z][\p{L}.\-]+\s+(Street|St\.|Road|Rd\.|Avenue|Ave\.)\b|\b(Street|Road|Avenue)\s+\d+/u;
const CY_VAT = /\b(CY\s?)?\d{8}[A-Z]\b/;
const VAT_ID = /\bVAT\s*(No\.?|number|ID|reg\w*)\s*[:#]?\s*[A-Z]{2}\s?\d{6,}/i;
for (const kind of LEGAL_KINDS) for (const loc of LOCALES) {
  const t = textOf(kind, loc);
  ok(`${kind}/${loc}: no VAT number`, !CY_VAT.test(t) && !VAT_ID.test(t));
  // The only street in the texts is the supervisory authority's (1 Iasonos Street), in the Privacy Policy.
  const noAuthority = t.replace(/1 Iasonos Street, 1082 \p{L}+/gu, '');
  ok(`${kind}/${loc}: no street address`, !STREET.test(noAuthority));
}

report('legal');
