import Link from "next/link";
import { skillAttempts } from "@/lib/attempts";
import type { SkillId, Track } from "@/lib/exams";
import { formatClock } from "@/lib/practice/numbering";
import { isPracticeSkill, testSets } from "@/lib/practice/content";
import { listGeneratedSets } from "@/lib/generate/sets";
import { speakingSets } from "@/lib/speaking/content";
import { writingSets } from "@/lib/writing/content";

/** Set id → title for the skill (file sets and AI-generated ones), so rows read as names. */
async function setTitles(track: Track, skill: SkillId): Promise<Map<string, string>> {
  if (isPracticeSkill(skill)) return new Map(testSets(track, skill).map((s) => [s.id, s.title]));
  const files = skill === "writing" ? writingSets(track) : speakingSets(track);
  const generated = await listGeneratedSets(track, skill);
  return new Map([
    ...files.map((s) => [s.id, s.title] as const),
    ...generated.map((g) => [g.setId, `${g.title} (AI)`] as const),
  ]);
}

function formatScore(score: number | null, maxScore: number | null): string {
  if (score === null) return "";
  return `${Number.isInteger(score) ? score : score.toFixed(1)} / ${maxScore ?? "?"}`;
}

/** Last attempts at one skill on this track, read fresh on every request. */
export async function AttemptHistory({ track, skill }: { track: Track; skill: SkillId }) {
  const attempts = await skillAttempts(track, skill);
  if (!attempts.length) {
    return <p className="text-sm text-muted">No {skill} attempts yet.</p>;
  }

  const titles = await setTitles(track, skill);
  // AI feedback is worth rereading, so writing and speaking rows open the saved review.
  const reviewable = skill === "writing" || skill === "speaking";

  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface text-sm">
      {attempts.map((a) => {
        const title = titles.get(a.task ?? "") ?? a.task;
        return (
          <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
            <div className="min-w-0">
              {reviewable ? (
                <Link href={`/${track}/${skill}/attempts/${a.id}`} className="block truncate text-accent">
                  {title}
                </Link>
              ) : (
                <p className="truncate">{title}</p>
              )}
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
              <span className="text-muted"> ({formatScore(a.score, a.maxScore)})</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
