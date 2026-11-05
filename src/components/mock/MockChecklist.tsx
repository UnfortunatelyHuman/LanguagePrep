import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrack, type Track } from "@/lib/exams";
import { loadMockExam, skillName, stepInfo, type MockView } from "@/lib/mock";
import type { StepStatus } from "@/lib/mock-plan";

/** Writing and speaking keep a saved review page; reading/listening don't. */
function reviewHref(track: Track, step: StepStatus): string | null {
  if (!step.attempt || (step.skill !== "writing" && step.skill !== "speaking")) return null;
  return `/${track}/${step.skill}/attempts/${step.attempt.id}`;
}

function formatScore(score: number | null, max: number | null): string {
  if (score === null) return "";
  return ` (${Number.isInteger(score) ? score : score.toFixed(1)} / ${max ?? "?"})`;
}

function StepRow({
  track,
  step,
  index,
  isNext,
}: {
  track: Track;
  step: StepStatus;
  index: number;
  isNext: boolean;
}) {
  const { title, detail } = stepInfo(track, step);
  const done = step.attempt !== null;
  const review = reviewHref(track, step);

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface p-4 ${
        isNext ? "border-accent" : "border-border"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            done ? "bg-good/15 text-good" : "bg-surface-subtle text-muted"
          }`}
        >
          {done ? "✓" : index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-medium">
            {skillName(track, step.skill)}
            {detail ? <span className="font-normal text-muted"> · {detail}</span> : null}
          </p>
          <p className="truncate text-sm text-muted">{title}</p>
        </div>
      </div>

      {done ? (
        <p className="text-sm">
          <span className="sr-only">Done: </span>
          <span className="font-medium">{step.attempt!.estimatedLevel ?? "Saved"}</span>
          <span className="text-muted">{formatScore(step.attempt!.score, step.attempt!.maxScore)}</span>
          {review ? (
            <Link href={review} className="ml-3 text-accent">
              Review
            </Link>
          ) : null}
        </p>
      ) : isNext ? (
        <Link
          href={`/${track}/${step.skill}/${step.setId}`}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          Start
        </Link>
      ) : (
        <Link href={`/${track}/${step.skill}/${step.setId}`} className="text-sm text-muted hover:text-accent">
          Start out of order
        </Link>
      )}
    </li>
  );
}

function Results({ track, mock }: { track: Track; mock: MockView }) {
  const { skills, weakest, target } = mock.outcome;
  const { scale } = getTrack(track);
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <p className="text-xs font-medium text-muted">Mock exam result</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {skills.map((s) => (
          <li key={s.skill} className="rounded-lg bg-surface-subtle p-3">
            <p className="text-sm text-muted">{skillName(track, s.skill)}</p>
            <p className="text-2xl font-semibold">{s.label ?? "—"}</p>
            <p className={`text-xs font-medium ${s.meetsTarget ? "text-good" : "text-warn"}`}>
              {s.meetsTarget ? `✓ At target (${scale} ${target})` : `! Below target (${scale} ${target})`}
            </p>
          </li>
        ))}
      </ul>
      {track === "en" ? (
        <p className="mt-3 text-xs text-muted">
          Writing shows the lower of your two tasks: one weak task pulls the whole skill down.
        </p>
      ) : null}
      {weakest ? (
        <p className="mt-4 text-sm">
          Weakest skill: <span className="font-semibold">{skillName(track, weakest)}</span>. IRCC scores each
          skill separately, so this is the one that decides your result.
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        Levels are practice estimates, not official scores.{" "}
        <Link href={`/${track}/progress`} className="text-accent">
          See your progress over time →
        </Link>
      </p>
    </section>
  );
}

/** The ordered steps of one mock exam, with the next one to do highlighted. */
export async function MockChecklist({ track, mockId }: { track: Track; mockId: Promise<string> }) {
  const mock = await loadMockExam(track, await mockId);
  if (!mock) notFound();
  const { complete, done, total } = mock.outcome;
  const next = mock.steps.findIndex((s) => !s.attempt);
  const started = mock.startedAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs text-muted">Started {started}</p>
        <p className="mt-1 text-sm">
          {complete ? "All steps done." : `${done} of ${total} steps done.`}
        </p>
      </div>

      {complete ? <Results track={track} mock={mock} /> : null}

      <ol className="flex flex-col gap-3">
        {mock.steps.map((step, i) => (
          <StepRow key={`${step.skill}-${step.setId}-${i}`} track={track} step={step} index={i} isNext={i === next} />
        ))}
      </ol>

      {!complete ? (
        <p className="text-xs leading-relaxed text-muted">
          Only your first attempt at each set after this mock started counts. After each step, come back to
          this page for the next one.
        </p>
      ) : null}
    </div>
  );
}
