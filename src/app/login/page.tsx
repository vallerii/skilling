import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход — Skilling",
};

export default function LoginPage() {
  return (
    <AuthShell title="Вход" lead="Аккаунт сохраняет пройденные уровни, серию дней и вопросы, где были ошибки.">
      <LoginForm />
    </AuthShell>
  );
}
