import Link from "next/link";
import type { SkillId, Track } from "@/lib/exams";
import { listGeneratedSets } from "@/lib/generate/sets";

/** AI-generated sets for a track (optionally one skill), newest first. */
export async function GeneratedList({
  track,
  skill,
  empty,
}: {
  track: Track;
  skill?: SkillId;
  empty: string;
}) {
  const sets = await listGeneratedSets(track, skill);
  if (!sets.length) return <p className="text-sm text-muted">{empty}</p>;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sets.map((s) => (
        <li key={s.setId}>
          <Link
            href={`/${track}/${s.skill}/${s.setId}`}
            className="flex h-full flex-col gap-1 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
          >
            <span className="text-xs text-muted">
              AI · {s.skill} ·{" "}
              {s.createdAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
            </span>
            <span className="font-medium">{s.title}</span>
            {s.summary ? <span className="text-sm text-muted">{s.summary}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
