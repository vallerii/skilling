import { describe, expect, it } from "vitest";
import { TopicFileSchema, type Question } from "@/lib/questions/schema";
import jsCore from "../../../content/questions/js-core.json";
import product from "../../../content/questions/product-thinking.json";
import {
  buildSession,
  createRng,
  gradeAnswer,
  isAnswerComplete,
  pickFormat,
  prepareItem,
  summarize,
} from "./session";

const js = TopicFileSchema.parse(jsCore).questions;
const pt = TopicFileSchema.parse(product).questions;
const byId = (id: string): Question => [...js, ...pt].find((q) => q.id === id)!;

describe("pickFormat", () => {
  it("в режиме practice выбирает формат узнавания, если он есть", () => {
    const rng = createRng(1);
    for (const q of js) expect(["open_text", "open_voice"]).not.toContain(pickFormat(q, "practice", rng));
  });

  it("в режиме recall выбирает открытый текстовый ответ", () => {
    expect(pickFormat(byId("js-core-001"), "recall", createRng(1))).toBe("open_text");
  });

  it("без тестовых форматов возвращает open_text и в режиме practice", () => {
    const openOnly = { ...byId("js-core-001"), formats: ["open_text", "open_voice"] } as Question;
    expect(pickFormat(openOnly, "practice", createRng(1))).toBe("open_text");
  });
});

describe("prepareItem", () => {
  it("single_choice: ровно один правильный вариант и не больше 4 вариантов", () => {
    const item = prepareItem(byId("js-core-001"), "single_choice", createRng(3));
    expect(item.options!.length).toBeLessThanOrEqual(4);
    expect(item.options!.filter((o) => byId("js-core-001").choices!.correct.includes(o))).toHaveLength(1);
  });

  it("ordering: перемешанный порядок не совпадает с правильным", () => {
    const q = byId("js-core-003");
    for (let seed = 0; seed < 50; seed++) {
      const item = prepareItem(q, "ordering", createRng(seed));
      expect(item.shuffledOrder).not.toEqual(q.ordering);
      expect([...item.shuffledOrder!].sort()).toEqual([...q.ordering!].sort());
    }
  });

  it("code_output: среди вариантов есть правильный ответ", () => {
    const item = prepareItem(byId("js-core-002"), "code_output", createRng(5));
    expect(item.options).toContain("1 4 3 2");
  });
});

describe("gradeAnswer", () => {
  it("single_choice", () => {
    const q = byId("js-core-001");
    const item = prepareItem(q, "single_choice", createRng(1));
    expect(gradeAnswer(item, { kind: "choice", selected: q.choices!.correct[0] }).correct).toBe(true);
    expect(gradeAnswer(item, { kind: "choice", selected: q.choices!.distractors[0] }).correct).toBe(false);
  });

  it("multiple_choice засчитывается только при полном совпадении", () => {
    const q = byId("js-core-005");
    const item = prepareItem(q, "multiple_choice", createRng(1));
    const correct = q.choices!.correct;
    expect(gradeAnswer(item, { kind: "multi", selected: [...correct].reverse() }).correct).toBe(true);
    expect(gradeAnswer(item, { kind: "multi", selected: correct.slice(1) }).correct).toBe(false);
    expect(gradeAnswer(item, { kind: "multi", selected: [...correct, q.choices!.distractors[0]] }).correct).toBe(false);
  });

  it("true_false требует верного ответа на все утверждения", () => {
    const q = byId("js-core-004");
    const item = prepareItem(q, "true_false", createRng(1));
    const right = q.statements!.map((s) => s.isTrue);
    expect(gradeAnswer(item, { kind: "true_false", verdicts: right }).correct).toBe(true);
    expect(gradeAnswer(item, { kind: "true_false", verdicts: [!right[0], ...right.slice(1)] }).correct).toBe(false);
  });

  it("ordering засчитывается только в точном порядке", () => {
    const q = byId("js-core-003");
    const item = prepareItem(q, "ordering", createRng(1));
    expect(gradeAnswer(item, { kind: "ordering", order: q.ordering! }).correct).toBe(true);
    expect(gradeAnswer(item, { kind: "ordering", order: [...q.ordering!].reverse() }).correct).toBe(false);
  });

  it("open_text: порог 70% отмеченных пунктов", () => {
    const q = byId("js-core-004"); // 4 ключевых пункта
    const item = prepareItem(q, "open_text", createRng(1));
    const g3 = gradeAnswer(item, { kind: "open", text: "ответ", checked: [0, 1, 2] });
    expect(g3).toEqual({ correct: true, score: 0.75 });
    const g2 = gradeAnswer(item, { kind: "open", text: "ответ", checked: [0, 1] });
    expect(g2).toEqual({ correct: false, score: 0.5 });
  });
});

describe("isAnswerComplete", () => {
  it("true_false готов, только когда отвечены все утверждения", () => {
    const item = prepareItem(byId("js-core-004"), "true_false", createRng(1));
    expect(isAnswerComplete(item, { kind: "true_false", verdicts: [true, null, true, false] })).toBe(false);
    expect(isAnswerComplete(item, { kind: "true_false", verdicts: [true, false, true, false] })).toBe(true);
  });
});

describe("buildSession и summarize", () => {
  it("сессия уровня содержит все вопросы уровня", () => {
    const level1 = js.filter((q) => q.level === 1);
    const session = buildSession(level1, { rng: createRng(42) });
    expect(session.map((i) => i.question.id).sort()).toEqual(level1.map((q) => q.id).sort());
  });

  it("продуктовые вопросы без тестов показываются открытым ответом", () => {
    const openOnly = pt.filter((q) => !q.formats.some((f) => f !== "open_text" && f !== "open_voice"));
    for (const item of buildSession(openOnly, { rng: createRng(7) })) expect(item.format).toBe("open_text");
  });

  it("уровень пройден при 70% и выше", () => {
    const g = (c: boolean) => ({ correct: c });
    expect(summarize([g(true), g(true), g(true), g(true), g(true), g(false), g(false)]).passed).toBe(true); // 5/7 ≈ 71%
    expect(summarize([g(true), g(true), g(true), g(true), g(false), g(false), g(false)]).passed).toBe(false); // 4/7 ≈ 57%
  });
});

describe("buildSession: повторения и перенос ошибок", async () => {
  const { buildSession: build, createRng: rng } = await import("./session");
  const { loadTopicQuestions } = await import("@/lib/questions/load");
  const all = await loadTopicQuestions("js-core");
  const level2 = all.filter((q) => q.level === 2);
  const errors = all.filter((q) => q.level === 1).slice(0, 2);

  it("ошибки прошлого уровня идут в конце и помечены", () => {
    const items = build(level2, { rng: rng(1), carried: errors });
    expect(items).toHaveLength(level2.length + 2);
    expect(items.slice(0, level2.length).every((i) => !i.carried)).toBe(true);
    expect(items.slice(level2.length).every((i) => i.carried)).toBe(true);
  });

  it("вопрос уровня не дублируется, если он же среди ошибок", () => {
    const items = build(level2, { rng: rng(2), carried: [level2[0]] });
    expect(items).toHaveLength(level2.length);
  });

  it("знакомые вопросы спрашиваются открытым ответом", () => {
    const recall = level2.find((q) => q.formats.includes("open_text"))!;
    const items = build(level2, { rng: rng(3), recallIds: new Set([recall.id]) });
    expect(items.find((i) => i.question.id === recall.id)!.format).toBe("open_text");
  });
});
