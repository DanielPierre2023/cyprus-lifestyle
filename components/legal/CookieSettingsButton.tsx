'use client';
// "Cookie settings": reopens the consent notice. Withdrawing consent must be as easy as giving it, so this forgets the
// stored choice (localStorage cl-consent) and reloads, which makes components/ConsentAnalytics show the notice again
// and keeps the optional scripts (analytics, GetYourGuide) from loading until the reader decides again.
export default function CookieSettingsButton({ label }: { label: string }) {
  function reopen() {
    try { localStorage.removeItem('cl-consent'); } catch { /* storage unavailable */ }
    try { window.location.reload(); } catch { /* ignore */ }
  }
  return <button type="button" style={{ display: 'block', background: 'none', border: 0, padding: '5px 0', margin: 0, color: 'inherit', opacity: 0.8, font: 'inherit', fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '.04em', textAlign: 'start', cursor: 'pointer' }} onClick={reopen}>{label}</button>;
}
