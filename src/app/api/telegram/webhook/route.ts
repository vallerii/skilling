import { timingSafeEqual } from "node:crypto";
import { sendMessage, siteUrl, type TelegramUpdate } from "@/lib/telegram/api";
import { handleUpdate } from "@/lib/telegram/bot";
import { supabaseStore } from "@/lib/telegram/store";
import { createAdminClient } from "@/lib/supabase/admin";

/** Telegram присылает сюда сообщения боту. Подлинность — по секрету, заданному в setWebhook. */
export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const got = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return new Response("forbidden", { status: 403 });
  }

  const update = (await request.json()) as TelegramUpdate;
  try {
    await handleUpdate(update, { store: supabaseStore(createAdminClient()), send: sendMessage, site: siteUrl() });
  } catch (error) {
    // Отвечаем 200, иначе Telegram будет повторять то же обновление
    console.error("telegram webhook", error);
  }
  return Response.json({ ok: true });
}
