"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { placementMissingAction, preparePlacementAction, savePlacementAction } from "@/lib/course/actions";
import { TOTAL_QUESTIONS, pickQuestion, type Asked, type PoolItem } from "@/lib/course/placement";
import { stopSpeaking } from "@/lib/course/useSpeak";
import { SpeakButton } from "./SpeakButton";

const SKILL_LABEL = { grammar: "Grammar", vocabulary: "Vocabulary", reading: "Reading", listening: "Listening" } as const;
/** Listening items may be played this many times, like a short exam clip. */
const MAX_PLAYS = 2;

/**
 * The placement test: prepares the question pool on first use (one AI request
 * per level), then asks ~20 adaptive questions with no feedback until the end.
 */
export function PlacementRunner({ pool, seen, retake }: { pool: PoolItem[]; seen: string[]; retake: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "preparing" | "test" | "saving">("intro");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState<Asked[]>([]);
  const [plays, setPlays] = useState(0);
  const seenIds = new Set(seen);

  const start = async () => {
    setError(null);
    setPhase("preparing");
    const missing = await placementMissingAction().catch(() => null);
    if (!missing) {
      setError("Couldn't reach the server. Is it still running?");
      return setPhase("intro");
    }
    setProgress({ done: 0, total: missing.length });
    for (const [i, level] of missing.entries()) {
      const result = await preparePlacementAction(level).catch(() => null);
      if (!result?.ok) {
        setError(result?.error ?? "Couldn't reach the server. Is it still running?");
        return setPhase("intro");
      }
      setProgress({ done: i + 1, total: missing.length });
    }
    if (missing.length) router.refresh(); // fetch the new questions
    setAsked([]);
    setPlays(0);
    setPhase("test");
  };

  const question = phase === "test" ? pickQuestion(pool, asked, seenIds) : null;

  const answer = async (picked: number) => {
    if (!question) return;
    stopSpeaking();
    const next = [...asked, { questionId: question.id, skill: question.skill, level: question.level, picked, correct: picked === question.answer }];
    setAsked(next);
    setPlays(0);
    if (next.length < TOTAL_QUESTIONS) return;
    setPhase("saving");
    const saved = await savePlacementAction(next.map(({ questionId, picked }) => ({ questionId, picked }))).catch(() => null);
    if (saved?.ok) {
      setPhase("intro");
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setError(saved && !saved.ok ? saved.error : "Couldn't save the result.");
      setPhase("test");
      setAsked(asked);
    }
  };

  if (phase === "intro" || phase === "preparing") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <h2 className="text-lg font-semibold">{retake ? "Take it again" : "Find your level"}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {TOTAL_QUESTIONS} questions, about 10 minutes: grammar, vocabulary, reading and listening (turn your sound on).
            Questions get harder when you answer right and easier when you don&apos;t. There&apos;s no feedback until the
            end, and guessing makes the result less accurate: if you don&apos;t know, pick the option you think is most
            likely.
          </p>
        </div>
        {phase === "preparing" ? (
          <p role="status" className="text-sm">
            Preparing the questions{progress?.total ? ` (level ${progress.done + 1 > progress.total ? progress.total : progress.done + 1} of ${progress.total})` : ""}… The AI
            writes them once; later tests reuse them.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={start}
          disabled={phase === "preparing"}
          className="self-start rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {phase === "preparing" ? "Preparing…" : retake ? "Retake the placement test" : "Start the placement test"}
        </button>
      </div>
    );
  }

  if (phase === "saving" || !question) {
    return (
      <p role="status" className="rounded-xl border border-border bg-surface p-5 text-sm">
        {phase === "saving" ? "Working out your level…" : "Loading the questions…"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{SKILL_LABEL[question.skill]}</span>
        <span>
          Question {asked.length + 1} of {TOTAL_QUESTIONS}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle" aria-hidden="true">
        <div className="h-full bg-accent transition-all" style={{ width: `${(asked.length / TOTAL_QUESTIONS) * 100}%` }} />
      </div>
      <div key={question.id} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
        {question.passage ? (
          <p lang="fr" className="whitespace-pre-line rounded-lg bg-surface-subtle p-3 leading-relaxed">
            {question.passage}
          </p>
        ) : null}
        {question.audio ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface-subtle p-3 text-sm">
            {plays < MAX_PLAYS ? (
              <span onClickCapture={() => setPlays((n) => n + 1)}>
                <SpeakButton id={`placement-${question.id}`} text={question.audio} label="Play the audio" />
              </span>
            ) : null}
            <span className="text-muted">
              {plays < MAX_PLAYS ? `Listen, then answer (${MAX_PLAYS - plays} play${MAX_PLAYS - plays === 1 ? "" : "s"} left).` : "No plays left."}
            </span>
          </div>
        ) : null}
        <p lang="fr" className="text-lg font-medium">
          {question.stem}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option, i) => (
            <button
              key={i}
              type="button"
              onClick={() => answer(i)}
              lang="fr"
              className="rounded-lg border border-border px-4 py-3 text-left hover:border-accent"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      ) : null}
    </div>
  );
}
