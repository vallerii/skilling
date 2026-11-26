import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { Sky } from "@/components/sky";
import { Brand, btnPrimary } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { TelegramSettings } from "./telegram-settings";

export const metadata: Metadata = { title: "Настройки — Skilling" };

export default function SettingsPage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div className="absolute inset-x-0 top-0 -z-10 h-[460px]">
        <Sky clouds={3} />
      </div>
      <SiteHeader width="max-w-[744px]">
        <Brand />
        <Link href="/" className="inline-flex min-h-10 items-center rounded-full bg-raised/80 px-4 text-sm font-medium hover:bg-raised">
          К темам
        </Link>
      </SiteHeader>
      <main className="mx-auto w-full max-w-[744px] flex-1 px-4 pt-8 pb-16 md:pt-14">
        <h1 className="text-[34px] leading-[42px] font-medium tracking-[-0.02em] text-[#18252e] md:text-[48px] md:leading-[56px]">Настройки</h1>
        <Suspense fallback={<p className="mt-6 text-muted">Загружаем…</p>}>
          <SettingsLoader />
        </Suspense>
      </main>
    </div>
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
