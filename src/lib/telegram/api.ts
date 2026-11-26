/** Минимальный клиент Telegram Bot API на fetch — без библиотек. */

export type InlineButton = { text: string; url: string };

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
  };
};

export const botToken = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
export const isTelegramConfigured = () => botToken().length > 0;

export async function callTelegram<T = unknown>(method: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан в .env");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string; error_code?: number };
  if (!data.ok) {
    const error = new Error(`Telegram ${method}: ${data.error_code} ${data.description}`) as Error & { code?: number };
    error.code = data.error_code;
    throw error;
  }
  return data.result as T;
}

/** Ссылки-кнопки Telegram принимает только с публичным https-адресом. */
export function canUseUrlButtons(siteUrl: string) {
  return /^https:\/\//.test(siteUrl) && !/localhost|127\.0\.0\.1/.test(siteUrl);
}

export async function sendMessage(chatId: number, text: string, buttons: InlineButton[] = []) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons.length ? { reply_markup: { inline_keyboard: [buttons] } } : {}),
  });
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
