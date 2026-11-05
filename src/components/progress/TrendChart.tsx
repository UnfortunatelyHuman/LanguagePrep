import type { TrendPoint } from "@/lib/progress";

/** Fixed level axis so the four small multiples compare at a glance. */
const Y_MIN = 3;
const Y_MAX = 12;
const GRID = [4, 6, 8, 10, 12];

const W = 320;
const H = 150;
const M = { top: 10, right: 44, bottom: 22, left: 26 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const y = (level: number) =>
  M.top + PLOT_H * (1 - (Math.min(Y_MAX, Math.max(Y_MIN, level)) - Y_MIN) / (Y_MAX - Y_MIN));

const shortDate = (d: Date) => d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });

/**
 * One skill's estimated level over its attempts: a 2px line with 8px markers,
 * a dashed target reference, recessive grid. Points are evenly spaced by
 * attempt (practice is irregular, so a time axis would bunch them up).
 * Hovering a point shows its date and level via the native SVG tooltip.
 */
export function TrendChart({
  points,
  target,
  scale,
  title,
}: {
  points: TrendPoint[];
  target: number;
  scale: string;
  title: string;
}) {
  const x = (i: number) =>
    points.length === 1 ? M.left + PLOT_W / 2 : M.left + (PLOT_W * i) / (points.length - 1);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.level).toFixed(1)}`).join("");
  const ty = y(target);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${title}: ${points.length} attempts, latest ${points.at(-1)?.label ?? "none"}, target ${scale} ${target}`}
      className="h-auto w-full overflow-visible"
    >
      {GRID.map((g) => (
        <g key={g}>
          <line x1={M.left} x2={W - M.right} y1={y(g)} y2={y(g)} className="stroke-border" strokeWidth={1} />
          <text x={M.left - 6} y={y(g)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px]">
            {g}
          </text>
        </g>
      ))}

      <line
        x1={M.left}
        x2={W - M.right}
        y1={ty}
        y2={ty}
        className="stroke-foreground"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.55}
      />
      {/* In the right margin, so it never sits on top of a point at the target. */}
      <text x={W - M.right + 6} y={ty} dy="0.32em" className="fill-muted text-[10px]">
        target
      </text>

      {points.length > 1 ? (
        <path d={path} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ) : null}

      {points.map((p, i) => (
        <g key={p.id}>
          <circle cx={x(i)} cy={y(p.level)} r={4} className="fill-accent stroke-surface" strokeWidth={2} />
          {/* Larger invisible hit area carrying the tooltip. */}
          <circle cx={x(i)} cy={y(p.level)} r={11} fill="transparent">
            <title>{`${shortDate(p.date)} · ${p.label}`}</title>
          </circle>
        </g>
      ))}

      {points.length ? (
        <>
          <text x={x(0)} y={H - 6} textAnchor={points.length === 1 ? "middle" : "start"} className="fill-muted text-[10px]">
            {shortDate(points[0].date)}
          </text>
          {points.length > 1 ? (
            <text x={x(points.length - 1)} y={H - 6} textAnchor="end" className="fill-muted text-[10px]">
              {shortDate(points.at(-1)!.date)}
            </text>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
