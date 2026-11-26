"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconCheck, IconClose } from "./ui";

/** Сообщения по параметру `?notice=` — после входа, регистрации, выхода и смены пароля. */
const NOTICES: { [key: string]: string } = {
  signin: "Вы вошли. С возвращением!",
  signup: "Аккаунт создан. Добро пожаловать в Skilling!",
  signout: "Вы вышли из аккаунта",
  password: "Пароль изменён, вы в аккаунте",
};

export function Toast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get("notice");
  const [text, setText] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Новый параметр в адресе — показываем сообщение (обновление состояния во время рендера, без эффекта)
  if (key !== lastKey) {
    setLastKey(key);
    if (key && NOTICES[key]) setText(NOTICES[key]);
  }

  // Убираем параметр из адреса, чтобы при обновлении страницы сообщение не появлялось снова
  useEffect(() => {
    if (!key) return;
    const rest = new URLSearchParams(params);
    rest.delete("notice");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [key, params, pathname, router]);

  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(() => setText(null), 4500);
    return () => clearTimeout(timer);
  }, [text]);

  if (!text) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      <div
        role="status"
        className="toast pointer-events-auto flex min-h-12 items-center gap-3 rounded-full bg-deep py-2 pr-2 pl-5 text-base text-white"
      >
        <IconCheck width={20} height={20} strokeWidth={2.25} className="text-[#7fd1c4]" />
        {text}
        <button
          type="button"
          onClick={() => setText(null)}
          aria-label="Закрыть"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        >
          <IconClose width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
