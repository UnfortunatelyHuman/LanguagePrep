import { skillAttempts } from "@/lib/attempts";
import { formatClock } from "@/lib/reading/numbering";
import { readingSets } from "@/lib/reading/content";
import type { Track } from "@/lib/exams";

/** Last reading attempts for this track, read fresh on every request. */
export async function ReadingHistory({ track }: { track: Track }) {
  const attempts = await skillAttempts(track, "reading");
  if (!attempts.length) {
    return <p className="text-sm text-muted">No reading attempts yet.</p>;
  }

  const titles = new Map(readingSets(track).map((s) => [s.id, s.title]));

  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface text-sm">
      {attempts.map((a) => (
        <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate">{titles.get(a.task ?? "") ?? a.task}</p>
            <p className="text-xs text-muted">
              {a.createdAt.toLocaleString("en-CA", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {a.durationSeconds !== null ? ` · ${formatClock(a.durationSeconds)}` : ""}
            </p>
          </div>
          <p className="shrink-0">
            <span className="font-medium">{a.estimatedLevel}</span>
            <span className="text-muted">
              {" "}
              ({a.score} / {a.maxScore})
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}
