import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/ui";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Восстановление пароля — Skilling" };

export default function ForgotPasswordPage() {
  return (
    <>
      <header className="border-b border-rule">
        <div className="mx-auto flex h-14 w-full max-w-[1132px] items-center px-4">
          <Brand />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-16 md:items-center md:pt-0">
        <div className="w-full max-w-[400px] md:rounded-[22px] md:bg-surface md:p-8">
          <h1 className="text-2xl leading-8 font-medium">Восстановление пароля</h1>
          <p className="mt-2 mb-8 text-base text-muted">
            Пришлём письмо со ссылкой. По ней можно задать новый пароль — прогресс сохранится.
          </p>
          <Suspense fallback={null}>
            <ForgotForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
