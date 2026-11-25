import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { Sky } from "@/components/sky";
import { BossCard, TopicCards } from "@/components/topics-map";
import { TopicsRail } from "@/components/topics-rail";
import { Brand, btnPrimary, IconArrow, plural, WordmarkInline } from "@/components/ui";
import { emptyDashboard, getDashboard, levelsOf, type Dashboard } from "@/lib/dashboard";
import { GAME } from "@/lib/game/config";
import { loadQuestionBank, type TopicWithQuestions } from "@/lib/questions/load";
import { isSupabaseConfigured } from "@/lib/supabase/env";

async function getBank() {
  "use cache";
  return loadQuestionBank();
}

export default async function Home() {
  const bank = await getBank();
  // Пока читается сессия, показываем тот же экран с нулями — макет не прыгает
  return (
    <Suspense fallback={<HomeView bank={bank} dash={emptyDashboard(bank)} pending />}>
      <HomeWithData bank={bank} />
    </Suspense>
  );
}

async function HomeWithData({ bank }: { bank: TopicWithQuestions[] }) {
  return <HomeView bank={bank} dash={await getDashboard(bank)} />;
}

function HomeView({ bank, dash, pending = false }: { bank: TopicWithQuestions[]; dash: Dashboard; pending?: boolean }) {
  const questionTotal = bank.reduce((s, t) => s + t.questions.length, 0);
  const accuracy = dash.today.answers > 0 ? Math.round((dash.today.correct / dash.today.answers) * 100) : null;

  return (
    <>
      {/* Небо — только первый экран главной; к низу растворяется в фоне */}
      <div className="relative isolate">
        <Sky />
        <header className="mx-auto flex h-16 w-full max-w-[1132px] items-center justify-between gap-4 px-4">
          <Brand />
          {!pending && <Account dash={dash} />}
        </header>

        <section aria-labelledby="greeting" className="mx-auto w-full max-w-[1132px] px-4 pt-6 pb-12 md:pt-16 md:pb-20">
          <h1
            id="greeting"
            className="text-[34px] leading-[42px] font-medium tracking-[-0.025em] text-[#18252e] md:text-[56px] md:leading-[64px] lg:text-[72px] lg:leading-[80px]"
          >
            {dash.next ? "Один техчек в день" : "Все уровни пройдены"}
          </h1>
          <p className="mt-3 max-w-[48ch] text-base leading-6 text-[#3c4a52] md:mt-5 md:text-xl md:leading-8">
            {!dash.next
              ? "Босс-техчек открыт: 10 вопросов из всех тем."
              : dash.user
                ? dash.streakDays > 0
                  ? `Так собеседование перестаёт пугать. Серия ${dash.streakDays} ${plural(dash.streakDays, ["день", "дня", "дней"])} — сегодняшний техчек её продлит.`
                  : "Так собеседование перестаёт пугать. Пройдите первый сегодня, чтобы начать серию."
                : `Так собеседование перестаёт пугать. ${bank.length} тем и ${questionTotal} вопросов под фронтенд и фулстек.`}
          </p>

          {/* Статистика — строкой цифр с тонкими разделителями, без карточек */}
          <dl className="mt-8 grid max-w-[720px] grid-cols-2 gap-y-5 md:mt-10 md:flex md:gap-0 md:divide-x md:divide-[#18252e]/15">
            <Figure label="уровней пройдено" value={dash.passedLevels} of={dash.totalLevels} />
            <Figure label={`${plural(dash.streakDays, ["день", "дня", "дней"])} подряд`} value={dash.streakDays} />
            <Figure
              label={accuracy !== null ? `ответов сегодня, ${accuracy}% верно` : "ответов сегодня"}
              value={dash.today.answers}
            />
            <Figure label="XP сегодня" value={dash.today.xp} />
          </dl>

          {dash.next ? <NextMove bank={bank} dash={dash} /> : null}
        </section>
      </div>

      <main className="flex-1 pb-16 md:pb-8">
        <TopicsRail
          heading={
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="topics" className="text-[28px] leading-9 font-medium tracking-[-0.02em] md:text-[44px] md:leading-[52px]">
                Темы
              </h2>
              <p className="tnum text-sm text-muted md:text-base">
                {bank.length} тем · {questionTotal} вопросов
              </p>
            </div>
          }
        >
          <TopicCards bank={bank} progress={dash.progress} next={dash.next} />
          <BossCard
            passed={dash.passedLevels}
            total={dash.totalLevels}
            bossCount={GAME.bossQuestionCount}
            ratio={GAME.bossPassRatio}
          />
        </TopicsRail>

      </main>
      <Footer bank={bank} questionTotal={questionTotal} signedIn={!!dash.user} />
    </>
  );
}

