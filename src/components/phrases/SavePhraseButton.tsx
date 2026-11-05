"use client";

import { useState } from "react";
import { savePhrase } from "@/lib/phrase-actions";
import type { Track } from "@/lib/exams";
import type { Fix } from "@/lib/writing/types";

type Status = "idle" | "saving" | "saved" | "error";

/** Adds a feedback fix's better version to the phrase bank's "Saved from feedback" deck. */
export function SavePhraseButton({
  track,
  source,
  fix,
}: {
  track: Track;
  source: "writing" | "speaking";
  fix: Fix;
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function save() {
    setStatus("saving");
    const result = await savePhrase({
      track,
      source,
      phrase: fix.after,
      note: `${fix.title}. ${fix.explanation}`,
      before: fix.before,
    }).catch(() => ({ ok: false }));
    setStatus(result.ok ? "saved" : "error");
  }

  if (status === "saved") {
    return (
      <p role="status" className="mt-2 text-xs text-good">
        ✓ Saved to your phrase bank
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs">
      <button
        type="button"
        disabled={status === "saving"}
        onClick={() => void save()}
        className="font-medium text-accent disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : "+ Save to phrase bank"}
      </button>
      {status === "error" ? (
        <span role="alert" className="ml-2 text-warn">
          Couldn&apos;t save. Try again.
        </span>
      ) : null}
    </p>
  );
}
