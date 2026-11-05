"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Countdown } from "@/components/practice/Countdown";
import { FeedbackErrorPanel } from "@/components/feedback/FeedbackErrorPanel";
import { WritingEditor } from "@/components/writing/WritingEditor";
import { WritingFeedback } from "@/components/writing/WritingFeedback";
import { WritingPrompt } from "@/components/writing/WritingPrompt";
import type { Track } from "@/lib/exams";
import type { FeedbackError } from "@/lib/feedback/types";
import type { TaskTexts, WritingResult, WritingSet } from "@/lib/writing/types";
import { countWords, wordStatus } from "@/lib/writing/words";

type Phase = "intro" | "writing" | "grading" | "error" | "results";

function emptyTexts(set: WritingSet): TaskTexts {
  return Object.fromEntries(set.tasks.map((t) => [t.id, ""]));
}

/** Send the texts to /api/feedback. Never throws: failures come back as a FeedbackError. */
async function requestFeedback(body: {
  track: Track;
  setId: string;
  texts: TaskTexts;
  durationSeconds: number;
}): Promise<{ result: WritingResult } | { error: FeedbackError }> {
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.attemptId) return { result: data as WritingResult };
    if (data?.error?.message) return { error: data.error as FeedbackError };
    return { error: { kind: "server", message: `The server answered with HTTP ${res.status}.` } };
  } catch {
    return {
      error: {
        kind: "server",
        message: "Couldn't reach the app server. Check that `npm run dev` is still running, then try again.",
      },
    };
  }
}

function Intro({ set, onStart }: { set: WritingSet; onStart: () => void }) {
  const tcf = set.exam === "tcf";
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {tcf ? "TCF Canada · Expression écrite" : "CELPIP · Writing"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{set.title}</h1>
        <p className="mt-2 text-sm text-muted">{set.summary}</p>
      </div>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>
          {tcf
            ? `One ${set.minutes}-minute timer for all three tasks. Move between them freely and plan your time (about 10, 20 and 30 minutes is a common split).`
            : `${set.minutes} minutes for this task, as in the real test.`}
        </li>
        <li>
          Word ranges:{" "}
          {set.tasks.map((t) => `${t.label.split(/[:]/)[0].trim()} ${t.minWords}–${t.maxWords}`).join(", ")}.
          The counter turns green when you are in range.
        </li>
        <li>Spell check is off, like the real exam.</li>
        <li>When time runs out your text is submitted automatically.</li>
        <li>
          An AI model then grades it strictly against the official rubric dimensions. This takes 15–60
          seconds and is an estimate, not an official score.
        </li>
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Start the timer
      </button>
    </section>
  );
}

/** Timed writing session → AI grading → feedback, with clear errors in between. */
export function WritingRunner({ set, track }: { set: WritingSet; track: Track }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [texts, setTexts] = useState<TaskTexts>(() => emptyTexts(set));
  const [active, setActive] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [error, setError] = useState<FeedbackError | null>(null);
  const [result, setResult] = useState<WritingResult | null>(null);
  const startedAt = useRef(0);
  const duration = useRef(0);
  const textsRef = useRef(texts);

  // Warn before leaving while there is unsaved writing.
  useEffect(() => {
    if (phase !== "writing" && phase !== "grading" && phase !== "error") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  function start() {
    const now = Date.now();
    startedAt.current = now;
    setEndsAt(now + set.minutes * 60_000);
    setPhase("writing");
  }

  function update(taskId: string, value: string) {
    const next = { ...textsRef.current, [taskId]: value };
    textsRef.current = next;
    setTexts(next);
  }

  async function submit() {
    if (phase === "writing") {
      duration.current = Math.round((Date.now() - startedAt.current) / 1000);
    }
    setPhase("grading");
    setError(null);
    const outcome = await requestFeedback({
      track,
      setId: set.id,
      texts: textsRef.current,
      durationSeconds: duration.current,
    });
    if ("result" in outcome) {
      setResult(outcome.result);
      setPhase("results");
      window.scrollTo({ top: 0 });
    } else {
      setError(outcome.error);
      setPhase("error");
    }
  }

  function submitEarly() {
    const short = set.tasks.filter(
      (t) => wordStatus(countWords(texts[t.id]), t.minWords, t.maxWords) !== "ok",
    );
    const warning = short.length
      ? `\n\nNot in the word range yet: ${short.map((t) => t.label.split(":")[0]).join(", ")}.`
      : "";
    if (window.confirm(`Submit for grading now? You can't edit afterwards.${warning}`)) void submit();
  }

  function onExpire() {
    setTimeUp(true);
    void submit();
  }

  function restart() {
    const blank = emptyTexts(set);
    textsRef.current = blank;
    setTexts(blank);
    setActive(0);
    setTimeUp(false);
    setResult(null);
    setError(null);
    setPhase("intro");
  }

  if (phase === "intro") return <Intro set={set} onStart={start} />;

  if (phase === "results" && result) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{set.title}</h1>
          <div className="flex gap-4 text-sm">
            <button type="button" onClick={restart} className="font-medium text-accent">
              Write this one again
            </button>
            <Link href={`/${track}/writing`} className="font-medium text-accent">
              All writing prompts
            </Link>
          </div>
        </div>
        <WritingFeedback set={set} result={result} />
      </div>
    );
  }

  const task = set.tasks[active];
  const locked = phase !== "writing";

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="min-w-0 truncate text-sm font-medium">{set.title}</p>
        <div className="flex items-center gap-3">
          {phase === "writing" ? (
            <Countdown endsAt={endsAt} onExpire={onExpire} />
          ) : (
            <span className="text-sm text-muted">{timeUp ? "Time's up" : "Submitted"}</span>
          )}
          {phase === "writing" ? (
            <button
              type="button"
              onClick={submitEarly}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
            >
              Submit
            </button>
          ) : null}
        </div>
      </div>

      {set.tasks.length > 1 ? (
        <nav aria-label="Tasks" className="flex flex-wrap gap-2">
          {set.tasks.map((t, i) => {
            const count = countWords(texts[t.id]);
            const ok = wordStatus(count, t.minWords, t.maxWords) === "ok";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active ? "step" : undefined}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  i === active ? "border-accent bg-accent-soft" : "border-border bg-surface"
                }`}
              >
                {t.label.split(":")[0].trim()}
                <span className={`ml-2 tabular-nums ${ok ? "text-good" : "text-muted"}`}>
                  {count} mots
                </span>
              </button>
            );
          })}
        </nav>
      ) : null}

      {phase === "grading" ? (
        <p role="status" className="rounded-xl border border-border bg-surface p-4 text-sm">
          {timeUp ? "Time's up — your text was submitted. " : ""}Grading with AI… this usually takes
          15–60 seconds.
        </p>
      ) : null}

      {phase === "error" && error ? (
        <FeedbackErrorPanel
          error={error}
          canEdit={!timeUp}
          onRetry={() => void submit()}
          onEdit={() => {
            setError(null);
            setPhase("writing");
          }}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-16 lg:self-start">
          <WritingPrompt task={task} />
        </div>
        <WritingEditor
          key={task.id}
          task={task}
          value={texts[task.id]}
          onChange={(v) => update(task.id, v)}
          readOnly={locked}
        />
      </div>
    </div>
  );
}
