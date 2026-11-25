import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход — Skilling",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      <Link href="/" className="text-sm font-bold uppercase tracking-wider text-brand">
        Skilling
      </Link>
      <h1 className="mt-1 mb-2 text-3xl font-extrabold">Вход</h1>
      <p className="mb-8 opacity-75">Чтобы сохранять прогресс и повторять ошибки.</p>
      <LoginForm />
    </main>
  );
}
