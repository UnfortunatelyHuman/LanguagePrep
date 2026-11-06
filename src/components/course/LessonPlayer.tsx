"use client";

import { useState, type ReactNode } from "react";
import { saveExercisesAction } from "@/lib/course/actions";
import type { ExerciseResult } from "@/lib/course/check";
import type { Lesson } from "@/lib/course/schemas";
import { stopSpeaking } from "@/lib/course/useSpeak";
import { ExerciseRunner } from "./ExerciseRunner";
import { LessonExplanation } from "./LessonExplanation";
import { VocabList } from "./VocabList";

type Step = { id: string; label: string; render: () => ReactNode };

/** A lesson, one step at a time: explanation, vocabulary, exercises. */
export function LessonPlayer({ lessonId, lesson }: { lessonId: string; lesson: Lesson }) {
  const [index, setIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const finishExercises = async (results: ExerciseResult[]) => {
    setSaveError(null);
    const saved = await saveExercisesAction(lessonId, results).catch(() => null);
    if (saved?.ok) setAttemptId(saved.attemptId);
    else setSaveError(saved?.error ?? "Couldn't reach the server to save your results.");
  };

  const steps: Step[] = [
    { id: "learn", label: "Learn", render: () => <LessonExplanation lesson={lesson} /> },
    { id: "words", label: "Words", render: () => <VocabList vocabulary={lesson.vocabulary} /> },
    {
      id: "practice",
      label: "Practice",
      render: () => (
        <div className="flex flex-col gap-3">
          <ExerciseRunner exercises={lesson.exercises} idPrefix={lessonId} onFinish={finishExercises} />
          {saveError ? (
            <p role="alert" className="text-sm text-warn">
              {saveError}
            </p>
          ) : attemptId ? (
            <p className="text-xs text-muted">Results saved.</p>
          ) : null}
        </div>
      ),
    },
  ];

  const go = (to: number) => {
    stopSpeaking();
    setIndex(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6">
      <ol aria-label="Lesson steps" className="flex flex-wrap gap-2 text-sm">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === index ? "step" : undefined}
              className={`rounded-full border px-3 py-1 ${
                i === index ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border text-muted"
              }`}
            >
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      {/* Every step stays mounted, so going back to the words keeps exercise progress. */}
      {steps.map((s, i) => (
        <div key={s.id} hidden={i !== index}>
          {s.render()}
        </div>
      ))}

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
        >
          Back
        </button>
        {index < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Next: {steps[index + 1].label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
