import type { Metadata } from "next";
import { Brand } from "@/components/ui";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Новый пароль — Skilling" };

export default function ResetPasswordPage() {
  return (
    <>
      <header className="border-b border-rule">
        <div className="mx-auto flex h-14 w-full max-w-[1132px] items-center px-4">
          <Brand />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-16 md:items-center md:pt-0">
        <div className="w-full max-w-[400px] md:rounded-[22px] md:bg-surface md:p-8">
          <h1 className="text-2xl leading-8 font-medium">Новый пароль</h1>
          <p className="mt-2 mb-8 text-base text-muted">Придумайте пароль — после сохранения вы останетесь в аккаунте.</p>
          <ResetForm />
        </div>
      </main>
    </>
  );
}
