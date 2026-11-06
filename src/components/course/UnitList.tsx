import Link from "next/link";
import { COURSE_LEVELS, LEVEL_GOALS, unitsAt, type CourseLevel } from "@/lib/course/syllabus";

const SKILL_LABEL = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" } as const;

/**
 * The syllabus by level: each unit's grammar point, vocabulary theme and TCF
 * skill focus, with lessons done and the level checkpoint.
 */
export function UnitList({
  completed = new Set(),
  checkpoints = {},
  startUnitId = null,
}: {
  completed?: Set<string>;
  checkpoints?: Partial<Record<CourseLevel, { passed: boolean; best: number }>>;
  startUnitId?: string | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      {COURSE_LEVELS.map((level) => {
        const units = unitsAt(level);
        const done = units.flatMap((u) => u.lessons).filter((l) => completed.has(l.id)).length;
        const checkpoint = checkpoints[level];
        return (
          <section key={level} aria-labelledby={`level-${level}`} className="flex flex-col gap-3">
            <div>
              <h2 id={`level-${level}`} className="flex flex-wrap items-baseline gap-x-3 text-xl font-bold tracking-tight">
                {level}
                {level === "B2" ? <span className="text-sm font-medium text-accent">target · NCLC 7</span> : null}
                <span className="text-sm font-normal text-muted">
                  {done} / {units.length * 2} lessons
                  {checkpoint?.passed ? " · checkpoint passed ✓" : ""}
                </span>
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{LEVEL_GOALS[level]}</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {units.map((unit) => {
                const unitDone = unit.lessons.filter((l) => completed.has(l.id)).length;
                return (
                  <li key={unit.id}>
                    <Link
                      href={`/fr/learn/units/${unit.id}`}
                      className={`flex h-full flex-col gap-2 rounded-xl border bg-surface p-4 hover:border-accent ${
                        unit.id === startUnitId ? "border-accent/60" : "border-border"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-semibold" lang="fr">
                          <span className="mr-2 font-mono text-xs text-muted">{unit.number}</span>
                          {unit.title}
                        </h3>
                        <span className="flex shrink-0 items-center gap-2">
                          {unitDone ? (
                            <span className={`text-xs font-medium ${unitDone === 2 ? "text-good" : "text-muted"}`}>
                              {unitDone === 2 ? "✓ done" : "1 / 2"}
                            </span>
                          ) : unit.id === startUnitId ? (
                            <span className="text-xs font-medium text-accent">start here</span>
                          ) : null}
                          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted">
                            {SKILL_LABEL[unit.skillFocus.skill]}
                          </span>
                        </span>
                      </div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                        <dt className="text-muted">Grammar</dt>
                        <dd>{unit.grammar}</dd>
                        <dt className="text-muted">Words</dt>
                        <dd>{unit.vocabulary}</dd>
                        <dt className="text-muted">Skill</dt>
                        <dd>{unit.skillFocus.text}</dd>
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <Link
              href={`/fr/learn/checkpoint/${level}`}
              className="self-start rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
            >
              {level} checkpoint
              {checkpoint ? (checkpoint.passed ? " · passed ✓" : ` · best ${checkpoint.best}%`) : ": test the whole level"} →
            </Link>
          </section>
        );
      })}
    </div>
  );
}
