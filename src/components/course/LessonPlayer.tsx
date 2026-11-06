"use client";

import { useCallback, useState, type ReactNode } from "react";
import { saveExercisesAction } from "@/lib/course/actions";
import { isRight, type ExerciseResult } from "@/lib/course/check";
import type { Lesson } from "@/lib/course/schemas";
import { stopSpeaking } from "@/lib/course/useSpeak";
import { ExerciseRunner } from "./ExerciseRunner";
import { LessonExplanation } from "./LessonExplanation";
import { LessonSummary } from "./LessonSummary";
import { LessonTask } from "./LessonTask";
import { VocabList } from "./VocabList";

type Step = { id: string; label: string; render: () => ReactNode };

/** A lesson, one step at a time: explanation, vocabulary, exercises, task, summary. */
export function LessonPlayer({ lessonId, lesson, nextHref }: { lessonId: string; lesson: Lesson; nextHref: string | null }) {
  const [index, setIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exerciseScore, setExerciseScore] = useState<{ right: number; total: number } | null>(null);
  const [taskScore, setTaskScore] = useState<number | null>(null);
  const onSaved = useCallback((id: string) => setAttemptId(id), []);

  const finishExercises = async (results: ExerciseResult[]) => {
    setSaveError(null);
    setExerciseScore({ right: results.filter(isRight).length, total: results.length });
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
    {
      id: "task",
      label: lesson.task.kind === "speaking" ? "Speak" : "Write",
      render: () => (
        <LessonTask
          lessonId={lessonId}
          task={lesson.task}
          attemptId={attemptId}
          onGraded={(id, feedback) => {
            setAttemptId(id);
            setTaskScore(feedback.score);
          }}
        />
      ),
    },
    {
      id: "summary",
      label: "Summary",
      render: () => (
        <LessonSummary
          lessonId={lessonId}
          lesson={lesson}
          attemptId={attemptId}
          exercises={exerciseScore}
          taskScore={taskScore}
          nextHref={nextHref}
          active={steps[index]?.id === "summary"}
          onSaved={onSaved}
        />
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
            {steps[index].id === "task" && taskScore === null ? "Skip the task" : `Next: ${steps[index + 1].label}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
