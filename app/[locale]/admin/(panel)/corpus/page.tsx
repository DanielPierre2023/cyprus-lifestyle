import { supabaseServer } from '@/lib/supabase/server';
import { LANGS } from '@/lib/journalism/languages';
import { analyzeCorpus, MIN_PIECES, type CorpusReport, type Example, type Group } from '@/lib/journalism/corpus';

export const dynamic = 'force-dynamic';

// Corpus monitor — what repeats across MANY articles. A single article can pass every check and still be one of forty that open
// "The Limassol …", end on a forecast and share the phrase "plays a key role". Readers feel that long before any detector does, and no test
// of one article can see it. This page reads the latest published pieces of ONE language and reports the repetition: how pieces begin
// and end, the headline templates, the phrases found in many pieces, and the words paragraphs begin with. It reports; it edits nothing.
// (The desk also shows the writers how the latest pieces began, so they avoid beginning alike.) It is craft control: variety in how we
// write. It is no guarantee against any external AI detector, and nothing here tries to evade one.

const WINDOW = 120;
const LANG_NAMES: Record<string, string> = { en: 'English', el: 'Greek', ro: 'Romanian', ar: 'Arabic', de: 'German', pl: 'Polish', ru: 'Russian' };
const TONE: Record<CorpusReport['verdict'], string> = { too_few: '#8a8371', varied: '#1f7a3f', watch: '#8a6d1f', repetitive: '#9a2020' };
const VERDICT: Record<CorpusReport['verdict'], string> = {
  too_few: `Fewer than ${MIN_PIECES} pieces in this language: too few to judge.`,
  varied: 'Varied: the pieces begin, end and are headlined in their own ways.',
  watch: 'On watch: some openings, endings, headlines or phrases recur. Look at the patterns below.',
  repetitive: 'Repetitive: many pieces share their openings, endings or phrases. Read the patterns below, then look at the model pieces and at the desk’s prompts.',
};
const pct = (x: number) => `${Math.round(x * 100)}%`;

function Examples({ ex, ids }: { ex: Example[]; ids: Map<string, string> }) {
  return (
    <>
      {ex.map((e, i) => {
        const id = ids.get(e.slug);
        return (
          <div key={`${e.slug}-${i}`} className="sub" style={{ margin: i ? '3px 0 0' : 0, fontSize: 12.5 }}>
            {id ? <a href={`/admin/editor?id=${id}`} style={{ color: '#0B0E11' }}>{e.text}</a> : e.text}
          </div>
        );
      })}
    </>
  );
}

function Groups({ rows, label, ids, empty }: { rows: Group[]; label: string; ids: Map<string, string>; empty: string }) {
  return (
    <table className="adm-t" style={{ marginBottom: 6 }}>
      <thead><tr><th>{label}</th><th>Pieces</th><th>Share</th><th>Examples</th></tr></thead>
      <tbody>
        {rows.map((g) => (
          <tr key={g.key}>
            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{g.key}</td>
            <td>{g.count}</td>
            <td>{pct(g.share)}</td>
            <td><Examples ex={g.examples} ids={ids} /></td>
          </tr>
        ))}
        {rows.length === 0 ? <tr><td colSpan={4} className="sub" style={{ margin: 0, color: '#1f7a3f' }}>{empty}</td></tr> : null}
      </tbody>
    </table>
  );
}

const H = ({ title, note }: { title: string; note: string }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #C9A24C', paddingBottom: 6, margin: '24px 0 10px', gap: 16, flexWrap: 'wrap' }}>
    <h1 style={{ fontSize: 18, margin: 0 }}>{title}</h1>
    <span className="sub" style={{ margin: 0, maxWidth: 640 }}>{note}</span>
  </div>
);

