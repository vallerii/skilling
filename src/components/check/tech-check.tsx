"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveLevelRun, saveReviewRun, type SaveRunResult } from "@/app/check/actions";
import { Markdown } from "@/components/markdown";
import { SiteHeader } from "@/components/site-header";
import { Brand, btnPrimary, btnSecondary, IconArrow, IconCheck, IconClose, plural } from "@/components/ui";
import { GAME } from "@/lib/game/config";
import {
  gradeAnswer,
  isAnswerComplete,
  summarize,
  type Answer,
  type Grade,
  type SessionItem,
  type SessionMode,
} from "@/lib/game/session";
import {
  MultiChoiceInput,
  OpenTextInput,
  OrderingInput,
  SingleChoiceInput,
  TrueFalseInput,
} from "./question-inputs";

type Props = {
  /** `level` — техчек уровня темы, `review` — ежедневное повторение по SM-2. */
  kind?: "level" | "review";
  topicId: string;
  topicTitle: string;
  level: number;
  hasNextLevel: boolean;
  mode: SessionMode;
  items: SessionItem[];
  /** Для повторения: название темы каждого вопроса. */
  topicOf?: { [questionId: string]: string };
};

type Phase = "answering" | "revealed" | "feedback";
type Record = { item: SessionItem; answer: Answer; grade: Grade; durationMs: number };

const FORMAT_LABEL: { [K in SessionItem["format"]]: string } = {
  single_choice: "Выберите один ответ",
  multiple_choice: "Несколько ответов",
  true_false: "Верно или неверно",
  code_output: "Что выведет код?",
  ordering: "Расставьте по порядку",
  open_text: "Открытый ответ",
  open_voice: "Ответ голосом",
};

/** Стартовый ответ: для ordering исходный порядок уже является ответом. */
function initialAnswer(item: SessionItem | undefined): Answer | null {
  return item?.format === "ordering" ? { kind: "ordering", order: item.shuffledOrder! } : null;
}

