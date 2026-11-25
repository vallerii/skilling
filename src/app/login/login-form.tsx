"use client";

import { useActionState, useState } from "react";
import { btnPrimary } from "@/components/ui";
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
        <label htmlFor="email" className="text-sm font-medium">
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
          className="min-h-12 rounded-xl border border-control bg-raised px-4 text-base outline-none focus-visible:border-ink focus-visible:shadow-[inset_0_0_0_1px_var(--text)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
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
          className="min-h-12 rounded-xl border border-control bg-raised px-4 text-base outline-none focus-visible:border-ink focus-visible:shadow-[inset_0_0_0_1px_var(--text)]"
        />
        {isSignup && (
          <p id="password-hint" className="text-sm text-muted">
            Минимум 8 символов
          </p>
        )}
      </div>

      {state?.error && (
        <p id="auth-error" role="alert" className="rounded-xl bg-negative-tint px-4 py-3 text-sm text-[#7a1d14]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={`${btnPrimary} mt-2 w-full`}
      >
        {isPending ? "Секунду…" : isSignup ? "Зарегистрироваться" : "Войти"}
      </button>

      <button
        type="button"
        onClick={() => setMode(isSignup ? "signin" : "signup")}
        className="min-h-11 text-sm text-ink underline underline-offset-4 hover:text-accent"
      >
        {isSignup ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
      </button>
    </form>
  );
}
