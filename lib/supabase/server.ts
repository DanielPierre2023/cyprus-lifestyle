// Supabase client for Server Components / Route Handlers, bound to the request
// cookies so it runs as the signed-in user (RLS applies). Used by the admin UI.
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as never));
          } catch {
            // called from a Server Component — safe to ignore, middleware refreshes it
          }
        },
      },
    },
  );
}

// Is the current signed-in user an admin? Uses the has_role() RPC ported in Stage 1.
export async function isAdmin(): Promise<boolean> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data, error } = await sb.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  return !error && data === true;
}
