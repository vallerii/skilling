import { GAME } from "@/lib/game/config";
import { countStreak, dayIn, timeIn } from "@/lib/game/streak";
import { plural } from "@/lib/plural";
import { canUseUrlButtons, escapeHtml, type InlineButton, type TelegramUpdate } from "./api";

/**
 * Логика бота без привязки к Supabase и сети: хранилище и отправка передаются снаружи.
 * Так её можно проверить тестами, а в проде подставить Supabase и Telegram API.
 */

export type Profile = {
  id: string;
  email: string | null;
  timezone: string;
  reminderTime: string; // HH:MM или HH:MM:SS
  remindersEnabled: boolean;
  chatId: number | null;
  lastRemindedOn: string | null;
};

export type Store = {
  /** Профиль по действующему коду привязки (не просроченному). */
  findByLinkCode(code: string, now: Date): Promise<Profile | null>;
  findByChat(chatId: number): Promise<Profile | null>;
  /** Привязать чат к профилю; если чат был привязан к другому аккаунту — отвязать там. */
  linkChat(profileId: string, chatId: number, username: string | null): Promise<void>;
  setReminders(profileId: string, enabled: boolean): Promise<void>;
  markReminded(profileId: string, day: string): Promise<void>;
  /** Все профили с привязанным Telegram и включёнными напоминаниями. */
  reminderCandidates(): Promise<Profile[]>;
  /** Вопросы, у которых наступил срок повторения. */
  dueCount(profileId: string, now: Date): Promise<number>;
  /** Дни с ответами (YYYY-MM-DD), последние сначала. */
  activeDays(profileId: string): Promise<string[]>;
};

export type Send = (chatId: number, text: string, buttons?: InlineButton[]) => Promise<unknown>;

export type Stats = { due: number; streak: number; activeToday: boolean };

export async function statsFor(store: Store, profile: Profile, now: Date): Promise<Stats> {
  const [due, days] = await Promise.all([store.dueCount(profile.id, now), store.activeDays(profile.id)]);
  const today = dayIn(profile.timezone, now);
  return {
    due: Math.min(due, GAME.dailyReviewLimit),
    streak: countStreak(days, today),
    activeToday: days.includes(today),
  };
}

const days = (n: number) => `${n} ${plural(n, ["день", "дня", "дней"])}`;
const questions = (n: number) => `${n} ${plural(n, ["вопрос", "вопроса", "вопросов"])}`;

/**
 * Текст ежедневного напоминания. `null` — напоминать незачем:
 * сегодня уже занимались и повторять нечего.
 */
export function reminderText(s: Stats): { text: string; path: string } | null {
  if (s.due > 0 && !s.activeToday) {
    const tail =
      s.streak > 0 ? `Серия ${days(s.streak)} — сегодня ещё без техчека.` : "Пара минут сейчас — и вопросы не забудутся.";
    return { text: `<b>Пора повторить: ${questions(s.due)}</b>\n${tail}`, path: "/review" };
  }
  if (s.due > 0) {
    return { text: `<b>Ещё ${questions(s.due)} ждут повторения</b>\nСегодня вы уже занимались — это бонус к памяти.`, path: "/review" };
  }
  if (!s.activeToday && s.streak > 0) {
    return { text: `<b>Серия ${days(s.streak)} прервётся в полночь</b>\nОдин уровень — минут пять.`, path: "/" };
  }
  if (!s.activeToday) {
    return { text: "<b>Один техчек в день</b>\nПять минут — и собеседование пугает чуть меньше.", path: "/" };
  }
  return null;
}

function statusText(s: Stats) {
  const lines = [
    s.due > 0 ? `К повторению: <b>${questions(s.due)}</b>` : "К повторению: ничего, всё в своём сроке",
    s.streak > 0 ? `Серия: <b>${days(s.streak)}</b>${s.activeToday ? ", сегодня засчитан" : ", сегодня ещё нет"}` : "Серии пока нет",
  ];
  return lines.join("\n");
}

function linkButtons(site: string, path: string, label: string): { buttons: InlineButton[]; suffix: string } {
  const url = `${site}${path}`;
  return canUseUrlButtons(site) ? { buttons: [{ text: label, url }], suffix: "" } : { buttons: [], suffix: `\n${url}` };
}

const HELP =
  "/review — что повторить сейчас\n/stop — выключить напоминания\n/start — включить снова";

