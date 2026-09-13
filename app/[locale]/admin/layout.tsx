import './admin.css';

// Bare wrapper so /admin/login (ungated) and /admin/* (gated in (panel)) share
// the admin stylesheet without the panel chrome.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
