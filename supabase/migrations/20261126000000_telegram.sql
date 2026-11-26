-- Этап 2: Telegram-бот с напоминаниями о повторении и стрике.
-- Привязка: сайт выдаёт одноразовый код → человек открывает t.me/<бот>?start=<код> →
-- бот (вебхук с секретным ключом Supabase) находит профиль по коду и сохраняет chat id.

alter table public.profiles
  add column if not exists telegram_link_code       text unique,
  add column if not exists telegram_link_expires_at timestamptz,
  add column if not exists telegram_username        text,
  add column if not exists reminders_enabled        boolean not null default true,
  add column if not exists last_reminded_on         date;

-- Один Telegram-чат — один аккаунт
create unique index if not exists profiles_telegram_chat_id_key
  on public.profiles (telegram_chat_id) where telegram_chat_id is not null;

-- Пользователь сам меняет только настройки (политика «own profile update» уже есть).
-- Код привязки и chat id пишет сервер секретным ключом: иначе можно было бы
-- вписать себе чужой chat id и слать напоминания постороннему человеку.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, timezone, reminder_time, voice_lang, reminders_enabled)
  on public.profiles to authenticated;
