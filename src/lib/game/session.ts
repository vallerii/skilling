import type { Question, QuestionFormat } from "@/lib/questions/schema";
import { RECOGNITION_FORMATS } from "@/lib/questions/schema";
import { GAME } from "./config";

/** Детерминированный генератор случайных чисел (mulberry32) — для воспроизводимых тестов. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Режим техчека:
 * - `practice` — форматы узнавания (тесты), открытый ответ только там, где тестов нет;
 * - `recall` — открытые ответы с проверкой по чек-листу (как на собеседовании).
 */
export type SessionMode = "practice" | "recall";

/** Голос подключим на этапе 3 — пока показываем только текстовый открытый ответ. */
const AVAILABLE_RECALL: QuestionFormat = "open_text";

export function pickFormat(question: Question, mode: SessionMode, rng: () => number): QuestionFormat {
  const recognition = question.formats.filter((f) => RECOGNITION_FORMATS.includes(f));
  const hasRecall = question.formats.some((f) => f === "open_text" || f === "open_voice");

  if (mode === "recall" && hasRecall) return AVAILABLE_RECALL;
  if (recognition.length > 0) return recognition[Math.floor(rng() * recognition.length)];
  return AVAILABLE_RECALL;
}

/** Вопрос, подготовленный к показу: выбран формат, варианты перемешаны. */
export type SessionItem = {
  question: Question;
  format: QuestionFormat;
  /** Варианты для single_choice, multiple_choice, code_output — в порядке показа. */
  options?: string[];
  /** Для ordering — шаги в порядке показа (перемешаны, не совпадают с правильным). */
  shuffledOrder?: string[];
};

export function prepareItem(question: Question, format: QuestionFormat, rng: () => number): SessionItem {
  switch (format) {
    case "single_choice":
    case "multiple_choice": {
      const { correct, distractors } = question.choices!;
      // Для single_choice — 1 правильный + до 3 ловушек; для multiple — все варианты
      const pool =
        format === "single_choice" ? [...correct, ...shuffle(distractors, rng).slice(0, 3)] : [...correct, ...distractors];
      return { question, format, options: shuffle(pool, rng) };
    }
    case "code_output": {
      const { answer, distractors } = question.codeOutput!;
      return { question, format, options: shuffle([answer, ...distractors.slice(0, 3)], rng) };
    }
    case "ordering": {
      const correct = question.ordering!;
      let shuffled = shuffle(correct, rng);
      for (let i = 0; i < 10 && shuffled.every((s, idx) => s === correct[idx]); i++) {
        shuffled = shuffle(correct, rng);
      }
      return { question, format, shuffledOrder: shuffled };
    }
    default:
      return { question, format };
  }
}

export function buildSession(
  questions: Question[],
  { mode = "practice", rng = Math.random }: { mode?: SessionMode; rng?: () => number } = {},
): SessionItem[] {
  return shuffle(questions, rng).map((q) => prepareItem(q, pickFormat(q, mode, rng), rng));
}

// ---------------------------------------------------------------------------
// Проверка ответов
// ---------------------------------------------------------------------------

export type Answer =
  | { kind: "choice"; selected: string }
  | { kind: "multi"; selected: string[] }
  | { kind: "true_false"; verdicts: (boolean | null)[] }
  | { kind: "ordering"; order: string[] }
  | { kind: "open"; text: string; checked: number[] };

export type Grade = {
  correct: boolean;
  /** Для открытых ответов — доля отмеченных ключевых пунктов. */
  score?: number;
};

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function gradeAnswer(item: SessionItem, answer: Answer): Grade {
  const q = item.question;
  switch (item.format) {
    case "single_choice":
      return { correct: answer.kind === "choice" && q.choices!.correct.includes(answer.selected) };
    case "code_output":
      return { correct: answer.kind === "choice" && answer.selected === q.codeOutput!.answer };
    case "multiple_choice":
      return { correct: answer.kind === "multi" && sameSet(answer.selected, q.choices!.correct) };
    case "true_false":
      return {
        correct:
          answer.kind === "true_false" &&
          q.statements!.every((s, i) => answer.verdicts[i] === s.isTrue),
      };
    case "ordering":
      return {
        correct:
          answer.kind === "ordering" &&
          answer.order.length === q.ordering!.length &&
          answer.order.every((s, i) => s === q.ordering![i]),
      };
    case "open_text":
    case "open_voice": {
      if (answer.kind !== "open" || q.keyPoints.length === 0) return { correct: false, score: 0 };
      const score = new Set(answer.checked).size / q.keyPoints.length;
      return { correct: score >= GAME.checklistPassRatio, score };
    }
  }
}

/** Можно ли нажать «Проверить» — ответ заполнен. */
export function isAnswerComplete(item: SessionItem, answer: Answer | null): boolean {
  if (!answer) return false;
  switch (answer.kind) {
    case "choice":
      return answer.selected.length > 0;
    case "multi":
      return answer.selected.length > 0;
    case "true_false":
      return answer.verdicts.length === (item.question.statements?.length ?? 0) && answer.verdicts.every((v) => v !== null);
    case "ordering":
      return answer.order.length > 0;
    case "open":
      return answer.text.trim().length > 0;
  }
}

export type LevelResult = { total: number; correct: number; ratio: number; passed: boolean };

export function summarize(grades: Grade[]): LevelResult {
  const total = grades.length;
  const correct = grades.filter((g) => g.correct).length;
  const ratio = total ? correct / total : 0;
  return { total, correct, ratio, passed: ratio >= GAME.levelPassRatio };
}
