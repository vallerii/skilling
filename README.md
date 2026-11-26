# Skilling

Подготовка к техническим собеседованиям в стиле Duolingo: короткие техчеки вместо уроков, интервальные повторения, ошибки переносятся в следующий этап, в конце — босс-техчек из 10 случайных вопросов.

📄 **Цель, механика, темы, схема базы и план — в [PROJECT.md](PROJECT.md).**

## Запуск

```bash
npm install
npm run dev
```

Откройте http://localhost:3000.

Без Supabase главная страница работает: банк вопросов читается из `content/`. Чтобы подключить базу:

1. Создайте проект на [supabase.com](https://supabase.com) (бесплатный тариф).
2. SQL Editor → выполните `supabase/migrations/20261124000000_init.sql`.
3. Скопируйте `.env.example` в `.env` и заполните ключи из Project Settings → API Keys.
4. Загрузите банк вопросов в базу: добавьте `SUPABASE_SECRET_KEY` в `.env` и выполните `npm run questions:seed`.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | запуск в режиме разработки |
| `npm run build` | продакшн-сборка |
| `npm run lint` / `npm run typecheck` | проверки кода |
| `npm run questions:validate` | проверка банка вопросов и статистика по темам |
| `npm test` | unit-тесты (Vitest) |
| `npm run questions:seed` | загрузка банка вопросов в Supabase (нужен `SUPABASE_SECRET_KEY`) |
| `npm run bot:dev` | Telegram-бот локально, без деплоя (long polling; снимает вебхук) |
| `npm run bot:remind` | разослать напоминания прямо сейчас (`-- --due` — только тем, у кого наступило время) |
| `npm run bot:webhook` | после деплоя: направить бота на `NEXT_PUBLIC_SITE_URL/api/telegram/webhook` |

## Telegram-бот

1. Создайте бота у @BotFather (`/newbot`) и добавьте в `.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`. Случайные секреты: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
2. Примените миграцию `supabase/migrations/20261126000000_telegram.sql` (SQL Editor в Supabase).
3. Локально: `npm run dev` и во втором терминале `npm run bot:dev`. На сайте: «Настройки» → «Подключить Telegram» → в боте «Start».
4. После деплоя на Vercel: те же переменные в настройках проекта, затем `npm run bot:webhook`. Ежедневный вызов `/api/cron/reminders` задан в `vercel.json` (17:00 UTC — 19:00 по Киеву зимой).

## Вопросы

Лежат в [`content/questions/`](content/questions/), по файлу на тему. Как добавлять — [content/questions/README.md](content/questions/README.md).
