"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/course/schemas";
import { SpeakButton } from "../SpeakButton";
import type { Answered } from "./types";

type Choice = Extract<Exercise, { type: "mcq" | "listen" }>;

/** Multiple choice, and listen-and-choose (audio first, transcript after answering). */
export function ChoiceExercise({ exercise, id, onAnswer }: { exercise: Choice; id: string; onAnswer: Answered }) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const listen = exercise.type === "listen";

  return (
    <div className="flex flex-col gap-4">
      {listen ? (
        <div className="flex items-center gap-3 rounded-lg bg-surface-subtle p-3 text-sm">
          <SpeakButton id={`${id}-audio`} text={exercise.audio} label="Play the audio" />
          {done ? (
            <span lang="fr" className="whitespace-pre-line">
              {exercise.audio}
            </span>
          ) : (
            <span className="text-muted">Listen (as often as you like), then answer.</span>
          )}
        </div>
      ) : null}
      <p lang="fr" className="text-lg font-medium">
        {listen ? exercise.question : exercise.prompt}
      </p>
      <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
        {exercise.options.map((option, i) => {
          const isAnswer = i === exercise.answer;
          const style = !done
            ? "border-border hover:border-accent"
            : isAnswer
              ? "border-good bg-good/10"
              : i === picked
                ? "border-warn bg-warn/10"
                : "border-border opacity-60";
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={done}
              onClick={() => {
                setPicked(i);
                onAnswer(option, isAnswer ? "correct" : "wrong");
              }}
              lang="fr"
              className={`rounded-lg border px-4 py-3 text-left ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
