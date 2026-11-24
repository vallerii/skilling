import { z } from "zod";

/**
 * Форматы, в которых может быть показан вопрос.
 * Один вопрос может поддерживать несколько форматов — движок выбирает
 * формат при показе (сначала «узнавание», потом «воспроизведение»).
 */
export const QUESTION_FORMATS = [
  "single_choice", // один правильный вариант
  "multiple_choice", // несколько правильных вариантов
  "true_false", // верно / неверно для набора утверждений
  "code_output", // «что выведет этот код»
  "ordering", // расставить шаги в правильном порядке
  "open_text", // открытый ответ текстом, проверка чек-листом keyPoints
  "open_voice", // открытый ответ голосом (Web Speech API), проверка чек-листом keyPoints
] as const;

export const FormatSchema = z.enum(QUESTION_FORMATS);
export type QuestionFormat = z.infer<typeof FormatSchema>;

/** Форматы «узнавания» — показываются, пока вопрос ещё не выучен. */
export const RECOGNITION_FORMATS: QuestionFormat[] = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "code_output",
  "ordering",
];

/** Форматы «воспроизведения» — открытый ответ с проверкой по чек-листу. */
export const RECALL_FORMATS: QuestionFormat[] = ["open_text", "open_voice"];

export const DifficultySchema = z.enum(["junior", "middle", "senior"]);

const CodeSchema = z.object({
  lang: z.enum(["js", "ts", "tsx", "jsx", "sql", "bash", "json", "html", "css"]),
  source: z.string().min(1),
});

export const QuestionSchema = z
  .object({
    /** Стабильный id: `<topic>-<номер>`, например `js-core-001`. Никогда не меняется. */
    id: z.string().regex(/^[a-z0-9-]+-\d{3}$/),
    /** Номер уровня внутри темы (1, 2, 3…). */
    level: z.number().int().min(1),
    difficulty: DifficultySchema,
    tags: z.array(z.string()).default([]),

    /** Сам вопрос, как его задали бы на собеседовании. */
    prompt: z.string().min(5),
    /** Фрагмент кода к вопросу (обязателен для code_output). */
    code: CodeSchema.optional(),

    /** Эталонный ответ (markdown) — показывается после ответа. */
    answer: z.string().min(10),
    /** Ключевые пункты для проверки открытых ответов чек-листом. */
    keyPoints: z.array(z.string().min(3)).default([]),
    /** Объяснение, которое показывается при ошибке. */
    explanation: z.string().min(10),

    /** В каких форматах можно показывать вопрос. */
    formats: z.array(FormatSchema).min(1),

    /** Для single_choice / multiple_choice. */
    choices: z
      .object({
        correct: z.array(z.string()).min(1),
        distractors: z.array(z.string()).min(1),
      })
      .optional(),

    /** Для true_false: набор утверждений. */
    statements: z
      .array(z.object({ text: z.string(), isTrue: z.boolean() }))
      .optional(),

    /** Для code_output: точный вывод и правдоподобные неправильные варианты. */
    codeOutput: z
      .object({
        answer: z.string(),
        distractors: z.array(z.string()).min(2),
      })
      .optional(),

    /** Для ordering: элементы в ПРАВИЛЬНОМ порядке (перемешиваются при показе). */
    ordering: z.array(z.string()).min(3).optional(),

    /** Ссылки на источники (MDN, документация). */
    sources: z.array(z.url()).default([]),
  })
  .superRefine((q, ctx) => {
    const need = (cond: unknown, format: QuestionFormat, field: string) => {
      if (q.formats.includes(format) && !cond) {
        ctx.addIssue({
          code: "custom",
          message: `Формат "${format}" требует поле "${field}"`,
          path: [field],
        });
      }
    };
    need(q.choices, "single_choice", "choices");
    need(q.choices, "multiple_choice", "choices");
    need(q.statements?.length, "true_false", "statements");
    need(q.codeOutput && q.code, "code_output", "codeOutput + code");
    need(q.ordering, "ordering", "ordering");

    if (q.formats.includes("single_choice") && q.choices && q.choices.correct.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: 'single_choice: в "choices.correct" должен быть ровно один вариант',
        path: ["choices", "correct"],
      });
    }
    const hasOpen = q.formats.some((f) => RECALL_FORMATS.includes(f));
    if (hasOpen && q.keyPoints.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Открытые форматы требуют минимум 2 keyPoints для чек-листа",
        path: ["keyPoints"],
      });
    }
  });

export type Question = z.infer<typeof QuestionSchema>;

export const TopicFileSchema = z.object({
  topic: z.string(),
  questions: z.array(QuestionSchema),
});
export type TopicFile = z.infer<typeof TopicFileSchema>;

export const TopicSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  description: z.string(),
  /** Сколько вопросов планируем в теме. */
  target: z.number().int().positive(),
  /** Для каких вакансий тема особенно важна. */
  focus: z.string(),
  order: z.number().int(),
});
export type Topic = z.infer<typeof TopicSchema>;

export const TopicsFileSchema = z.object({ topics: z.array(TopicSchema) });
