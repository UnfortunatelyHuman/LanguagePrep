import "server-only";
import { io } from "next/cache";
import { generateJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { lessonFixture } from "./fixtures";
import { lessonPrompt } from "./prompts";
import { LessonSchema, type Lesson } from "./schemas";
import { findCourseLesson } from "./units";

/**
 * Lessons are generated once, the first time they're opened, and kept. A row
 * with status "generating" is the claim: whoever creates it calls the AI,
 * anyone else waits for it to turn "ready". A claim older than CLAIM_STALE_MS
 * (a crashed request) can be taken over. A failed generation deletes its row
 * so the next visit can try again.
 */

const CLAIM_STALE_MS = 4 * 60_000;
const WAIT_STEP_MS = 1500;
const WAIT_MAX_MS = 200_000;

export type StoredLesson = { id: string; unitId: string; level: string; lesson: Lesson; model: string | null; createdAt: Date };

function toStored(row: { id: string; unitId: string; level: string; data: unknown; model: string | null; createdAt: Date }): StoredLesson | null {
  const parsed = LessonSchema.safeParse(row.data);
  if (!parsed.success) {
    console.error(`[course] stored lesson ${row.id} no longer matches the schema`);
    return null;
  }
  return { id: row.id, unitId: row.unitId, level: row.level, lesson: parsed.data, model: row.model, createdAt: row.createdAt };
}

/** The cached lesson, or null if it hasn't been generated (or is being generated). */
export async function findLesson(lessonId: string): Promise<StoredLesson | null> {
  await io();
  const row = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
  return row?.status === "ready" ? toStored(row) : null;
}

/** Which lessons of these ids are ready. */
export async function readyLessonIds(ids: string[]): Promise<Set<string>> {
  await io();
  const rows = await prisma.courseLesson.findMany({ where: { id: { in: ids }, status: "ready" }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

async function write(lessonId: string): Promise<{ data: Lesson; model: string }> {
  const found = await findCourseLesson(lessonId);
  if (!found) throw new Error(`Unknown lesson ${lessonId}`);
  const { unit, lesson } = found;
  const { system, prompt } = lessonPrompt(unit, lesson.part);
  let model = "";
  const data = await generateJSON(prompt, LessonSchema, {
    system,
    temperature: 0.7,
    timeoutMs: 120_000,
    onModel: (m) => (model = m),
    mockFixture: () => lessonFixture(unit, lesson.part),
  });
  return { data, model };
}

/** Try to become the one generating this lesson. */
async function claim(lessonId: string, unitId: string, level: string): Promise<boolean> {
  try {
    await prisma.courseLesson.create({ data: { id: lessonId, unitId, level } });
    return true;
  } catch {
    // Exists: take it over only if it's a stale claim.
    const { count } = await prisma.courseLesson.updateMany({
      where: { id: lessonId, status: "generating", updatedAt: { lt: new Date(Date.now() - CLAIM_STALE_MS) } },
      data: { updatedAt: new Date() },
    });
    return count === 1;
  }
}

/**
 * The lesson, generating it if needed. Throws AiError when the AI fails (the
 * claim is released so a retry can run).
 */
export async function getOrCreateLesson(lessonId: string): Promise<StoredLesson> {
  const found = await findCourseLesson(lessonId);
  if (!found) throw new Error(`Unknown lesson ${lessonId}`);
  const deadline = Date.now() + WAIT_MAX_MS;

  while (Date.now() < deadline) {
    const row = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
    if (row?.status === "ready") {
      // A copy saved under an older schema is written again.
      return toStored(row) ?? (await regenerateLesson(lessonId));
    }

    if (await claim(lessonId, found.unit.id, found.unit.level)) {
      try {
        const { data, model } = await write(lessonId);
        const row = await prisma.courseLesson.update({
          where: { id: lessonId },
          data: { status: "ready", data, model },
        });
        return toStored(row)!;
      } catch (error) {
        await prisma.courseLesson.deleteMany({ where: { id: lessonId, status: "generating" } });
        throw error;
      }
    }
    // Someone else is writing it: wait for them.
    await new Promise((r) => setTimeout(r, WAIT_STEP_MS));
  }
  throw new Error(`Timed out waiting for lesson ${lessonId}`);
}

/** Write the lesson again and replace the cached copy (only after the new one validates). */
export async function regenerateLesson(lessonId: string): Promise<StoredLesson> {
  const { data, model } = await write(lessonId);
  const row = await prisma.courseLesson.update({ where: { id: lessonId }, data: { status: "ready", data, model } });
  return toStored(row)!;
}
