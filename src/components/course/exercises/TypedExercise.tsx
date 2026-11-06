"use client";

import { useState } from "react";
import { checkTyped } from "@/lib/course/check";
import type { Exercise } from "@/lib/course/schemas";
import type { Answered } from "./types";

type Typed = Extract<Exercise, { type: "blank" | "translate" }>;

const ACCENTS = ["é", "è", "ê", "à", "â", "ç", "î", "ô", "û", "ù", "ë", "ï", "œ"];

/** Fill in the blank, or translate English → French; checked leniently. */
export function TypedExercise({ exercise, onAnswer }: { exercise: Typed; onAnswer: Answered }) {
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const blank = exercise.type === "blank";
  const [before, after] = blank ? exercise.sentence.split("___") : ["", ""];

  const submit = () => {
    if (!value.trim() || done) return;
    setDone(true);
    onAnswer(value.trim(), checkTyped(value, exercise.answers));
  };

  const input = (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && submit()}
      disabled={done}
      lang="fr"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      aria-label={blank ? "Missing word(s)" : "Your French translation"}
      className={`rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent ${
        blank ? "w-40 max-w-full" : "w-full"
      }`}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {blank ? (
        <p lang="fr" className="flex flex-wrap items-center gap-2 text-lg font-medium">
          <span>{before}</span>
          {input}
          <span>{after}</span>
        </p>
      ) : (
        <>
          <p className="text-lg font-medium">Translate into French: “{exercise.en}”</p>
          {input}
        </>
      )}
      {blank && exercise.hint ? <p className="text-sm text-muted">Hint: {exercise.hint}</p> : null}
      {!done ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue((v) => v + c)}
              className="size-8 rounded border border-border text-sm hover:border-accent"
              aria-label={`Type ${c}`}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Check
          </button>
        </div>
      ) : null}
    </div>
  );
}
