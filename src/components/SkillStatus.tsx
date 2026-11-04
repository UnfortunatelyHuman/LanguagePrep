import { latestAttempt } from "@/lib/attempts";
import type { SkillId, Track } from "@/lib/exams";

function formatScore(score: number | null, maxScore: number | null): string | null {
  if (score === null) return null;
  const rounded = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return maxScore === null ? rounded : `${rounded} / ${maxScore}`;
}

/** Fallback that ships in the static shell while the query runs. */
export function SkillStatusPending() {
  return <p className="text-sm text-muted">Checking your history…</p>;
}

/** Where this skill stands, read fresh on every request. */
export async function SkillStatus({
  track,
  skill,
}: {
  track: Track;
  skill: SkillId;
}) {
  const attempt = await latestAttempt(track, skill);

  if (!attempt) {
    return <p className="text-sm text-muted">No attempts yet.</p>;
  }

  const score = formatScore(attempt.score, attempt.maxScore);
  const date = attempt.createdAt.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });

  return (
    <p className="text-sm">
      <span className="text-muted">Last attempt {date}: </span>
      <span className="font-medium">
        {attempt.estimatedLevel ?? score ?? "recorded"}
      </span>
      {attempt.estimatedLevel && score ? (
        <span className="text-muted"> ({score})</span>
      ) : null}
    </p>
  );
}
