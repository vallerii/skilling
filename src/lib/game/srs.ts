import type { QuestionFormat } from "@/lib/questions/schema";
import { GAME } from "./config";
import type { Grade } from "./session";

/**
 * Интервальные повторения по SM-2 (SuperMemo 2), с упрощением под техчеки:
 * - оценка ответа 0–5 выводится из формата и результата, а не спрашивается у человека;
 * - первые интервалы 1 и 3 дня, дальше интервал × ease;
 * - ошибка сбрасывает серию и возвращает вопрос на завтра.
 */

export type Stage = "new" | "learning" | "review" | "mastered";

export type SrsState = {
  stage: Stage;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  correctCount: number;
  wrongCount: number;
  dueAt: string;
  lastAnsweredAt: string | null;
};

export const NEW_STATE: Omit<SrsState, "dueAt"> = {
  stage: "new",
  ease: GAME.initialEase,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
  correctCount: 0,
  wrongCount: 0,
  lastAnsweredAt: null,
};

const isOpen = (f: QuestionFormat) => f === "open_text" || f === "open_voice";

/**
 * Оценка ответа по шкале SM-2:
 * 5 — открытый ответ почти со всеми ключевыми пунктами; 4 — верно;
 * 2 — открытый ответ, где вспомнилась хотя бы половина; 1 — ошибка.
 */
export function qualityOf(format: QuestionFormat, grade: Grade): number {
  if (isOpen(format)) {
    const score = grade.score ?? 0;
    if (grade.correct) return score >= 0.9 ? 5 : 4;
    return score >= 0.5 ? 2 : 1;
  }
  return grade.correct ? 4 : 1;
}

const DAY = 24 * 60 * 60 * 1000;

export function nextState(prev: Omit<SrsState, "dueAt"> | null, quality: number, now: Date): SrsState {
  const base = prev ?? NEW_STATE;
  const q = Math.max(0, Math.min(5, quality));
  const correct = q >= 3;

  // Формула SM-2 для ease: правильные ответы с запасом поднимают её, ошибки — опускают
  const ease = Math.max(GAME.minEase, round2(base.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))));

  let repetitions: number;
  let intervalDays: number;
  if (correct) {
    repetitions = base.repetitions + 1;
    intervalDays =
      repetitions <= GAME.firstIntervals.length
        ? GAME.firstIntervals[repetitions - 1]
        : Math.round(base.intervalDays * ease);
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  const stage: Stage = !correct
    ? "learning"
    : intervalDays >= GAME.masteredIntervalDays
      ? "mastered"
      : repetitions >= GAME.recallAfterRepetitions
        ? "review"
        : "learning";

  return {
    stage,
    ease,
    intervalDays,
    repetitions,
    lapses: base.lapses + (correct ? 0 : 1),
    correctCount: base.correctCount + (correct ? 1 : 0),
    wrongCount: base.wrongCount + (correct ? 0 : 1),
    dueAt: new Date(now.getTime() + intervalDays * DAY).toISOString(),
    lastAnsweredAt: now.toISOString(),
  };
}

/** Вопрос уже знаком настолько, что его пора спрашивать открытым ответом. */
export function wantsRecall(state: Pick<SrsState, "repetitions"> | null | undefined): boolean {
  return (state?.repetitions ?? 0) >= GAME.recallAfterRepetitions;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Строки базы <-> состояние
// ---------------------------------------------------------------------------

export type StateRow = {
  question_id: string;
  stage: Stage;
  ease: number | string;
  interval_days: number;
  repetitions: number;
  lapses: number;
  correct_count: number;
  wrong_count: number;
  due_at: string;
  last_answered_at: string | null;
};

export function fromRow(row: StateRow): SrsState {
  return {
    stage: row.stage,
    ease: Number(row.ease),
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    lapses: row.lapses,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    dueAt: row.due_at,
    lastAnsweredAt: row.last_answered_at,
  };
}

export function toRow(userId: string, questionId: string, s: SrsState) {
  return {
    user_id: userId,
    question_id: questionId,
    stage: s.stage,
    ease: s.ease,
    interval_days: s.intervalDays,
    repetitions: s.repetitions,
    lapses: s.lapses,
    correct_count: s.correctCount,
    wrong_count: s.wrongCount,
    due_at: s.dueAt,
    last_answered_at: s.lastAnsweredAt,
  };
}
