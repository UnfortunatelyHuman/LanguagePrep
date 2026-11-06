"use server";

import { revalidatePath } from "next/cache";
import { isAiError } from "@/lib/ai";
import { ResultsSchema, saveExerciseResults } from "./attempts";
import { findLesson, getOrCreateLesson, regenerateLesson } from "./lessons";
import { getLesson } from "./syllabus";

export type ActionResult = { ok: true } | { ok: false; error: string };

function failure(where: string, error: unknown): ActionResult {
  if (isAiError(error)) {
    console.error(`[course] ${where}: AI ${error.kind}: ${error.message}`);
    return { ok: false, error: error.message };
  }
  console.error(`[course] ${where} failed`, error);
  return { ok: false, error: "Something went wrong on the server. Please try again." };
}

/** Make sure a lesson exists, generating it the first time. */
export async function prepareLessonAction(lessonId: string): Promise<ActionResult> {
  if (!getLesson(lessonId)) return { ok: false, error: "Unknown lesson." };
  try {
    await getOrCreateLesson(lessonId);
  } catch (error) {
    return failure(`lesson ${lessonId}`, error);
  }
  revalidatePath("/fr/learn", "layout");
  return { ok: true };
}

/** Write a lesson again (asked for explicitly when the content came out wrong). */
export async function regenerateLessonAction(lessonId: string): Promise<ActionResult> {
  if (!getLesson(lessonId)) return { ok: false, error: "Unknown lesson." };
  try {
    await regenerateLesson(lessonId);
  } catch (error) {
    return failure(`regenerate ${lessonId}`, error);
  }
  revalidatePath("/fr/learn", "layout");
  return { ok: true };
}

/** Save the first-try results of a lesson's exercises. */
export async function saveExercisesAction(
  lessonId: string,
  results: unknown,
): Promise<{ ok: true; attemptId: string } | { ok: false; error: string }> {
  const parsed = ResultsSchema.safeParse(results);
  const stored = await findLesson(lessonId);
  if (!parsed.success || !stored || parsed.data.some((r) => r.index >= stored.lesson.exercises.length)) {
    return { ok: false, error: "Those results don't match this lesson." };
  }
  try {
    return { ok: true, attemptId: await saveExerciseResults(lessonId, parsed.data) };
  } catch (error) {
    console.error("[course] saving exercise results failed", error);
    return { ok: false, error: "Couldn't save your results. Please try again." };
  }
}
