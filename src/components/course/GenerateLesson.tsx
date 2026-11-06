"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { prepareLessonAction } from "@/lib/course/actions";

/** Shown the first time a lesson is opened: asks the server to write it, then reloads. */
export function GenerateLesson({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [run, setRun] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    // One request per run, even when effects fire twice in development.
    if (started.current === run) return;
    started.current = run;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    prepareLessonAction(lessonId)
      .then((result) => {
        if (result.ok) router.refresh();
        else setError(result.error);
      })
      .catch(() => setError("Couldn't reach the server. Is it still running?"))
      .finally(() => window.clearInterval(timer));
    return () => window.clearInterval(timer);
  }, [lessonId, run, router]);

  if (error) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-xl border border-warn/40 bg-warn/10 p-5 text-sm">
        <p className="font-semibold">The lesson couldn&apos;t be written.</p>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setSeconds(0);
            setRun((r) => r + 1);
          }}
          className="self-start rounded-lg bg-accent px-4 py-2 font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-8 text-center">
      <span className="size-8 animate-spin rounded-full border-4 border-accent/30 border-t-accent" aria-hidden="true" />
      <p className="font-semibold">Preparing your lesson…</p>
      <p className="max-w-sm text-sm text-muted">
        The AI is writing it now ({seconds} s; usually under a minute). It&apos;s saved afterwards, so this only happens
        once.
      </p>
    </div>
  );
}
