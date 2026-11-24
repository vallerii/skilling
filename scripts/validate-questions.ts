/**
 * Проверяет банк вопросов: схему каждого вопроса, уникальность id,
 * соответствие id и темы, и печатает статистику по темам.
 *
 *   npm run questions:validate
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { TopicFileSchema, TopicsFileSchema } from "../src/lib/questions/schema";

const CONTENT_DIR = path.join(process.cwd(), "content");

async function main() {
  const topicsRaw = JSON.parse(await readFile(path.join(CONTENT_DIR, "topics.json"), "utf8"));
  const { topics } = TopicsFileSchema.parse(topicsRaw);

  const errors: string[] = [];
  const seenIds = new Set<string>();
  const rows: { topic: string; count: number; target: number; levels: number }[] = [];

  for (const topic of topics) {
    const file = path.join(CONTENT_DIR, "questions", `${topic.id}.json`);
    let json: unknown;
    try {
      json = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      errors.push(`${topic.id}: не удалось прочитать ${file}: ${(e as Error).message}`);
      continue;
    }

    const result = TopicFileSchema.safeParse(json);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${topic.id}.json → ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }

    const { topic: fileTopic, questions } = result.data;
    if (fileTopic !== topic.id) {
      errors.push(`${topic.id}.json: поле "topic" = "${fileTopic}", ожидалось "${topic.id}"`);
    }
    for (const q of questions) {
      if (!q.id.startsWith(`${topic.id}-`)) {
        errors.push(`${q.id}: id должен начинаться с "${topic.id}-"`);
      }
      if (seenIds.has(q.id)) errors.push(`${q.id}: дублирующийся id`);
      seenIds.add(q.id);
    }

    rows.push({
      topic: topic.id,
      count: questions.length,
      target: topic.target,
      levels: new Set(questions.map((q) => q.level)).size,
    });
  }

  console.table(rows);
  const total = rows.reduce((s, r) => s + r.count, 0);
  const target = topics.reduce((s, t) => s + t.target, 0);
  console.log(`Всего вопросов: ${total} из ${target}`);

  if (errors.length) {
    console.error(`\n❌ Ошибок: ${errors.length}`);
    for (const e of errors) console.error(" - " + e);
    process.exit(1);
  }
  console.log("✅ Банк вопросов валиден");
}

main();
