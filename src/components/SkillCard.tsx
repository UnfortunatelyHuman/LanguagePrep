import type { ReactNode } from "react";
import type { Skill } from "@/lib/exams";

/**
 * One skill on the dashboard: what the real exam asks for, and where you stand.
 * `status` streams in from the database, so it arrives as a slot.
 */
export function SkillCard({
  skill,
  status,
}: {
  skill: Skill;
  status: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{skill.name}</h3>
          <p className="mt-0.5 text-xs text-muted">{skill.time}</p>
        </div>
        <div className="shrink-0 rounded-lg bg-accent-soft px-2.5 py-1.5 text-right">
          <span className="block text-xs text-muted">Target</span>
          <span className="block font-mono text-sm font-semibold text-accent">
            {skill.target}
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted">{skill.structure}</p>

      {skill.targetNote ? (
        <p className="text-xs text-muted">{skill.targetNote}</p>
      ) : null}

      <div className="mt-auto border-t border-border pt-3">{status}</div>
    </article>
  );
}
