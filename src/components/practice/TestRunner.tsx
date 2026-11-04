"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Countdown } from "@/components/practice/Countdown";
import { ListeningClip, type ClipStatus } from "@/components/practice/ListeningClip";
import { SectionView } from "@/components/practice/SectionView";
import { SoundCheck } from "@/components/practice/SoundCheck";
import { TestResults } from "@/components/practice/TestResults";
import { submitAttempt } from "@/lib/practice/actions";
import { questionNumbers } from "@/lib/practice/numbering";
import { localeFor } from "@/lib/practice/speech";
import type {
  Answers,
  ClientPart,
  ClientTestSet,
  TestResult,
} from "@/lib/practice/types";

type Phase = "intro" | "test" | "results";

const partQuestions = (part: ClientPart) =>
  part.sections.flatMap((s) => s.questions);

/**
 * Timed multiple-choice test, shared by reading and listening.
 *
 * Each part has its own clock; when it runs out (or you finish the part) the
 * test moves on and the part is locked, as in CELPIP. TCF is one timed block.
 * Reading lets you move freely between screens inside a part. Listening only
 * moves forward, and each clip plays once.
 */
export function TestRunner({ set, track }: { set: ClientTestSet; track: string }) {
  const numbers = useMemo(() => questionNumbers(set), [set]);
  const listening = set.skill === "listening";
  const locale = localeFor(set.exam);

  const [phase, setPhase] = useState<Phase>("intro");
  const [partIndex, setPartIndex] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [clips, setClips] = useState<Record<string, ClipStatus>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [partEndsAt, setPartEndsAt] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const part = set.parts[partIndex];
  const section = part.sections[sectionIndex];
  const isLastPart = partIndex === set.parts.length - 1;
  const isLastSection = sectionIndex === part.sections.length - 1;

  // Leaving mid-test loses the answers, so ask first.
  useEffect(() => {
    if (phase !== "test") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  function start() {
    const now = Date.now();
    setAnswers({});
    setClips({});
    setResult(null);
    setError(null);
    setPartIndex(0);
    setSectionIndex(0);
    setStartedAt(now);
    setPartEndsAt(now + set.parts[0].minutes * 60_000);
    setPhase("test");
    scrollTop();
  }

  function submit() {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    setDurationSeconds(seconds);
    setError(null);
    startSubmit(async () => {
      try {
        const res = await submitAttempt({
          track,
          skill: set.skill,
          setId: set.id,
          answers,
          durationSeconds: seconds,
        });
        setResult(res);
        setPhase("results");
        scrollTop();
      } catch {
        setError("Could not save or score the test. Your answers are still here — try again.");
      }
    });
  }

  function advancePart() {
    if (isLastPart) {
      submit();
      return;
    }
    const next = partIndex + 1;
    setPartIndex(next);
    setSectionIndex(0);
    setPartEndsAt(Date.now() + set.parts[next].minutes * 60_000);
    scrollTop();
  }

  function finishPart() {
    const open = partQuestions(part).filter((q) => answers[q.id] === undefined);
    if (open.length) {
      const where = isLastPart ? "submit the test" : "move to the next part";
      const ok = window.confirm(
        `${open.length} question${open.length > 1 ? "s" : ""} in this part ${
          open.length > 1 ? "are" : "is"
        } unanswered. ${isLastPart ? "Submit" : "Move on"} anyway? You can't come back once you ${where}.`,
      );
      if (!ok) return;
    }
    advancePart();
  }

  function nextSection() {
    setSectionIndex((i) => i + 1);
    scrollTop();
  }

  function onExpire() {
    if (!submitting) advancePart();
  }

  if (phase === "intro") {
    return <Intro set={set} onStart={start} />;
  }

  if (phase === "results" && result) {
    return (
      <TestResults
        set={set}
        track={track}
        numbers={numbers}
        result={result}
        durationSeconds={durationSeconds}
        onRetake={start}
      />
    );
  }

  const inPart = partQuestions(part);
  const answeredInPart = inPart.filter((q) => answers[q.id] !== undefined).length;
  const clipStatus = clips[section.id] ?? "idle";
  const audio = section.audio ? (
    <ListeningClip
      key={section.id}
      clip={section.audio}
      speakers={set.speakers ?? {}}
      locale={locale}
      status={clipStatus}
      onStatusChange={(status) =>
        setClips((c) =>
          // A clip that has finished never goes back to idle or playing.
          c[section.id] === "done" ? c : { ...c, [section.id]: status },
        )
      }
    />
  ) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="mr-auto min-w-0">
            <p className="truncate text-sm font-semibold">{part.title}</p>
            <p className="text-xs text-muted">
              {set.parts.length > 1
                ? `Part ${partIndex + 1} of ${set.parts.length} · `
                : ""}
              {answeredInPart}/{inPart.length} answered
            </p>
          </div>
          <Countdown key={partIndex} endsAt={partEndsAt} onExpire={onExpire} />
        </div>

        {part.sections.length > 1 ? (
          <nav aria-label="Screens in this part" className="mt-3 flex flex-wrap gap-1.5">
            {part.sections.map((s, i) => {
              const done = s.questions.every((q) => answers[q.id] !== undefined);
              const first = numbers[s.questions[0].id];
              const last = numbers[s.questions[s.questions.length - 1].id];
              // Listening is forward-only, so earlier screens can't be reopened.
              const locked = listening && i !== sectionIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSectionIndex(i)}
                  disabled={locked}
                  aria-current={i === sectionIndex ? "step" : undefined}
                  className={`min-w-9 rounded-md border px-2 py-1 font-mono text-xs disabled:cursor-default ${
                    i === sectionIndex
                      ? "border-accent bg-accent text-white"
                      : done
                        ? "border-accent/40 bg-accent-soft"
                        : "border-border bg-surface"
                  } ${locked && i > sectionIndex ? "opacity-50" : ""}`}
                >
                  {first === last ? first : `${first}–${last}`}
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>

      {sectionIndex === 0 && part.instructions ? (
        <p className="text-sm font-medium">{part.instructions}</p>
      ) : null}

      <SectionView
        key={section.id}
        section={section}
        numbers={numbers}
        answers={answers}
        onAnswer={(id, option) => setAnswers((a) => ({ ...a, [id]: option }))}
        audio={audio}
        questionsHidden={Boolean(set.questionsAfterAudio && audio && clipStatus !== "done")}
      />

      {error ? (
        <p role="alert" className="rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {listening ? (
          <span className="text-xs text-muted">You can&apos;t go back to earlier clips.</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSectionIndex((i) => i - 1);
              scrollTop();
            }}
            disabled={sectionIndex === 0}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Previous
          </button>
        )}
        {isLastSection ? (
          <button
            type="button"
            onClick={finishPart}
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Scoring…" : isLastPart ? "Submit test" : "Finish part →"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (
                listening &&
                section.questions.some((q) => answers[q.id] === undefined) &&
                !window.confirm("Some questions on this screen are unanswered. Move on anyway?")
              ) {
                return;
              }
              nextSection();
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function Intro({ set, onStart }: { set: ClientTestSet; onStart: () => void }) {
  const total = set.parts.reduce((n, p) => n + partQuestions(p).length, 0);
  const minutes = set.parts.reduce((n, p) => n + p.minutes, 0);
  const multiPart = set.parts.length > 1;
  const listening = set.skill === "listening";

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{set.title}</h1>
        <p className="mt-2 text-sm text-muted">{set.summary}</p>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm">
        {set.parts.map((p) => (
          <li key={p.id} className="flex justify-between gap-3 px-3 py-2.5">
            <span>{p.title}</span>
            <span className="shrink-0 text-muted">
              {partQuestions(p).length} questions · {p.minutes} min
            </span>
          </li>
        ))}
      </ul>

      <ul className="list-disc pl-5 text-sm leading-relaxed text-muted">
        <li>
          {total} questions, {minutes} minutes of timed work.
        </li>
        {multiPart ? (
          <li>Each part has its own timer. When it runs out, the test moves to the next part.</li>
        ) : (
          <li>One timer for the whole paper.</li>
        )}
        {listening ? (
          <>
            <li>Press Play to start each clip. It plays once, with no pause or replay.</li>
            {set.questionsAfterAudio ? (
              <li>The questions appear when the clip ends, as in the real test.</li>
            ) : (
              <li>Read the question first, then play the recording.</li>
            )}
            <li>You can only move forward. Transcripts are shown in the review.</li>
          </>
        ) : multiPart ? (
          <li>You can move between screens inside a part, but not back to a finished part.</li>
        ) : (
          <li>You can move freely between questions.</li>
        )}
        <li>Unanswered questions count as wrong, so answer every one.</li>
        <li>Your answers are scored and saved when you submit or the time runs out.</li>
      </ul>

      {listening ? <SoundCheck set={set} /> : null}

      <button
        type="button"
        onClick={onStart}
        className="self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white"
      >
        Start the test
      </button>
    </section>
  );
}
