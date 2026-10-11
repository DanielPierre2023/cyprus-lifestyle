// An edition is compared with its source by MEANING and ORDER, in any language: the 5-word-run test sees none of a sentence-by-sentence
// paraphrase and none of a translation. These tests use hand-made vectors (one direction per topic), so they say what the arithmetic does;
// the thresholds themselves are tuned on the measurements the desk logs.
import { embedTexts, cosine, EMBED_MAX_CHARS } from '@/lib/journalism/embeddings';
import { compareToSource, kendallTau, semanticReasons, semanticSummary, sentencesFor, SEMANTIC, type SentenceSet } from '@/lib/journalism/semantic';
import { splitSentences, substantive, wordsIn } from '@/lib/journalism/sentences';
import { eq, ok, report } from './_harness';

// ── sentences ────────────────────────────────────────────────────────────────────────────────────────────────────
eq('plain sentences', splitSentences('The marina opened. The fee is high! Is it fair? Nobody knows.'), ['The marina opened.', 'The fee is high!', 'Is it fair?', 'Nobody knows.']);
eq('decimals, initials and abbreviations do not split', splitSentences('The works cost €4.2 million. A. Charalambous said so. Dr. Smith agreed, see No. 5 on the list. It ended at 5 p.m. Tuesday was calm.'), ['The works cost €4.2 million.', 'A. Charalambous said so.', 'Dr. Smith agreed, see No. 5 on the list.', 'It ended at 5 p.m. Tuesday was calm.']);
eq('a closing quotation mark stays with its sentence', splitSentences('He said "we start in June." Then he left.'), ['He said "we start in June."', 'Then he left.']);
eq('scripts without capitals split too (Arabic full stop, Greek and Cyrillic capitals)', [splitSentences('قال الوزير ذلك. ثم غادر القاعة.').length, splitSentences('Η μαρίνα άνοιξε. Το τέλος αυξάνεται.').length, splitSentences('Марина открылась. Плата растёт.').length], [2, 2, 2]);
eq('empty and blank texts', [splitSentences(''), splitSentences('   ')], [[], []]);
eq('only sentences of four words or more are compared', substantive(['Yes.', 'It rains today in Limassol.', 'No way.']), ['It rains today in Limassol.']);
eq('words are counted', wordsIn('a b  c'), 3);
eq('the sentences of a text are capped', sentencesFor(Array.from({ length: 30 }, (_, i) => `Sentence number ${i} says something here.`).join(' '), 10).length, 10);

// ── Kendall's tau ────────────────────────────────────────────────────────────────────────────────────────────────
eq('ascending, descending, mixed, too short', [kendallTau([1, 2, 3, 4]), kendallTau([4, 3, 2, 1]), kendallTau([1, 3, 2, 4]), kendallTau([1, 2])], [1, -1, 0.6666666666666666, null]);
eq('ties are ignored; all equal is undefined', [kendallTau([1, 1, 2, 3]), kendallTau([5, 5, 5])], [1, null]);

// ── vectors ──────────────────────────────────────────────────────────────────────────────────────────────────────
const DIM = 16;
const unit = (k: number): number[] => Array.from({ length: DIM }, (_, i) => (i === k ? 1 : 0));
const near = (k: number, sim: number): number[] => { const v = unit(k); const o = unit((k + 8) % DIM); return v.map((x, i) => x * sim + o[i] * Math.sqrt(1 - sim * sim)); };   // cosine to unit(k) = sim
const set = (ks: number[], f: (k: number) => number[] = unit): SentenceSet => ({ sents: ks.map((k) => `Sentence about topic ${k} in full here.`), vecs: ks.map(f) });
ok('cosine of a vector with itself is 1, of orthogonal ones 0, of a made 0.8 pair 0.8', Math.abs(cosine(unit(1), unit(1)) - 1) < 1e-9 && cosine(unit(1), unit(2)) === 0 && Math.abs(cosine(unit(3), near(3, 0.8)) - 0.8) < 1e-9);
eq('an empty vector has no direction', cosine([], [1, 2]), 0);

