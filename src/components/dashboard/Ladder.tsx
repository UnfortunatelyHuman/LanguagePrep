/**
 * The CLB / NCLC ladder: twelve rising steps, filled up to where the skill
 * stands, with the target step marked. Filled steps at or above the target
 * turn green, so "at target" reads without a legend.
 */
export function Ladder({
  level,
  target,
  scale,
  steps = 12,
  size = "md",
}: {
  /** Recent level (may be fractional); null when there's no attempt yet. */
  level: number | null;
  target: number;
  scale: "CLB" | "NCLC";
  steps?: number;
  size?: "sm" | "md";
}) {
  const filled = level === null ? 0 : Math.floor(level + 1e-9);
  const height = size === "sm" ? 28 : 44;
  return (
    <div
      role="img"
      aria-label={
        level === null
          ? `No level yet; target ${scale} ${target}`
          : `${scale} ${level} of ${steps}; target ${scale} ${target}`
      }
      className="flex items-end gap-[3px]"
      style={{ height }}
    >
      {Array.from({ length: steps }, (_, i) => {
        const step = i + 1;
        const isFilled = step <= filled;
        const isTarget = step === target;
        const pct = 30 + (70 * i) / (steps - 1);
        const colour = isFilled ? (filled >= target ? "bg-good" : "bg-accent") : "bg-ladder-empty";
        return (
          <span
            key={step}
            className={`flex-1 rounded-[3px] ${colour} ${
              isTarget && !isFilled ? "outline-2 outline-dashed outline-offset-1 outline-accent" : ""
            }`}
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}
