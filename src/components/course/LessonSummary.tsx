"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { completeLessonAction } from "@/lib/course/actions";
import type { Lesson } from "@/lib/course/schemas";

/** Last step: takeaways and scores. Reaching it marks the lesson done (once). */
export function LessonSummary({
  lessonId,
  lesson,
  attemptId,
  exercises,
  taskScore,
  nextHref,
  active,
  onSaved,
}: {
  lessonId: string;
  lesson: Lesson;
  attemptId: string | null;
  exercises: { right: number; total: number } | null;
  taskScore: number | null;
  nextHref: string | null;
  /** Only completes when the step is actually shown. */
  active: boolean;
  onSaved: (attemptId: string) => void;
}) {
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const done = useRef(false);

  useEffect(() => {
    if (!active || done.current) return;
    done.current = true;
    completeLessonAction(lessonId, attemptId)
      .then((r) => {
        if (r.ok) {
          setState("saved");
          onSaved(r.attemptId);
        } else setState("error");
      })
      .catch(() => setState("error"));
  }, [active, lessonId, attemptId, onSaved]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Exercises, first try</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {exercises ? `${exercises.right} / ${exercises.total}` : "–"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">{lesson.task.kind === "speaking" ? "Speaking" : "Writing"} task (AI estimate)</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{taskScore === null ? "skipped" : `${taskScore} / 20`}</p>
        </div>
      </div>
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="font-semibold">Remember</h3>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
          {lesson.takeaways.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-muted" role="status">
        {state === "saved"
          ? "Lesson complete and saved."
          : state === "error"
            ? "Couldn't save your progress; reload the page to try again."
            : "Saving…"}
      </p>
      <div className="flex flex-wrap gap-3">
        {nextHref ? (
          <Link href={nextHref} className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white">
            Next lesson →
          </Link>
        ) : null}
        <Link href="/fr/learn" className="rounded-lg border border-border px-5 py-2 text-sm">
          Back to the course
        </Link>
      </div>
    </div>
  );
}
