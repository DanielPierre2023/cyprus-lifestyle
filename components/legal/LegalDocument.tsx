// Renders one of the four legal documents (lib/legal) in the site's existing legal-page layout.
import type { Locale } from '@/lib/locales';
import { LEGAL_UI, getLegalDoc, legalUpdatedLabel, type LegalKind } from '@/lib/legal';

export default function LegalDocument({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const doc = getLegalDoc(kind, locale);
  const ui = LEGAL_UI[locale] || LEGAL_UI.en;
  return (
    <div className="page wrap">
      <div className="page-head">
        <span className="kicker">{ui.kicker}</span>
        <h1>{doc.title}</h1>
        <p className="dek">{doc.dek}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
        <p className="legal-updated">{legalUpdatedLabel(locale)}</p>
      </div>
      <div className="prose legal">
        {doc.sections.map((s, i) => (
          <section key={i} className="legal-sec">
            <h2>{s.h}</h2>
            {s.p?.map((para, j) => <p key={j}>{para}</p>)}
            {s.li && s.li.length ? <ul>{s.li.map((x, j) => <li key={j}>{x}</li>)}</ul> : null}
          </section>
        ))}
      </div>
    </div>
  );
}
