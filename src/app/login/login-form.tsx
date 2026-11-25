"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    authenticate,
    undefined,
  );
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="mode" value={mode} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-bold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.email}
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "auth-error" : undefined}
          className="rounded-xl border-2 border-black/15 bg-transparent px-4 py-3 outline-none focus-visible:border-brand dark:border-white/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-bold">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={8}
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "auth-error" : isSignup ? "password-hint" : undefined}
          className="rounded-xl border-2 border-black/15 bg-transparent px-4 py-3 outline-none focus-visible:border-brand dark:border-white/20"
        />
        {isSignup && (
          <p id="password-hint" className="text-sm opacity-70">
            Минимум 8 символов
          </p>
        )}
      </div>

      {state?.error && (
        <p id="auth-error" role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-2xl border-b-4 border-brand-dark bg-brand px-4 py-3 font-extrabold uppercase tracking-wide text-white transition active:translate-y-0.5 active:border-b-2 disabled:opacity-60"
      >
        {isPending ? "Секунду…" : isSignup ? "Зарегистрироваться" : "Войти"}
      </button>

      <button
        type="button"
        onClick={() => setMode(isSignup ? "signin" : "signup")}
        className="text-sm font-bold text-brand underline-offset-4 hover:underline"
      >
        {isSignup ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
      </button>
    </form>
  );
}
