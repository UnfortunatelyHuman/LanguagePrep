"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setNewCardsPerDayAction } from "@/lib/course/actions";

/** How many new cards a day join the review queue. */
export function NewCardsSetting({ value }: { value: number }) {
  const router = useRouter();
  const [count, setCount] = useState(value);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await setNewCardsPerDayAction(count);
          setMessage(result.ok ? "Saved." : result.error);
          if (result.ok) router.refresh();
        });
      }}
    >
      <label htmlFor="new-per-day" className="text-muted">
        New cards per day
      </label>
      <input
        id="new-per-day"
        type="number"
        min={0}
        max={50}
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        className="w-16 rounded-lg border border-border bg-surface px-2 py-1"
      />
      <button type="submit" disabled={pending || count === value} className="rounded-lg border border-border px-3 py-1 disabled:opacity-40">
        Save
      </button>
      {message ? <span className="text-xs text-muted">{message}</span> : null}
    </form>
  );
}
