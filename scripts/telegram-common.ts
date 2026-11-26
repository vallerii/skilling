import { callTelegram } from "../src/lib/telegram/api";

export function checkEnv(names: string[]) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`❌ Не хватает переменных в .env: ${missing.join(", ")}`);
    process.exit(1);
  }
}

/** Меню команд бота (кнопка «/» в чате). */
export async function setCommands() {
  await callTelegram("setMyCommands", {
    commands: [
      { command: "review", description: "Что повторить сейчас" },
      { command: "stop", description: "Выключить напоминания" },
      { command: "start", description: "Включить напоминания" },
    ],
  });
}
