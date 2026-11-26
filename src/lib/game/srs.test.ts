import { describe, expect, it } from "vitest";
import { nextState, qualityOf, wantsRecall } from "./srs";

const now = new Date("2026-11-26T10:00:00Z");
const days = (iso: string) => Math.round((Date.parse(iso) - now.getTime()) / 86_400_000);

describe("qualityOf", () => {
  it("тесты: верно 4, ошибка 1", () => {
    expect(qualityOf("single_choice", { correct: true })).toBe(4);
    expect(qualityOf("ordering", { correct: false })).toBe(1);
  });
  it("открытый ответ зависит от доли пунктов", () => {
    expect(qualityOf("open_text", { correct: true, score: 1 })).toBe(5);
    expect(qualityOf("open_text", { correct: true, score: 0.75 })).toBe(4);
    expect(qualityOf("open_text", { correct: false, score: 0.5 })).toBe(2);
    expect(qualityOf("open_text", { correct: false, score: 0.2 })).toBe(1);
  });
});

describe("nextState", () => {
  it("правильные ответы подряд: 1 → 3 → ×ease дней", () => {
    const a = nextState(null, 4, now);
    expect(a.intervalDays).toBe(1);
    expect(a.stage).toBe("learning");
    expect(days(a.dueAt)).toBe(1);
    const b = nextState(a, 4, now);
    expect(b.intervalDays).toBe(3);
    expect(b.stage).toBe("review");
    const c = nextState(b, 4, now);
    expect(c.intervalDays).toBe(Math.round(3 * c.ease));
    expect(c.repetitions).toBe(3);
  });

  it("ease при оценке 4 не меняется, при 5 растёт, при ошибке падает, но не ниже 1.3", () => {
    expect(nextState(null, 4, now).ease).toBe(2.5);
    expect(nextState(null, 5, now).ease).toBe(2.6);
    let s = nextState(null, 1, now);
    expect(s.ease).toBeLessThan(2.5);
    for (let i = 0; i < 10; i++) s = nextState(s, 0, now);
    expect(s.ease).toBe(1.3);
  });

  it("ошибка сбрасывает серию и возвращает вопрос на завтра", () => {
    let s = nextState(null, 4, now);
    s = nextState(s, 4, now);
    s = nextState(s, 1, now);
    expect(s.repetitions).toBe(0);
    expect(s.intervalDays).toBe(1);
    expect(s.stage).toBe("learning");
    expect(s.lapses).toBe(1);
    expect(s.correctCount).toBe(2);
    expect(s.wrongCount).toBe(1);
    expect(days(s.dueAt)).toBe(1);
  });

  it("интервал от 21 дня — вопрос выучен", () => {
    let s = nextState(null, 5, now);
    while (s.intervalDays < 21) s = nextState(s, 5, now);
    expect(s.stage).toBe("mastered");
  });

  it("после двух верных подряд вопрос переходит в открытый формат", () => {
    expect(wantsRecall(nextState(null, 4, now))).toBe(false);
    expect(wantsRecall(nextState(nextState(null, 4, now), 4, now))).toBe(true);
  });
});
