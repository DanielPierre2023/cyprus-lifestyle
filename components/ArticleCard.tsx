import { Link } from '@/lib/i18n/routing';
import type { Card } from '@/lib/queries';

export default function ArticleCard({ card, kicker }: { card: Card; kicker?: string }) {
  return (
    <article className="card">
      <Link href={`/article/${card.slug}`} className="thumb" aria-hidden={!card.cover_image}>
        {card.cover_image ? <img src={card.cover_image} alt="" loading="lazy" /> : <span />}
      </Link>
      <h3><Link href={`/article/${card.slug}`}>{card.title}</Link></h3>
      {card.excerpt ? <p>{card.excerpt}</p> : null}
      <div className="meta">{kicker || card.category || ''}{card.author_name ? ` · ${card.author_name}` : ''}</div>
    </article>
  );
}
