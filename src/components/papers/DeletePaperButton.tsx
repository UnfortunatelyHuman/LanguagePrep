"use client";

import { useActionState } from "react";
import { deletePaperAction, type DeletePaperState } from "@/lib/papers/actions";
import type { Track } from "@/lib/exams";

const INITIAL: DeletePaperState = { error: null, deleted: false };

/** Deletes one of the learner's papers after a confirm. Past attempts at it are kept. */
export function DeletePaperButton({ track, setId, title }: { track: Track; setId: string; title: string }) {
  const [state, action, pending] = useActionState(deletePaperAction, INITIAL);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Delete “${title}”? Your past scores on it are kept. This can't be undone.`)) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="track" value={track} />
      <input type="hidden" name="setId" value={setId} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-muted underline-offset-2 hover:text-warn hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.error ? (
        <span role="alert" className="ml-2 text-xs text-warn">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
