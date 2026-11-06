"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regenerateLessonAction } from "@/lib/course/actions";

/** For a lesson that came out wrong: write it again (one AI request), after a confirm. */
export function RegenerateLessonButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Write this lesson again? It uses one AI request and replaces the current version.")) return;
          setError(null);
          start(async () => {
            const result = await regenerateLessonAction(lessonId);
            if (result.ok) router.refresh();
            else setError(result.error);
          });
        }}
        className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
      >
        {pending ? "Rewriting the lesson…" : "Something wrong with this lesson? Regenerate it"}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-warn">
          {error}
        </span>
      ) : null}
    </span>
  );
}
