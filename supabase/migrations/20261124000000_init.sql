-- Skilling: начальная схема
-- Банк вопросов (topics, questions) синхронизируется из content/ скриптом сидинга.
-- Всё остальное — прогресс конкретного пользователя, защищено RLS.

-- ============================================================
-- Справочники (читают все, пишет только service role при сидинге)
-- ============================================================

create table public.topics (
  id          text primary key,              -- 'js-core'
  title       text not null,
  description text not null default '',
  target      int  not null default 0,       -- плановое кол-во вопросов
  sort_order  int  not null default 0,
  updated_at  timestamptz not null default now()
);

create table public.questions (
  id          text primary key,              -- 'js-core-001'
  topic_id    text not null references public.topics(id) on delete cascade,
  level       int  not null check (level >= 1),
  difficulty  text not null check (difficulty in ('junior','middle','senior')),
  formats     text[] not null,               -- допустимые форматы показа
  data        jsonb not null,                -- полный объект вопроса из content/questions/*.json
  is_active   boolean not null default true, -- удалённые из content/ вопросы не стираем, а выключаем
  updated_at  timestamptz not null default now()
);
create index questions_topic_level_idx on public.questions (topic_id, level) where is_active;

-- ============================================================
-- Профиль и настройки напоминаний
-- ============================================================

create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  timezone         text not null default 'Europe/Kyiv',
  reminder_time    time not null default '19:00',
  telegram_chat_id bigint,                   -- для напоминаний через Telegram-бота
  voice_lang       text not null default 'ru-RU', -- язык распознавания для open_voice
  created_at       timestamptz not null default now()
);

-- Автоматически создаём профиль при регистрации
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Интервальные повторения: состояние каждого вопроса для пользователя (SM-2)
-- ============================================================

create table public.user_question_state (
  user_id       uuid not null references auth.users(id) on delete cascade,
  question_id   text not null references public.questions(id) on delete cascade,
  stage         text not null default 'new'
                check (stage in ('new','learning','review','mastered')),
  ease          numeric(4,2) not null default 2.50, -- коэффициент лёгкости SM-2
  interval_days int  not null default 0,
  repetitions   int  not null default 0,            -- правильных ответов подряд
  lapses        int  not null default 0,            -- сколько раз «забыли»
  correct_count int  not null default 0,
  wrong_count   int  not null default 0,
  due_at        timestamptz not null default now(), -- когда показать снова
  last_answered_at timestamptz,
  primary key (user_id, question_id)
);
create index uqs_due_idx on public.user_question_state (user_id, due_at);

-- ============================================================
-- Прохождения уровней, босс-этапы, попытки
-- ============================================================

create table public.level_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  topic_id   text not null references public.topics(id) on delete cascade,
  level      int  not null,
  status     text not null default 'locked' check (status in ('locked','unlocked','passed')),
  best_score numeric(5,2),                   -- лучший % правильных
  passed_at  timestamptz,
  primary key (user_id, topic_id, level)
);

create table public.level_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  topic_id    text not null references public.topics(id) on delete cascade,
  level       int  not null,
  question_ids text[] not null,              -- вопросы уровня + перенесённые ошибки
  total       int  not null default 0,
  correct     int  not null default 0,
  passed      boolean,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

create table public.boss_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  question_ids text[] not null,              -- 10 случайных вопросов с перевесом на слабые
  total        int  not null default 10,
  correct      int  not null default 0,
  passed       boolean,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create table public.attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  question_id  text not null references public.questions(id) on delete cascade,
  format       text not null,
  context      text not null check (context in ('level','review','boss')),
  level_run_id uuid references public.level_runs(id) on delete set null,
  boss_run_id  uuid references public.boss_runs(id) on delete set null,
  is_correct   boolean not null,
  score        numeric(4,3),                 -- доля отмеченных keyPoints для открытых ответов
  answer       jsonb,                        -- выбранные варианты / текст / отмеченные пункты
  duration_ms  int,
  created_at   timestamptz not null default now()
);
create index attempts_user_created_idx on public.attempts (user_id, created_at desc);

-- Активность по дням — для стрика и «XP»
create table public.daily_activity (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null,
  answers  int  not null default 0,
  correct  int  not null default 0,
  xp       int  not null default 0,
  primary key (user_id, day)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.topics              enable row level security;
alter table public.questions           enable row level security;
alter table public.profiles            enable row level security;
alter table public.user_question_state enable row level security;
alter table public.level_progress      enable row level security;
alter table public.level_runs          enable row level security;
alter table public.boss_runs           enable row level security;
alter table public.attempts            enable row level security;
alter table public.daily_activity      enable row level security;

-- Банк вопросов читают все; запись — только service role (обходит RLS)
create policy "topics are public"    on public.topics    for select using (true);
create policy "questions are public" on public.questions for select using (is_active);

-- Профиль: только свой
create policy "own profile select" on public.profiles for select using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update using ((select auth.uid()) = id);

-- Прогресс: только свои строки
create policy "own rows" on public.user_question_state for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.level_progress for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.level_runs for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.boss_runs for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.attempts for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.daily_activity for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
