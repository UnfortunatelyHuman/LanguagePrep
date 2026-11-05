import Link from "next/link";
import { TrendChart } from "@/components/progress/TrendChart";
import type { Track } from "@/lib/exams";
import { progressSummary, type SkillProgress } from "@/lib/progress";

function changeText(change: number | null): string {
  if (change === null) return "";
  if (change === 0) return "steady over the last attempts";
  return `${change > 0 ? "▲ up" : "▼ down"} ${Math.abs(change)} over the last attempts`;
}

function SkillPanel({
  track,
  skill,
  target,
  scale,
  focused,
}: {
  track: Track;
  skill: SkillProgress;
  target: number;
  scale: string;
  focused: boolean;
}) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:p-5 ${
        focused ? "border-warn" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold tracking-tight">{skill.name}</h3>
          <p className="text-xs text-muted">
            {skill.points.length} {skill.points.length === 1 ? "attempt" : "attempts"}
            {skill.change !== null ? ` · ${changeText(skill.change)}` : ""}
          </p>
        </div>
        {skill.latest ? (
          <div className="text-right">
            <p className="text-lg font-semibold">{skill.latest.label}</p>
            <p className="text-xs text-muted">recent avg {skill.recentAverage}</p>
          </div>
        ) : null}
      </div>

      {skill.points.length ? (
        <>
          <TrendChart points={skill.points} target={target} scale={scale} title={`${skill.name} level`} />
          <p className={`text-xs font-medium ${skill.meetsTarget ? "text-good" : "text-warn"}`}>
            {skill.meetsTarget
              ? `✓ Recent average at target (${scale} ${target})`
              : `! Recent average below target (${scale} ${target})`}
          </p>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-muted">No attempts yet.</p>
      )}

      <Link href={`/${track}/${skill.skill}`} className="mt-auto text-sm font-medium text-accent">
        Practise {skill.name.toLowerCase()} →
      </Link>
    </article>
  );
}

/** Per-skill trends, level vs target, and the skill to work on next. */
export async function ProgressView({ track }: { track: Track }) {
  const { skills, target, scale, focus } = await progressSummary(track);
  const focusSkill = skills.find((s) => s.skill === focus?.skill);
  const total = skills.reduce((n, s) => n + s.points.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {focus && focusSkill ? (
        <section className="rounded-xl border border-warn/40 bg-warn/10 p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-warn">Focus next</p>
          <p className="mt-1 text-lg font-semibold">{focusSkill.name}</p>
          <p className="mt-1 text-sm">{focus.reason}</p>
          <Link href={`/${track}/${focus.skill}`} className="mt-2 inline-block text-sm font-medium text-accent">
            Start a {focusSkill.name.toLowerCase()} practice →
          </Link>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {skills.map((s) => (
          <SkillPanel
            key={s.skill}
            track={track}
            skill={s}
            target={target}
            scale={scale}
            focused={s.skill === focus?.skill}
          />
        ))}
      </div>

      {total ? (
        <details className="rounded-xl border border-border bg-surface p-4 text-sm">
          <summary className="cursor-pointer font-medium">All attempts as a table</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 pr-4 font-medium">Date</th>
                  <th className="py-1 pr-4 font-medium">Skill</th>
                  <th className="py-1 font-medium">Estimated level</th>
                </tr>
              </thead>
              <tbody>
                {skills
                  .flatMap((s) => s.points.map((p) => ({ ...p, name: s.name })))
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-1.5 pr-4 whitespace-nowrap">
                        {p.date.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                      </td>
                      <td className="py-1.5 pr-4">{p.name}</td>
                      <td className="py-1.5">{p.label}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}
