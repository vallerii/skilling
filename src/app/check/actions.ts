"use server";

import { z } from "zod";
import { GAME } from "@/lib/game/config";
import { createClient } from "@/lib/supabase/server";

const AttemptSchema = z.object({
  questionId: z.string(),
  format: z.string(),
  correct: z.boolean(),
  score: z.number().min(0).max(1).optional(),
  answer: z.unknown(),
  durationMs: z.number().int().nonnegative(),
});

const RunSchema = z.object({
  topicId: z.string(),
  level: z.number().int().min(1),
  attempts: z.array(AttemptSchema).min(1).max(100),
});

export type SaveRunInput = z.infer<typeof RunSchema>;
export type SaveRunResult = { saved: true } | { saved: false; reason: "auth" | "error"; message?: string };

/** Дата «сегодня» в часовом поясе пользователя — для стрика. */
function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export async function saveLevelRun(input: SaveRunInput): Promise<SaveRunResult> {
  const parsed = RunSchema.safeParse(input);
  if (!parsed.success) return { saved: false, reason: "error", message: "Некорректные данные" };
  const { topicId, level, attempts } = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { saved: false, reason: "auth" };

  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  const ratio = correct / total;
  const passed = ratio >= GAME.levelPassRatio;
  const now = new Date().toISOString();

  try {
    // 1. Прохождение уровня
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

    // 2. Каждый ответ
    const { error: attemptsError } = await supabase.from("attempts").insert(
      attempts.map((a) => ({
        user_id: user.id,
        question_id: a.questionId,
        format: a.format,
        context: "level",
        level_run_id: run.id,
        is_correct: a.correct,
        score: a.score ?? null,
        answer: a.answer ?? null,
        duration_ms: a.durationMs,
      })),
    );
    if (attemptsError) throw attemptsError;

    // 3. Прогресс уровня: лучший результат и статус «пройден» не ухудшаются
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

    // Следующий уровень открывается после прохождения (если ещё не открыт)
    if (passed) {
      await supabase
        .from("level_progress")
        .upsert(
          { user_id: user.id, topic_id: topicId, level: level + 1, status: "unlocked" },
          { onConflict: "user_id,topic_id,level", ignoreDuplicates: true },
        );
    }

    // 4. Активность за день — для стрика и XP
    const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
    const day = todayIn(profile?.timezone ?? "Europe/Kyiv");
    const xp = attempts.reduce((sum, a) => sum + (a.correct ? (a.format.startsWith("open") ? 15 : 10) : 0), 0);
    const { data: activity } = await supabase
      .from("daily_activity")
      .select("answers, correct, xp")
      .eq("user_id", user.id)
      .eq("day", day)
      .maybeSingle();
    const { error: activityError } = await supabase.from("daily_activity").upsert({
      user_id: user.id,
      day,
      answers: (activity?.answers ?? 0) + total,
      correct: (activity?.correct ?? 0) + correct,
      xp: (activity?.xp ?? 0) + xp,
    });
    if (activityError) throw activityError;

    return { saved: true };
  } catch (error) {
    console.error("saveLevelRun", error);
    return { saved: false, reason: "error", message: "Не удалось сохранить прогресс" };
  }
}
