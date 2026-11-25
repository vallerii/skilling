import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Показывает email и кнопку выхода или ссылку на вход. Читает cookies — оборачивать в Suspense. */
export async function UserMenu() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-xl border-2 border-black/15 px-3 py-1.5 text-sm font-bold dark:border-white/20"
      >
        Войти
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="max-w-[14rem] truncate font-semibold opacity-80">{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-xl border-2 border-black/15 px-3 py-1.5 font-bold dark:border-white/20"
        >
          Выйти
        </button>
      </form>
    </div>
  );
}
