"use client";

import Link from "next/link";
import { useState } from "react";
import { saveCheckpointAction } from "@/lib/course/actions";
import { isRight, type ExerciseResult } from "@/lib/course/check";
import type { Exercise } from "@/lib/course/schemas";
import { ExerciseRunner } from "./ExerciseRunner";

/** The checkpoint quiz; saves the first-try score and says whether the level is passed. */
export function CheckpointRunner({ level, exercises, passPercent }: { level: string; exercises: Exercise[]; passPercent: number }) {
  const [outcome, setOutcome] = useState<{ right: number; total: number; passed: boolean | null; error?: string } | null>(null);

  const finish = async (results: ExerciseResult[]) => {
    const right = results.filter(isRight).length;
    setOutcome({ right, total: results.length, passed: null });
    const saved = await saveCheckpointAction(level, results).catch(() => null);
    setOutcome({
      right,
      total: results.length,
      passed: saved?.ok ? saved.passed : null,
      error: saved?.ok ? undefined : "Couldn't save the result.",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {outcome ? (
        <div
          role="status"
          className={`rounded-xl p-4 text-sm ${outcome.passed ? "bg-good-soft" : outcome.passed === false ? "bg-warn-soft" : "bg-surface-subtle"}`}
        >
          <p className="text-lg font-semibold">
            {outcome.passed === null
              ? outcome.error ?? "Saving…"
              : outcome.passed
                ? `${level} checkpoint passed!`
                : `Not yet: ${passPercent}% needed.`}
          </p>
          <p className="mt-1">
            {outcome.right} / {outcome.total} ({Math.round((outcome.right / outcome.total) * 100)}%).{" "}
            {outcome.passed === false ? "Review the lessons you found hard, then try again: the questions change each time." : ""}
          </p>
          <Link href="/fr/learn" className="mt-2 inline-block font-medium text-accent">
            Back to the course →
          </Link>
        </div>
      ) : null}
      <ExerciseRunner exercises={exercises} idPrefix={`checkpoint-${level}`} onFinish={finish} />
    </div>
  );
}
