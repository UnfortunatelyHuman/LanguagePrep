"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { formatClock } from "@/lib/reading/numbering";

/**
 * Time left until `endsAt`. Calls `onExpire` once when it reaches zero.
 * Remount it (via `key`) for each new part so it never shows a stale value.
 */
export function Countdown({
  endsAt,
  onExpire,
}: {
  endsAt: number;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        window.clearInterval(id);
        expire();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const urgent = left <= 60;

  return (
    <span
      role="timer"
      aria-label="Time left in this part"
      className={`rounded-md px-2 py-1 font-mono text-sm font-semibold tabular-nums ${
        urgent ? "bg-warn/15 text-warn" : "bg-surface-subtle"
      }`}
    >
      {formatClock(left)}
    </span>
  );
}
