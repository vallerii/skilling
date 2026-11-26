import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Восстановление пароля — Skilling" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Восстановление пароля"
      lead="Пришлём письмо со ссылкой. По ней можно задать новый пароль — прогресс сохранится."
    >
      <Suspense fallback={null}>
        <ForgotForm />
      </Suspense>
    </AuthShell>
  );
}
