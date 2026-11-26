import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Новый пароль — Skilling" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Новый пароль" lead="Придумайте пароль — после сохранения вы останетесь в аккаунте.">
      <ResetForm />
    </AuthShell>
  );
}
