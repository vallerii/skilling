import { describe, expect, it } from "vitest";
import { handleUpdate, isReminderDue, reminderText, runReminders, type Profile, type Store } from "./bot";

// 2026-11-26 19:30 по Киеву (UTC+2)
const now = new Date("2026-11-26T17:30:00Z");

function fakeStore(profiles: Profile[], opts: { due?: number; days?: string[]; codes?: Record<string, string> } = {}) {
  const calls: string[] = [];
  const store: Store = {
    async findByLinkCode(code) {
      const id = opts.codes?.[code];
      return profiles.find((p) => p.id === id) ?? null;
    },
    async findByChat(chatId) {
      return profiles.find((p) => p.chatId === chatId) ?? null;
    },
    async linkChat(id, chatId) {
      for (const p of profiles) if (p.chatId === chatId) p.chatId = null;
      profiles.find((p) => p.id === id)!.chatId = chatId;
      calls.push(`link ${id} ${chatId}`);
    },
    async setReminders(id, enabled) {
      profiles.find((p) => p.id === id)!.remindersEnabled = enabled;
      calls.push(`reminders ${id} ${enabled}`);
    },
    async markReminded(id, day) {
      profiles.find((p) => p.id === id)!.lastRemindedOn = day;
      calls.push(`marked ${id} ${day}`);
    },
    async reminderCandidates() {
      return profiles.filter((p) => p.chatId && p.remindersEnabled);
    },
    async dueCount() {
      return opts.due ?? 0;
    },
    async activeDays() {
      return opts.days ?? [];
    },
  };
  const sent: { chatId: number; text: string; buttons?: unknown[] }[] = [];
  const send = async (chatId: number, text: string, buttons?: unknown[]) => {
    sent.push({ chatId, text, buttons });
  };
  return { store, send, sent, calls };
}

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: "u1",
  email: "me@example.com",
  timezone: "Europe/Kyiv",
  reminderTime: "19:00:00",
  remindersEnabled: true,
  chatId: null,
  lastRemindedOn: null,
  ...over,
});

const msg = (text: string, chatId = 42) => ({
  update_id: 1,
  message: { message_id: 1, text, chat: { id: chatId, type: "private" }, from: { id: chatId, username: "tester" } },
});

describe("reminderText", () => {
  it("есть что повторить и сегодня не занимались", () => {
    const r = reminderText({ due: 14, streak: 3, activeToday: false })!;
    expect(r.text).toContain("Пора повторить: 14 вопросов");
    expect(r.text).toContain("Серия 3 дня");
    expect(r.path).toBe("/review");
  });
  it("повторять нечего, серия под угрозой", () => {
    expect(reminderText({ due: 0, streak: 5, activeToday: false })!.text).toContain("Серия 5 дней прервётся в полночь");
  });
  it("уже позанимались и повторять нечего — молчим", () => {
    expect(reminderText({ due: 0, streak: 5, activeToday: true })).toBeNull();
  });
  it("1 вопрос, 21 день — правильные окончания", () => {
    const { text } = reminderText({ due: 1, streak: 21, activeToday: false })!;
    expect(text).toContain("Пора повторить: 1 вопрос</b>");
    expect(text).toContain("Серия 21 день");
  });
});

describe("isReminderDue", () => {
  it("после времени из профиля и если сегодня ещё не напоминали", () => {
    expect(isReminderDue(profile(), now)).toBe(true);
    expect(isReminderDue(profile({ reminderTime: "20:00:00" }), now)).toBe(false);
    expect(isReminderDue(profile({ lastRemindedOn: "2026-11-26" }), now)).toBe(false);
  });
});

