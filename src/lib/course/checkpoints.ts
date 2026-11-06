import "server-only";
import { io } from "next/cache";
import { prisma } from "@/lib/prisma";
import { shuffled } from "./check";
import { LessonSchema, type Exercise } from "./schemas";
import { COURSE_LEVELS, type CourseLevel } from "./syllabus";
import { allUnits } from "./units";

/**
 * Level checkpoints: up to 20 questions drawn from the cached exercises of the
 * level's lessons (no AI request). 70% passes.
 */

export const CHECKPOINT_SIZE = 20;
/** Fewest exercises (from opened lessons) worth a checkpoint. */
export const CHECKPOINT_MIN = 10;
export const PASS_RATE = 0.7;

export const isCourseLevel = (v: string): v is CourseLevel => (COURSE_LEVELS as readonly string[]).includes(v);

/** Exercises for a checkpoint, spread across the level's lessons (round-robin), in a fresh order each time. */
export async function checkpointExercises(level: CourseLevel): Promise<{ exercises: Exercise[]; lessonsReady: number; lessonsTotal: number }> {
  await io();
  const ids = (await allUnits()).filter((u) => u.level === level).flatMap((u) => u.lessons.map((l) => l.id));
  const rows = await prisma.courseLesson.findMany({ where: { id: { in: ids }, status: "ready" } });
  const seed = Date.now() % 100_000;
  const pools = rows.flatMap((row, i) => {
    const parsed = LessonSchema.safeParse(row.data);
    return parsed.success ? [shuffled(parsed.data.exercises, seed + i)] : [];
  });
  const picked: Exercise[] = [];
  for (let round = 0; picked.length < CHECKPOINT_SIZE && pools.some((p) => p.length > round); round++) {
    for (const pool of shuffled(pools, seed + round)) {
      if (pool[round] && picked.length < CHECKPOINT_SIZE) picked.push(pool[round]);
    }
  }
  return { exercises: picked, lessonsReady: rows.length, lessonsTotal: ids.length };
}

export async function saveCheckpoint(level: CourseLevel, correct: number, total: number) {
  return prisma.checkpointResult.create({
    data: { level, correct, total, passed: total > 0 && correct / total >= PASS_RATE },
  });
}

/** Best result per level (passed if any attempt passed). */
export async function checkpointStatus(): Promise<Partial<Record<CourseLevel, { passed: boolean; best: number }>>> {
  await io();
  const rows = await prisma.checkpointResult.findMany();
  const status: Partial<Record<CourseLevel, { passed: boolean; best: number }>> = {};
  for (const r of rows) {
    if (!isCourseLevel(r.level)) continue;
    const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
    const prev = status[r.level];
    status[r.level] = { passed: (prev?.passed ?? false) || r.passed, best: Math.max(prev?.best ?? 0, pct) };
  }
  return status;
}
