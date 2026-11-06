"use client";

import { useState } from "react";
import { correctAnswer, isRight, type ExerciseResult, type Verdict } from "@/lib/course/check";
import type { Exercise } from "@/lib/course/schemas";
import { stopSpeaking } from "@/lib/course/useSpeak";
import { ChoiceExercise } from "./exercises/ChoiceExercise";
import { ReorderExercise } from "./exercises/ReorderExercise";
import { TypedExercise } from "./exercises/TypedExercise";

const TYPE_LABEL: Record<Exercise["type"], string> = {
  mcq: "Choose",
  blank: "Fill in the blank",
  reorder: "Reorder",
  translate: "Translate",
  listen: "Listen and choose",
};

function ExerciseView({ exercise, id, seed, onAnswer }: { exercise: Exercise; id: string; seed: number; onAnswer: (a: string, v: Verdict) => void }) {
  switch (exercise.type) {
    case "mcq":
    case "listen":
      return <ChoiceExercise exercise={exercise} id={id} onAnswer={onAnswer} />;
    case "blank":
    case "translate":
      return <TypedExercise exercise={exercise} onAnswer={onAnswer} />;
    case "reorder":
      return <ReorderExercise exercise={exercise} seed={seed} onAnswer={onAnswer} />;
  }
}

function Feedback({ exercise, result, onOverride }: { exercise: Exercise; result: ExerciseResult; onOverride?: () => void }) {
  const right = isRight(result);
  const explanation = "explanation" in exercise ? exercise.explanation : `“${exercise.translation}”`;
  return (
    <div
      role="status"
      className={`flex flex-col gap-2 rounded-lg p-4 text-sm ${right ? "bg-good-soft" : "bg-warn-soft"}`}
    >
      <p className="font-semibold">
        {result.overridden
          ? "Counted as right."
          : result.verdict === "correct"
            ? "Right!"
            : result.verdict === "accents"
              ? "Right, but check the accents."
              : "Not quite."}
      </p>
      {result.verdict !== "correct" ? (
        <p>
          Answer: <span lang="fr" className="font-medium">{correctAnswer(exercise)}</span>
          {exercise.type === "translate" && exercise.answers.length > 1 ? (
            <span className="block text-muted">Also accepted: {exercise.answers.slice(1).join(" · ")}</span>
          ) : null}
        </p>
      ) : null}
      <p className="leading-relaxed">{explanation}</p>
      {onOverride ? (
        <button type="button" onClick={onOverride} className="self-start text-xs text-muted underline">
          My translation means the same: count it as right
        </button>
      ) : null}
    </div>
  );
}

/**
 * The lesson's exercises one at a time. Only the first try counts; at the end,
 * missed ones can be practised again (not scored).
 */
export function ExerciseRunner({
  exercises,
  idPrefix,
  onFinish,
}: {
  exercises: Exercise[];
  idPrefix: string;
  onFinish: (results: ExerciseResult[]) => void;
}) {
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [index, setIndex] = useState(0);
  /** null: scored round; otherwise the indexes being practised again. */
  const [retry, setRetry] = useState<number[] | null>(null);
  const [retryPos, setRetryPos] = useState(0);
  const [retryAnswered, setRetryAnswered] = useState<ExerciseResult | null>(null);
  const [round, setRound] = useState(0);

  const finished = retry === null && results.length === exercises.length && index === exercises.length;
  const current = retry ? retry[retryPos] : index;
  const answered = retry ? retryAnswered : results.find((r) => r.index === current) ?? null;

  const answer = (text: string, verdict: Verdict) => {
    const result = { index: current, answer: text, verdict };
    if (retry) setRetryAnswered(result);
    else setResults((r) => [...r, result]);
  };

  const next = () => {
    stopSpeaking();
    if (retry) {
      setRetryAnswered(null);
      if (retryPos + 1 < retry.length) setRetryPos(retryPos + 1);
      else setRetry(null);
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex === exercises.length) onFinish(results);
  };

  const override = () =>
    setResults((list) => list.map((r) => (r.index === current ? { ...r, overridden: true } : r)));

  if (finished) {
    const right = results.filter(isRight).length;
    const missed = results.filter((r) => !isRight(r)).map((r) => r.index);
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <p className="text-lg font-semibold">
          {right} / {exercises.length} right on the first try
        </p>
        {missed.length ? (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              {missed.map((i) => (
                <li key={i}>
                  <span className="text-muted">{i + 1}.</span>{" "}
                  <span lang="fr">{correctAnswer(exercises[i])}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                setRetry(missed);
                setRetryPos(0);
                setRound((r) => r + 1);
              }}
              className="self-start rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
            >
              Practise the {missed.length} I missed again
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">Every one right. Excellent.</p>
        )}
      </div>
    );
  }

  const exercise = exercises[current];
  const position = retry ? `Again ${retryPos + 1} of ${retry.length}` : `${index + 1} of ${exercises.length}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{TYPE_LABEL[exercise.type]}</span>
        <span>{position}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle" aria-hidden="true">
        <div className="h-full bg-accent transition-all" style={{ width: `${(results.length / exercises.length) * 100}%` }} />
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <ExerciseView
          key={`${round}-${current}`}
          exercise={exercise}
          id={`${idPrefix}-${current}`}
          seed={current + 1 + round * 31}
          onAnswer={answer}
        />
      </div>
      {answered ? (
        <>
          <Feedback
            exercise={exercise}
            result={answered}
            onOverride={!retry && exercise.type === "translate" && !isRight(answered) ? override : undefined}
          />
          <button
            type="button"
            onClick={next}
            className="self-end rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white"
          >
            {retry ? (retryPos + 1 < retry.length ? "Next" : "Done") : index + 1 < exercises.length ? "Next" : "See results"}
          </button>
        </>
      ) : null}
    </div>
  );
}
