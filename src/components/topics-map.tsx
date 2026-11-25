import Link from "next/link";
import { levelsOf, type NextLevel, type ProgressMap } from "@/lib/dashboard";
import type { TopicWithQuestions } from "@/lib/questions/load";
import { IconArrow, IconCheck, IconLock, plural } from "./ui";

/** Спокойные тона карточек: туман, шалфей, песок, глина — по кругу. */
const TINTS = ["#e3ebf0", "#e4ebdf", "#ebe8e1", "#eee4df"];

/**
 * Дорожка уровней. Пройденный — белая плитка с бирюзовой галочкой,
 * следующий — чёрная, остальные — белые с тёмной цифрой.
 */
export function LevelTrack({ topic, progress, next }: { topic: TopicWithQuestions; progress: ProgressMap; next: NextLevel | null }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label={`Уровни темы ${topic.title}`}>
      {levelsOf(topic).map((level) => {
        const state = progress[`${topic.id}:${level}`];
        const count = topic.questions.filter((q) => q.level === level).length;
        const isNext = next?.topicId === topic.id && next.level === level;
        const score = state?.bestScore != null ? Math.round(state.bestScore) : null;
        const label = state?.passed
          ? `Уровень ${level}: пройден, лучший результат ${score ?? 0}%`
          : `Уровень ${level}: ${count} вопросов${score !== null ? `, лучший результат ${score}%` : ""}${isNext ? ", следующий" : ""}`;
        const look = state?.passed
          ? "bg-raised text-accent"
          : isNext
            ? "bg-primary text-white hover:bg-[#3a3b37]"
            : "bg-raised/70 text-ink hover:bg-raised";
        return (
          <li key={level}>
            <Link
              href={`/check/${topic.id}/${level}`}
              aria-label={label}
              title={label}
              className={`tnum flex h-11 w-11 items-center justify-center rounded-xl text-base font-medium transition-colors ${look}`}
            >
              {state?.passed ? <IconCheck width={20} height={20} strokeWidth={2.25} /> : level}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Уровни строками: номер, число вопросов, лучший результат. Для больших карточек. */
function LevelList({ topic, progress, next }: { topic: TopicWithQuestions; progress: ProgressMap; next: NextLevel | null }) {
  return (
    <ol className="flex flex-col gap-1.5" aria-label={`Уровни темы ${topic.title}`}>
      {levelsOf(topic).map((level) => {
        const state = progress[`${topic.id}:${level}`];
        const count = topic.questions.filter((q) => q.level === level).length;
        const isNext = next?.topicId === topic.id && next.level === level;
        const score = state?.bestScore != null ? Math.round(state.bestScore) : null;
        return (
          <li key={level}>
            <Link
              href={`/check/${topic.id}/${level}`}
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-base transition-colors [@media(max-height:800px)]:min-h-11 ${
                isNext ? "bg-primary text-white hover:bg-[#3a3b37]" : "bg-raised/60 text-ink hover:bg-raised"
              }`}
            >
              <span className="shrink-0 whitespace-nowrap">Уровень {level}</span>
              <span className={`tnum flex-1 whitespace-nowrap pl-2 text-sm ${isNext ? "text-white/75" : "text-muted"}`}>
                {count} {plural(count, ["вопрос", "вопроса", "вопросов"])}
              </span>
              {state?.passed ? (
                <span className="tnum flex items-center gap-1.5 text-sm text-accent">
                  {score !== null && `${score}%`}
                  <IconCheck width={18} height={18} strokeWidth={2.25} aria-label="пройден" />
                </span>
              ) : isNext ? (
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="hidden sm:inline">Следующий</span>
                  <span className="sr-only sm:hidden">Следующий</span>
                  <IconArrow width={18} height={18} />
                </span>
              ) : score !== null ? (
                <span className="tnum text-sm text-muted">лучший {score}%</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function TopicCards({
  bank,
  progress,
  next,
}: {
  bank: TopicWithQuestions[];
  progress: ProgressMap;
  next: NextLevel | null;
}) {
  return bank.map((topic, i) => {
    const levels = levelsOf(topic);
    const passed = levels.filter((l) => progress[`${topic.id}:${l}`]?.passed).length;
    return (
      <li
        key={topic.id}
        data-card
        className="flex w-[min(86vw,380px)] shrink-0 snap-start scroll-ml-4 flex-col rounded-[32px] p-6 md:min-h-[min(560px,calc(100dvh-10vh-120px))] md:w-[clamp(380px,33vw,560px)] md:p-8"
        style={{ background: TINTS[i % TINTS.length] }}
      >
        <div className="flex items-baseline justify-between text-sm text-muted">
          <span className="tnum">{String(i + 1).padStart(2, "0")}</span>
          <span className="tnum">{topic.questions.length} вопросов</span>
        </div>
        <h3 className="mt-6 text-[28px] leading-9 font-medium tracking-[-0.015em] md:mt-8 md:text-[34px] md:leading-[42px] md:[@media(max-height:800px)]:text-[28px] md:[@media(max-height:800px)]:leading-9">
          {topic.title}
        </h3>
        <p className="mt-3 text-base leading-6 text-[#4f4f4b] md:text-[17px] md:leading-7">{topic.description}</p>

        {/* Пара вопросов из темы — чтобы было понятно, что внутри */}
        <div className="mt-6 hidden md:[@media(min-height:820px)]:block">
          <p className="text-sm text-muted">Например</p>
          <ul className="mt-2 flex flex-col gap-2">
            {topic.questions
              .filter((q) => q.level === 1)
              .slice(0, 2)
              .map((q, n) => (
                <li
                  key={q.id}
                  className={`${n > 0 ? "hidden [@media(min-height:960px)]:[display:-webkit-box]" : ""} line-clamp-2 border-l-2 border-[#1f201d]/15 pl-3 text-[15px] leading-6 text-[#3d3d3a]`}
                >
                  {q.prompt}
                </li>
              ))}
          </ul>
        </div>

        <div className="mt-auto pt-8 [@media(max-height:800px)]:pt-6">
          <div className="mb-4 flex items-center gap-3">
            {/* Шкала темы: доля пройденных уровней */}
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised/70">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(passed / levels.length) * 100}%` }} />
            </div>
            <span className={`tnum text-sm ${passed > 0 ? "text-accent" : "text-muted"}`}>
              {passed} из {levels.length}
            </span>
          </div>
          <LevelList topic={topic} progress={progress} next={next} />
        </div>
      </li>
    );
  });
}

/** Последняя карточка ленты — босс. Тёмная, чтобы её было видно в конце пути. */
export function BossCard({ passed, total, bossCount, ratio }: { passed: number; total: number; bossCount: number; ratio: number }) {
  const left = total - passed;
  const open = left === 0;
  return (
    <li
      data-card
      className="flex w-[min(86vw,380px)] shrink-0 snap-start scroll-ml-4 flex-col rounded-[32px] bg-[#1f201d] p-6 text-[#e9e8e2] md:min-h-[min(560px,calc(100dvh-10vh-120px))] md:w-[clamp(380px,33vw,560px)] md:p-8"
    >
      <div className="flex items-center justify-between text-sm text-[#a3a29b]">
        <span>Финал</span>
        <span className="flex items-center gap-1.5">
          {!open && <IconLock width={16} height={16} />}
          {open ? "Открыт" : "Закрыт"}
        </span>
      </div>
      <h3 className="mt-6 text-[28px] leading-9 font-medium tracking-[-0.015em] text-white md:mt-8 md:text-[34px] md:leading-[42px]">
        Босс-техчек
      </h3>
      <p className="mt-3 text-base leading-6 text-[#c9c8c1] md:text-[17px] md:leading-7">
        {bossCount} случайных вопросов из всех тем подряд, как на настоящем собеседовании. Засчитывается от{" "}
        {Math.round(ratio * 100)}% верных.
      </p>

      <div className="mt-auto pt-8">
        <p className="tnum text-[56px] leading-[60px] font-normal text-white md:text-[72px] md:leading-[76px]">
          {passed}
          <span className="text-[#8e8d86]"> / {total}</span>
        </p>
        <p className="mt-1 text-sm text-[#a3a29b]">уровней пройдено</p>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/12">
          <div className="h-full rounded-full bg-[#5fb3a8]" style={{ width: `${(passed / total) * 100}%` }} />
        </div>
        <p className="mt-4 text-base text-[#e9e8e2]">
          {open
            ? "Все уровни позади — можно идти к боссу."
            : `Ещё ${left} ${plural(left, ["уровень", "уровня", "уровней"])} — и босс откроется.`}
        </p>
      </div>
    </li>
  );
}
