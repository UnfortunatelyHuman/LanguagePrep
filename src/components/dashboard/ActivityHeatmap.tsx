import type { Activity } from "@/lib/activity";

const SHADES = ["bg-ladder-empty", "bg-accent/35", "bg-accent/65", "bg-accent"];

function shade(count: number) {
  return SHADES[Math.min(count, SHADES.length - 1)];
}

const label = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });

/** Weeks as columns, Monday at the top, like a contribution graph. */
export function ActivityHeatmap({ activity }: { activity: Activity }) {
  const weeks: Activity["days"][] = [];
  for (let i = 0; i < activity.days.length; i += 7) weeks.push(activity.days.slice(i, i + 7));

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
      <dl className="grid shrink-0 grid-cols-3 gap-5 sm:grid-cols-1 sm:gap-3">
        <div>
          <dt className="text-xs text-muted">Current streak</dt>
          <dd className="text-2xl font-bold tabular-nums">
            {activity.streak} <span className="text-sm font-normal text-muted">{activity.streak === 1 ? "day" : "days"}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Longest</dt>
          <dd className="text-lg font-semibold tabular-nums">{activity.longestStreak}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Days this week</dt>
          <dd className="text-lg font-semibold tabular-nums">{activity.activeThisWeek} / 7</dd>
        </div>
      </dl>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="flex w-max gap-[3px] sm:w-full sm:justify-end" role="img" aria-label={`Practice over the last ${weeks.length} weeks`}>
          {weeks.map((week) => (
            <div key={week[0].date} className="flex flex-col gap-[3px]">
              {week.map((d) => (
                <span
                  key={d.date}
                  title={`${label(d.date)}: ${d.count ? `${d.count} attempt${d.count === 1 ? "" : "s"}${d.minutes ? `, ${d.minutes} min` : ""}` : "no practice"}`}
                  className={`size-3.5 rounded-[3px] sm:size-4 ${shade(d.count)}`}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted">
          Less
          {SHADES.map((s) => (
            <span key={s} className={`size-3 rounded-[3px] ${s}`} />
          ))}
          More
        </p>
      </div>
    </div>
  );
}
