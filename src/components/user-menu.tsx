import Link from "next/link";
import { btnSmall } from "@/components/ui";
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
        className={btnSmall}
      >
        Войти
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="max-w-[14rem] truncate text-muted">{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className={btnSmall}
        >
          Выйти
        </button>
      </form>
    </div>
  );
}
