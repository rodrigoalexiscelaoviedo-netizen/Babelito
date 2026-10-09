/**
 * Gráficos SVG propios. Reemplazan a recharts (~106 kB gzip) porque la app solo
 * necesita dos formas simples: área de actividad y barras horizontales.
 */

interface AreaChartProps {
  data: { day: string; sessions: number }[];
  height?: number;
}

/** Área de sesiones por día. Responsive por viewBox, sin medir el DOM. */
export function ActivityArea({ data, height = 160 }: AreaChartProps) {
  const W = 600;
  const H = height;
  const padX = 8;
  const padTop = 10;
  const padBottom = 22;
  const max = Math.max(1, ...data.map((d) => d.sessions));
  const step = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0;
  const yFor = (v: number) => padTop + (H - padTop - padBottom) * (1 - v / max);

  const points = data.map((d, i) => [padX + i * step, yFor(d.sessions)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = points.length
    ? `${line} L${points[points.length - 1][0].toFixed(1)},${H - padBottom} L${points[0][0].toFixed(1)},${H - padBottom} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Sessions per day" preserveAspectRatio="none">
      <defs>
        <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B5E" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#FF6B5E" stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={padX} x2={W - padX} y1={H - padBottom} y2={H - padBottom} stroke="#222C44" strokeWidth={1} />
      {area && <path d={area} fill="url(#activity-fill)" />}
      {area && <path d={line} fill="none" stroke="#FF6B5E" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
      {points.map(([x, y], i) => (
        <circle key={data[i].day} cx={x} cy={y} r={3} fill="#FF6B5E">
          <title>{`${data[i].day}: ${data[i].sessions}`}</title>
        </circle>
      ))}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={`l-${d.day}`} x={padX + i * step} y={H - 6} fill="#5A6379" fontSize={11} textAnchor="middle">
            {d.day}
          </text>
        ) : null
      )}
    </svg>
  );
}

interface HBarsProps {
  data: { label: string; count: number }[];
  color?: string;
}

/** Barras horizontales (errores más frecuentes). */
export function HorizontalBars({ data, color = "#36C5A8" }: HBarsProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="space-y-2.5" aria-label="Top errors">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-xs text-paper-muted truncate" title={d.label}>{d.label}</span>
          <div className="flex-1 h-4 rounded-md bg-ink-700 overflow-hidden">
            <div
              className="h-full rounded-md transition-[width] duration-700"
              style={{ width: `${(d.count / max) * 100}%`, background: color }}
            />
          </div>
          <span className="w-6 text-right text-xs font-mono text-paper-muted">{d.count}</span>
        </li>
      ))}
    </ul>
  );
}
