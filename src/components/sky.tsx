/**
 * Небо с облаками для главной. Только CSS: каждое облако — размытый SVG,
 * который сдвигается transform'ом (композитинг, без перерисовки).
 * При prefers-reduced-motion облака стоят на месте.
 */
const CLOUDS = [
  // top, ширина, длительность прохода (с), задержка (доля прохода), прозрачность
  { top: "6%", width: 420, duration: 260, delay: 0.15, opacity: 0.9 },
  { top: "22%", width: 300, duration: 210, delay: 0.62, opacity: 0.75 },
  { top: "44%", width: 520, duration: 320, delay: 0.4, opacity: 0.7 },
  { top: "12%", width: 240, duration: 190, delay: 0.88, opacity: 0.6 },
  { top: "60%", width: 360, duration: 280, delay: 0.05, opacity: 0.55 },
];

function Cloud({ width }: { width: number }) {
  return (
    <svg width={width} height={width * 0.42} viewBox="0 0 200 84" aria-hidden>
      <defs>
        <filter id="cloud-soft" x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <g fill="#ffffff" filter="url(#cloud-soft)">
        <ellipse cx="60" cy="56" rx="46" ry="20" />
        <ellipse cx="112" cy="50" rx="58" ry="26" />
        <ellipse cx="150" cy="58" rx="38" ry="16" />
        <circle cx="86" cy="38" r="24" />
        <circle cx="122" cy="32" r="22" />
      </g>
    </svg>
  );
}

export function Sky() {
  return (
    <div aria-hidden className="sky pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: c.top,
            opacity: c.opacity,
            animationDuration: `${c.duration}s`,
            animationDelay: `-${Math.round(c.duration * c.delay)}s`,
          }}
        >
          <Cloud width={c.width} />
        </div>
      ))}
    </div>
  );
}
