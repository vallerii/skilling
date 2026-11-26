import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TechCheck } from "@/components/check/tech-check";
import { Brand, btnPrimary } from "@/components/ui";
import { buildSession } from "@/lib/game/session";
import { reviewQueue } from "@/lib/srs-data";

export const metadata: Metadata = { title: "Повторение — Skilling" };

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-muted">Собираем повторение…</p>}>
      <ReviewLoader />
    </Suspense>
  );
}

async function ReviewLoader() {
  await connection();
  const queue = await reviewQueue();

  if (!queue || queue.questions.length === 0) {
    return (
      <>
        <header className="border-b border-rule">
          <div className="mx-auto flex h-14 w-full max-w-[712px] items-center px-4">
            <Brand />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[712px] flex-1 px-4 pt-10 pb-16">
          <h1 className="text-2xl leading-8 font-medium">{queue ? "На сегодня повторять нечего" : "Повторение"}</h1>
          <p className="mt-2 text-base text-muted">
            {queue
              ? "Все вопросы, которые вы уже проходили, вернутся в свой срок. Пока можно пройти новый уровень."
              : "Войдите, чтобы приложение запоминало ответы и возвращало вопросы на повторение."}
          </p>
          <Link href={queue ? "/" : "/login"} className={`${btnPrimary} mt-8`}>
            {queue ? "К темам" : "Войти"}
          </Link>
        </main>
      </>
    );
  }

  return (
    <TechCheck
      kind="review"
      topicId=""
      topicTitle="Повторение"
      level={0}
      hasNextLevel={false}
      mode="practice"
      items={buildSession(queue.questions, { mode: "practice", recallIds: queue.recallIds })}
      topicOf={Object.fromEntries(queue.topicOf)}
    />
  );
}
