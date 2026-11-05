import { formatClock } from "@/lib/practice/numbering";
import type { Fix } from "@/lib/writing/types";

/** The parts of an AI rubric result the summary card needs (writing and speaking). */
export type RubricSummaryData = {
  level: string;
  target: string;
  meetsTarget: boolean;
  score: number;
  maxScore: number;
  summary: string;
  model: string;
  dimensions: { id: string; label: string; score: number; max: number; comment: string }[];
};

/** Estimated level, target badge, per-dimension bars, and the not-official disclaimer. */
export function LevelCard({
  result,
  scaleNote,
  durationSeconds,
}: {
  result: RubricSummaryData;
  /** e.g. "the CELPIP writing dimensions (1–12)". */
  scaleNote: string;
  durationSeconds?: number | null;
}) {
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
        {durationSeconds != null ? (
          <span className="text-muted"> · time {formatClock(durationSeconds)}</span>
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
        AI estimate by {result.model}, graded strictly against {scaleNote}. It is guidance for
        practice, not an official score. Saved to your history.
      </p>
    </section>
  );
}

export function Strengths({ items }: { items: string[] }) {
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

export function Fixes({
  fixes,
  lang,
  beforeLabel = "You wrote",
}: {
  fixes: Fix[];
  lang: "en" | "fr";
  beforeLabel?: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold tracking-tight">3 fixes for next time</h2>
      <ol className="mt-3 flex flex-col gap-4 text-sm">
        {fixes.map((f, i) => (
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
                    <span className="block text-xs text-muted">{beforeLabel}</span>
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
