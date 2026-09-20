'use client';
import { usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

// The admin tabs (Romanian originals in parentheses for parity with TT).
const TABS = [
  { href: '/admin', label: 'Dashboard' },
  { grp: 'Newsroom' },
  { href: '/admin/editor', label: 'Editor' },
  { href: '/admin/ai', label: 'AI' },
  { href: '/admin/editorial', label: 'Editorial Studio' },
  { href: '/admin/articles', label: 'Articles (Articole)' },
  { href: '/admin/scraper', label: 'Scraper RSS' },
  { href: '/admin/comments', label: 'Comments (Comentarii)' },
  { grp: 'Listings' },
  { href: '/admin/directory', label: 'Directory' },
  { href: '/admin/agenda', label: 'Agenda / events' },
  { grp: 'Audience' },
  { href: '/admin/social', label: 'Social' },
  { href: '/admin/newsletter', label: 'Newsletter' },
  { href: '/admin/subscribers', label: 'Subscribers (Abonați)' },
  { href: '/admin/inbox', label: 'Inbox' },
  { grp: 'Revenue & ops' },
  { href: '/admin/requests', label: 'Requests (Cereri)' },
  { href: '/admin/crm', label: 'CRM' },
  { href: '/admin/fulfillment', label: 'Fulfilment' },
  { href: '/admin/sponsors', label: 'Sponsors (Publicitate)' },
  { href: '/admin/advertising', label: 'Advertising' },
  { href: '/admin/analytics', label: 'Analytics (Observabilitate)' },
  { href: '/admin/settings', label: 'Settings (Setări)' },
];

export default function AdminNav() {
  const pathname = usePathname();
  // strip a leading locale segment (e.g. /el/admin/ai → /admin/ai)
  const path = pathname.replace(/^\/(en|el|ro|ar|de|pl|ru)(?=\/)/, '') || '/admin';

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.href = '/admin/login';
  }

  return (
    <aside className="adm-side">
      <div className="brand">Cyprus Lifestyle</div>
      {TABS.map((tab, i) =>
        'grp' in tab ? (
          <div className="grp" key={`g${i}`}>{tab.grp}</div>
        ) : (
          <a key={tab.href} href={tab.href} className={path === tab.href ? 'active' : ''}>{tab.label}</a>
        ),
      )}
      <div className="grp">Session</div>
      <a href="#" onClick={(e) => { e.preventDefault(); signOut(); }}>Sign out</a>
      <a href="/" target="_blank">View site ↗</a>
    </aside>
  );
}
