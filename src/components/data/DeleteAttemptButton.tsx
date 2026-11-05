"use client";

import { useActionState } from "react";
import { deleteAttemptAction, type DeleteState } from "@/lib/data-actions";
import type { Track } from "@/lib/exams";

const INITIAL: DeleteState = { error: null, deleted: false };

/**
 * Deletes one attempt (and its recordings) after a confirm. `afterDelete` is
 * where the server sends the user next, for pages that show the attempt itself.
 */
export function DeleteAttemptButton({
  track,
  attemptId,
  afterDelete,
  label = "Delete",
}: {
  track: Track;
  attemptId: string;
  afterDelete?: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState(deleteAttemptAction, INITIAL);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Delete this attempt and any recordings? This can't be undone.")) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="track" value={track} />
      <input type="hidden" name="attemptId" value={attemptId} />
      {afterDelete ? <input type="hidden" name="afterDelete" value={afterDelete} /> : null}
      <button
        type="submit"
        disabled={pending}
        aria-label={label === "Delete" ? "Delete this attempt" : undefined}
        className="text-xs text-muted underline-offset-2 hover:text-warn hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : label}
      </button>
      {state.error ? (
        <span role="alert" className="ml-2 text-xs text-warn">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
