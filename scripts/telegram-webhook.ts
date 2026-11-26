/**
 * После деплоя: направить Telegram на вебхук сайта.
 *
 *   npm run bot:webhook   — NEXT_PUBLIC_SITE_URL должен быть публичным https-адресом
 */
import "./load-env";
import { callTelegram, siteUrl } from "../src/lib/telegram/api";
import { checkEnv, setCommands } from "./telegram-common";

async function main() {
  checkEnv(["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET", "NEXT_PUBLIC_SITE_URL"]);
  const url = `${siteUrl()}/api/telegram/webhook`;
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
