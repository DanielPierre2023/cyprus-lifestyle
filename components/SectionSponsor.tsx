import type { SectionSponsor as SectionSponsorData } from '@/lib/queries';

// "Presented by" in all seven editions — the label is localized; the sponsor's own
// name is never translated.
const PRESENTED: Record<string, string> = {
  en: 'Presented by', el: 'Παρουσιάζεται από', ro: 'Prezentat de',
  ar: 'برعاية', de: 'Präsentiert von', pl: 'Prezentowane przez', ru: 'При поддержке',
};

// A tasteful "Presented by <name>" lockup for a sponsored section, in the site's
// kicker/gold aesthetic. Renders the sponsor logo when one is set, else the name
// in the display serif. Links out (rel="sponsored") when a URL is present.
// Renders nothing when there is no sponsor — so the section page is unchanged.
export default function SectionSponsor({ sponsor, locale = 'en' }: { sponsor: SectionSponsorData | null; locale?: string }) {
  if (!sponsor?.name) return null;
  const label = PRESENTED[locale] || PRESENTED.en;

  const inner = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, verticalAlign: 'middle' }}>
      <span className="kicker" style={{ whiteSpace: 'nowrap' }}>{label}</span>
      {sponsor.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sponsor.logo} alt={sponsor.name} height={26}
          style={{ maxHeight: 26, width: 'auto', objectFit: 'contain', display: 'block' }} />
      ) : (
        <strong style={{ fontFamily: 'var(--disp)', fontSize: 18, fontWeight: 600, color: 'var(--gold-deep)', letterSpacing: '.005em' }}>
          {sponsor.name}
        </strong>
      )}
    </span>
  );

  return (
    <div className="section-sponsor" style={{ margin: '10px 0 2px' }}>
      {sponsor.url ? (
        <a href={sponsor.url} target="_blank" rel="sponsored noopener" style={{ textDecoration: 'none', color: 'inherit' }}>
          {inner}
        </a>
      ) : inner}
    </div>
  );
}
