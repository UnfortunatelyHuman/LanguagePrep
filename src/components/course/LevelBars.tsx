import type { CourseProgress } from "@/lib/course/progress";
import { COURSE_SKILLS } from "@/lib/course/progress";
import { CEFR_LEVELS } from "@/lib/course/syllabus";

const LABEL = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
} as const;
const TARGET = CEFR_LEVELS.indexOf("B2");

/** Estimated CEFR level per skill, A1–C1, with B2 (NCLC 7) ringed. */
export function LevelBars({ skills }: { skills: CourseProgress["skills"] }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Level per skill</h2>
        <span className="text-xs text-muted">Target: B2 in every skill (NCLC 7) · estimates, not official</span>
      </div>
      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {COURSE_SKILLS.map((skill) => {
          const { level, source } = skills[skill];
          const i = level ? CEFR_LEVELS.indexOf(level) : -1;
          return (
            <li key={skill} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{LABEL[skill]}</span>
                <span className={`font-mono font-semibold ${level ? "" : "text-muted"}`}>{level ?? "–"}</span>
              </div>
              <div className="flex gap-1" aria-hidden="true">
                {CEFR_LEVELS.map((l, j) => (
                  <span
                    key={l}
                    className={`h-2 flex-1 rounded-full ${j <= i ? (i >= TARGET ? "bg-good" : "bg-accent") : "bg-surface-subtle"} ${
                      j === TARGET ? "ring-2 ring-good/40 ring-offset-1 ring-offset-surface" : ""
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted">From {source}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
