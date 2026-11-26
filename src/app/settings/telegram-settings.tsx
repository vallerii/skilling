"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { btnPrimary, btnSecondary, btnSmall, IconArrow, IconCheck } from "@/components/ui";
import { createTelegramLink, disconnectTelegram, saveReminderSettings } from "./actions";

const TIMEZONES = [
  ["Europe/Kyiv", "Киев"],
  ["Europe/Warsaw", "Варшава"],
  ["Europe/Berlin", "Берлин"],
  ["Europe/Lisbon", "Лиссабон"],
  ["Europe/London", "Лондон"],
  ["Asia/Tbilisi", "Тбилиси"],
  ["Asia/Dubai", "Дубай"],
  ["America/New_York", "Нью-Йорк"],
] as const;

type Props = {
  email: string;
  connected: boolean;
  username: string | null;
  enabled: boolean;
  timezone: string;
  reminderTime: string;
  botUsername: string | null;
};

export function TelegramSettings({ email, connected, username, enabled, timezone, reminderTime, botUsername }: Props) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [on, setOn] = useState(enabled);
  const [tz, setTz] = useState(timezone);
  const [saved, setSaved] = useState(false);

  // Пока ссылка открыта, раз в 3 секунды проверяем, нажали ли Start в боте
  useEffect(() => {
    if (!link || connected) return;
    const timer = setInterval(() => router.refresh(), 3000);
    const stop = setTimeout(() => clearInterval(timer), 15 * 60_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [link, connected, router]);

  const save = (next: { enabled: boolean; timezone: string }) =>
    start(async () => {
      const result = await saveReminderSettings(next);
      setSaved(result.saved);
    });

  return (
    <section aria-labelledby="tg" className="mt-8 rounded-[28px] bg-raised p-6 md:p-8">
      <h2 id="tg" className="text-xl leading-7 font-medium">
        Напоминания в Telegram
      </h2>

      {!connected ? (
        <>
          <p className="mt-2 text-base leading-6 text-muted">
            Раз в день, около {reminderTime}, бот{botUsername ? ` @${botUsername}` : ""} напишет, сколько вопросов ждут
            повторения, или что серия прервётся в полночь. Если вы уже позанимались и повторять нечего — промолчит.
          </p>

          {!link ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const result = await createTelegramLink();
                  if (result.url) setLink(result.url);
                  else setError(result.error ?? "Что-то пошло не так");
                })
              }
              className={`${btnPrimary} mt-6`}
            >
              {pending ? "Готовим ссылку…" : "Подключить Telegram"}
            </button>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              <ol className="flex flex-col gap-2 text-base leading-6">
                <li>1. Откройте бота по кнопке ниже.</li>
                <li>2. Нажмите «Start» в чате — аккаунт {email} подключится сам.</li>
              </ol>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href={link} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                  Открыть @{botUsername}
                  <IconArrow width={18} height={18} />
                </a>
                <button type="button" onClick={() => router.refresh()} className={btnSecondary}>
                  Проверить подключение
                </button>
              </div>
              <p className="text-sm text-muted" aria-live="polite">
                Ждём, пока вы нажмёте Start. Ссылка одноразовая и действует 15 минут.
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-negative-tint px-4 py-3 text-sm text-[#7a1d14]">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          <p className="flex items-center gap-2 text-base">
            <IconCheck width={20} height={20} strokeWidth={2.25} className="text-accent" />
            Подключено{username ? <span className="text-muted">· @{username}</span> : null}
          </p>

          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface px-4">
            <span className="text-base">Ежедневные напоминания</span>
            <input
              type="checkbox"
              role="switch"
              checked={on}
              onChange={(e) => {
                setOn(e.target.checked);
                save({ enabled: e.target.checked, timezone: tz });
              }}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-7 w-12 shrink-0 rounded-full bg-control transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Часовой пояс</span>
            <select
              value={tz}
              onChange={(e) => {
                setTz(e.target.value);
                save({ enabled: on, timezone: e.target.value });
              }}
              className="min-h-12 rounded-xl border border-control bg-raised px-4 text-base"
            >
              {TIMEZONES.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
              {!TIMEZONES.some(([id]) => id === tz) && <option value={tz}>{tz}</option>}
            </select>
            <span className="text-sm text-muted">
              Напоминание — около {reminderTime} по этому времени. По нему же считается, засчитан ли день в серии.
            </span>
          </label>

          <p className="text-sm text-muted" aria-live="polite">
            {pending ? "Сохраняем…" : saved ? "Сохранено" : " "}
          </p>

          <form action={disconnectTelegram}>
            <button type="submit" className={btnSmall}>
              Отключить Telegram
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