describe("handleUpdate", () => {
  const site = "http://localhost:3000";

  it("/start с кодом привязывает чат и здоровается", async () => {
    const p = profile();
    const { store, send, sent, calls } = fakeStore([p], { codes: { "abcdefghijklmnopqrstuvwx": "u1" } });
    await handleUpdate(msg("/start abcdefghijklmnopqrstuvwx"), { store, send, site, now });
    expect(calls).toContain("link u1 42");
    expect(sent[0].text).toContain("подключён");
    expect(sent[0].text).toContain("19:00");
  });

  it("неизвестный код — просит взять новую ссылку", async () => {
    const { store, send, sent, calls } = fakeStore([profile()]);
    await handleUpdate(msg("/start wrongcodewrongcode123"), { store, send, site, now });
    expect(calls).toHaveLength(0);
    expect(sent[0].text).toContain("устарела");
  });

  it("незнакомый чат получает инструкцию со ссылкой на настройки", async () => {
    const { store, send, sent } = fakeStore([profile()]);
    await handleUpdate(msg("/review", 7), { store, send, site, now });
    expect(sent[0].text).toContain(`${site}/settings`);
  });

  it("/stop и /start выключают и включают напоминания", async () => {
    const p = profile({ chatId: 42 });
    const { store, send, calls } = fakeStore([p]);
    await handleUpdate(msg("/stop"), { store, send, site, now });
    expect(p.remindersEnabled).toBe(false);
    await handleUpdate(msg("/start"), { store, send, site, now });
    expect(p.remindersEnabled).toBe(true);
    expect(calls).toEqual(["reminders u1 false", "reminders u1 true"]);
  });

  it("/review показывает число вопросов; на localhost — ссылка текстом, без кнопки", async () => {
    const { store, send, sent } = fakeStore([profile({ chatId: 42 })], { due: 30, days: ["2026-11-25"] });
    await handleUpdate(msg("/review"), { store, send, site, now });
    expect(sent[0].text).toContain("20 вопросов"); // не больше дневного лимита
    expect(sent[0].text).toContain("Серия: <b>1 день</b>, сегодня ещё нет");
    expect(sent[0].text).toContain(`${site}/review`);
    expect(sent[0].buttons).toEqual([]);
  });

  it("на https-сайте — кнопка «Повторить»", async () => {
    const { store, send, sent } = fakeStore([profile({ chatId: 42 })], { due: 3 });
    await handleUpdate(msg("/review"), { store, send, site: "https://skilling.vercel.app", now });
    expect(sent[0].buttons).toEqual([{ text: "Повторить", url: "https://skilling.vercel.app/review" }]);
  });

  it("групповые чаты игнорируются", async () => {
    const { store, send, sent } = fakeStore([profile({ chatId: 42 })]);
    await handleUpdate({ update_id: 1, message: { message_id: 1, text: "/review", chat: { id: 42, type: "group" } } }, { store, send, site, now });
    expect(sent).toHaveLength(0);
  });
});

describe("runReminders", () => {
  it("шлёт тем, у кого наступило время, и отмечает день", async () => {
    const a = profile({ id: "a", chatId: 1 });
    const b = profile({ id: "b", chatId: 2, reminderTime: "21:00:00" });
    const c = profile({ id: "c", chatId: 3, lastRemindedOn: "2026-11-26" });
    const { store, send, sent } = fakeStore([a, b, c], { due: 4 });
    const report = await runReminders({ store, send, site: "http://localhost:3000", now });
    expect(sent.map((s) => s.chatId)).toEqual([1]);
    expect(a.lastRemindedOn).toBe("2026-11-26");
    expect(report).toMatchObject({ checked: 3, sent: 1, skipped: 2 });
  });

  it("force — всем, не глядя на время", async () => {
    const { store, send, sent } = fakeStore([profile({ chatId: 1, reminderTime: "23:00:00" })], { due: 1 });
    await runReminders({ store, send, site: "x", now, force: true });
    expect(sent).toHaveLength(1);
  });

  it("если человек заблокировал бота, напоминания выключаются", async () => {
    const p = profile({ chatId: 1 });
    const { store } = fakeStore([p], { due: 2 });
    const blocked = async () => {
      throw Object.assign(new Error("Forbidden"), { code: 403 });
    };
    const report = await runReminders({ store, send: blocked, site: "x", now });
    expect(report.disabled).toBe(1);
    expect(p.remindersEnabled).toBe(false);
  });
});
