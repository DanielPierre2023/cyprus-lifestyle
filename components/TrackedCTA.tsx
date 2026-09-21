'use client';
// A drop-in <a> that logs a CTA click before navigating (roadmap item 11). Used for the
// money CTAs on directory listing pages — website, phone, directions — so we can measure
// which listings actually convert attention into action. Best-effort; never blocks the click.
import { useCallback, type ReactNode, type CSSProperties } from 'react';

function cid(): string {
  try { return localStorage.getItem('cl_cid') || ''; } catch { return ''; }
}

export default function TrackedCTA({
  slug, label, href, className, style, target, rel, children,
}: {
  slug: string; label: string; href: string; className?: string; style?: CSSProperties;
  target?: string; rel?: string; children: ReactNode;
}) {
  const onClick = useCallback(() => {
    try {
      fetch('/api/track/rec-click', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, source: 'directory', label, cid: cid() }),
      });
    } catch { /* best-effort */ }
  }, [slug, label]);
  return <a href={href} className={className} style={style} target={target} rel={rel} onClick={onClick}>{children}</a>;
}
