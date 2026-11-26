import { GAME } from "@/lib/game/config";
import { countStreak, dayIn } from "@/lib/game/streak";

export { countStreak };
import type { TopicWithQuestions } from "@/lib/questions/load";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type LevelState = { passed: boolean; bestScore: number | null };
/** Ключ — `${topicId}:${level}`. */
export type ProgressMap = { [key: string]: LevelState | undefined };

export type NextLevel = { topicId: string; topicTitle: string; level: number; questionCount: number };

export type Dashboard = {
  user: { email: string } | null;
  progress: ProgressMap;
  passedLevels: number;
  totalLevels: number;
  today: { answers: number; correct: number; xp: number };
  streakDays: number;
  /** Сколько вопросов ждут повторения прямо сейчас (не больше дневного лимита). */
  dueCount: number;
  /** Последние 7 дней, сегодня — последний: был ли хоть один ответ. */
  week: { day: string; active: boolean }[];
  next: NextLevel | null;
};

export function levelsOf(topic: TopicWithQuestions): number[] {
  return [...new Set(topic.questions.map((q) => q.level))].sort((a, b) => a - b);
}

/** Следующий уровень: первый непройденный по порядку тем и уровней. */
export function findNext(bank: TopicWithQuestions[], progress: ProgressMap): NextLevel | null {
  for (const topic of bank) {
    for (const level of levelsOf(topic)) {
      if (!progress[`${topic.id}:${level}`]?.passed) {
        return {
          topicId: topic.id,
          topicTitle: topic.title,
          level,
          questionCount: topic.questions.filter((q) => q.level === level).length,
        };
      }
    }
  }
  return null;
}

/** Главная без пользователя: тот же макет, нули вместо прогресса. */
export function emptyDashboard(bank: TopicWithQuestions[]): Dashboard {
  return {
    user: null,
    progress: {},
    passedLevels: 0,
    totalLevels: bank.reduce((sum, t) => sum + levelsOf(t).length, 0),
    today: { answers: 0, correct: 0, xp: 0 },
    streakDays: 0,
    dueCount: 0,
    week: [], // без пользователя дат нет — полоса недели рисуется пустой
    next: findNext(bank, {}),
  };
}

/** Семь дней, заканчивая сегодняшним. */
export function lastDays(today: string, active: Set<string>) {
  const cursor = new Date(`${today}T12:00:00Z`);
  const days: { day: string; active: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCDate(cursor.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    days.push({ day, active: active.has(day) });
  }
  return days;
}

/** Данные главной. Читает сессию — вызывать внутри Suspense. */
export async function getDashboard(bank: TopicWithQuestions[]): Promise<Dashboard> {
  const empty = emptyDashboard(bank);
  if (!isSupabaseConfigured) return empty;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return empty;

  const [{ data: rows }, { data: profile }, { data: activity }, { count: due }] = await Promise.all([
    supabase.from("level_progress").select("topic_id, level, status, best_score").eq("user_id", user.id),
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase
      .from("daily_activity")
      .select("day, answers, correct, xp")
      .eq("user_id", user.id)
      .order("day", { ascending: false })
      .limit(400),
    supabase
      .from("user_question_state")
      .select("question_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("due_at", new Date().toISOString()),
  ]);

  const progress: ProgressMap = {};
  for (const row of rows ?? []) {
    progress[`${row.topic_id}:${row.level}`] = {
      passed: row.status === "passed",
      bestScore: row.best_score === null ? null : Number(row.best_score),
    };
  }

  // Считаем только уровни, которые есть в текущем банке
  const passedLevels = bank.reduce(
    (sum, t) => sum + levelsOf(t).filter((l) => progress[`${t.id}:${l}`]?.passed).length,
    0,
  );

  const today = dayIn(profile?.timezone ?? "Europe/Kyiv", new Date());
  const todayRow = (activity ?? []).find((a) => a.day === today);

  return {
    user: { email: user.email ?? "" },
    progress,
    passedLevels,
    totalLevels: empty.totalLevels,
    today: { answers: todayRow?.answers ?? 0, correct: todayRow?.correct ?? 0, xp: todayRow?.xp ?? 0 },
    streakDays: countStreak((activity ?? []).map((a) => a.day as string), today),
    dueCount: Math.min(due ?? 0, GAME.dailyReviewLimit),
    week: lastDays(today, new Set((activity ?? []).filter((a) => a.answers > 0).map((a) => a.day as string))),
    next: findNext(bank, progress),
  };
}