/** Подвал: короткий смысл продукта, ссылки, и вордмарк на всю ширину внизу. */
function Footer({ bank, questionTotal, signedIn }: { bank: TopicWithQuestions[]; questionTotal: number; signedIn: boolean }) {
  return (
    <footer className="mt-8 overflow-hidden bg-[#1f201d] text-[#e9e8e2]">
      <div className="mx-auto grid w-full max-w-[1132px] gap-10 px-4 pt-14 pb-10 md:grid-cols-12 md:gap-4 md:pt-20">
        <div className="md:col-span-6">
          <p className="max-w-[26ch] text-2xl leading-8 font-medium tracking-[-0.01em] text-white md:text-[32px] md:leading-10">
            Теория без зубрёжки — по одной ступени в день
          </p>
          <p className="mt-4 max-w-[46ch] text-base leading-6 text-[#b4b3ac]">
            {bank.length} тем и {questionTotal} вопросов, которые чаще всего спрашивают на собеседованиях фронтенд- и
            фулстек-разработчиков. Уровень засчитывается от {Math.round(GAME.levelPassRatio * 100)}% верных, ошибки
            возвращаются на повторение.
          </p>
        </div>
        <nav aria-label="Темы" className="md:col-span-3 md:col-start-8">
          <h2 className="text-sm text-[#a3a29b]">Темы</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-base md:grid-cols-1">
            {bank.slice(0, 6).map((t) => (
              <li key={t.id}>
                <Link href={`/check/${t.id}/1`} className="hover:text-white hover:underline hover:underline-offset-4">
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-2">
          <h2 className="text-sm text-[#a3a29b]">Аккаунт</h2>
          <ul className="mt-3 flex flex-col gap-2 text-base">
            {!signedIn && (
              <li>
                <Link href="/login" className="hover:text-white hover:underline hover:underline-offset-4">
                  Войти
                </Link>
              </li>
            )}
            <li>
              <Link href="/#topics" className="hover:text-white hover:underline hover:underline-offset-4">
                Все {bank.length} тем
              </Link>
            </li>
          </ul>
        </div>
      </div>
      {/* Вордмарк на всю ширину: размер шрифта подобран так, чтобы надпись заняла строку */}
      <div className="mx-auto w-full max-w-[1132px] px-4">
        <div aria-hidden className="mt-6 select-none text-white md:mt-10" style={{ fontSize: "min(calc((100vw - 32px) / 3.08), 356px)" }}>
          <WordmarkInline />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1132px] justify-between gap-4 px-4 pt-4 pb-8 text-sm text-[#a3a29b]">
        <span>skilling · 2026</span>
        <span>Подготовка к собеседованиям</span>
      </div>
    </footer>
  );
}

function Figure({ label, value, of }: { label: string; value: number; of?: number }) {
  return (
    <div className="flex flex-col gap-1 md:px-8 md:first:pl-0">
      <dt className="order-2 text-sm leading-5 text-[#3c4a52]">{label}</dt>
      <dd className="tnum order-1 text-[32px] leading-9 text-[#18252e]">
        {value}
        {of !== undefined && <span className="text-xl text-[#3c4a52]"> / {of}</span>}
      </dd>
    </div>
  );
}

/**
 * Следующий ход: крупный белый блок на небе. Справа — лестница уровней темы,
 * где видно, сколько ступеней уже позади и какая следующая.
 */
function NextMove({ bank, dash }: { bank: TopicWithQuestions[]; dash: Dashboard }) {
  const next = dash.next!;
  const topic = bank.find((t) => t.id === next.topicId)!;
  const levels = levelsOf(topic);
  const passed = levels.filter((l) => dash.progress[`${topic.id}:${l}`]?.passed).length;

  return (
    <section
      aria-labelledby="next-move"
      className="mt-10 grid gap-8 rounded-[32px] bg-raised p-6 md:mt-14 md:min-h-[300px] md:grid-cols-[1fr_auto] md:items-end md:gap-12 md:p-10"
    >
      <div className="flex h-full flex-col">
        <h2 id="next-move" className="text-sm text-muted">
          Следующий ход
        </h2>
        <p className="mt-3 text-[28px] leading-9 font-medium tracking-[-0.01em] md:text-[34px] md:leading-[42px]">
          {next.topicTitle}
          <br />
          уровень {next.level}
        </p>
        <p className="mt-3 text-base leading-6 text-muted">
          {next.questionCount} {plural(next.questionCount, ["вопрос", "вопроса", "вопросов"])} · засчитывается от{" "}
          {Math.round(GAME.levelPassRatio * 100)}% верных
        </p>
        <Link
          href={`/check/${next.topicId}/${next.level}`}
          className={`${btnPrimary} mt-8 min-h-14 w-full px-8 text-[17px] md:mt-auto md:w-fit`}
        >
          Начать техчек
          <IconArrow width={18} height={18} />
        </Link>
      </div>

      {/* Лестница уровней темы */}
      <div>
        <ol className="flex h-24 items-end gap-2 md:h-44 md:gap-3" aria-label={`Уровни темы: пройдено ${passed} из ${levels.length}`}>
          {levels.map((level, i) => {
            const isPassed = dash.progress[`${topic.id}:${level}`]?.passed;
            const isNext = level === next.level;
            const height = 28 + (72 * (i + 1)) / levels.length;
            return (
              <li
                key={level}
                className={`tnum flex w-10 items-start justify-center rounded-xl pt-2 text-sm md:w-14 md:pt-3 md:text-base ${
                  isPassed ? "bg-accent text-white" : isNext ? "bg-primary text-white" : "bg-surface text-muted"
                }`}
                style={{ height: `${height}%` }}
              >
                <span className="sr-only">Уровень </span>
                {level}
                {isPassed && <span className="sr-only">, пройден</span>}
                {isNext && <span className="sr-only">, следующий</span>}
              </li>
            );
          })}
        </ol>
        <p className="tnum mt-3 text-sm text-muted">
          {passed} из {levels.length} {plural(levels.length, ["уровня", "уровней", "уровней"])} темы позади
        </p>
      </div>
    </section>
  );
}

function Account({ dash }: { dash: Dashboard }) {
  if (!isSupabaseConfigured) return null;
  const pill =
    "inline-flex min-h-10 items-center justify-center rounded-full bg-raised/80 px-4 text-sm font-medium text-ink transition-colors hover:bg-raised";
  if (!dash.user) {
    return (
      <Link href="/login" className={pill}>
        Войти
      </Link>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="hidden max-w-[16rem] truncate text-sm text-[#3c4a52] sm:block">{dash.user.email}</span>
      <form action={signOut}>
        <button type="submit" className={pill}>
          Выйти
        </button>
      </form>
    </div>
  );
}
