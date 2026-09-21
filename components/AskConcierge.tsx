'use client';
// Inline concierge call-to-action embedded in articles. Clicking it opens the
// site's concierge widget with a question seeded from the article's topic (via a
// 'concierge:ask' window event ConciergeChat listens for) — so a reader can go
// straight from reading to asking, in their own language.
export default function AskConcierge({ question, heading, label }: { question: string; heading: string; label: string }) {
  const ask = () => {
    try { window.dispatchEvent(new CustomEvent('concierge:ask', { detail: { q: question } })); } catch { /* no-op */ }
  };
  return (
    <aside
      style={{
        margin: '28px 0', padding: '20px 22px', borderRadius: 8,
        border: '1px solid rgba(201,162,76,.45)', borderTop: '3px solid #C9A24C',
        background: 'rgba(201,162,76,.06)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 260px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: 'inherit', marginBottom: 4 }}>{heading}</div>
        <div style={{ fontSize: 13, opacity: .75 }}>{question}</div>
      </div>
      <button
        onClick={ask}
        style={{
          padding: '11px 20px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
          border: '1px solid #C9A24C', background: 'linear-gradient(180deg,#E4D2AC,#C9A24C)',
          color: '#0B0E11', fontWeight: 700, fontSize: 13, letterSpacing: '.3px',
        }}
      >✦ {label}</button>
    </aside>
  );
}