export function TechCheck({ kind = "level", topicId, topicTitle, level, hasNextLevel, mode, items, topicOf }: Props) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(() => initialAnswer(items[0]));
  const [phase, setPhase] = useState<Phase>("answering");
  const [records, setRecords] = useState<Record[]>([]);
  const [save, setSave] = useState<SaveRunResult | "saving" | null>(null);
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(0);
  const item = items[index];
  const isOpen = item?.format === "open_text" || item?.format === "open_voice";

  useEffect(() => {
    startedAt.current = performance.now();
  }, [index]);

  const current = records[index];

  const check = useCallback(() => {
    if (!item || !answer || !isAnswerComplete(item, answer)) return;
    if (isOpen && phase === "answering") {
      setPhase("revealed");
      return;
    }
    const grade = gradeAnswer(item, answer);
    setRecords((r) => [...r, { item, answer, grade, durationMs: Math.round(performance.now() - startedAt.current) }]);
    setPhase("feedback");
  }, [item, answer, isOpen, phase]);

  /** Последний вопрос → экран результата и сохранение прогресса. */
  const finish = useCallback(() => {
    setFinished(true);
    setSave("saving");
    const attempts = records.map((r) => ({
      questionId: r.item.question.id,
      format: r.item.format,
      correct: r.grade.correct,
      score: r.grade.score,
      answer: r.answer,
      durationMs: r.durationMs,
      carried: r.item.carried,
    }));
    (kind === "review" ? saveReviewRun({ attempts }) : saveLevelRun({ topicId, level, attempts })).then(setSave, () =>
      setSave({ saved: false, reason: "error" }),
    );
  }, [records, topicId, level, kind]);

  const next = useCallback(() => {
    if (index + 1 >= items.length) {
      finish();
      return;
    }
    setAnswer(initialAnswer(items[index + 1]));
    setPhase("answering");
    setIndex(index + 1);
  }, [items, index, finish]);

  // Enter — проверить / продолжить (кроме набора текста в поле ответа)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLButtonElement) return; // Enter на кнопке и так её нажмёт
      if (finished) return;
      if (phase === "feedback") next();
      else check();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, check, next, finished]);

  if (finished) {
    return (
      <Result
        kind={kind}
        topicId={topicId}
        topicTitle={topicTitle}
        level={level}
        hasNextLevel={hasNextLevel}
        mode={mode}
        records={records}
        save={save}
      />
    );
  }

  const progress = (records.length / items.length) * 100;
  const locked = phase === "feedback";
  const canCheck = answer !== null && isAnswerComplete(item, answer);
  const wrong = locked && !current?.grade.correct;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-rule bg-ground">
        <div className="mx-auto flex h-14 w-full max-w-[712px] items-center gap-3 px-2 sm:px-4">
          <Link
            href="/"
            aria-label="Выйти из техчека"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
          >
            <IconClose />
          </Link>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={records.length}
            aria-label="Прогресс техчека"
            className="h-2 flex-1 overflow-hidden rounded-full bg-active"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="tnum min-w-12 shrink-0 pr-2 text-right text-sm whitespace-nowrap text-muted">
            {index + 1} / {items.length}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[712px] flex-1 px-4 pt-6 pb-10 md:pt-10">
        <p className="mb-2 text-sm text-muted">
          {item.carried ? (
            <span className="text-negative">Ошибка с прошлого уровня</span>
          ) : kind === "review" ? (
            (topicOf?.[item.question.id] ?? "Повторение")
          ) : (
            `${topicTitle} · уровень ${level}`
          )}{" "}
          · {FORMAT_LABEL[item.format]}
        </p>
        <h1 className="mb-6 text-[22px] leading-[30px] font-medium md:text-2xl md:leading-8">{item.question.prompt}</h1>

        {item.question.code && (
          <pre className="mb-6 overflow-x-auto rounded-2xl bg-code p-4 text-sm leading-6 text-white">
            <code className="font-mono">{item.question.code.source}</code>
          </pre>
        )}

        <div key={item.question.id}>
          {(item.format === "single_choice" || item.format === "code_output") && (
            <SingleChoiceInput
              item={item}
              answer={answer?.kind === "choice" ? answer : null}
              onChange={setAnswer}
              locked={locked}
            />
          )}
          {item.format === "multiple_choice" && (
            <MultiChoiceInput item={item} answer={answer?.kind === "multi" ? answer : null} onChange={setAnswer} locked={locked} />
          )}
          {item.format === "true_false" && (
            <TrueFalseInput
              item={item}
              answer={answer?.kind === "true_false" ? answer : null}
              onChange={setAnswer}
              locked={locked}
            />
          )}
          {item.format === "ordering" && (
            <OrderingInput item={item} answer={answer?.kind === "ordering" ? answer : null} onChange={setAnswer} locked={locked} />
          )}
          {isOpen && (
            <OpenTextInput
              item={item}
              answer={answer?.kind === "open" ? answer : null}
              onChange={setAnswer}
              locked={locked}
              revealed={phase !== "answering"}
            />
          )}
        </div>

        {isOpen && phase !== "answering" && (
          <section className="mt-6 rounded-2xl border border-line p-5">
            <h2 className="mb-3 text-base font-semibold">Эталонный ответ</h2>
            <Markdown>{item.question.answer}</Markdown>
          </section>
        )}
      </main>

      <footer
        className={`sticky bottom-0 border-t ${
          locked ? (wrong ? "border-[#f5c9c4] bg-negative-tint" : "border-[#c4e3c8] bg-positive-tint") : "border-rule bg-ground"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[712px] flex-col gap-4 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex-row md:items-start md:justify-between md:py-5">
          {locked && current && <Feedback record={current} />}
          <button
            type="button"
            onClick={locked ? next : check}
            disabled={!locked && !canCheck}
            className={`${btnPrimary} w-full md:ml-auto md:w-auto md:min-w-44`}
          >
            {locked
              ? index + 1 === items.length
                ? "Результат"
                : "Продолжить"
              : isOpen && phase === "answering"
                ? "Сравнить с эталоном"
                : "Проверить"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function Feedback({ record }: { record: Record }) {
  const { grade, item } = record;
  const points = item.question.keyPoints.length;
  return (
    <div role="status" aria-live="polite" className="flex min-w-0 flex-1 flex-col gap-2">
      <p className={`flex items-center gap-2 text-lg font-semibold ${grade.correct ? "text-positive" : "text-negative"}`}>
        {grade.correct ? <IconCheck strokeWidth={2.25} /> : <IconClose strokeWidth={2.25} />}
        {grade.correct ? "Верно" : "Не совсем"}
        {grade.score !== undefined && (
          <span className="tnum text-base font-normal text-ink">
            · {Math.round(grade.score * points)} из {points} пунктов
          </span>
        )}
      </p>
      {!grade.correct && (
        <div className="max-h-[30vh] overflow-y-auto">
          <Markdown>{item.question.explanation}</Markdown>
        </div>
      )}
      {item.format !== "open_text" && (
        <details className="text-sm">
          <summary className="cursor-pointer py-1 font-medium">Эталонный ответ</summary>
          <div className="mt-2 max-h-72 overflow-y-auto">
            <Markdown>{item.question.answer}</Markdown>
          </div>
        </details>
      )}
    </div>
  );
}

function Result({
  kind,
  topicId,
  topicTitle,
  level,
  hasNextLevel,
  mode,
  records,
  save,
}: {
  kind: "level" | "review";
  topicId: string;
  topicTitle: string;
  level: number;
  hasNextLevel: boolean;
  mode: SessionMode;
  records: Record[];
  save: SaveRunResult | "saving" | null;
}) {
  const isReview = kind === "review";
  // Результат уровня — только по его вопросам; перенесённые ошибки показываем отдельно
  const result = summarize(records.filter((r) => !r.item.carried).map((r) => r.grade));
  const carried = records.filter((r) => r.item.carried);
  const fixed = carried.filter((r) => r.grade.correct).length;
  const percent = Math.round(result.ratio * 100);
  const mistakes = records.filter((r) => !r.grade.correct);
  const base = `/check/${topicId}/${level}`;

  return (
    <>
      <SiteHeader width="max-w-[744px]">
        <Brand />
        <Link href="/" className="inline-flex min-h-10 items-center rounded-full border border-control px-4 text-sm font-medium hover:bg-surface">
          К темам
        </Link>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-[712px] flex-1 flex-col gap-8 px-4 pt-8 pb-16 md:pt-12">
        <section aria-labelledby="result-title">
          <p className="text-sm text-muted">
            {isReview ? "Повторение" : `${topicTitle} · уровень ${level}`}
            {mode === "recall" ? " · открытые ответы" : ""}
          </p>
          <h1 id="result-title" className="mt-1 text-2xl leading-8 font-medium md:text-[28px] md:leading-9">
            {isReview ? "Повторение закончено" : result.passed ? "Уровень пройден" : "Пока не пройден"}
          </h1>
          <p className="mt-2 text-base text-muted">
            {isReview
              ? "Вопросы, где были ошибки, вернутся завтра. Верные — через несколько дней."
              : result.passed
              ? mistakes.length > 0
                ? "Засчитано. Ниже — вопросы, где были ошибки."
                : "Без единой ошибки."
              : `Нужно ${Math.round(GAME.levelPassRatio * 100)}% верных. Разберите ошибки и попробуйте ещё раз.`}
          </p>

          <div className="mt-6 rounded-[22px] bg-surface p-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="tnum text-[32px] leading-9">
                {percent}%
              </p>
              <p className="tnum text-sm text-muted">
                {result.correct} из {result.total} верно
                {isReview ? "" : ` · порог ${Math.round(GAME.levelPassRatio * 100)}%`}
              </p>
            </div>
            {/* Полоса результата с отметкой порога прохождения */}
            <div className="relative mt-4 h-2 rounded-full bg-active">
              <div
                className={`h-full rounded-full ${result.passed || isReview ? "bg-accent" : "bg-negative"}`}
                style={{ width: `${percent}%` }}
              />
              {!isReview && (
                <span
                  aria-hidden
                  className="absolute -top-1 h-4 w-0.5 rounded bg-ink"
                  style={{ left: `${GAME.levelPassRatio * 100}%` }}
                />
              )}
            </div>
            <p className="mt-4 text-sm" aria-live="polite">
              {save === "saving" && <span className="text-muted">Сохраняем прогресс…</span>}
              {save !== null && save !== "saving" && save.saved && (
                <span className="text-ink">
                  {save.firstToday && save.streak === 1
                    ? "Серия началась: 1 день. Завтра — второй."
                    : save.firstToday
                      ? `Серия продлена: ${save.streak} ${plural(save.streak, ["день", "дня", "дней"])} подряд.`
                      : `Серия: ${save.streak} ${plural(save.streak, ["день", "дня", "дней"])} подряд.`}{" "}
                  <span className="text-muted">+{save.xp} XP</span>
                </span>
              )}
              {save !== null && save !== "saving" && !save.saved && save.reason === "auth" && (
                <span className="text-muted">
                  <Link href="/login" className="text-accent underline underline-offset-2">
                    Войдите
                  </Link>
                  , чтобы сохранять прогресс
                </span>
              )}
              {save !== null && save !== "saving" && !save.saved && save.reason === "error" && (
                <span className="text-negative">Не удалось сохранить прогресс</span>
              )}
            </p>
          </div>
          {carried.length > 0 && (
            <p className="mt-4 text-base">
              Ошибки с прошлых уровней: исправлено <span className="tnum">{fixed}</span> из{" "}
              <span className="tnum">{carried.length}</span>.
              <span className="text-muted">
                {fixed < carried.length ? " Остальные вернутся на следующем уровне и в повторении." : " Они ушли в повторение."}
              </span>
            </p>
          )}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {isReview ? (
            <Link href="/" className={btnPrimary}>
              На главную
            </Link>
          ) : result.passed && hasNextLevel ? (
            <Link href={`/check/${topicId}/${level + 1}`} className={btnPrimary}>
              Следующий уровень
              <IconArrow width={18} height={18} />
            </Link>
          ) : (
            <a href={`${base}${mode === "recall" ? "?mode=recall" : ""}`} className={btnPrimary}>
              Пройти ещё раз
            </a>
          )}
          {!isReview && mode === "practice" && (
            <a href={`${base}?mode=recall`} className={btnSecondary}>
              Ответить своими словами
            </a>
          )}
          {!isReview && (
            <Link href="/" className={btnSecondary}>
              К темам
            </Link>
          )}
        </div>

        {mistakes.length > 0 && (
          <section aria-labelledby="mistakes">
            <h2 id="mistakes" className="mb-3 text-lg font-semibold">
              Разбор ошибок · <span className="tnum">{mistakes.length}</span>
            </h2>
            <ul className="flex flex-col gap-3">
              {mistakes.map(({ item }) => (
                <li key={item.question.id}>
                  <details className="group rounded-2xl border border-line">
                    <summary className="flex min-h-14 cursor-pointer items-start gap-3 p-4 text-base leading-6">
                      <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-negative" />
                      {item.question.prompt}
                    </summary>
                    <div className="flex flex-col gap-4 px-4 pb-4">
                      <Markdown>{item.question.explanation}</Markdown>
                      <div className="rounded-xl bg-surface p-4">
                        <p className="mb-2 text-sm text-muted">Эталонный ответ</p>
                        <Markdown>{item.question.answer}</Markdown>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
