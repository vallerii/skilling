"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { countStreak } from "@/lib/game/streak";
import { GAME } from "@/lib/game/config";
import { nextState, qualityOf, toRow } from "@/lib/game/srs";
import { QUESTION_FORMATS } from "@/lib/questions/schema";
import { loadStates } from "@/lib/srs-data";
import { createClient } from "@/lib/supabase/server";

const AttemptSchema = z.object({
  questionId: z.string(),
  format: z.enum(QUESTION_FORMATS),
  correct: z.boolean(),
  score: z.number().min(0).max(1).optional(),
  answer: z.unknown(),
  durationMs: z.number().int().nonnegative(),
  /** Старая ошибка, добавленная в уровень, — в результат уровня не входит. */
  carried: z.boolean().optional(),
});

const RunSchema = z.object({
  topicId: z.string(),
  level: z.number().int().min(1),
  attempts: z.array(AttemptSchema).min(1).max(100),
});

const ReviewSchema = z.object({
  attempts: z.array(AttemptSchema).min(1).max(100),
});

type Attempt = z.infer<typeof AttemptSchema>;
export type SaveRunInput = z.infer<typeof RunSchema>;

/** Что вернуть экрану результата: сохранено ли, и как изменилась серия дней. */
export type SaveRunResult =
  | { saved: true; streak: number; firstToday: boolean; xp: number }
  | { saved: false; reason: "auth" | "error"; message?: string };

/** Дата «сегодня» в часовом поясе пользователя — для стрика. */
function dayIn(timeZone: string, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const xpFor = (a: Attempt) => (a.correct ? (a.format.startsWith("open") ? 15 : 10) : 0);

/**
 * Общая часть для уровня и повторения: ответы, интервалы SM-2 по каждому вопросу,
 * активность за день. Возвращает серию дней после этого техчека.
 */
async function recordAnswers(
  supabase: SupabaseClient,
  userId: string,
  attempts: Attempt[],
  context: "level" | "review",
  levelRunId: string | null,
) {
  const now = new Date();

  const { error: attemptsError } = await supabase.from("attempts").insert(
    attempts.map((a) => ({
      user_id: userId,
      question_id: a.questionId,
      format: a.format,
      context,
      level_run_id: levelRunId,
      is_correct: a.correct,
      score: a.score ?? null,
      answer: a.answer ?? null,
      duration_ms: a.durationMs,
    })),
  );
  if (attemptsError) throw attemptsError;

  // SM-2: следующая дата показа для каждого вопроса
  const states = await loadStates(
    supabase,
    userId,
    attempts.map((a) => a.questionId),
  );
  const rows = new Map<string, ReturnType<typeof toRow>>();
  for (const a of attempts) {
    const next = nextState(states.get(a.questionId) ?? null, qualityOf(a.format, a), now);
    states.set(a.questionId, next);
    rows.set(a.questionId, toRow(userId, a.questionId, next));
  }
  const { error: stateError } = await supabase.from("user_question_state").upsert([...rows.values()]);
  if (stateError) throw stateError;

  // Активность за день — стрик и XP
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  const timeZone = profile?.timezone ?? "Europe/Kyiv";
  const day = dayIn(timeZone, now);
  const xp = attempts.reduce((sum, a) => sum + xpFor(a), 0);
  const { data: activity } = await supabase
    .from("daily_activity")
    .select("answers, correct, xp")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  const { error: activityError } = await supabase.from("daily_activity").upsert({
    user_id: userId,
    day,
    answers: (activity?.answers ?? 0) + attempts.length,
    correct: (activity?.correct ?? 0) + attempts.filter((a) => a.correct).length,
    xp: (activity?.xp ?? 0) + xp,
  });
  if (activityError) throw activityError;

  const { data: days } = await supabase
    .from("daily_activity")
    .select("day")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(400);
  const streak = countStreak((days ?? []).map((d) => d.day as string), day);
  return { streak, firstToday: !activity, xp };
}

export async function saveLevelRun(input: SaveRunInput): Promise<SaveRunResult> {
  const parsed = RunSchema.safeParse(input);
  if (!parsed.success) return { saved: false, reason: "error", message: "Некорректные данные" };
  const { topicId, level, attempts } = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { saved: false, reason: "auth" };

  // Результат уровня считается только по его собственным вопросам
  const own = attempts.filter((a) => !a.carried);
  const total = own.length;
  const correct = own.filter((a) => a.correct).length;
  const ratio = total ? correct / total : 0;
  const passed = ratio >= GAME.levelPassRatio;
  const now = new Date().toISOString();

  try {
    const { data: run, error: runError } = await supabase
      .from("level_runs")
      .insert({
        user_id: user.id,
        topic_id: topicId,
        level,
        question_ids: attempts.map((a) => a.questionId),
        total,
        correct,
        passed,
        finished_at: now,
      })
      .select("id")
      .single();
    if (runError) throw runError;

    const habit = await recordAnswers(supabase, user.id, attempts, "level", run.id);

    // Прогресс уровня: лучший результат и статус «пройден» не ухудшаются
    const { data: existing } = await supabase
      .from("level_progress")
      .select("status, best_score")
      .eq("user_id", user.id)
      .eq("topic_id", topicId)
      .eq("level", level)
      .maybeSingle();

    const score = Math.round(ratio * 10000) / 100;
    const wasPassed = existing?.status === "passed";
    const { error: progressError } = await supabase.from("level_progress").upsert({
      user_id: user.id,
      topic_id: topicId,
      level,
      status: passed || wasPassed ? "passed" : "unlocked",
      best_score: Math.max(score, Number(existing?.best_score ?? 0)),
      passed_at: passed && !wasPassed ? now : undefined,
    });
    if (progressError) throw progressError;

    if (passed) {
      await supabase
        .from("level_progress")
        .upsert(
          { user_id: user.id, topic_id: topicId, level: level + 1, status: "unlocked" },
          { onConflict: "user_id,topic_id,level", ignoreDuplicates: true },
        );
    }

    return { saved: true, ...habit };
  } catch (error) {
    console.error("saveLevelRun", error);
    return { saved: false, reason: "error", message: "Не удалось сохранить прогресс" };
  }
}

export async function saveReviewRun(input: z.infer<typeof ReviewSchema>): Promise<SaveRunResult> {
  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) return { saved: false, reason: "error", message: "Некорректные данные" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { saved: false, reason: "auth" };

  try {
    return { saved: true, ...(await recordAnswers(supabase, auth.user.id, parsed.data.attempts, "review", null)) };
  } catch (error) {
    console.error("saveReviewRun", error);
    return { saved: false, reason: "error", message: "Не удалось сохранить повторение" };
  }
}
