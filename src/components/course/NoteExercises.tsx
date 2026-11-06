"use client";

import type { Exercise } from "@/lib/course/schemas";
import { ExerciseRunner } from "./ExerciseRunner";

/** Exercises from an import, practised like a lesson's (results aren't saved). */
export function NoteExercises({ noteId, exercises }: { noteId: string; exercises: Exercise[] }) {
  return <ExerciseRunner exercises={exercises} idPrefix={`notes-${noteId}`} onFinish={() => {}} />;
}
