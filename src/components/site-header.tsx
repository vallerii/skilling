"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Закреплённый хедер. Поверх неба он прозрачный, а как только страница
 * прокручена — получает фон и тонкую линию снизу, чтобы текст под ним не мешал.
 */
export function SiteHeader({ children, width = "max-w-[1132px]" }: { children: ReactNode; width?: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 ${
        scrolled ? "border-b border-rule bg-ground/95" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className={`mx-auto flex h-16 w-full ${width} items-center justify-between gap-4 px-4`}>{children}</div>
    </header>
  );
}
