import Link from "next/link";
import type { Track } from "@/lib/exams";
import { listMockExams, skillName } from "@/lib/mock";

const formatDate = (d: Date) =>
  d.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Past mock exams with progress and, once finished, the weakest skill. */
export async function MockList({ track }: { track: Track }) {
  const mocks = await listMockExams(track);
  if (!mocks.length) return <p className="text-sm text-muted">No mock exams yet.</p>;

  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface text-sm">
      {mocks.map((m) => {
        const { complete, done, total, skills, weakest, target } = m.outcome;
        const atTarget = skills.filter((s) => s.meetsTarget).length;
        return (
          <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
            <div className="min-w-0">
              <Link href={`/${track}/mock/${m.id}`} className="font-medium text-accent">
                Mock exam · {formatDate(m.startedAt)}
              </Link>
              <p className="text-xs text-muted">
                {complete ? "Finished" : `In progress: ${done} of ${total} steps done`}
              </p>
            </div>
            {complete ? (
              <p className="shrink-0 text-right">
                <span className="font-medium">
                  {atTarget} of {skills.length} skills at target ({target})
                </span>
                {weakest ? (
                  <span className="block text-xs text-muted">Weakest: {skillName(track, weakest)}</span>
                ) : null}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
