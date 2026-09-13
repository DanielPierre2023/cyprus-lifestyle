// Instant skeleton for the article feature opener + reading column.
export default function Loading() {
  return (
    <article>
      <div className="sk" style={{ height: '60vh', width: '100%', borderRadius: 0 }} />
      <div className="article wrap">
        <div className="sk" style={{ height: 10, width: 60, margin: '36px auto 26px' }} />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="sk" style={{ height: 16, width: i % 3 === 2 ? '68%' : '100%', marginBottom: 13 }} />
        ))}
      </div>
    </article>
  );
}
