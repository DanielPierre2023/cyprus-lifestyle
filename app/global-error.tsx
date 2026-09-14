'use client';
// Last-resort boundary: catches faults in the root layout itself, so it must
// render its own <html>/<body> and cannot rely on globals.css, next/font or any
// i18n context. Fully self-contained inline styles; English only.
import { useEffect } from 'react';
import { reportError } from '@/lib/monitor';

const serif = '"Bodoni Moda","Didot","Bodoni MT",Georgia,serif';
const sans = '"Jost","Futura","Helvetica Neue",system-ui,sans-serif';
const gold = '#C9A24C';
const obsidian = '#0B0E11';
const ivory = '#F4EFE6';
const champagne = '#E6D6AE';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { boundary: 'global', digest: error?.digest });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main style={{
          minHeight: '100vh', background: obsidian, color: ivory,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '48px 24px',
        }}>
          <div style={{ maxWidth: 620 }}>
            <div style={{ fontFamily: serif, fontSize: 26, letterSpacing: '.14em', textTransform: 'uppercase', color: ivory }}>
              Cyprus Lifestyle
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
              color: gold, margin: '28px 0',
            }}>
              <span style={{ height: 1, width: 64, background: `linear-gradient(90deg,transparent,${gold})` }} />
              <span style={{ width: 6, height: 6, background: gold, transform: 'rotate(45deg)' }} />
              <span style={{ height: 1, width: 64, background: `linear-gradient(90deg,${gold},transparent)` }} />
            </div>
            <div style={{ fontFamily: sans, textTransform: 'uppercase', letterSpacing: '.24em', fontSize: 11, fontWeight: 600, color: gold }}>
              Editorial Notice
            </div>
            <h1 style={{ fontFamily: serif, fontWeight: 600, fontSize: 'clamp(34px,5vw,54px)', lineHeight: 1.05, letterSpacing: '-.015em', margin: '16px 0 0' }}>
              The presses have stopped
            </h1>
            <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, color: champagne, margin: '18px auto 34px', maxWidth: '44ch', lineHeight: 1.5 }}>
              An unexpected fault interrupted the edition. Our team has been notified. Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                fontFamily: sans, textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 12, fontWeight: 600,
                background: gold, color: obsidian, border: 'none', padding: '14px 30px', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
