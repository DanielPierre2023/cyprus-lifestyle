// Server component: FIRST-PARTY reviews for a directory listing.
// Given a slug it reads the APPROVED reviews + the Bayesian first-party rating
// (lib/directory/reviews.ts, service role) and renders them, with any owner reply
// inline under its review. It renders NOTHING until there is at least one approved
// review — so it is safe to drop onto every listing page today (0 approved reviews
// → returns null, no visual change). No client JS; styling matches the listing
// detail page's `.lh-sec`/`.lh-h2` section rhythm.
import { getApprovedReviews, getFirstPartyRating } from '@/lib/directory/reviews';

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span aria-label={`${rating.toFixed(1)}/5`} style={{ color: '#C9A24C', letterSpacing: 1 }}>
      {'★'.repeat(full)}
      <span style={{ color: '#d9cfba' }}>{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export default async function DirectoryReviews({
  slug,
  locale = 'en',
  heading = 'Guest reviews',
  reviewsLabel = 'reviews',
}: {
  slug: string;
  locale?: string;
  heading?: string;
  reviewsLabel?: string;
}) {
  const [reviews, rating] = await Promise.all([
    getApprovedReviews(slug),
    getFirstPartyRating(slug),
  ]);

  // Empty-state: nothing approved yet → render nothing at all (true for every
  // listing today). Keeps the detail page unchanged until first-party data lands.
  if (!reviews.length) return null;

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short' }); }
    catch { return ''; }
  };

  return (
    <section className="lh-sec dr-sec">
      <h2 className="lh-h2">{heading}</h2>

      {rating && rating.count > 0 && rating.avg != null ? (
        <p className="dr-agg">
          <Stars rating={rating.avg} /> <b>{rating.avg.toFixed(1)}</b>
          <span className="dr-muted"> · {rating.count.toLocaleString(locale)} {reviewsLabel}</span>
          <span className="dr-fp" title="Collected first-party by Cyprus Lifestyle">◆ first-party</span>
        </p>
      ) : null}

      <ul className="dr-list">
        {reviews.map((r) => (
          <li key={r.id} className="dr-item">
            <div className="dr-head">
              <Stars rating={r.rating} />
              {r.author_name ? <span className="dr-who">{r.author_name}</span> : null}
              {r.verified_visit ? <span className="dr-vv">✓ verified visit</span> : null}
              {r.created_at ? <span className="dr-when">{fmt(r.created_at)}</span> : null}
            </div>
            {r.body ? <p className="dr-body">{r.body}</p> : null}
            {r.owner_reply ? (
              <div className="dr-reply">
                <span className="dr-reply-k">Owner’s reply{r.owner_reply_at ? ` · ${fmt(r.owner_reply_at)}` : ''}</span>
                <p className="dr-reply-b">{r.owner_reply}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <style>{DR_CSS}</style>
    </section>
  );
}

const DR_CSS = `
  .dr-agg{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-family:var(--sans);font-size:15px;color:var(--ink,#171310);margin:0 0 16px}
  .dr-agg .dr-muted{color:var(--ink-soft,#5b5346)}
  .dr-agg .dr-fp{color:#8a5b12;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em}
  .dr-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
  .dr-item{border:1px solid var(--line,#e0d6c1);border-radius:6px;padding:14px 16px;background:#fff}
  .dr-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;font-family:var(--sans);font-size:13px}
  .dr-who{font-weight:600;color:var(--ink,#171310)}
  .dr-vv{color:#4E7A46;font-size:12px;font-weight:600}
  .dr-when{color:var(--ink-soft,#5b5346);margin-left:auto}
  .dr-body{font-family:var(--body);font-size:16px;line-height:1.55;color:var(--ink,#171310);margin:10px 0 0}
  .dr-reply{margin:12px 0 0;padding:10px 12px;border-left:3px solid #C9A24C;background:var(--paper-2,#efe8d8);border-radius:0 5px 5px 0}
  .dr-reply-k{font-family:var(--sans);text-transform:uppercase;letter-spacing:.1em;font-size:10.5px;color:#8a5b12;font-weight:600}
  .dr-reply-b{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--ink,#171310);margin:4px 0 0}
`;
