// A small note on the page of every listing that belongs to the Leptos group (projects, offices, hotels, university ...):
// who stands behind it, with a link to the head-office page that carries the history and the whole group structure.
import { Link } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/locales';
import { LEPTOS_SLUG, UI, leptosRole } from '@/lib/partners/leptos';

export default function LeptosMemberNote({ locale, slug }: { locale: Locale; slug: string }) {
  const role = leptosRole(slug);
  if (!role || role === 'hub') return null;
  const ui = UI[locale];
  return (
    <>
      <p className="lm-note">
        <span className="lm-k">◆ {role === 'project' ? ui.developedBy : ui.partOfGroup}</span>
        <Link href={`/directory/vendor/${LEPTOS_SLUG}`}>{ui.aboutLeptos}</Link>
      </p>
      <style>{`
        .lm-note{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline;margin:14px 0 0;padding:10px 14px;border:1px solid var(--line,#e3d9c4);border-inline-start:3px solid var(--gold,#C9A24C);background:#fff;border-radius:4px;font-family:var(--sans);font-size:13.5px}
        .lm-k{font-weight:600;color:var(--ink,#171922)}
        .lm-note a{color:var(--gold-deep,#a9832f);font-weight:600}
      `}</style>
    </>
  );
}
