'use client';
// Loads the concierge widget (components/ConciergeChat.tsx, ~44 KB source) OFF the critical
// path. It used to be bundled into the (site) layout, so every page of every locale paid for
// it in first-load JS even if the visitor never opened the chat. Now its chunk is fetched
//   - when the browser is idle (rIC, max 4 s), or
//   - immediately on the first pointer / key / scroll / touch, or
//   - at once when another component asks it a question ('concierge:ask' - AskConcierge).
// An 'ask' that arrives before the chunk is in is replayed once the widget has mounted.
import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { ConciergeChatLabels } from '@/components/ConciergeChat';
import type { Locale } from '@/lib/locales';

type Props = { locale: Locale; labels: ConciergeChatLabels };

export default function ConciergeLazy(props: Props) {
  const [Chat, setChat] = useState<ComponentType<Props> | null>(null);
  const pending = useRef<unknown>(null);
  const started = useRef(false);

  useEffect(() => {
    const load = () => {
      if (started.current) return;
      started.current = true;
      import('@/components/ConciergeChat').then((m) => setChat(() => m.default as ComponentType<Props>)).catch(() => { started.current = false; });
    };
    const onAsk = (e: Event) => { pending.current = (e as CustomEvent).detail ?? {}; load(); };
    const opts: AddEventListenerOptions = { once: true, passive: true };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((ev) => window.addEventListener(ev, load, opts));
    window.addEventListener('concierge:ask', onAsk);

    const hasIdle = typeof window.requestIdleCallback === 'function';
    const idle = hasIdle ? window.requestIdleCallback(load, { timeout: 4000 }) : window.setTimeout(load, 2500);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, load));
      window.removeEventListener('concierge:ask', onAsk);
      if (hasIdle) window.cancelIdleCallback(idle); else window.clearTimeout(idle);
    };
  }, []);

  // Runs after the widget's own effects (children first), so its 'concierge:ask' listener exists.
  useEffect(() => {
    if (Chat && pending.current) {
      const detail = pending.current;
      pending.current = null;
      try { window.dispatchEvent(new CustomEvent('concierge:ask', { detail })); } catch { /* old browsers */ }
    }
  }, [Chat]);

  return Chat ? <Chat {...props} /> : null;
}
