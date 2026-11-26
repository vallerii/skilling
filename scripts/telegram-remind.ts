/**
 * Разослать напоминания прямо сейчас — для проверки.
 *
 *   npm run bot:remind           — всем подключённым, не глядя на время и «уже напоминали сегодня»
 *   npm run bot:remind -- --due  — как cron: только тем, у кого наступило время напоминания
 */
import "./load-env";
import { sendMessage, siteUrl } from "../src/lib/telegram/api";
import { runReminders } from "../src/lib/telegram/bot";
import { supabaseStore } from "../src/lib/telegram/store";
import { createAdminClient } from "../src/lib/supabase/admin";
import { checkEnv } from "./telegram-common";

async function main() {
  checkEnv(["TELEGRAM_BOT_TOKEN", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"]);

  const force = !process.argv.includes("--due");
  const report = await runReminders({ store: supabaseStore(createAdminClient()), send: sendMessage, site: siteUrl(), force });
  console.log(force ? "Напоминания (принудительно):" : "Напоминания (по расписанию):", report);
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
