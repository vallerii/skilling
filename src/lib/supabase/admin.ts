import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Клиент с секретным ключом: обходит RLS. Только для сервера — вебхук Telegram,
 * cron напоминаний, привязка аккаунта, скрипты. Никогда не импортируйте в клиентские компоненты.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SECRET_KEY в .env");
  }
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
