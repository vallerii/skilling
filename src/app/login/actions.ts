"use server";

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

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
