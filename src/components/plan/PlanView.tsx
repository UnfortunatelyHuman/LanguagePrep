import Link from "next/link";
import { PlanSettingsForm } from "@/components/plan/PlanSettingsForm";
import type { Track } from "@/lib/exams";
import type { PlanBlock } from "@/lib/study-plan";
import { timeZoneNames } from "@/lib/time-zone";
import { todayPlan } from "@/lib/today-plan";

const ICONS: Record<PlanBlock["skill"], string> = {
  listening: "🎧",
  reading: "📖",
  writing: "✍️",
  speaking: "🎙️",
  phrases: "🗂️",
  mock: "⏱️",
  review: "🔁",
};

const BLOCK_TITLES: Record<PlanBlock["skill"], string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
  phrases: "Phrase bank",
  mock: "Mock exam",
  review: "Review",
};

/** YYYY-MM-DD of a local date (today) or of a UTC-midnight stored date. */
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const utcIso = (d: Date) => d.toISOString().slice(0, 10);

/** Today's plan, the countdown, and the settings that drive them. */
export async function PlanView({ track }: { track: Track }) {
  const { plan, settings, today } = await todayPlan(track);
  const zone = settings.timeZone;
  const total = plan.blocks.reduce((n, b) => n + b.minutes, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="rounded-xl border border-border bg-surface p-5 text-center sm:min-w-44">
          <p className="text-xs font-medium text-muted">Exam in</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-accent">
            {plan.daysLeft === null ? "—" : plan.daysLeft}
          </p>
          <p className="text-sm text-muted">
            {plan.daysLeft === null
              ? settings.examDate
                ? "date has passed"
                : "no date set"
              : plan.daysLeft === 1
                ? "day"
                : "days"}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-1 rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">
            {today.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })} · about{" "}
            {total} min
          </p>
          {plan.note ? <p className="text-sm">{plan.note}</p> : null}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Today</h2>
        <ol className="flex flex-col gap-3">
          {plan.blocks.map((b, i) => (
            <li key={`${b.skill}-${i}`} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
              <span aria-hidden className="text-2xl leading-none">
                {ICONS[b.skill]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{BLOCK_TITLES[b.skill]}</p>
                  <p className="text-sm tabular-nums text-muted">{b.minutes} min</p>
                </div>
                <p className="mt-0.5 text-sm">{b.activity}</p>
                <p className="mt-0.5 text-xs text-muted">{b.why}</p>
                <Link href={b.href} className="mt-2 inline-block text-sm font-medium text-accent">
                  Start →
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <PlanSettingsForm
        track={track}
        examDate={settings.examDate ? utcIso(settings.examDate) : ""}
        dailyMinutes={settings.dailyMinutes}
        timeZone={zone ?? ""}
        timeZones={timeZoneNames()}
        minDate={localIso(today)}
      />
    </div>
  );
}
