"use client";

import { useEffect, useRef, useState } from "react";
import { CorrectionDiff, DiffLegend } from "@/components/writing/CorrectionDiff";
import { WordCount } from "@/components/writing/WordCount";
import { gradeTaskAction } from "@/lib/course/actions";
import type { GradedTask } from "@/lib/course/grade-task";
import type { Lesson } from "@/lib/course/schemas";
import { Capture, MIC_MESSAGES, MicError, captureSupport, closeMicrophone, openMicrophone } from "@/lib/speaking/capture";
import { diffWords } from "@/lib/writing/diff";
import { countWords } from "@/lib/writing/words";

type Task = Lesson["task"];

/** Record an answer and transcribe it (fr-CA); the transcript is what gets graded. */
function SpeakingAnswer({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [live, setLive] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const capture = useRef<Capture | null>(null);

  useEffect(
    () => () => {
      capture.current?.cancel();
      closeMicrophone(stream.current);
    },
    [],
  );
  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const start = async () => {
    setError(null);
    if (!captureSupport().recognition) {
      setError("Speech recognition needs Chrome or Edge. You can type your answer instead.");
      return;
    }
    try {
      stream.current ??= await openMicrophone();
    } catch (e) {
      setError(MIC_MESSAGES[e instanceof MicError ? e.problem : "other"]);
      return;
    }
    setLive("");
    setSeconds(0);
    capture.current = new Capture(stream.current, "fr-CA", (text) => setLive(text));
    capture.current.start();
    setState("recording");
  };

  const stop = async () => {
    const result = await capture.current?.stop();
    capture.current = null;
    closeMicrophone(stream.current);
    stream.current = null;
    setState("done");
    if (result?.recognitionError) setError(result.recognitionError);
    setLive(result?.transcript ?? live);
    onTranscript(result?.transcript ?? live);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {state === "recording" ? (
          <button type="button" onClick={stop} className="rounded-lg bg-warn px-4 py-2 text-sm font-semibold text-white">
            Stop ({seconds} s)
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {state === "done" ? "Record again" : "Start speaking"}
          </button>
        )}
        <span className="text-sm text-muted">Aim for about a minute. The transcript is what gets graded.</span>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      ) : null}
      <p lang="fr" className="min-h-16 rounded-lg border border-border bg-surface p-3 text-sm leading-relaxed">
        {live || <span className="text-muted">Your words appear here as you speak.</span>}
      </p>
    </div>
  );
}

function FeedbackView({ answer, feedback }: { answer: string; feedback: GradedTask }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-2xl font-extrabold tabular-nums">
          {feedback.score}
          <span className="text-base font-medium text-muted"> / 20</span>
        </p>
        <p className="text-sm">
          Shows about <span className="font-semibold">{feedback.cefr}</span>
          <span className="text-muted"> · 10/20 ≈ B2 (NCLC 7) · an AI estimate, not an official score</span>
        </p>
      </div>
      <p className="text-sm leading-relaxed">{feedback.summary}</p>
      <div>
        <h3 className="text-sm font-semibold">What worked</h3>
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm">
          {feedback.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Three fixes</h3>
        <ol className="mt-2 flex flex-col gap-3 text-sm">
          {feedback.fixes.map((fix, i) => (
            <li key={i} className="rounded-lg bg-surface-subtle p-3">
              <p className="font-medium">{fix.title}</p>
              <p className="mt-1 text-muted">{fix.explanation}</p>
              <p lang="fr" className="mt-2">
                <del className="text-warn">{fix.before}</del> → <ins className="text-good no-underline">{fix.after}</ins>
              </p>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Corrected version</h3>
        <DiffLegend />
        <CorrectionDiff parts={diffWords(answer, feedback.corrected)} lang="fr" />
      </div>
    </div>
  );
}

/** The lesson's mini writing or speaking task, graded by AI (one request). Skippable. */
export function LessonTask({
  lessonId,
  task,
  attemptId,
  onGraded,
}: {
  lessonId: string;
  task: Task;
  attemptId: string | null;
  onGraded: (attemptId: string, feedback: GradedTask) => void;
}) {
  const [mode, setMode] = useState<"writing" | "speaking">(task.kind);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graded, setGraded] = useState<{ answer: string; feedback: GradedTask } | null>(null);
  const words = countWords(text);

  const submit = async () => {
    setPending(true);
    setError(null);
    const result = await gradeTaskAction(lessonId, attemptId, text, mode).catch(() => null);
    setPending(false);
    if (!result) return setError("Couldn't reach the server. Is it still running?");
    if (!result.ok) return setError(result.error);
    setGraded({ answer: text, feedback: result.feedback });
    onGraded(result.attemptId, result.feedback);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-xs font-medium text-muted">{task.kind === "speaking" ? "Speaking task" : "Writing task"}</p>
        <p lang="fr" className="mt-1 text-lg font-medium">
          {task.promptFr}
        </p>
        <p className="mt-1 text-sm text-muted">{task.promptEn}</p>
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm">
          {task.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      {graded ? (
        <FeedbackView answer={graded.answer} feedback={graded.feedback} />
      ) : (
        <>
          {mode === "speaking" ? (
            <SpeakingAnswer onTranscript={setText} disabled={pending} />
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={pending}
                lang="fr"
                rows={7}
                spellCheck={false}
                aria-label="Your answer"
                className="rounded-lg border border-border bg-surface p-3 leading-relaxed outline-none focus:border-accent"
              />
              <WordCount count={words} min={task.minWords} max={task.maxWords} />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setText("");
              setMode(mode === "speaking" ? "writing" : "speaking");
            }}
            className="self-start text-xs text-muted underline"
          >
            {mode === "speaking" ? "Type the answer instead" : "Answer by speaking instead"}
          </button>
          {error ? (
            <p role="alert" className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !text.trim()}
            className="self-end rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Grading…" : "Get feedback"}
          </button>
        </>
      )}
    </div>
  );
}
