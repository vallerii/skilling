"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { requestPasswordReset, type ResetState } from "@/app/login/actions";
import { btnPrimary } from "@/components/ui";

const field =
  "min-h-12 rounded-xl border border-control bg-raised px-4 text-base outline-none focus-visible:border-ink focus-visible:shadow-[inset_0_0_0_1px_var(--text)]";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(requestPasswordReset, undefined);
  const expired = useSearchParams().get("expired");

  if (state?.sent) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="rounded-xl bg-positive-tint px-4 py-3 text-base">
          Если аккаунт с адресом <b>{state.email}</b> есть, письмо уже в пути. Откройте ссылку из него в этом же браузере.
        </p>
        <p className="text-sm text-muted">Письма нет пару минут — проверьте «Спам» или «Промоакции».</p>
        <Link href="/login" className="min-h-11 text-sm underline underline-offset-4">
          Вернуться ко входу
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {expired && (
        <p className="rounded-xl bg-negative-tint px-4 py-3 text-sm text-[#7a1d14]">
          Ссылка из письма устарела или уже использована. Запросите новую.
        </p>
      )}
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
          aria-describedby={state?.error ? "reset-error" : undefined}
          className={field}
        />
      </div>
      {state?.error && (
        <p id="reset-error" role="alert" className="rounded-xl bg-negative-tint px-4 py-3 text-sm text-[#7a1d14]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} mt-2 w-full`}>
        {pending ? "Отправляем…" : "Прислать ссылку"}
      </button>
      <Link href="/login" className="flex min-h-11 items-center justify-center text-sm underline underline-offset-4">
        Вспомнили пароль? Войти
      </Link>
    </form>
  );
}