/** Обработать одно обновление от Telegram (сообщение в личке с ботом). */
export async function handleUpdate(update: TelegramUpdate, deps: { store: Store; send: Send; site: string; now?: Date }) {
  const message = update.message;
  if (!message?.text || message.chat.type !== "private") return;
  const { store, send, site } = deps;
  const now = deps.now ?? new Date();
  const chatId = message.chat.id;
  const [command, payload] = message.text.trim().split(/\s+/, 2);
  const cmd = command.toLowerCase().replace(/@\w+$/, "");

  if (cmd === "/start" && payload) {
    const profile = await store.findByLinkCode(payload, now);
    if (!profile) {
      await send(
        chatId,
        `Ссылка устарела или уже использована. Откройте настройки на сайте и нажмите «Подключить Telegram» ещё раз.\n${site}/settings`,
      );
      return;
    }
    await store.linkChat(profile.id, chatId, message.from?.username ?? null);
    const time = profile.reminderTime.slice(0, 5);
    await send(
      chatId,
      `Готово, аккаунт ${profile.email ? `<b>${escapeHtml(profile.email)}</b> ` : ""}подключён.\n\n` +
        `Каждый день в ${time} напомню, если есть что повторить или серия под угрозой. ` +
        `Если вы уже позанимались и повторять нечего — промолчу.\n\n${HELP}`,
    );
    return;
  }

  const profile = await store.findByChat(chatId);
  if (!profile) {
    await send(
      chatId,
      `Привет! Это бот Skilling — напоминает повторять вопросы к собеседованию.\n\n` +
        `Чтобы подключить аккаунт, откройте настройки на сайте и нажмите «Подключить Telegram»:\n${site}/settings`,
    );
    return;
  }

  if (cmd === "/stop") {
    await store.setReminders(profile.id, false);
    await send(chatId, "Напоминания выключены. Включить снова — /start");
    return;
  }

  if (cmd === "/start") {
    await store.setReminders(profile.id, true);
    await send(chatId, `Напоминания включены, каждый день в ${profile.reminderTime.slice(0, 5)}.\n\n${HELP}`);
    return;
  }

  if (cmd === "/review" || cmd === "/status") {
    const s = await statsFor(store, profile, now);
    const { buttons, suffix } = s.due > 0 ? linkButtons(site, "/review", "Повторить") : linkButtons(site, "/", "Открыть Skilling");
    await send(chatId, statusText(s) + suffix, buttons);
    return;
  }

  await send(chatId, HELP);
}

/** Пора ли напоминать: наступило время из профиля и сегодня ещё не напоминали. */
export function isReminderDue(profile: Profile, now: Date) {
  const today = dayIn(profile.timezone, now);
  if (profile.lastRemindedOn === today) return false;
  return timeIn(profile.timezone, now) >= profile.reminderTime.slice(0, 5);
}

export type ReminderReport = { checked: number; sent: number; skipped: number; disabled: number; failed: number };

/**
 * Разослать напоминания. Вызывается cron'ом (раз в день на бесплатном Vercel или чаще).
 * `force` — не смотреть на время и «уже напоминали сегодня» (для ручной проверки).
 */
export async function runReminders(deps: { store: Store; send: Send; site: string; now?: Date; force?: boolean }) {
  const { store, send, site, force = false } = deps;
  const now = deps.now ?? new Date();
  const report: ReminderReport = { checked: 0, sent: 0, skipped: 0, disabled: 0, failed: 0 };

  for (const profile of await store.reminderCandidates()) {
    report.checked++;
    if (!profile.chatId || (!force && !isReminderDue(profile, now))) {
      report.skipped++;
      continue;
    }
    const reminder = reminderText(await statsFor(store, profile, now));
    if (reminder) {
      const { buttons, suffix } = linkButtons(site, reminder.path, reminder.path === "/review" ? "Повторить" : "Открыть Skilling");
      try {
        await send(profile.chatId, reminder.text + suffix, buttons);
        report.sent++;
      } catch (error) {
        // 403 — человек заблокировал бота: больше не пишем
        if ((error as { code?: number }).code === 403) {
          await store.setReminders(profile.id, false);
          report.disabled++;
        } else {
          report.failed++;
          console.error("reminder", profile.id, error);
        }
        continue;
      }
    } else {
      report.skipped++;
    }
    await store.markReminded(profile.id, dayIn(profile.timezone, now));
  }
  return report;
}
