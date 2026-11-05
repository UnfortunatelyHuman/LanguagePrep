import { CorrectionDiff, DiffLegend } from "@/components/writing/CorrectionDiff";
import { changedWordCount, diffWords } from "@/lib/writing/diff";
import { WordCount } from "@/components/writing/WordCount";
import { formatClock } from "@/lib/practice/numbering";
import type { WritingResult, WritingSet } from "@/lib/writing/types";

function LevelCard({ result, exam }: { result: WritingResult; exam: WritingSet["exam"] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">Estimated level</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="text-4xl font-semibold tracking-tight text-accent">{result.level}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            result.meetsTarget ? "bg-good/15 text-good" : "bg-warn/15 text-warn"
          }`}
        >
          {result.meetsTarget ? `Meets your ${result.target} target` : `Target: ${result.target}`}
        </span>
      </div>
      <p className="mt-3 text-sm">
        Average {result.score} / {result.maxScore} across {result.dimensions.length} dimensions
        {result.durationSeconds !== null ? (
          <span className="text-muted"> · time {formatClock(result.durationSeconds)}</span>
        ) : null}
      </p>
      <p className="mt-3 text-sm leading-relaxed">{result.summary}</p>

      <ul className="mt-5 flex flex-col gap-4">
        {result.dimensions.map((d) => (
          <li key={d.id} className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{d.label}</span>
              <span className="font-mono text-muted">
                {d.score}/{d.max}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(d.score / d.max) * 100}%` }} />
            </div>
            <p className="text-muted">{d.comment}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs leading-relaxed text-muted">
        AI estimate by {result.model}, graded strictly against the{" "}
        {exam === "celpip" ? "CELPIP writing dimensions (1–12)" : "TCF Canada writing criteria (0–20, mapped to NCLC with IRCC's table)"}
        . It is guidance for practice, not an official score. Saved to your history.
      </p>
    </section>
  );
}

function Strengths({ items }: { items: string[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold tracking-tight">What worked</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}

function Fixes({ result, lang }: { result: WritingResult; lang: "en" | "fr" }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold tracking-tight">3 fixes for next time</h2>
      <ol className="mt-3 flex flex-col gap-4 text-sm">
        {result.fixes.map((f, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{f.title}</p>
              <p className="mt-1 leading-relaxed text-muted">{f.explanation}</p>
              {f.before || f.after ? (
                <div lang={lang} className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  <p className="rounded-md bg-warn/10 px-2.5 py-1.5">
                    <span className="block text-xs text-muted">You wrote</span>
                    {f.before}
                  </p>
                  <p className="rounded-md bg-good/10 px-2.5 py-1.5">
                    <span className="block text-xs text-muted">Better</span>
                    {f.after}
                  </p>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

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
                ({changedWordCount(diffWords(task.text, task.corrected))} words changed)
              </span>
            </h3>
            <DiffLegend />
          </div>
          <div className="rounded-lg bg-surface-subtle p-3">
            <CorrectionDiff original={task.text} corrected={task.corrected} lang={lang} />
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
      <LevelCard result={result} exam={set.exam} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Strengths items={result.strengths} />
        <Fixes result={result} lang={lang} />
      </div>
      {result.tasks.map((t) => (
        <TaskCorrection key={t.taskId} set={set} task={t} lang={lang} />
      ))}
    </div>
  );
}
