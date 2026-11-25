import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import { loadQuestionBank } from "@/lib/questions/load";

async function getBank() {
  "use cache";
  return loadQuestionBank();
}

export default async function Home() {
  const bank = await getBank();
  const total = bank.reduce((s, t) => s + t.questions.length, 0);
  const target = bank.reduce((s, t) => s + t.target, 0);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <header className="mb-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Skilling</p>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </div>
        <h1 className="mt-1 text-3xl font-extrabold">Техчеки к собеседованию</h1>
        <p className="mt-3 text-base opacity-80">
          Короткие ежедневные проверки вместо зубрёжки. Ошибки возвращаются в следующий этап, а
          после всех уровней ждёт босс-техчек из 10 случайных вопросов.
        </p>
        <p className="mt-4 text-sm font-semibold opacity-70">
          Банк вопросов: {total} из {target}
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {bank.map((topic) => {
          const pct = Math.round((topic.questions.length / topic.target) * 100);
          return (
            <li
              key={topic.id}
              className="rounded-2xl border-2 border-black/10 p-4 dark:border-white/15"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-extrabold">{topic.title}</h2>
                <span className="shrink-0 text-sm font-bold opacity-70">
                  {topic.questions.length}/{topic.target}
                </span>
              </div>
              <p className="mt-1 text-sm opacity-75">{topic.description}</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}

        <li className="rounded-2xl border-2 border-boss p-4 text-center">
          <h2 className="text-lg font-extrabold text-boss">Босс-техчек</h2>
          <p className="mt-1 text-sm opacity-75">
            Откроется после прохождения всех уровней. 10 случайных вопросов, нужно ≥80%.
          </p>
        </li>
      </ol>
    </main>
  );
}
