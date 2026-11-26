import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Brand, btnPrimary } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { TelegramSettings } from "./telegram-settings";

export const metadata: Metadata = { title: "Настройки — Skilling" };

export default function SettingsPage() {
  return (
    <>
      <header className="border-b border-rule">
        <div className="mx-auto flex h-16 w-full max-w-[712px] items-center px-4">
          <Brand />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[712px] flex-1 px-4 pt-8 pb-16 md:pt-12">
        <h1 className="text-[28px] leading-9 font-medium tracking-[-0.01em] md:text-[34px] md:leading-[42px]">Настройки</h1>
        <Suspense fallback={<p className="mt-6 text-muted">Загружаем…</p>}>
          <SettingsLoader />
        </Suspense>
      </main>
    </>
  );
}

async function SettingsLoader() {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return (
      <div className="mt-6">
        <p className="text-base text-muted">Войдите, чтобы подключить напоминания.</p>
        <Link href="/login" className={`${btnPrimary} mt-6`}>
          Войти
        </Link>
      </div>
    );
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, reminder_time, reminders_enabled, telegram_chat_id, telegram_username")
    .eq("id", auth.user.id)
    .maybeSingle();

  return (
    <TelegramSettings
      email={auth.user.email ?? ""}
      connected={profile?.telegram_chat_id != null}
      username={profile?.telegram_username ?? null}
      enabled={profile?.reminders_enabled ?? true}
      timezone={profile?.timezone ?? "Europe/Kyiv"}
      reminderTime={(profile?.reminder_time ?? "19:00").slice(0, 5)}
      botUsername={process.env.TELEGRAM_BOT_USERNAME ?? null}
    />
  );
}
