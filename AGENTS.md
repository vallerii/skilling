<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Skilling — контекст проекта

Сайт для подготовки к техническим собеседованиям в стиле Duolingo (Next.js 16 + Supabase). Интерфейс и документация на русском.

**Перед любой работой прочитайте [`PROJECT.md`](PROJECT.md)** — там цель, механика (уровни, интервальные повторения, босс-техчек), форматы ответов, темы, схема базы и план по этапам.

## Главное

- Банк вопросов — JSON в `content/questions/<topic>.json`, источник правды. Формат и правила — `content/questions/README.md`, схема — `src/lib/questions/schema.ts`.
- После изменения вопросов: `npm run questions:validate`, затем обновить колонку «Сейчас» в таблице тем в `PROJECT.md`.
- `id` вопросов не меняются и не переиспользуются: к ним привязан прогресс пользователей.
- Правила игры (пороги, размер босса) — только в `src/lib/game/config.ts`, не хардкодить в компонентах.
- LLM для проверки ответов не используем: открытые ответы проверяются чек-листом `keyPoints`.
- Прогресс пользователя — только в Supabase, все таблицы под RLS. Новая таблица = новая миграция в `supabase/migrations/` + политики RLS.
- `src/proxy.ts` — это бывший `middleware.ts` (переименован в Next.js 16).
- Вход — email и пароль через Supabase Auth: `src/app/login/` (Server Actions), меню пользователя — `src/components/user-menu.tsx`. Компоненты, читающие сессию, оборачиваются в `<Suspense>` (включены Cache Components).
- Закончили пункт плана — отметьте его в `PROJECT.md`.

## Команды

- `npm run dev` — разработка
- `npm run build` — сборка
- `npm run lint`, `npm run typecheck`
- `npm test` — unit-тесты (Vitest); логику проверки ответов менять вместе с `src/lib/game/session.test.ts`
- `npm run questions:validate` — проверка банка вопросов
- `npm run questions:seed` — загрузка банка вопросов в Supabase (после изменения вопросов)
