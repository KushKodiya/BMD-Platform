import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Request-scoped Supabase client that carries the logged-in user's session,
// so RLS and auth.uid() apply. Use this in server components and actions.
export function supabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (all: CookieToSet[]) => {
          try {
            all.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Called from a Server Component render — safe to ignore; middleware
            // (or the action) refreshes the session cookie.
          }
        },
      },
    }
  );
}