// ── the comparison ───────────────────────────────────────────────────────────────────────────────────────────────
{
  const src = set([0, 1, 2, 3, 4, 5, 6, 7]);
  const copy = compareToSource(src, set([0, 1, 2, 3, 4, 5, 6]), { sameLang: true });
  ok('the same sentences in the same order: a copy of the structure', copy.copy && copy.close === 1 && copy.tau === 1 && copy.editionSentences === 7 && copy.sourceSentences === 8);
  const reordered = compareToSource(src, set([5, 2, 7, 0, 3, 6, 1]), { sameLang: true });
  ok('the same facts in an order of its own: close in meaning, NOT a copy (honest reporting looks like this)', !reordered.copy && reordered.close === 1 && (reordered.tau ?? 1) < 0.75);
  const unrelated = compareToSource(src, set([8, 9, 10, 11, 12, 13]), { sameLang: true });
  ok('unrelated sentences: nothing close, no order to speak of', !unrelated.copy && unrelated.close === 0 && unrelated.tau === null);
  const shortEd = compareToSource(src, set([0, 1, 2]), { sameLang: true });
  ok('a very short edition is not judged on structure', !shortEd.copy);
  ok('what is closest is listed for the editor (at most three)', copy.worst.length === 3 && copy.worst.every((w) => w.sim === 1 && w.edition.length > 0 && w.source.length > 0));
}
{
  // the thresholds differ between languages: translations sit lower than paraphrases
  const src = set([0, 1, 2, 3, 4, 5, 6, 7]);
  const translated = set([0, 1, 2, 3, 4, 5, 6], (k) => near(k, 0.8));
  const sameL = compareToSource(src, translated, { sameLang: true });
  const crossL = compareToSource(src, translated, { sameLang: false });
  ok('0.80 is not close in the same language (a loose paraphrase) …', sameL.close === 0 && !sameL.copy);
  ok('… but it is close across languages (a translation), and in the same order it is a copy', crossL.close === 1 && crossL.copy && crossL.closeAt === SEMANTIC.cross.closeAt);
}
{
  const src = set([0, 1, 2, 3]);
  const lede = compareToSource(src, set([0, 9, 10, 11, 12]), { sameLang: true });
  ok('an opening that says what the original\'s opening says is caught', lede.ledeCopy && !lede.copy && lede.ledeSim === 1);
  const viaTitle = compareToSource(set([5, 6, 7, 8]), set([4, 9, 10, 11, 12]), { sameLang: true, titleVec: unit(4) });
  ok('the title of the source counts as an opening', viaTitle.ledeCopy);
  const fine = compareToSource(src, set([9, 10, 11, 12, 13]), { sameLang: true });
  ok('a different opening is fine', !fine.ledeCopy && fine.ledeSim === 0);
  const nothing = compareToSource({ sents: [], vecs: [] }, set([0, 1, 2, 3, 4]), { sameLang: true });
  ok('no source sentences: nothing to say', !nothing.copy && !nothing.ledeCopy && nothing.close === 0);
}
{
  const r = compareToSource(set([0, 1, 2, 3, 4, 5, 6, 7]), set([0, 1, 2, 3, 4, 5, 6]), { sameLang: true });
  const why = semanticReasons(r);
  ok('the writer is told why, in plain words (a copy that also opens like the original gets both reasons)', why.length === 2 && /follows the original/.test(why[0]) && /100%/.test(why[0]) && /opening says what the original/.test(why[1]));
  ok('the log line carries every measure', /close 100% · order 1 · lede 1 · mean 1 \(same-language, 7\/8 sentences\)/.test(semanticSummary(r)));
  eq('an honest edition has nothing to be told', semanticReasons(compareToSource(set([0, 1, 2, 3, 4, 5, 6, 7]), set([6, 1, 5, 2, 4, 3, 7]), { sameLang: true })), []);
}

