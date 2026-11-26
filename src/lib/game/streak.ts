/** Стрик: дни подряд хотя бы с одним ответом. Даты — строки YYYY-MM-DD в часовом поясе пользователя. */

export function dayIn(timeZone: string, date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Время HH:MM в часовом поясе пользователя. */
export function timeIn(timeZone: string, date: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** Дней подряд с хотя бы одним ответом: считаем от сегодня, а если сегодня ещё не занимались — от вчера. */
export function countStreak(days: string[], today: string): number {
  const set = new Set(days);
  const cursor = new Date(`${today}T12:00:00Z`);
  if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

