"use client";

import { useActionState, useState } from "react";
import { generateSetAction, type GenerateState } from "@/lib/generate/actions";
import type { GenerateOption } from "@/lib/generate/kinds";
import type { Track } from "@/lib/exams";

/** Pick a kind (and optionally a theme); the server writes the set and opens it. */
export function GenerateForm({ track, options }: { track: Track; options: GenerateOption[] }) {
  const [state, action, pending] = useActionState<GenerateState, FormData>(generateSetAction, { error: null });
  const [kind, setKind] = useState(options[0]?.kind ?? "");

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="track" value={track} />
      <fieldset className="flex flex-col gap-2" disabled={pending}>
        <legend className="mb-1 text-sm font-medium">What should the AI write?</legend>
        {options.map((o) => (
          <label
            key={o.kind}
            className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
              kind === o.kind ? "border-accent bg-accent-soft" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={o.kind}
              checked={kind === o.kind}
              onChange={() => setKind(o.kind)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{o.label}</span>
              <span className="block text-muted">{o.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Theme (optional)</span>
        <input
          name="topic"
          maxLength={120}
          disabled={pending}
          placeholder={track === "fr" ? "ex. le logement, la santé, le bénévolat" : "e.g. housing, healthcare, volunteering"}
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
        />
      </label>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-warn/10 p-3 text-sm text-warn">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !kind}
        className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Writing your set… (about 20–60 s)" : "Generate and open"}
      </button>
    </form>
  );
}
