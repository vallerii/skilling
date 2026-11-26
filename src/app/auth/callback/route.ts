import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Ссылка из письма Supabase (восстановление пароля) приходит сюда с `?code=`.
 * Меняем код на сессию и ведём дальше — на страницу нового пароля.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  // Только внутренние пути — иначе ссылкой можно увести на чужой сайт
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
    console.error("auth callback", error.message);
  }
  return NextResponse.redirect(`${origin}/forgot-password?expired=1`);
}
