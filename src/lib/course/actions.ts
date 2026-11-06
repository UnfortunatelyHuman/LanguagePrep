"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAiError } from "@/lib/ai";
import { ResultsSchema, saveExerciseResults } from "./attempts";
import { addCards, addLessonCards, countActivity, reviewCard, saveCourseSettings } from "./cards";
import {
  ConversationClosed,
  MAX_MESSAGE_CHARS,
  deleteConversation,
  endConversation,
  sendMessage,
  startConversation,
  type StoredConversation,
} from "./conversation";
import { MAX_NOTES_CHARS, addNoteCards, deleteNotes, importNotes } from "./notes";
import { attemptFor, completeAttempt, gradeTask, saveTask, type GradedTask } from "./grade-task";
import { GRADES, type Grade } from "./srs";
import { findLesson, getOrCreateLesson, regenerateLesson } from "./lessons";
import { missingLevels, savePlacement, writeLevel } from "./placement-store";
import { TOTAL_QUESTIONS } from "./placement";
import { CEFR_LEVELS, getLesson, getScenario, getUnit, type Cefr } from "./syllabus";
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

/** Start a conversation (no AI request: the learner speaks first) and open it. */
export async function startConversationAction(form: FormData): Promise<void> {
  const raw = String(form.get("scenarioId") ?? "");
  const scenarioId = raw && getScenario(raw) ? raw : null;
  const id = await startConversation(scenarioId);
  redirect(`/fr/learn/chat/${id}`);
}

/** One message to the partner (one AI request); returns the updated conversation. */
export async function sendMessageAction(
  conversationId: string,
  text: string,
): Promise<{ ok: true; conversation: StoredConversation } | { ok: false; error: string }> {
  const message = String(text ?? "").trim();
  if (!message) return { ok: false, error: "Write something first." };
  if (message.length > MAX_MESSAGE_CHARS) return { ok: false, error: `Keep messages under ${MAX_MESSAGE_CHARS} characters.` };
  try {
    return { ok: true, conversation: await sendMessage(String(conversationId), message) };
  } catch (error) {
    if (error instanceof ConversationClosed) return { ok: false, error: "This conversation has ended. Start a new one." };
    const result = failure("chat", error);
    return result.ok ? { ok: false, error: "Unexpected result." } : result;
  }
}

export async function endConversationAction(conversationId: string): Promise<ActionResult> {
  await endConversation(String(conversationId));
  revalidatePath("/fr/learn/chat");
  return { ok: true };
}

export async function deleteConversationAction(form: FormData): Promise<void> {
  await deleteConversation(String(form.get("conversationId") ?? ""));
  revalidatePath("/fr/learn/chat");
  redirect("/fr/learn/chat");
}

const ChatCard = z.object({
  conversationId: z.string().min(1).max(40),
  kind: z.enum(["vocab", "phrase"]),
  front: z.string().trim().min(1).max(300),
  back: z.string().trim().min(1).max(600),
});

/** Save a new word or a correction from a conversation to the daily review. */
export async function saveChatCardAction(input: unknown): Promise<ActionResult> {
  const parsed = ChatCard.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nothing to save." };
  const { conversationId, kind, front, back } = parsed.data;
  await addCards("chat", conversationId, [{ kind, front, back }]);
  return { ok: true };
}

/** Read the partner's replies aloud automatically. */
export async function setTtsRepliesAction(on: boolean): Promise<ActionResult> {
  await saveCourseSettings({ ttsReplies: !!on });
  return { ok: true };
}

export type NotesState = { error: string | null };

/** Form action: notes → proposed cards and exercises (one AI request per ~5,000 characters), then open them. */
export async function importNotesAction(_prev: NotesState, form: FormData): Promise<NotesState> {
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const text = String(form.get("notes") ?? "").trim();
  if (text.length < 20) return { error: "Paste a few notes first (at least a couple of words with their meaning)." };
  if (text.length > MAX_NOTES_CHARS) return { error: `That's more than ${MAX_NOTES_CHARS.toLocaleString("en-CA")} characters. Import it in parts.` };
  let id: string;
  try {
    id = await importNotes(title, text);
  } catch (error) {
    const result = failure("notes import", error);
    return { error: result.ok ? "Unexpected result." : result.error };
  }
  revalidatePath("/fr/learn/notes");
  redirect(`/fr/learn/notes/${id}`);
}

/** Add the ticked cards from an import to the daily review. */
export async function addNoteCardsAction(noteId: string, keep: number[]): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const indexes = z.array(z.number().int().min(0).max(100)).max(100).safeParse(keep);
  if (!indexes.success) return { ok: false, error: "Pick the cards to add." };
  try {
    const added = await addNoteCards(String(noteId), indexes.data);
    revalidatePath("/fr/learn", "layout");
    return { ok: true, added };
  } catch (error) {
    console.error("[course] adding note cards failed", error);
    return { ok: false, error: "Couldn't add the cards." };
  }
}

export async function deleteNotesAction(form: FormData): Promise<void> {
  await deleteNotes(String(form.get("noteId") ?? ""));
  revalidatePath("/fr/learn/notes");
  redirect("/fr/learn/notes");
}
