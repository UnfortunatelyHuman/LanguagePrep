"use server";

import { revalidatePath } from "next/cache";
import { isAiError } from "@/lib/ai";
import { ResultsSchema, saveExerciseResults } from "./attempts";
import { addLessonCards, countActivity, reviewCard, saveCourseSettings } from "./cards";
import { attemptFor, completeAttempt, gradeTask, saveTask, type GradedTask } from "./grade-task";
import { GRADES, type Grade } from "./srs";
import { findLesson, getOrCreateLesson, regenerateLesson } from "./lessons";
import { missingLevels, savePlacement, writeLevel } from "./placement-store";
import { TOTAL_QUESTIONS } from "./placement";
import { CEFR_LEVELS, getLesson, getUnit, type Cefr } from "./syllabus";
import { z } from "zod";
import { countWords } from "@/lib/writing/words";

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

/** Fewest words worth sending for feedback (saves quota on accidental submits). */
const MIN_TASK_WORDS = 5;
const MAX_TASK_CHARS = 4000;

/** Grade the lesson's mini task (one AI request) and save it on the attempt. */
export async function gradeTaskAction(
  lessonId: string,
  attemptId: string | null,
  text: string,
  kind: "writing" | "speaking",
): Promise<{ ok: true; attemptId: string; feedback: GradedTask } | { ok: false; error: string }> {
  if (kind !== "writing" && kind !== "speaking") return { ok: false, error: "Unknown task kind." };
  const stored = await findLesson(lessonId);
  const unit = stored && getUnit(stored.unitId);
  if (!stored || !unit) return { ok: false, error: "Unknown lesson." };
  const answer = String(text ?? "").trim().slice(0, MAX_TASK_CHARS);
  if (countWords(answer) < MIN_TASK_WORDS) {
    return { ok: false, error: `Write or say at least ${MIN_TASK_WORDS} words before asking for feedback.` };
  }
  try {
    const feedback = await gradeTask(stored.lesson, unit.level, answer, kind);
    const id = await attemptFor(lessonId, attemptId);
    await saveTask(id, kind, answer, feedback);
    return { ok: true, attemptId: id, feedback };
  } catch (error) {
    const result = failure(`task ${lessonId}`, error);
    return result.ok ? { ok: false, error: "Unexpected result." } : result;
  }
}

/** Mark the lesson done (reaching the summary). */
export async function completeLessonAction(
  lessonId: string,
  attemptId: string | null,
): Promise<{ ok: true; attemptId: string; cardsAdded: number } | { ok: false; error: string }> {
  if (!getLesson(lessonId)) return { ok: false, error: "Unknown lesson." };
  try {
    const id = await attemptFor(lessonId, attemptId);
    await completeAttempt(id);
    const cardsAdded = await addLessonCards(lessonId);
    await countActivity("lessons");
    revalidatePath("/fr/learn", "layout");
    return { ok: true, attemptId: id, cardsAdded };
  } catch (error) {
    console.error("[course] completing lesson failed", error);
    return { ok: false, error: "Couldn't save your progress. Please try again." };
  }
}

/** Write the questions for one placement level (one AI request, once ever). */
export async function preparePlacementAction(level: string): Promise<ActionResult> {
  if (!(CEFR_LEVELS as readonly string[]).includes(level)) return { ok: false, error: "Unknown level." };
  try {
    await writeLevel(level as Cefr);
    return { ok: true };
  } catch (error) {
    return failure(`placement ${level}`, error);
  }
}

/** Levels still to write (the page asks for them one at a time, with progress). */
export async function placementMissingAction(): Promise<Cefr[]> {
  return missingLevels();
}

const Picks = z
  .array(z.object({ questionId: z.string().min(1).max(40), picked: z.number().int().min(0).max(3) }))
  .min(1)
  .max(TOTAL_QUESTIONS);

/** Save a finished placement test; levels are computed on the server. */
export async function savePlacementAction(picks: unknown): Promise<ActionResult> {
  const parsed = Picks.safeParse(picks);
  if (!parsed.success) return { ok: false, error: "Those answers don't look right." };
  try {
    await savePlacement(parsed.data);
  } catch (error) {
    return failure("saving placement", error);
  }
  revalidatePath("/fr/learn", "layout");
  return { ok: true };
}

/** Record one review in the daily queue. */
export async function reviewCardAction(cardId: string, grade: string): Promise<ActionResult> {
  if (typeof cardId !== "string" || !GRADES.includes(grade as Grade)) return { ok: false, error: "Bad review." };
  try {
    const due = await reviewCard(cardId, grade as Grade);
    return due ? { ok: true } : { ok: false, error: "That card no longer exists." };
  } catch (error) {
    console.error("[course] review failed", error);
    return { ok: false, error: "Couldn't save the review." };
  }
}

/** How many new cards the daily queue introduces. */
export async function setNewCardsPerDayAction(count: number): Promise<ActionResult> {
  if (!Number.isInteger(count) || count < 0 || count > 50) return { ok: false, error: "Choose 0–50." };
  await saveCourseSettings({ newCardsPerDay: count });
  revalidatePath("/fr/learn", "layout");
  return { ok: true };
}
