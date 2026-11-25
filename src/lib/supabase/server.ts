import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Supabase-клиент для Server Components, Server Actions и Route Handlers. */
export async function createClient() {
  // Клиент Supabase проверяет срок сессии через Date.now() — с Cache Components
  // это допустимо только во время запроса, поэтому явно ждём входящий запрос.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Вызов из Server Component: куки обновит proxy.ts
        }
      },
    },
  });
}
