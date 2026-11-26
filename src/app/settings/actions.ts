"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Сколько живёт ссылка привязки Telegram. */
const LINK_TTL_MINUTES = 15;

export type LinkState = { url?: string; error?: string };

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

/**
 * Одноразовая ссылка на бота: t.me/<бот>?start=<код>. Код пишет сервер секретным ключом —
 * клиенту менять поля Telegram в профиле запрещено (см. миграцию 20261126000000_telegram.sql).
 */
export async function createTelegramLink(): Promise<LinkState> {
  const session = await requireUser();
  if (!session) return { error: "Войдите, чтобы подключить Telegram" };
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!bot || !process.env.SUPABASE_SECRET_KEY) {
    return { error: "Бот не настроен: нужны TELEGRAM_BOT_USERNAME и SUPABASE_SECRET_KEY в .env" };
  }
  const code = randomBytes(18).toString("base64url"); // 24 символа, разрешены в ?start=
  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      telegram_link_code: code,
      telegram_link_expires_at: new Date(Date.now() + LINK_TTL_MINUTES * 60_000).toISOString(),
    })
    .eq("id", session.user.id);
  if (error) {
    console.error("createTelegramLink", error);
    return { error: "Не получилось создать ссылку, попробуйте ещё раз" };
  }
  return { url: `https://t.me/${bot}?start=${code}` };
}

export async function disconnectTelegram() {
  const session = await requireUser();
  if (!session) return;
  await createAdminClient()
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_username: null, telegram_link_code: null })
    .eq("id", session.user.id);
  revalidatePath("/settings");
}

const ReminderSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }),
});

export async function saveReminderSettings(input: z.infer<typeof ReminderSchema>) {
  const parsed = ReminderSchema.safeParse(input);
  const session = await requireUser();
  if (!parsed.success || !session) return { saved: false };
  const { error } = await session.supabase
    .from("profiles")
    .update({ reminders_enabled: parsed.data.enabled, timezone: parsed.data.timezone })
    .eq("id", session.user.id);
  revalidatePath("/settings");
  return { saved: !error };
}
