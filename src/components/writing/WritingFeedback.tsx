import { CorrectionDiff, DiffLegend } from "@/components/writing/CorrectionDiff";
import { changedWordCount, diffWords } from "@/lib/writing/diff";
import { WordCount } from "@/components/writing/WordCount";
import { Fixes, LevelCard, Strengths } from "@/components/feedback/RubricSummary";
import type { WritingResult, WritingSet } from "@/lib/writing/types";

function TaskCorrection({
  set,
  task,
  lang,
}: {
  set: WritingSet;
  task: WritingResult["tasks"][number];
  lang: "en" | "fr";
}) {
  const info = set.tasks.find((t) => t.id === task.taskId)!;
  const blank = !task.text.trim();
  // Computed once: the diff is an LCS table over both texts.
  const parts = task.corrected ? diffWords(task.text, task.corrected) : [];
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold tracking-tight">{info.label}</h2>
        <WordCount count={task.wordCount} min={info.minWords} max={info.maxWords} />
      </div>
      {task.comment ? <p className="text-sm leading-relaxed">{task.comment}</p> : null}

      {blank ? (
        <p className="text-sm text-muted">Left blank.</p>
      ) : task.corrected ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">
              Corrected version, with changes{" "}
              <span className="font-normal text-muted">
                ({changedWordCount(parts)} words changed)
              </span>
            </h3>
            <DiffLegend />
          </div>
          <div className="rounded-lg bg-surface-subtle p-3">
            <CorrectionDiff parts={parts} lang={lang} />
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-accent">Clean corrected text</summary>
            <p lang={lang} className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-subtle p-3 text-sm leading-7">
              {task.corrected}
            </p>
          </details>
        </>
      ) : null}

      <details>
        <summary className="cursor-pointer text-sm text-accent">Your original text</summary>
        <p lang={lang} className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-subtle p-3 text-sm leading-7">
          {task.text || "—"}
        </p>
      </details>
    </section>
  );
}

/** Full feedback for one writing attempt. Works on the server and the client (no hooks). */
export function WritingFeedback({ set, result }: { set: WritingSet; result: WritingResult }) {
  const lang = set.exam === "tcf" ? "fr" : "en";
  return (
    <div className="flex flex-col gap-5">
      <LevelCard
        result={result}
        durationSeconds={result.durationSeconds}
        scaleNote={
          set.exam === "celpip"
            ? "the CELPIP writing dimensions (1–12)"
            : "the TCF Canada writing criteria (0–20, mapped to NCLC with IRCC's table)"
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Strengths items={result.strengths} />
        <Fixes
          fixes={result.fixes}
          lang={lang}
          saveTo={{ track: set.exam === "tcf" ? "fr" : "en", source: "writing" }}
        />
      </div>
      {result.tasks.map((t) => (
        <TaskCorrection key={t.taskId} set={set} task={t} lang={lang} />
      ))}
    </div>
  );
}
