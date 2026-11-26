/**
 * После деплоя: направить Telegram на вебхук сайта.
 *
 *   npm run bot:webhook -- https://skilling.vercel.app   — адрес сайта аргументом
 *   npm run bot:webhook                                  — или из NEXT_PUBLIC_SITE_URL в .env
 */
import "./load-env";
import { callTelegram, siteUrl } from "../src/lib/telegram/api";
import { checkEnv, setCommands } from "./telegram-common";

async function main() {
  checkEnv(["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"]);
  const site = (process.argv[2] ?? siteUrl()).replace(/\/$/, "");
  const url = `${site}/api/telegram/webhook`;
  if (!url.startsWith("https://")) {
    console.error(`❌ Вебхук должен быть https, сейчас: ${url}. Локально используйте npm run bot:dev`);
    process.exit(1);
  }
  await callTelegram("setWebhook", {
    url,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  await setCommands();
  console.log("✅ Вебхук:", await callTelegram("getWebhookInfo"));
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
