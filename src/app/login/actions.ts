"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; email?: string } | undefined;

const CredentialsSchema = z.object({
  email: z.email("Введите email в формате name@example.com"),
  password: z.string().min(8, "Пароль — минимум 8 символов"),
});

/** Переводим частые ошибки Supabase Auth на русский. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверный email или пароль";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Пользователь с таким email уже зарегистрирован — попробуйте войти";
  if (m.includes("password")) return "Слишком простой пароль, придумайте сложнее";
  if (m.includes("rate limit")) return "Слишком много попыток, подождите минуту";
  return "Не получилось войти. Попробуйте ещё раз";
}

function parseCredentials(formData: FormData) {
  return CredentialsSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
}

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parseCredentials(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, email };
  }

  const supabase = await createClient();
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";

  const { error } =
    mode === "signup"
      ? await supabase.auth.signUp(parsed.data)
      : await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: translateAuthError(error.message), email };

  redirect(`/?notice=${mode}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?notice=signout");
}

// ---------------------------------------------------------------------------
// Восстановление пароля: письмо со ссылкой → /auth/callback (обмен кода на сессию) → /reset-password
// ---------------------------------------------------------------------------

export type ResetState = { sent?: boolean; error?: string; email?: string } | undefined;

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!z.email().safeParse(email).success) return { error: "Введите email, например name@example.com", email };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("rate limit") || m.includes("security purposes")) {
      return { error: "Письмо уже отправлено недавно. Подождите минуту и попробуйте снова", email };
    }
    console.error("requestPasswordReset", error);
    return { error: "Не получилось отправить письмо, попробуйте позже", email };
  }
  // Не сообщаем, есть ли такой аккаунт: так нельзя перебором узнать чужие email
  return { sent: true, email };
}

export type NewPasswordState = { error?: string } | undefined;

export async function setNewPassword(_prev: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (password.length < 8) return { error: "Минимум 8 символов" };
  if (password !== repeat) return { error: "Пароли не совпадают" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Ссылка устарела. Запросите письмо ещё раз" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("different from the old")) return { error: "Новый пароль должен отличаться от старого" };
    console.error("setNewPassword", error);
    return { error: "Не получилось сменить пароль, попробуйте ещё раз" };
  }
  redirect("/?notice=password");
}
