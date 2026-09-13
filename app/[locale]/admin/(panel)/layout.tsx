import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/supabase/server';
import AdminNav from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

// Gate: only admins reach the panel. Everyone else → login.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/admin/login');
  return (
    <div className="adm">
      <AdminNav />
      <main className="adm-main">{children}</main>
    </div>
  );
}
