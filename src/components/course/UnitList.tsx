import Link from "next/link";
import { COURSE_LEVELS, LEVEL_GOALS, unitsAt } from "@/lib/course/syllabus";

const SKILL_LABEL = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" } as const;

/** The syllabus by level: each unit's grammar point, vocabulary theme and TCF skill focus. */
export function UnitList() {
  return (
    <div className="flex flex-col gap-8">
      {COURSE_LEVELS.map((level) => (
        <section key={level} aria-labelledby={`level-${level}`} className="flex flex-col gap-3">
          <div>
            <h2 id={`level-${level}`} className="text-xl font-bold tracking-tight">
              {level}
              {level === "B2" ? <span className="ml-2 text-sm font-medium text-accent">target · NCLC 7</span> : null}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{LEVEL_GOALS[level]}</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {unitsAt(level).map((unit) => (
              <li key={unit.id}>
                <Link
                  href={`/fr/learn/units/${unit.id}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-4 hover:border-accent"
                >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold" lang="fr">
                    <span className="mr-2 font-mono text-xs text-muted">{unit.number}</span>
                    {unit.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted">
                    {SKILL_LABEL[unit.skillFocus.skill]}
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
            ))}
          </ol>
          <Link
            href={`/fr/learn/checkpoint/${level}`}
            className="self-start rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
          >
            {level} checkpoint: test the whole level →
          </Link>
        </section>
      ))}
    </div>
  );
}
