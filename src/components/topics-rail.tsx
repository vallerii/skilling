"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Лента тем. На десктопе (и если движение не отключено) вертикальная прокрутка
 * страницы двигает ленту вбок: секция «прилипает», а карточки едут влево.
 * На телефоне — обычная горизонтальная лента со снапом под палец.
 */
export function TopicsRail({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const query = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    let distance = 0;
    let frame = 0;
    // Лента прилипает под закреплённым хедером: отступ сверху = высота хедера
    const stickyTop = () => parseFloat(getComputedStyle(stickyRef.current!).top) || 0;

    const apply = () => {
      frame = 0;
      const pinned = stickyTop() - section.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, pinned / Math.max(distance, 1)));
      track.style.transform = `translate3d(${-progress * distance}px,0,0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const measure = () => {
      if (!query.matches) {
        section.style.height = "";
        track.style.transform = "";
        section.dataset.pinned = "false";
        return;
      }
      section.dataset.pinned = "true";
      const viewport = track.parentElement!.clientWidth;
      distance = Math.max(0, track.scrollWidth - viewport);
      section.style.height = `${stickyRef.current!.offsetHeight + distance}px`;
      apply();
    };
    // Фокус с клавиатуры на карточке за краем — докручиваем страницу до неё
    const onFocus = (e: FocusEvent) => {
      if (!query.matches) return;
      const card = (e.target as HTMLElement).closest("li[data-card]") as HTMLElement | null;
      if (!card) return;
      const viewport = track.parentElement!.clientWidth;
      const want = Math.min(distance, Math.max(0, card.offsetLeft + card.offsetWidth - viewport + 48));
      const current = stickyTop() - section.getBoundingClientRect().top;
      if (Math.abs(current - want) > 8 && (card.offsetLeft - current < 0 || card.offsetLeft + card.offsetWidth - current > viewport)) {
        window.scrollTo({ top: window.scrollY + (want - current), behavior: "instant" });
      }
    };

    measure();
    // Ширина ленты может измениться после загрузки стилей/шрифтов или стриминга —
    // пересчитываем по факту, а не один раз при монтировании
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(document.documentElement);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    query.addEventListener("change", measure);
    track.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      query.removeEventListener("change", measure);
      track.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="topics" className="relative">
      <div
        ref={stickyRef}
        className="md:sticky md:top-16 md:flex md:h-[calc(100dvh-4rem)] md:flex-col md:justify-start md:overflow-hidden md:pt-[6vh] md:[@media(max-height:800px)]:pt-6"
      >
        <div className="mx-auto w-full max-w-[1132px] px-4">{heading}</div>
        <div className="rail-scroll mt-5 overflow-x-auto overscroll-x-contain md:overflow-visible">
          <ul
            ref={trackRef}
            className="flex w-max snap-x snap-mandatory gap-4 px-4 pb-2 will-change-transform md:snap-none md:gap-5 md:px-[max(1rem,calc((100vw-1100px)/2))]"
          >
            {children}
          </ul>
        </div>
      </div>
    </section>
  );
}
