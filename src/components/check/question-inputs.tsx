"use client";

import type { Answer, SessionItem } from "@/lib/game/session";

type InputProps<A extends Answer> = {
  item: SessionItem;
  answer: A | null;
  onChange: (answer: A) => void;
  /** После проверки ответ нельзя менять — подсвечиваем правильные и ошибочные варианты. */
  locked: boolean;
};

import { IconCheck, IconDown, IconUp } from "@/components/ui";

/*
 * Варианты — белые строки с тонкой рамкой. Выбранный — рамка в цвет текста.
 * После проверки цвет появляется только там, где он что-то значит: верно / ошибка.
 */
const optionBase =
  "w-full min-h-14 rounded-2xl border px-4 py-3.5 text-left text-base leading-6 transition-colors disabled:cursor-default";
const optionIdle = "border-line bg-raised hover:border-control hover:bg-surface";
const optionSelected = "border-ink bg-surface shadow-[inset_0_0_0_1px_var(--text)]";
const optionCorrect = "border-positive bg-positive-tint shadow-[inset_0_0_0_1px_var(--positive)]";
const optionWrong = "border-negative bg-negative-tint shadow-[inset_0_0_0_1px_var(--negative)]";
const hint = "text-sm text-muted";

/** single_choice и code_output — один вариант. */
export function SingleChoiceInput({ item, answer, onChange, locked }: InputProps<Extract<Answer, { kind: "choice" }>>) {
  const correct =
    item.format === "code_output" ? [item.question.codeOutput!.answer] : item.question.choices!.correct;
  const mono = item.format === "code_output";

  return (
    <div role="radiogroup" aria-label="Варианты ответа" className="flex flex-col gap-3">
      {item.options!.map((option, i) => {
        const selected = answer?.selected === option;
        const state = locked
          ? correct.includes(option)
            ? optionCorrect
            : selected
              ? optionWrong
              : optionIdle
          : selected
            ? optionSelected
            : optionIdle;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={locked}
            onClick={() => onChange({ kind: "choice", selected: option })}
            className={`${optionBase} ${state} flex items-start gap-3`}
          >
            <span
              aria-hidden
              className={`tnum mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${selected && !locked ? "border-ink bg-ink text-white" : "border-control text-muted"}`}
            >
              {i + 1}
            </span>
            <span className={mono ? "font-mono text-[15px]" : undefined}>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

/** multiple_choice — несколько вариантов. */
export function MultiChoiceInput({ item, answer, onChange, locked }: InputProps<Extract<Answer, { kind: "multi" }>>) {
  const selected = answer?.selected ?? [];
  const correct = item.question.choices!.correct;
  const toggle = (option: string) =>
    onChange({
      kind: "multi",
      selected: selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option],
    });

  return (
    <div className="flex flex-col gap-3">
      <p className={hint}>Выберите все правильные варианты</p>
      {item.options!.map((option) => {
        const isSelected = selected.includes(option);
        const isCorrect = correct.includes(option);
        const state = locked
          ? isCorrect
            ? optionCorrect
            : isSelected
              ? optionWrong
              : optionIdle
          : isSelected
            ? optionSelected
            : optionIdle;
        return (
          <button
            key={option}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            disabled={locked}
            onClick={() => toggle(option)}
            className={`${optionBase} ${state} flex items-start gap-3`}
          >
            <span
              aria-hidden
              className={`mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${isSelected ? "border-ink bg-ink text-white" : "border-control"}`}
            >
              {isSelected && <IconCheck width={16} height={16} strokeWidth={2.5} />}
            </span>
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

/** true_false — вердикт для каждого утверждения. */
export function TrueFalseInput({ item, answer, onChange, locked }: InputProps<Extract<Answer, { kind: "true_false" }>>) {
  const statements = item.question.statements!;
  const verdicts = answer?.verdicts ?? statements.map(() => null);
  const set = (i: number, value: boolean) =>
    onChange({ kind: "true_false", verdicts: verdicts.map((v, idx) => (idx === i ? value : v)) });

  return (
    <ul className="flex flex-col gap-3">
      {statements.map((s, i) => {
        const v = verdicts[i];
        const wrong = locked && v !== s.isTrue;
        return (
          <li
            key={s.text}
            className={`rounded-2xl border p-4 ${locked ? (wrong ? "border-negative bg-negative-tint" : "border-positive bg-positive-tint") : "border-line bg-raised"}`}
          >
            <p className="mb-3 text-base leading-6">{s.text}</p>
            <div role="radiogroup" aria-label={`Утверждение ${i + 1}`} className="flex gap-2">
              {[
                { value: true, label: "Верно" },
                { value: false, label: "Неверно" },
              ].map(({ value, label }) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={v === value}
                  disabled={locked}
                  onClick={() => set(i, value)}
                  className={`min-h-11 flex-1 rounded-full border px-3 text-base transition-colors ${v === value ? "border-ink bg-ink text-white" : "border-control bg-raised hover:bg-surface"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {locked && wrong && (
              <p className="mt-2 text-sm font-medium text-negative">Правильно: {s.isTrue ? "верно" : "неверно"}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** ordering — перестановка кнопками вверх/вниз (работает с клавиатуры и на телефоне). */
export function OrderingInput({ item, answer, onChange, locked }: InputProps<Extract<Answer, { kind: "ordering" }>>) {
  const order = answer?.order ?? item.shuffledOrder!;
  const correct = item.question.ordering!;
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    onChange({ kind: "ordering", order: next });
  };

  return (
    <div className="flex flex-col gap-2">
      <p className={hint}>Расставьте шаги по порядку стрелками</p>
      <ol className="flex flex-col gap-2">
        {order.map((step, i) => {
          const state = locked ? (step === correct[i] ? optionCorrect : optionWrong) : optionIdle;
          return (
            <li key={step} className={`flex min-h-14 items-center gap-3 rounded-2xl border py-2 pr-2 pl-4 ${state}`}>
              <span className="tnum w-5 shrink-0 text-sm text-muted">{i + 1}</span>
              <span className="flex-1 text-base leading-6">{step}</span>
              {!locked && (
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Поднять «${step}»`}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface disabled:text-control"
                  >
                    <IconUp width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Опустить «${step}»`}
                    disabled={i === order.length - 1}
                    onClick={() => move(i, i + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface disabled:text-control"
                  >
                    <IconDown width={18} height={18} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {locked && order.some((s, i) => s !== correct[i]) && (
        <div className="mt-2 rounded-2xl bg-surface p-4">
          <p className="mb-2 text-sm font-medium">Правильный порядок</p>
          <ol className="list-decimal space-y-1 pl-5">
            {correct.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** open_text — ответ своими словами, затем самопроверка по чек-листу ключевых пунктов. */
export function OpenTextInput({
  item,
  answer,
  onChange,
  locked,
  revealed,
}: InputProps<Extract<Answer, { kind: "open" }>> & { revealed: boolean }) {
  const text = answer?.text ?? "";
  const checked = answer?.checked ?? [];
  const toggle = (i: number) =>
    onChange({ kind: "open", text, checked: checked.includes(i) ? checked.filter((c) => c !== i) : [...checked, i] });

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="open-answer" className={hint}>
        Ответьте своими словами, как на собеседовании
      </label>
      <textarea
        id="open-answer"
        value={text}
        readOnly={revealed}
        onChange={(e) => onChange({ kind: "open", text: e.target.value, checked })}
        rows={6}
        placeholder="Например: замыкание — это…"
        className="w-full resize-y rounded-2xl border border-control bg-raised p-4 text-base leading-6 outline-none placeholder:text-muted focus-visible:border-ink focus-visible:shadow-[inset_0_0_0_1px_var(--text)] read-only:bg-surface"
      />

      {revealed && (
        <fieldset className="rounded-2xl bg-surface p-4 pt-3">
          <legend className="float-left mb-1 w-full pt-1 text-base font-semibold">Что из этого вы упомянули?</legend>
          <p className="mb-3 clear-left text-sm text-muted">
            Отметьте честно — засчитывается от {Math.ceil(item.question.keyPoints.length * 0.7)} из{" "}
            {item.question.keyPoints.length}
          </p>
          <ul className="flex flex-col gap-2">
            {item.question.keyPoints.map((point, i) => (
              <li key={point}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-active">
                  <input
                    type="checkbox"
                    checked={checked.includes(i)}
                    disabled={locked}
                    onChange={() => toggle(i)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--text)]"
                  />
                  <span className="text-base leading-6">{point}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
