/**
 * Бот локально, без деплоя: забирает сообщения через getUpdates (long polling)
 * и обрабатывает их той же логикой, что и вебхук на Vercel.
 *
 *   npm run bot:dev        — бот отвечает, пока скрипт запущен (Ctrl+C — остановить)
 *
 * Внимание: getUpdates не работает, пока у бота установлен вебхук, поэтому скрипт
 * снимает вебхук. После деплоя верните его: npm run bot:webhook
 */
import "./load-env";
import { callTelegram, sendMessage, siteUrl, type TelegramUpdate } from "../src/lib/telegram/api";
import { handleUpdate } from "../src/lib/telegram/bot";
import { supabaseStore } from "../src/lib/telegram/store";
import { createAdminClient } from "../src/lib/supabase/admin";
import { checkEnv, setCommands } from "./telegram-common";

async function main() {
  checkEnv(["TELEGRAM_BOT_TOKEN", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"]);

  const store = supabaseStore(createAdminClient());
  const me = await callTelegram<{ username: string }>("getMe");
  await callTelegram("deleteWebhook", { drop_pending_updates: false });
  await setCommands();
  console.log(`🤖 @${me.username} слушает сообщения. Ссылки ведут на ${siteUrl()}. Ctrl+C — остановить.`);

  let offset = 0;
  for (;;) {
    try {
      const updates = await callTelegram<TelegramUpdate[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
      for (const update of updates) {
        offset = update.update_id + 1;
        console.log("←", update.message?.chat.id, update.message?.text);
        await handleUpdate(update, { store, send: sendMessage, site: siteUrl() }).catch((e) => console.error("handleUpdate", e));
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
