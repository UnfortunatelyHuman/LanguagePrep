import { Fixes, LevelCard, Strengths } from "@/components/feedback/RubricSummary";
import { Playback } from "@/components/speaking/Playback";
import type { SpeakingResult, SpeakingSet, SpeakingTaskFeedback } from "@/lib/speaking/types";

/** Typical conversational pace; below ~100 wpm usually sounds hesitant in an exam. */
const PACE_HINT = { slow: 100, fast: 190 };

function paceNote(wpm: number): string {
  if (wpm < PACE_HINT.slow) return "slow, often a sign of long pauses";
  if (wpm > PACE_HINT.fast) return "very fast";
  return "a natural pace";
}

function TaskAnswer({
  set,
  task,
  lang,
}: {
  set: SpeakingSet;
  task: SpeakingTaskFeedback;
  lang: "en" | "fr";
}) {
  const info = set.tasks.find((t) => t.id === task.taskId);
  if (!info) return null;
  const option = task.choice ? info.options?.find((o) => o.id === task.choice) : undefined;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold tracking-tight">{info.label}</h2>
        <p className="text-sm text-muted">
          {task.seconds} s of {info.speakSeconds} s · {task.wordsPerMinute} words/min ({paceNote(task.wordsPerMinute)})
        </p>
      </div>
      {option ? (
        <p className="text-sm text-muted">
          You chose option {option.id}: {option.title}
          {info.rival ? `, against the third option: ${info.rival.title}` : ""}
        </p>
      ) : null}

      {task.audioId ? (
        <Playback src={`/api/recordings/${task.audioId}`} />
      ) : (
        <p className="text-xs text-muted">No recording was kept for this answer.</p>
      )}

      {task.comment ? <p className="text-sm leading-relaxed">{task.comment}</p> : null}

      {task.dialogue?.length ? (
        <details>
          <summary className="cursor-pointer text-sm text-accent">The exchange with the AI examiner</summary>
          <ol lang={lang} className="mt-2 flex flex-col gap-1.5 rounded-lg bg-surface-subtle p-3 text-sm">
            {task.dialogue.map((t, i) => (
              <li key={i} className={t.role === "examiner" ? "text-accent" : undefined}>
                <span className="font-medium">{t.role === "examiner" ? "Examinateur : " : "Vous : "}</span>
                {t.text}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <details open>
        <summary className="cursor-pointer text-sm text-accent">What you said (automatic transcript)</summary>
        <p lang={lang} className="mt-2 rounded-lg bg-surface-subtle p-3 text-sm leading-7">
          {task.transcript || "Nothing was recognized."}
        </p>
      </details>

      {task.improved ? (
        <details>
          <summary className="cursor-pointer text-sm text-accent">A stronger answer, built from your ideas</summary>
          <p lang={lang} className="mt-2 whitespace-pre-wrap rounded-lg bg-good/10 p-3 text-sm leading-7">
            {task.improved}
          </p>
        </details>
      ) : null}
    </section>
  );
}

/** Full feedback for one speaking attempt. Server- and client-safe (no hooks). */
export function SpeakingFeedback({ set, result }: { set: SpeakingSet; result: SpeakingResult }) {
  const lang = set.exam === "tcf" ? "fr" : "en";
  return (
    <div className="flex flex-col gap-5">
      <LevelCard
        result={result}
        scaleNote={
          set.exam === "celpip"
            ? "CELPIP speaking levels (1–12) from an automatic transcript; pronunciation isn't assessed"
            : "TCF Canada speaking criteria (0–20, mapped to NCLC with IRCC's table) from an automatic transcript; pronunciation isn't assessed"
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Strengths items={result.strengths} />
        <Fixes
          fixes={result.fixes}
          lang={lang}
          beforeLabel="You said"
          saveTo={{ track: set.exam === "tcf" ? "fr" : "en", source: "speaking" }}
        />
      </div>
      {result.tasks.map((t) => (
        <TaskAnswer key={t.taskId} set={set} task={t} lang={lang} />
      ))}
    </div>
  );
}
