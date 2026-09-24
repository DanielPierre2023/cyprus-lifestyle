// Editorial imagery — pure logic (brief-building, credit lines, candidate pick and
// the AI prompt guardrails). The network I/O (Unsplash edge function, OpenAI images,
// Storage upload) is integration and not exercised here; these are the deterministic
// helpers that feed it. Bundles like the other pure suites.
import {
  coverInputFromPiece, stockCredit, pickStockResult, aiPrompt,
  type CoverInput,
} from '@/lib/editorial/cover';
import { eq, ok, report } from './_harness';

// ── coverInputFromPiece ──────────────────────────────────────────────────────
const piece = {
  slug: 'a-cyprus-dispatch', source_lang: 'en',
  title_en: 'Dinner in a Listed House', title_el: 'Δείπνο', angle: 'A tavern in a protected building',
  excerpt_en: 'What the harvest owes the table', summary_en: 'Longer summary here',
  category: 'table', subcategory: 'fine-dining', county: 'limassol',
};
const ci = coverInputFromPiece(piece, 'en');
eq('title comes from title_<lang>', ci.title, 'Dinner in a Listed House');
eq('summary prefers excerpt_<lang>', ci.summary, 'What the harvest owes the table');
eq('category carried', ci.category, 'table');
eq('county (district) carried', ci.county, 'limassol');

ok('falls back to title_en when the lang title is missing', (() => {
  const c = coverInputFromPiece({ title_en: 'Fallback', source_lang: 'de' }, 'de');
  return c.title === 'Fallback';
})());
ok('falls back to slug when no title at all', (() => {
  const c = coverInputFromPiece({ slug: 'my-slug' }, 'en');
  return c.title === 'my-slug';
})());
ok('summary falls back to angle', (() => {
  const c = coverInputFromPiece({ title_en: 'T', angle: 'the angle' }, 'en');
  return c.summary === 'the angle';
})());
ok('missing summary is null, not empty string', coverInputFromPiece({ title_en: 'T' }, 'en').summary === null);
ok('subcategory used when category is absent', coverInputFromPiece({ title_en: 'T', subcategory: 'wine' }, 'en').category === 'wine');

// ── stockCredit ──────────────────────────────────────────────────────────────
eq('credit names the author', stockCredit('Jane Doe'), 'Photo: Jane Doe / Unsplash');
eq('credit trims', stockCredit('  Jane  '), 'Photo: Jane / Unsplash');
eq('credit without an author', stockCredit(''), 'Photo: Unsplash');
eq('credit null-safe', stockCredit(null), 'Photo: Unsplash');

// ── pickStockResult ──────────────────────────────────────────────────────────
ok('picks the first candidate with a url (relevance order)', (() => {
  const r = pickStockResult([{ id: 'a', url: 'https://x/1' }, { id: 'b', url: 'https://x/2' }]);
  return r?.id === 'a';
})());
ok('skips leading candidates with no url', (() => {
  const r = pickStockResult([{ id: 'a', url: '' }, { id: 'b', url: 'https://x/2' }]);
  return r?.id === 'b';
})());
ok('empty results → null', pickStockResult([]) === null);
ok('non-array → null', pickStockResult(null) === null && pickStockResult(undefined) === null);

// ── aiPrompt (guardrails) ────────────────────────────────────────────────────
const promptInput: CoverInput = { title: 'The Marina at Dawn', summary: 'boats and light', category: 'escapes', county: 'limassol' };
const prompt = aiPrompt(promptInput);
ok('AI prompt grounds in the district', /Limassol, Cyprus/.test(prompt));
ok('AI prompt names the subject', prompt.includes('The Marina at Dawn'));
ok('AI prompt forbids text/logos/watermarks', /no text/i.test(prompt) && /no logos/i.test(prompt) && /no watermarks/i.test(prompt));
ok('AI prompt forbids real faces', /no recognisable real individuals/i.test(prompt));
ok('AI prompt is photorealistic editorial', /photorealistic/i.test(prompt) && /editorial/i.test(prompt));
ok('national/blank district grounds to Cyprus (no district clause)', (() => {
  const p = aiPrompt({ title: 'T', county: 'national' });
  return /grounded in Cyprus/.test(p) && !/national/i.test(p);
})());
ok('missing subject still yields a valid Cyprus prompt', (() => {
  const p = aiPrompt({ title: '' });
  return /Cyprus/.test(p) && /no logos/i.test(p);
})());

report('editorial-cover.pure');
