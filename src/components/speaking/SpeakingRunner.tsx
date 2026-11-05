"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FeedbackErrorPanel } from "@/components/feedback/FeedbackErrorPanel";
import { Countdown } from "@/components/practice/Countdown";
import { SpeakingFeedback } from "@/components/speaking/SpeakingFeedback";
import { SpeakingPrompt } from "@/components/speaking/SpeakingPrompt";
import type { Track } from "@/lib/exams";
import { REQUEST_TIMEOUT_MS, type FeedbackError } from "@/lib/feedback/types";
import { formatClock } from "@/lib/practice/numbering";
import {
  Capture,
  MIC_MESSAGES,
  MicError,
  captureSupport,
  closeMicrophone,
  openMicrophone,
  speechLang,
} from "@/lib/speaking/capture";
import type { SpeakingResult, SpeakingSet, SpeakingTask } from "@/lib/speaking/types";
import { countWords } from "@/lib/writing/words";

type Phase = "intro" | "task" | "grading" | "error" | "results";
type Stage = "choose" | "prep" | "speak" | "saving" | "done";

type Answer = {
  transcript: string;
  seconds: number;
  choice?: "A" | "B";
  audio: Blob | null;
  url: string | null;
  recognitionError: string | null;
};

// Support never changes during a session, so one cached snapshot is enough.
const noSubscribe = () => () => {};
let supportSnapshot: ReturnType<typeof captureSupport> | null = null;
const getSupport = () => (supportSnapshot ??= captureSupport());

/** Wall-clock end of a timer that starts now. Called only from event handlers. */
function deadline(seconds: number): number {
  return Date.now() + seconds * 1000;
}

/** How long each timed stage of a task lasts. */
function stageSeconds(stage: Stage, task: SpeakingTask): number {
  if (stage === "choose") return task.chooseSeconds ?? 0;
  if (stage === "prep") return task.prepSeconds;
  if (stage === "speak") return task.speakSeconds;
  return 0;
}

function firstStage(task: SpeakingTask): Stage {
  if (task.chooseSeconds) return "choose";
  return task.prepSeconds > 0 ? "prep" : "speak";
}

