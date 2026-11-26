"use client";

import { useActionState } from "react";
import { setNewPassword, type NewPasswordState } from "@/app/login/actions";
import { btnPrimary } from "@/components/ui";

const field =
  "min-h-12 rounded-xl border border-control bg-raised px-4 text-base outline-none focus-visible:border-ink focus-visible:shadow-[inset_0_0_0_1px_var(--text)]";

export function ResetForm() {
  const [state, formAction, pending] = useActionState<NewPasswordState, FormData>(setNewPassword, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Новый пароль
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="pw-hint" className={field} />
        <p id="pw-hint" className="text-sm text-muted">
          Минимум 8 символов
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="repeat" className="text-sm font-medium">
          Ещё раз
        </label>
        <input id="repeat" name="repeat" type="password" autoComplete="new-password" required minLength={8} className={field} />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-negative-tint px-4 py-3 text-sm text-[#7a1d14]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} mt-2 w-full`}>
        {pending ? "Сохраняем…" : "Сохранить пароль"}
      </button>
    </form>
  );
}
