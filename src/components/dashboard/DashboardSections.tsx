import Link from "next/link";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { Ladder } from "@/components/dashboard/Ladder";
import { activity } from "@/lib/activity";
import { getTrack, type Track } from "@/lib/exams";
import type { PlanBlock } from "@/lib/study-plan";
import { todayPlan } from "@/lib/today-plan";

const BLOCK_TITLES: Record<PlanBlock["skill"], string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
  phrases: "Phrase bank",
  mock: "Mock exam",
  review: "Review",
};

/** Attempts in a row at or above target before we'd call a skill solid. */
const SOLID_ATTEMPTS = 3;

/** Today's first step, big, then the rest of the plan; plus the exam countdown. */
export async function TodaySection({ track }: { track: Track }) {
  const { plan, today } = await todayPlan(track);
  const [first, ...rest] = plan.blocks;
  const total = plan.blocks.reduce((n, b) => n + b.minutes, 0);
  const dateLabel = today.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });

  return (
    <section aria-labelledby="today-h" className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-7">
        <div className="min-w-0 max-w-xl">
          <h2 id="today-h" className="text-sm text-muted">
            {dateLabel} · about {total} min planned
          </h2>
          {first ? (
            <>
              <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{BLOCK_TITLES[first.skill]}</p>
              <p className="mt-1.5 text-base leading-relaxed">{first.activity}</p>
              <p className="mt-1 text-sm text-muted">{first.why}</p>
              <Link
                href={first.href}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90"
              >
                Start {first.minutes} min of {BLOCK_TITLES[first.skill].toLowerCase()}
              </Link>
            </>
          ) : (
            <p className="mt-3 text-lg">Nothing planned today. Rest is part of the plan.</p>
          )}
          {plan.note && plan.daysLeft !== null ? <p className="mt-4 text-sm text-muted">{plan.note}</p> : null}
        </div>
        <Link
          href={`/${track}/plan`}
          className="shrink-0 rounded-xl bg-accent-soft px-4 py-3 text-center hover:opacity-90"
        >
          {plan.daysLeft === null ? (
            <>
              <span className="block text-sm font-semibold text-accent">Set exam date</span>
              <span className="block text-xs text-muted">for a countdown plan</span>
            </>
          ) : (
            <>
              <span className="block text-3xl font-bold tabular-nums text-accent">{plan.daysLeft}</span>
              <span className="block text-xs text-muted">{plan.daysLeft === 1 ? "day" : "days"} to the exam</span>
            </>
          )}
        </Link>
      </div>
      {rest.length ? (
        <ol className="divide-y divide-border border-t border-border bg-surface-subtle/60">
          {rest.map((b, i) => (
            <li key={`${b.skill}-${i}`}>
              <Link href={b.href} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-subtle sm:px-7">
                <span className="w-24 shrink-0 text-sm font-semibold">{BLOCK_TITLES[b.skill]}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{b.activity}</span>
                <span className="shrink-0 text-sm tabular-nums text-muted">{b.minutes} min</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function TodaySectionPending() {
  return <div className="h-56 animate-pulse rounded-2xl border border-border bg-surface" />;
}

/** Each skill on its ladder, and whether the whole profile is ready to book. */
export async function StandingSection({ track }: { track: Track }) {
  const { summary } = await todayPlan(track);
  const { skills: info, scale } = getTrack(track);
  const target = summary.target;
  const atTarget = summary.skills.filter((s) => s.meetsTarget).length;
  const solid = summary.skills.every((s) => s.meetsTarget && s.points.length >= SOLID_ATTEMPTS);

  let verdict: string;
  if (solid) verdict = `Every skill has held ${scale} ${target} over your last ${SOLID_ATTEMPTS} attempts. Good time to book the real test.`;
  else if (summary.skills.every((s) => !s.points.length)) verdict = `Take one test in each skill to see where you start.`;
  else
    verdict = `${atTarget} of 4 skills at ${scale} ${target} on recent attempts. Book the real test once all four hold it for ${SOLID_ATTEMPTS} attempts in a row.`;

  return (
    <section aria-labelledby="standing-h" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="standing-h" className="text-lg font-bold tracking-tight">
          Where you stand
        </h2>
        <p className="text-sm text-muted">Each skill needs its own {scale} {target}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {summary.skills.map((s) => {
          const meta = info.find((i) => i.id === s.skill)!;
          return (
            <li key={s.skill}>
              <Link
                href={`/${track}/${s.skill}`}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 hover:border-accent/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{meta.name}</p>
                    <p className="text-xs text-muted">
                      {meta.time} · {s.points.length} {s.points.length === 1 ? "attempt" : "attempts"}
                    </p>
                  </div>
                  <div className="text-right">
                    {s.latest ? (
                      <>
                        <p className={`text-xl font-bold tabular-nums ${s.latest.level >= target ? "text-good" : ""}`}>
                          {scale} {s.latest.level}
                        </p>
                        <p className="text-xs text-muted">
                          latest{s.recentAverage !== null && s.points.length > 1 ? ` · avg ${s.recentAverage}` : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-accent">Take a first test</p>
                    )}
                  </div>
                </div>
                <Ladder level={s.recentAverage} target={target} scale={scale} />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className={`rounded-xl px-4 py-3 text-sm ${solid ? "bg-good-soft text-good" : "bg-surface-subtle text-muted"}`}>
        {verdict}
      </p>
    </section>
  );
}

export function StandingSectionPending() {
  return <div className="h-80 animate-pulse rounded-2xl border border-border bg-surface" />;
}

export async function ActivitySection({ track }: { track: Track }) {
  const { settings } = await todayPlan(track);
  const data = await activity(settings.timeZone);
  return (
    <section aria-labelledby="activity-h" className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <div>
        <h2 id="activity-h" className="text-lg font-bold tracking-tight">
          Practice habit
        </h2>
        <p className="text-sm text-muted">
          Short daily practice beats long weekend sessions. Every saved test, writing or speaking attempt counts, in
          either language.
        </p>
      </div>
      <ActivityHeatmap activity={data} />
    </section>
  );
}
