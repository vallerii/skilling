import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  TopicFileSchema,
  TopicsFileSchema,
  type Question,
  type Topic,
} from "./schema";

/**
 * Банк вопросов хранится в репозитории (content/), это источник правды.
 * В Supabase он попадает через `npm run questions:seed` (этап 2 плана),
 * а прогресс пользователя живёт только в базе.
 */
const CONTENT_DIR = path.join(process.cwd(), "content");

export async function loadTopics(): Promise<Topic[]> {
  const raw = await readFile(path.join(CONTENT_DIR, "topics.json"), "utf8");
  const { topics } = TopicsFileSchema.parse(JSON.parse(raw));
  return [...topics].sort((a, b) => a.order - b.order);
}

export async function loadTopicQuestions(topicId: string): Promise<Question[]> {
  const file = path.join(CONTENT_DIR, "questions", `${topicId}.json`);
  const raw = await readFile(file, "utf8");
  const parsed = TopicFileSchema.parse(JSON.parse(raw));
  return parsed.questions;
}

export type TopicWithQuestions = Topic & { questions: Question[] };

export async function loadQuestionBank(): Promise<TopicWithQuestions[]> {
  const topics = await loadTopics();
  return Promise.all(
    topics.map(async (t) => ({ ...t, questions: await loadTopicQuestions(t.id) })),
  );
}
