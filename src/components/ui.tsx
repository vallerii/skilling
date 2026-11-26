import Link from "next/link";
import type { SVGProps } from "react";

/** Кнопки: плоские, полностью скруглённые. Главное действие — почти чёрное. */
export const btnPrimary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-[#3a3b37] active:bg-black disabled:cursor-not-allowed disabled:bg-active disabled:text-muted";
export const btnSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-control bg-raised px-6 text-base font-medium text-ink transition-colors hover:bg-surface";
export const btnSmall =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-control px-4 text-sm font-medium text-ink transition-colors hover:bg-surface";

/** Знак продукта: три ступени — уровни, по которым поднимаешься к собеседованию. */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <rect width="24" height="24" rx="7" fill="var(--accent)" />
      <rect x="5" y="14" width="3.5" height="5" rx="1" fill="#fff" />
      <rect x="10.25" y="10" width="3.5" height="9" rx="1" fill="#fff" />
      <rect x="15.5" y="5" width="3.5" height="14" rx="1" fill="#fff" />
    </svg>
  );
}

/**
 * Вордмарк: «skilling», где «ill» нарисованы тремя ступенями — уровнями,
 * по которым поднимаешься к собеседованию. Ступени стоят на базовой линии текста.
 */
export function Wordmark({ size = 22 }: { size?: number }) {
  const step = (h: number) => (
    <span
      aria-hidden
      className="inline-block rounded-[0.05em] bg-accent"
      style={{ width: "0.16em", height: `${h}em`, marginInline: "0.04em" }}
    />
  );
  return (
    <span
      role="img"
      aria-label="Skilling"
      className="inline-flex items-baseline font-semibold tracking-[-0.02em] text-ink"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      <span aria-hidden>sk</span>
      <span aria-hidden className="inline-flex items-end px-[0.03em]" style={{ height: "0.76em" }}>
        {step(0.4)}
        {step(0.58)}
        {step(0.76)}
      </span>
      <span aria-hidden>ing</span>
    </span>
  );
}

/** Тот же вордмарк, но в размере родителя и цвете текста — для подвала. */
export function WordmarkInline() {
  const step = (h: number) => (
    <span
      className="inline-block rounded-[0.04em] bg-current"
      style={{ width: "0.16em", height: `${h}em`, marginInline: "0.04em" }}
    />
  );
  return (
    <span className="inline-flex items-baseline leading-none font-semibold tracking-[-0.045em]">
      <span>sk</span>
      <span className="inline-flex items-end px-[0.03em] text-[#5fb3a8]" style={{ height: "0.76em" }}>
        {step(0.4)}
        {step(0.58)}
        {step(0.76)}
      </span>
      <span>ing</span>
    </span>
  );
}

export function Brand({ size }: { size?: number }) {
  return (
    <Link href="/" aria-label="Skilling — на главную" className="inline-flex items-center rounded-lg py-2">
      <Wordmark size={size} />
    </Link>
  );
}

type IconProps = SVGProps<SVGSVGElement>;
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconClose = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconCheck = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconLock = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);
export const IconUp = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const IconDown = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);
export const IconArrow = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export { plural } from "@/lib/plural";