// ── the embeddings client ────────────────────────────────────────────────────────────────────────────────────────
const fakeFetch = (handler: (body: { model: string; input: string[] }) => { ok?: boolean; json?: unknown; throws?: boolean }) => {
  const sent: Array<{ url: string; body: { model: string; input: string[] }; auth: string }> = [];
  const f = (async (url: string, init: { body: string; headers: Record<string, string> }) => {
    const body = JSON.parse(init.body);
    sent.push({ url, body, auth: init.headers.Authorization });
    const r = handler(body);
    if (r.throws) throw new Error('network down');
    return { ok: r.ok !== false, json: async () => r.json } as unknown as Response;
  }) as unknown as typeof fetch;
  return { f, sent };
};
{
  const spend: Array<{ tokens: number; usd: number; inputs: number }> = [];
  const { f, sent } = fakeFetch((b) => ({ json: { data: b.input.map((_, i) => ({ index: b.input.length - 1 - i, embedding: Array.from({ length: 12 }, () => b.input.length - 1 - i) })).reverse(), usage: { total_tokens: 2_000_000 } } }));
  const out = await embedTexts(['first', 'second', 'third'], { apiKey: 'sk-test', fetch: f, onUsage: (e) => { spend.push(e); } });
  ok('one vector per text, in the order of the texts (the service may answer in any order)', !!out && out.length === 3 && out[0][0] === 0 && out[1][0] === 1 && out[2][0] === 2);
  ok('it calls the embeddings endpoint with the key and the small model', sent[0].url === 'https://api.openai.com/v1/embeddings' && sent[0].auth === 'Bearer sk-test' && sent[0].body.model === 'text-embedding-3-small');
  eq('the cost is reported from the tokens billed ($0.02 per million)', spend.map((s) => [s.tokens, s.usd, s.inputs]), [[2_000_000, 0.04, 3]]);
  const long = fakeFetch((b) => ({ json: { data: b.input.map((_, i) => ({ index: i, embedding: Array(12).fill(1) })) } }));
  await embedTexts(['x'.repeat(5_000), '   '], { apiKey: 'k', fetch: long.f });
  ok('a runaway text is cut and a blank one still gets an input', long.sent[0].body.input[0].length === EMBED_MAX_CHARS && long.sent[0].body.input[1] === ' ');
}
eq('no key, no texts, too many texts: null without a request', await Promise.all([embedTexts(['a'], { apiKey: '' }), embedTexts([], { apiKey: 'k' }), embedTexts(Array(1_001).fill('a'), { apiKey: 'k' })]), [null, null, null]);
{
  const bad = fakeFetch(() => ({ ok: false, json: {} }));
  const thrown = fakeFetch(() => ({ throws: true }));
  const partial = fakeFetch((b) => ({ json: { data: [{ index: 0, embedding: Array(12).fill(1) }].slice(0, b.input.length - 1) } }));
  const tiny = fakeFetch((b) => ({ json: { data: b.input.map((_, i) => ({ index: i, embedding: [1, 2] })) } }));
  eq('a refused request, a network error, a missing vector and a vector too short are all null (the desk goes on without the comparison)', await Promise.all([
    embedTexts(['a', 'b'], { apiKey: 'k', fetch: bad.f }), embedTexts(['a', 'b'], { apiKey: 'k', fetch: thrown.f }), embedTexts(['a', 'b'], { apiKey: 'k', fetch: partial.f }), embedTexts(['a'], { apiKey: 'k', fetch: tiny.f }),
  ]), [null, null, null, null]);
  const tel = fakeFetch((b) => ({ json: { data: b.input.map((_, i) => ({ index: i, embedding: Array(12).fill(1) })) } }));
  const out = await embedTexts(['a'], { apiKey: 'k', fetch: tel.f, onUsage: () => { throw new Error('telemetry broke'); } });
  ok('a failing spend log never breaks a call', !!out);
}

// ── the splitter must stay linear: a scraped page can hold a run of full stops (table-of-contents leaders) ────────
{
  const t0 = Date.now();
  const runs = splitSentences(`${'.'.repeat(60_000)} The next sentence starts here. ${'. '.repeat(10_000)}Last words follow. ${'!?'.repeat(20_000)} End.`);
  ok('a text with long runs of full stops is split in well under a second (it was quadratic: 43 s for 100,000 dots)', Date.now() - t0 < 1_000);
  ok('...and its sentences are still found', runs.some((x) => x.includes('The next sentence starts here.')) && runs.some((x) => x.includes('Last words follow.')));
  eq('a run of stops before a capital is one boundary, not several', splitSentences('Wait... Then it began. And ended.'), ['Wait...', 'Then it began.', 'And ended.']);
}

report('journalism-semantic');