function audioExtension(type: string): string {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

async function requestFeedback(
  meta: object,
  audio: [taskId: string, blob: Blob][],
): Promise<{ result: SpeakingResult } | { error: FeedbackError }> {
  const form = new FormData();
  form.set("meta", JSON.stringify(meta));
  for (const [taskId, blob] of audio) {
    form.set(`audio-${taskId}`, blob, `${taskId}.${audioExtension(blob.type)}`);
  }
  try {
    const res = await fetch("/api/speaking/feedback", {
      method: "POST",
      body: form,
      // The server gives up after ~3 minutes; don't wait forever if it never answers.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.attemptId) return { result: data as SpeakingResult };
    if (data?.error?.message) return { error: data.error as FeedbackError };
    return { error: { kind: "server", message: `The server answered with HTTP ${res.status}.` } };
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return { error: { kind: "provider", message: "Grading took too long (over 4 minutes). Try again in a moment." } };
    }
    return {
      error: {
        kind: "server",
        message: "Couldn't reach the app server. Check that `npm run dev` is still running, then try again.",
      },
    };
  }
}

function Intro({
  set,
  onStart,
  micMessage,
  starting,
}: {
  set: SpeakingSet;
  onStart: (tasks: SpeakingTask[]) => void;
  micMessage: string | null;
  starting: boolean;
}) {
  const support = useSyncExternalStore(noSubscribe, getSupport, () => null);
  const tcf = set.exam === "tcf";
  const blocked = support !== null && (!support.recognition || !support.microphone);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {tcf ? "TCF Canada · Expression orale" : "CELPIP · Speaking"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{set.title}</h1>
        <p className="mt-2 text-sm text-muted">{set.summary}</p>
      </div>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>Each task has a preparation timer, then a speaking timer. Recording starts and stops on its own.</li>
        <li>
          Your answer is recorded (kept so you can listen back) and transcribed by the browser, then an AI
          model grades the transcript strictly. Pronunciation can&apos;t be judged from a transcript.
        </li>
        <li>Use Chrome or Edge with a headset or a quiet room. Transcription needs an internet connection.</li>
        {tcf ? (
          <li>
            In the real test an examiner talks with you. Here you answer the examiner&apos;s questions in turn
            (tâche 1) and ask your own questions aloud (tâche 2).
          </li>
        ) : null}
      </ul>

      {support === null ? <p className="text-sm text-muted">Checking your browser…</p> : null}
      {blocked ? (
        <p role="alert" className="rounded-lg bg-warn/10 p-3 text-sm text-warn">
          This browser can&apos;t {support?.microphone ? "transcribe speech" : "use the microphone"}. Open the app in
          Chrome or Edge to practise speaking.
        </p>
      ) : null}
      {starting ? (
        <p role="status" className="text-sm text-muted">
          If your browser shows a permission prompt, choose <strong>Allow</strong> to use the microphone.
        </p>
      ) : null}
      {micMessage ? (
        <p role="alert" className="rounded-lg bg-warn/10 p-3 text-sm text-warn">
          {micMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={support === null || blocked || starting}
          onClick={() => onStart(set.tasks)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {starting ? "Waiting for the microphone…" : `Start the full test (${set.tasks.length} tasks)`}
        </button>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-accent">Or practise a single task</summary>
        <ul className="mt-2 flex flex-col gap-1.5">
          {set.tasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={support === null || blocked || starting}
                onClick={() => onStart([t])}
                className="text-left text-sm hover:text-accent disabled:opacity-50"
              >
                {t.label}{" "}
                <span className="text-muted">
                  ({t.prepSeconds ? `${t.prepSeconds} s prep, ` : ""}
                  {formatClock(t.speakSeconds)} speaking)
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

/** Timed speaking session → AI grading → feedback with playback. */
export function SpeakingRunner({ set, track }: { set: SpeakingSet; track: Track }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [queue, setQueue] = useState<SpeakingTask[]>([]);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("prep");
  const [endsAt, setEndsAt] = useState(0);
  const [choices, setChoices] = useState<Record<string, "A" | "B">>({});
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [heard, setHeard] = useState("");
  const [micMessage, setMicMessage] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<FeedbackError | null>(null);
  const [result, setResult] = useState<SpeakingResult | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const capture = useRef<Capture | null>(null);
  const urls = useRef<string[]>([]);
  const startedAt = useRef(0);

  // Release the microphone and object URLs when leaving the page.
  useEffect(
    () => () => {
      capture.current?.cancel();
      closeMicrophone(stream.current);
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  useEffect(() => {
    if (phase !== "task" && phase !== "grading" && phase !== "error") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const task = queue[index];

  function enterStage(next: Stage, t: SpeakingTask) {
    setStage(next);
    setEndsAt(deadline(stageSeconds(next, t)));
    if (next === "speak") beginCapture();
  }

  function beginCapture() {
    if (!stream.current) return;
    // Guard against a double start (button and timer on the same tick).
    capture.current?.cancel();
    setHeard("");
    const c = new Capture(stream.current, speechLang(set.exam), setHeard);
    capture.current = c;
    c.start();
  }

  async function start(tasks: SpeakingTask[]) {
    setStarting(true);
    setMicMessage(null);
    // A stream whose track ended (mic unplugged, headset disconnected) can't record.
    if (stream.current?.getAudioTracks().some((t) => t.readyState === "ended")) {
      closeMicrophone(stream.current);
      stream.current = null;
    }
    revokeUrls();
    try {
      stream.current ??= await openMicrophone();
    } catch (e) {
      setMicMessage(MIC_MESSAGES[e instanceof MicError ? e.problem : "other"]);
      setStarting(false);
      return;
    }
    setStarting(false);
    startedAt.current = deadline(0);
    setQueue(tasks);
    setIndex(0);
    setAnswers({});
    setChoices({});
    setPhase("task");
    enterStage(firstStage(tasks[0]), tasks[0]);
  }

  async function finishSpeaking() {
    const c = capture.current;
    if (!c || stage !== "speak") return;
    capture.current = null;
    setStage("saving");
    const captured = await c.stop();
    const url = captured.audio ? URL.createObjectURL(captured.audio) : null;
    if (url) urls.current.push(url);
    setAnswers((prev) => ({
      ...prev,
      [task.id]: { ...captured, choice: choices[task.id], url },
    }));
    setStage("done");
  }

  function onTimerEnd() {
    if (stage === "choose") enterStage("prep", task);
    else if (stage === "prep") enterStage("speak", task);
    else if (stage === "speak") void finishSpeaking();
  }

  function nextTask() {
    const next = index + 1;
    setIndex(next);
    enterStage(firstStage(queue[next]), queue[next]);
  }

  /** Free the previous run's playback URLs. */
  function revokeUrls() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
  }

  async function submit() {
    // Every answer is recorded by now; turn the mic (and its browser indicator) off.
    closeMicrophone(stream.current);
    stream.current = null;
    setPhase("grading");
    setError(null);
    const meta = {
      track,
      setId: set.id,
      durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      answers: queue
        .filter((t) => answers[t.id])
        .map((t) => ({
          taskId: t.id,
          transcript: answers[t.id].transcript,
          seconds: Math.round(answers[t.id].seconds * 10) / 10,
          choice: answers[t.id].choice,
        })),
    };
    const audio = queue.flatMap((t) => {
      const blob = answers[t.id]?.audio;
      return blob ? [[t.id, blob] as [string, Blob]] : [];
    });
    const outcome = await requestFeedback(meta, audio);
    if ("result" in outcome) {
      setResult(outcome.result);
      setPhase("results");
      window.scrollTo({ top: 0 });
    } else {
      setError(outcome.error);
      setPhase("error");
    }
  }

  function restart() {
    setPhase("intro");
    setResult(null);
    setError(null);
  }

  if (phase === "intro") {
    return <Intro set={set} onStart={start} micMessage={micMessage} starting={starting} />;
  }

  if (phase === "results" && result) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{set.title}</h1>
          <div className="flex gap-4 text-sm">
            <button type="button" onClick={restart} className="font-medium text-accent">
              Practise again
            </button>
            <Link href={`/${track}/speaking`} className="font-medium text-accent">
              All speaking sets
            </Link>
          </div>
        </div>
        <SpeakingFeedback set={set} result={result} />
      </div>
    );
  }

  const answer = task ? answers[task.id] : undefined;
  const isLast = index === queue.length - 1;
  const timerLabel = { choose: "Choose an option", prep: "Preparation", speak: "Recording" } as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="min-w-0 truncate text-sm font-medium">
          {set.title}
          {queue.length > 1 ? ` · task ${index + 1} of ${queue.length}` : ""}
        </p>
        {phase === "task" && (stage === "choose" || stage === "prep" || stage === "speak") ? (
          <div className="flex items-center gap-2 text-sm">
            <span className={stage === "speak" ? "font-medium text-warn" : "text-muted"}>
              {stage === "speak" ? "● " : ""}
              {timerLabel[stage]}
            </span>
            <Countdown key={`${task.id}-${stage}`} endsAt={endsAt} onExpire={onTimerEnd} label={`${timerLabel[stage]} time left`} />
          </div>
        ) : null}
      </div>

      {phase === "grading" ? (
        <p role="status" className="rounded-xl border border-border bg-surface p-4 text-sm">
          Grading with AI… this usually takes 20–60 seconds.
        </p>
      ) : null}
      {phase === "error" && error ? (
        <FeedbackErrorPanel error={error} canEdit={false} onRetry={() => void submit()} onDiscard={restart} />
      ) : null}

      {phase === "task" && task ? (
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-xl border border-border bg-surface p-4">
            <SpeakingPrompt
              task={task}
              choice={choices[task.id]}
              onChoose={
                // Options stay selectable during prep, so a choose timer that runs out isn't final.
                task.options && (stage === "choose" || stage === "prep")
                  ? (c) => setChoices((prev) => ({ ...prev, [task.id]: c }))
                  : undefined
              }
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
            {stage === "choose" ? (
              <>
                <p>Pick the option you prefer. Preparation starts when the timer ends.</p>
                <button
                  type="button"
                  disabled={!choices[task.id]}
                  onClick={() => enterStage("prep", task)}
                  className="self-start rounded-lg bg-accent px-3 py-1.5 font-medium text-white disabled:opacity-50"
                >
                  Confirm choice
                </button>
              </>
            ) : null}
            {stage === "prep" ? (
              <>
                <p>Plan your answer. Recording starts automatically when preparation ends.</p>
                {task.options && !choices[task.id] ? (
                  <p className="text-warn">Pick the option you&apos;ll talk about, and say it clearly in your answer.</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => enterStage("speak", task)}
                  className="self-start rounded-lg border border-border px-3 py-1.5 font-medium"
                >
                  I&apos;m ready, start recording
                </button>
              </>
            ) : null}
            {stage === "speak" ? (
              <>
                <p role="status" className="font-medium text-warn">
                  Recording… speak now.
                </p>
                <p className="text-muted">
                  {countWords(heard)} words recognized so far
                </p>
                <button
                  type="button"
                  onClick={() => void finishSpeaking()}
                  className="self-start rounded-lg border border-border px-3 py-1.5 font-medium"
                >
                  Finish this answer early
                </button>
              </>
            ) : null}
            {stage === "saving" ? (
              <p role="status" className="text-muted">
                Saving your answer…
              </p>
            ) : null}
            {stage === "done" && answer ? (
              <>
                <p className="font-medium">
                  Answer recorded: {Math.round(answer.seconds)} s, {countWords(answer.transcript)} words.
                </p>
                {answer.recognitionError ? (
                  <p className="rounded-lg bg-warn/10 p-2 text-warn">{answer.recognitionError}</p>
                ) : null}
                {answer.url ? (
                  <audio controls src={answer.url} className="w-full" />
                ) : null}
                <details>
                  <summary className="cursor-pointer text-accent">Transcript</summary>
                  <p className="mt-1 text-muted">{answer.transcript || "Nothing was recognized."}</p>
                </details>
                {isLast ? (
                  <button
                    type="button"
                    onClick={() => void submit()}
                    className="self-start rounded-lg bg-accent px-3 py-1.5 font-medium text-white"
                  >
                    Get AI feedback
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextTask}
                    className="self-start rounded-lg bg-accent px-3 py-1.5 font-medium text-white"
                  >
                    Next task
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
