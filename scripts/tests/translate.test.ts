// The translation helpers on OpenAI: routed by task, guarded in code (figures, elements), and never handing the source back as a translation.
import { translateHtml, translateText, translateBundle } from '@/lib/translate';
import { installFakeOpenAI } from './_fakeOpenAI';
import { eq, ok, report } from './_harness';

const SRC = '<p>The harbour authority raised the berth fee to <strong>90 euros</strong> on 1 March.</p><h2>Why</h2><p>About 400 berth holders are affected; the old fee was 70 euros.</p>';
const GOOD_DE = '<p>Die Hafenbehörde hat die Liegegebühr am 1. März auf <strong>90 Euro</strong> angehoben.</p><h2>Warum</h2><p>Rund 400 Liegeplatzinhaber sind betroffen; die alte Gebühr betrug 70 Euro.</p>';

async function main() {
  // ── translateHtml ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const f = installFakeOpenAI(() => GOOD_DE);
    const r = await translateHtml(SRC, 'en', 'de');
    ok('a faithful translation is returned', r.ok === true && r.html === GOOD_DE);
    eq('one call, routed to the translation task at medium effort on the allowed model', [f.calls.length, f.calls[0].model, f.calls[0].effort], [1, 'gpt-6-luna', 'medium']);
    ok('the German brief keeps the no-dash rule', /No em or en dashes/.test(f.calls[0].system));
    f.restore();
  }
  {
    const f = installFakeOpenAI(() => GOOD_DE);
    await translateHtml(SRC, 'en', 'ru');
    ok('the Russian brief allows the dash its punctuation needs', /тире/.test(f.calls[0].system) && !/No em or en dashes/.test(f.calls[0].system));
    f.restore();
  }
  {
    const dropped = GOOD_DE.replace(' die alte Gebühr betrug 70 Euro', '');
    const f = installFakeOpenAI((_c, n) => (n === 1 ? dropped : GOOD_DE));
    const r = await translateHtml(SRC, 'en', 'de');
    eq('a translation that drops a figure is asked for again with the problem named (a 60-second route has time for medium effort at most)', [r.ok, f.calls.length, f.calls[1].effort, /CORRECTION/.test(f.calls[1].system), /70/.test(f.calls[1].system) || /missing/.test(f.calls[1].system)], [true, 2, 'medium', true, true]);
    f.restore();
    process.env.AI_APP_BUDGET_MS = '240000';
    const g = installFakeOpenAI((_c, n) => (n === 1 ? dropped : GOOD_DE));
    await translateHtml(SRC, 'en', 'de');
    eq('with the longer budget of a Pro plan the second attempt thinks harder', g.calls[1].effort, 'high');
    delete process.env.AI_APP_BUDGET_MS; g.restore();
  }
  {
    const wrong = GOOD_DE.replace('90 Euro', '95 Euro');
    const f = installFakeOpenAI(() => wrong);
    const r = await translateHtml(SRC, 'en', 'de');
    ok('a translation that still changes a figure is refused, not returned', r.ok === false && /changed figures/.test(r.error || '') && !r.html && f.calls.length === 2);
    f.restore();
  }
  {
    const merged = GOOD_DE.replace('<h2>Warum</h2>', '');
    const f = installFakeOpenAI(() => merged);
    const r = await translateHtml(SRC, 'en', 'de');
    ok('differing elements with correct figures are delivered with a warning', r.ok === true && /elements differ/.test(r.warning || '') && f.calls.length === 2);
    f.restore();
  }
  {
    const f = installFakeOpenAI(() => ({ status: 500, body: { error: { message: 'server error' } } }));
    const r = await translateHtml(SRC, 'en', 'de');
    ok('a model failure is an error, never the English text', r.ok === false && !r.html && /server error/i.test(r.error || ''));
    f.restore();
  }
  {
    const f = installFakeOpenAI(() => GOOD_DE);
    eq('same language and empty input need no call', [(await translateHtml(SRC, 'en', 'en')).html, (await translateHtml('  ', 'en', 'de')).ok, f.calls.length], [SRC, false, 0]);
    f.restore();
  }
  {
    const f = installFakeOpenAI(() => '```html\n' + GOOD_DE + '\n```');
    const r = await translateHtml(SRC, 'en', 'de');
    ok('code fences are removed', r.ok === true && r.html === GOOD_DE);
    f.restore();
  }

  // ── translateText ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const f = installFakeOpenAI(() => 'Marina Limassol erhöht die Liegegebühr auf 90 Euro');
    eq('a title is translated', [await translateText('Limassol marina raises berth fee to 90 euros', 'en', 'de', 'title'), f.calls[0].effort], ['Marina Limassol erhöht die Liegegebühr auf 90 Euro', 'medium']);
    f.restore();
    const g = installFakeOpenAI(() => ({ status: 500, body: { error: { message: 'down' } } }));
    eq('on failure the answer is empty, not the English source', await translateText('Limassol marina raises berth fee', 'en', 'de'), '');
    g.restore();
    const h = installFakeOpenAI(() => 'Marina Limassol erhöht die Gebühr auf 99 Euro');
    eq('a figure that is not in the source makes the translation unusable', await translateText('Limassol marina raises the fee to 90 euros', 'en', 'de'), '');
    h.restore();
    eq('same language returns the text, empty returns empty', [await translateText('Hello', 'en', 'en'), await translateText('  ', 'en', 'de')], ['Hello', '']);
  }

  // ── translateBundle ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const f = installFakeOpenAI(() => JSON.stringify({ title: 'Marina erhöht Gebühr auf 90 Euro', excerpt: 'Ab 1. März gilt der neue Preis', seo_title: 'Marina Gebühr 95 Euro' }));
    const r = await translateBundle({ title: 'Marina raises fee to 90 euros', excerpt: 'From 1 March the new price applies', seo_title: 'Marina fee 90 euros', summary: '' }, 'en', 'de');
    eq('only translated, figure-true fields come back (the one with an invented figure and the empty one are absent)', [Object.keys(r).sort(), r.title], [['excerpt', 'title'], 'Marina erhöht Gebühr auf 90 Euro']);
    eq('JSON mode, medium effort', [f.calls[0].format?.type, f.calls[0].effort], ['json_object', 'medium']);
    f.restore();
    const g = installFakeOpenAI(() => ({ status: 429, body: { error: { message: 'You exceeded your current quota', code: 'insufficient_quota' } } }));
    eq('on failure nothing comes back (the callers used to store the English fields)', await translateBundle({ title: 'Marina raises fee' }, 'en', 'de'), {});
    g.restore();
    eq('same language returns the fields, no fields returns nothing', [await translateBundle({ title: 'x' }, 'en', 'en'), await translateBundle({ title: '' }, 'en', 'de')], [{ title: 'x' }, {}]);
  }
  report('translate');
}
main().catch((e) => { console.error(e); process.exit(1); });
