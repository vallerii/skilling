/**
 * Загружает банк вопросов из content/ в Supabase (таблицы topics и questions).
 * Upsert по id: новые вопросы добавляются, изменённые обновляются,
 * удалённые из content/ — помечаются is_active = false (история ответов сохраняется).
 *
 *   npm run questions:seed
 *
 * Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SECRET_KEY в .env.
 * Секретный ключ обходит RLS — используйте его только в серверных скриптах.
 */
import { createClient } from "@supabase/supabase-js";
import { loadQuestionBank } from "../src/lib/questions/load";

try {
  process.loadEnvFile(".env");
} catch {
  // .env может отсутствовать, если переменные заданы в окружении
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "❌ Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SECRET_KEY в .env.\n" +
      `   Сейчас: URL ${url ? "есть" : "нет"}, секретный ключ ${secretKey ? "есть" : "нет"}.\n` +
      "   Секретный ключ: Supabase → Project Settings → API Keys → Secret keys.",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, { auth: { persistSession: false } });
const BATCH = 100;

async function main() {
  const bank = await loadQuestionBank();
  const now = new Date().toISOString();

  const topics = bank.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    target: t.target,
    sort_order: t.order,
    updated_at: now,
  }));
  const { error: topicsError } = await supabase.from("topics").upsert(topics);
  if (topicsError) throw topicsError;

  const questions = bank.flatMap((t) =>
    t.questions.map((q) => ({
      id: q.id,
      topic_id: t.id,
      level: q.level,
      difficulty: q.difficulty,
      formats: q.formats,
      data: q,
      is_active: true,
      updated_at: now,
    })),
  );

  for (let i = 0; i < questions.length; i += BATCH) {
    const { error } = await supabase.from("questions").upsert(questions.slice(i, i + BATCH));
    if (error) throw error;
  }

  // Вопросы, которых больше нет в content/, выключаем, а не удаляем
  const ids = new Set(questions.map((q) => q.id));
  const { data: existing, error: listError } = await supabase.from("questions").select("id");
  if (listError) throw listError;
  const removed = (existing ?? []).map((r) => r.id as string).filter((id) => !ids.has(id));
  if (removed.length) {
    const { error } = await supabase
      .from("questions")
      .update({ is_active: false, updated_at: now })
      .in("id", removed);
    if (error) throw error;
  }

  console.log(
    `✅ Тем: ${topics.length}, вопросов: ${questions.length}` +
      (removed.length ? `, выключено удалённых: ${removed.length}` : ""),
  );
}

main().catch((error) => {
  console.error("❌ Ошибка загрузки:", error.message ?? error);
  process.exit(1);
});
