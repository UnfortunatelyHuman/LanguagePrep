import Link from "next/link";
import { LEVEL_MEANING } from "@/lib/course/placement";
import type { StoredPlacement } from "@/lib/course/placement-store";
import { PLACEMENT_SKILLS } from "@/lib/course/schemas";
import { CEFR_LEVELS, getUnit } from "@/lib/course/syllabus";

const SKILL_LABEL = { grammar: "Grammar", vocabulary: "Vocabulary", reading: "Reading", listening: "Listening" } as const;
const TARGET = CEFR_LEVELS.indexOf("B2");

/** Level per skill from the latest placement, against the B2 target, and where to start. */
export function PlacementResult({ result }: { result: StoredPlacement }) {
  const unit = getUnit(result.startUnitId);
  const right = result.asked.filter((a) => a.correct).length;
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <p className="text-xs text-muted">
          Your level · {result.createdAt.toLocaleDateString("en-CA", { dateStyle: "medium" })} · {right} of{" "}
          {result.asked.length} right
        </p>
        <h2 className="mt-1 text-lg font-semibold">Estimated level per skill</h2>
      </div>
      <ul className="flex flex-col gap-3">
        {PLACEMENT_SKILLS.map((skill) => {
          const level = result.levels[skill];
          const i = CEFR_LEVELS.indexOf(level);
          return (
            <li key={skill} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{SKILL_LABEL[skill]}</span>
                <span className="font-mono font-semibold">{level}</span>
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
              <p className="text-xs text-muted">{LEVEL_MEANING[level]}</p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">
        The ringed segment is B2, the NCLC 7 target. These are estimates from a short test, not official results.
        Writing and speaking aren&apos;t placed; lesson tasks estimate them.
      </p>
      {unit ? (
        <Link
          href={`/fr/learn/units/${unit.id}`}
          className="self-start rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white"
        >
          Start at unit {unit.number}: {unit.title} ({unit.level}) →
        </Link>
      ) : null}
    </section>
  );
}
