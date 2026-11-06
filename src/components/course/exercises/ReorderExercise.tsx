"use client";

import { useMemo, useState } from "react";
import { checkReorder, reorderWords, shuffled } from "@/lib/course/check";
import type { Exercise } from "@/lib/course/schemas";
import type { Answered } from "./types";

type Reorder = Extract<Exercise, { type: "reorder" }>;

/** Tap the words in order to rebuild the sentence; tap a placed word to take it back. */
export function ReorderExercise({ exercise, seed, onAnswer }: { exercise: Reorder; seed: number; onAnswer: Answered }) {
  const { words, end } = useMemo(() => reorderWords(exercise.sentence), [exercise.sentence]);
  // Positions into `words`, so repeated words stay distinct.
  const pool = useMemo(() => shuffled(words.map((_, i) => i), seed), [words, seed]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const left = pool.filter((i) => !placed.includes(i));

  const check = () => {
    setDone(true);
    const chosen = placed.map((i) => words[i]);
    onAnswer(`${chosen.join(" ")}${end}`, checkReorder(exercise.sentence, chosen));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-medium">Put the words in order: “{exercise.translation}”</p>
      <div
        aria-label="Your sentence"
        className="flex min-h-14 flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-2"
        lang="fr"
      >
        {placed.map((i) => (
          <button
            key={i}
            type="button"
            disabled={done}
            onClick={() => setPlaced((p) => p.filter((x) => x !== i))}
            className="rounded-lg border border-accent bg-accent-soft px-3 py-1.5"
          >
            {words[i]}
          </button>
        ))}
        {placed.length ? <span>{end}</span> : <span className="text-sm text-muted">Tap the words below</span>}
      </div>
      <div className="flex flex-wrap gap-2" lang="fr">
        {left.map((i) => (
          <button
            key={i}
            type="button"
            disabled={done}
            onClick={() => setPlaced((p) => [...p, i])}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 hover:border-accent"
          >
            {words[i]}
          </button>
        ))}
      </div>
      {!done ? (
        <button
          type="button"
          onClick={check}
          disabled={left.length > 0}
          className="self-end rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Check
        </button>
      ) : null}
    </div>
  );
}
