import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TechCheck } from "@/components/check/tech-check";
import { buildSession, type SessionMode } from "@/lib/game/session";
import { loadTopicQuestions, loadTopics } from "@/lib/questions/load";
import { levelExtras } from "@/lib/srs-data";

type Params = Promise<{ topic: string; level: string }>;
type SearchParams = Promise<{ mode?: string }>;

export const metadata: Metadata = { title: "Техчек — Skilling" };

export default function CheckPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="p-10 text-center text-muted">Готовим техчек…</p>}>
      <CheckLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CheckLoader({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  // Порядок вопросов и вариантов случайный для каждого прохождения
  await connection();
  const { topic: topicId, level: levelParam } = await params;
  const { mode: modeParam } = await searchParams;
  const level = Number(levelParam);
  const mode: SessionMode = modeParam === "recall" ? "recall" : "practice";

  const topic = (await loadTopics()).find((t) => t.id === topicId);
  if (!topic || !Number.isInteger(level)) notFound();

  const all = await loadTopicQuestions(topicId);
  const questions = all.filter((q) => q.level === level);
  if (questions.length === 0) notFound();

  const maxLevel = Math.max(...all.map((q) => q.level));
  // Старые ошибки темы — в конец уровня; знакомые вопросы — открытым ответом
  const { carried, recallIds } = await levelExtras(topicId, level, questions);

  return (
    <TechCheck
      topicId={topicId}
      topicTitle={topic.title}
      level={level}
      hasNextLevel={level < maxLevel}
      mode={mode}
      items={buildSession(questions, { mode, carried, recallIds })}
    />
  );
}