export default async function CorpusTab({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const sp = await searchParams;
  const lang = (LANGS as string[]).includes(String(sp.lang)) ? String(sp.lang) : 'en';
  const sb = await supabaseServer();
  const { data } = await sb
    .from('blog_posts')
    .select(`id, slug, published_at, title_${lang}, content_${lang}`)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(WINDOW);
  const rows = ((data as unknown as Record<string, unknown>[] | null) || [])
    .map((r) => ({ id: String(r.id), slug: String(r.slug || r.id), published: r.published_at ? String(r.published_at) : '', title: String(r[`title_${lang}`] || ''), html: String(r[`content_${lang}`] || '') }))
    .filter((r) => r.title && r.html);
  const report = analyzeCorpus(rows, lang);
  const ids = new Map(rows.map((r) => [r.slug, r.id]));
  const dates = rows.map((r) => r.published).filter(Boolean).sort();
  const span = dates.length ? `${dates[0].slice(0, 10)} to ${dates[dates.length - 1].slice(0, 10)}` : '';
  const tone = TONE[report.verdict];
  const mix = report.endingMix;

  return (
    <>
      <h1>Corpus monitor</h1>
      <p className="sub">
        What repeats across <strong>many</strong> articles, which no check of a single article can see: how pieces begin and end, the headline templates, the phrases found
        in many pieces, and the words paragraphs begin with. Read-only, one language at a time, over the {WINDOW} most recent published pieces.
      </p>
      <p className="sub">
        This is craft control, variety in how we write. It is not a guarantee against any external AI detector, and nothing here tries to deceive one. The writers
        already see how our latest pieces began; this page shows the whole picture.
      </p>

      <div className="row" style={{ marginBottom: 18 }}>
        {(LANGS as string[]).map((l) => (
          <a key={l} href={`/admin/corpus?lang=${l}`} className={`abtn${l === lang ? ' gold' : ' ghost'}`} style={{ textDecoration: 'none' }}>{l.toUpperCase()} · {LANG_NAMES[l]}</a>
        ))}
      </div>

      <div className="cards">
        <div className="stat"><div className="n">{report.pieces}</div><div className="k">Pieces analysed{span ? ` · ${span}` : ''}</div></div>
        <div className="stat"><div className="n" style={{ color: tone }}>{report.verdict === 'too_few' ? '—' : report.index}</div><div className="k">Repetition index (0 = all different)</div></div>
        <div className="stat"><div className="n" style={{ color: tone, fontSize: 22, paddingTop: 6 }}>{report.verdict === 'too_few' ? 'too few' : report.verdict}</div><div className="k">Verdict</div></div>
        <div className="stat"><div className="n" style={{ fontSize: 22, paddingTop: 6 }}>{pct(report.openingShape.figure)} · {pct(report.openingShape.quote)}</div><div className="k">Open on a figure · on a quotation</div></div>
      </div>
      <p className="sub" style={{ marginTop: -10 }}>{VERDICT[report.verdict]}</p>

      {report.verdict === 'too_few' ? null : (
        <>
          <H title="How pieces begin" note="The first three words of the first sentence. A pattern in many pieces is a template, not a style." />
          <Groups rows={report.openings} label="Opening words" ids={ids} empty="No opening is shared by several pieces." />
          <p className="sub" style={{ fontSize: 12.5 }}>The first word alone:</p>
          <Groups rows={report.openingWords} label="First word" ids={ids} empty="—" />

          <H title="How pieces end" note="The last three words of the last sentence, and what kind of ending it is. The house standard ends on a hard fact, not on a forecast or a moral." />
          <div className="cards" style={{ marginBottom: 12 }}>
            <div className="stat"><div className="n">{pct(mix.concrete)}</div><div className="k">End on a figure or date</div></div>
            <div className="stat"><div className="n">{pct(mix.quote)}</div><div className="k">End on a quotation</div></div>
            <div className="stat"><div className="n" style={{ color: mix.forward > 0.25 ? '#9a2020' : '#0B0E11' }}>{pct(mix.forward)}</div><div className="k">End looking forward</div></div>
            <div className="stat"><div className="n">{pct(mix.other)}</div><div className="k">Other endings</div></div>
          </div>
          <Groups rows={report.endings} label="Closing words" ids={ids} empty="No ending is shared by several pieces." />

          <H title="Headlines" note="The first two words of the headline (a template) and the shape of the headline." />
          <Groups rows={report.titles} label="Headline template" ids={ids} empty="No headline template recurs." />
          <Groups rows={report.titleShapes} label="Headline shape" ids={ids} empty="—" />

          <H title="Phrases that recur" note="Runs of four or five words found in many different pieces." />
          <table className="adm-t" style={{ marginBottom: 6 }}>
            <thead><tr><th>Phrase</th><th>Pieces</th><th>Share</th><th>Example</th></tr></thead>
            <tbody>
              {report.phrases.map((p) => (
                <tr key={p.phrase}>
                  <td style={{ fontWeight: 600 }}>{p.phrase}</td><td>{p.pieces}</td><td>{pct(p.share)}</td>
                  <td><Examples ex={p.examples.slice(0, 1)} ids={ids} /></td>
                </tr>
              ))}
              {report.phrases.length === 0 ? <tr><td colSpan={4} className="sub" style={{ margin: 0, color: '#1f7a3f' }}>No phrase occurs in many pieces.</td></tr> : null}
            </tbody>
          </table>

          <H title="Paragraph openers" note="The first word of each paragraph after the first, across all pieces." />
          <Groups rows={report.paragraphOpeners} label="First word" ids={ids} empty="—" />
        </>
      )}
    </>
  );
}
