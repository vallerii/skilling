import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { GAME } from "@/lib/game/config";
import { fromRow, wantsRecall, type SrsState, type StateRow } from "@/lib/game/srs";
import { loadQuestionBank, loadTopicQuestions } from "@/lib/questions/load";
import type { Question } from "@/lib/questions/schema";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const STATE_COLUMNS =
  "question_id, stage, ease, interval_days, repetitions, lapses, correct_count, wrong_count, due_at, last_answered_at";

export async function currentUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

export async function loadStates(supabase: SupabaseClient, userId: string, questionIds: string[]) {
  const map = new Map<string, SrsState>();
  if (questionIds.length === 0) return map;
  const { data, error } = await supabase
    .from("user_question_state")
    .select(STATE_COLUMNS)
    .eq("user_id", userId)
    .in("question_id", questionIds);
  if (error) throw error;
  for (const row of (data ?? []) as StateRow[]) map.set(row.question_id, fromRow(row));
  return map;
}

/**
 * Что добавить к уровню: вопросы этой темы с прошлых уровней, на которые
 * в последний раз ответили неправильно. Самые старые ошибки — первыми.
 * Плюс какие вопросы уровня уже пора спрашивать открытым ответом.
 */
export async function levelExtras(topicId: string, level: number, levelQuestions: Question[]) {
  const empty = { carried: [] as Question[], recallIds: new Set<string>() };
  const session = await currentUser();
  if (!session) return empty;
  const { supabase, user } = session;

  const topicQuestions = await loadTopicQuestions(topicId);
  const earlier = topicQuestions.filter((q) => q.level < level);
  const states = await loadStates(
    supabase,
    user.id,
    [...levelQuestions, ...earlier].map((q) => q.id),
  );

  const carried = earlier
    .filter((q) => {
      const s = states.get(q.id);
      return s && s.repetitions === 0 && s.wrongCount > 0;
    })
    .sort((a, b) => Date.parse(states.get(a.id)!.lastAnsweredAt ?? "") - Date.parse(states.get(b.id)!.lastAnsweredAt ?? ""))
    .slice(0, GAME.carryOverLimit);

  const recallIds = new Set(levelQuestions.filter((q) => wantsRecall(states.get(q.id))).map((q) => q.id));
  return { carried, recallIds };
}

/** Очередь повторения: вопросы, у которых наступил срок, не больше дневного лимита. */
export async function reviewQueue() {
  const session = await currentUser();
  if (!session) return null;
  const { supabase, user } = session;
  const { data, error } = await supabase
    .from("user_question_state")
    .select(STATE_COLUMNS)
    .eq("user_id", user.id)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(GAME.dailyReviewLimit);
  if (error) throw error;

  const byId = new Map((await loadQuestionBank()).flatMap((t) => t.questions.map((q) => [q.id, { q, topic: t.title }] as const)));
  const rows = (data ?? []) as StateRow[];
  const questions = rows.map((r) => byId.get(r.question_id)).filter((x) => x !== undefined);
  const recallIds = new Set(rows.filter((r) => wantsRecall(fromRow(r))).map((r) => r.question_id));
  return { questions: questions.map((x) => x.q), topicOf: new Map(questions.map((x) => [x.q.id, x.topic])), recallIds };
}
