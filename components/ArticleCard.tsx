import { Link } from '@/lib/i18n/routing';
import CoverImage from '@/components/CoverImage';
import type { Card } from '@/lib/queries';

export default function ArticleCard({
  card, kicker, wide = false, readLabel,
}: { card: Card; kicker?: string; wide?: boolean; readLabel?: string }) {
  const label = kicker || card.category || '';
  const read = card.reading_time_min;
  const meta = [
    card.author_name,
    read && readLabel ? `${read} ${readLabel}` : null,
  ].filter(Boolean).join(' · ');
  const sizes = wide ? '(max-width: 900px) 100vw, 50vw' : '(max-width: 900px) 100vw, 33vw';

  return (
    <article className={`card${wide ? ' wide' : ''}`}>
      <Link href={`/article/${card.slug}`} className="ph" aria-hidden="true" tabIndex={-1}>
        <CoverImage src={card.cover_image} seed={card.slug} alt={card.title} className="ph-img" sizes={sizes} />
      </Link>
      {label ? <span className="kicker">{label}</span> : null}
      <h3><Link href={`/article/${card.slug}`}>{card.title}</Link></h3>
      {card.excerpt ? <p>{card.excerpt}</p> : null}
      {meta ? <div className="meta">{meta}</div> : null}
    </article>
  );
}
