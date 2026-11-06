import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRight, type ExerciseResult } from "./check";

/** What the browser sends: checked against the lesson's exercise count. */
export const ResultsSchema = z
  .array(
    z.object({
      index: z.number().int().min(0).max(20),
      answer: z.string().max(500),
      verdict: z.enum(["correct", "accents", "wrong"]),
      overridden: z.boolean().optional(),
    }),
  )
  .max(20);

/** Save a run through the lesson's exercises; returns the attempt id. */
export async function saveExerciseResults(lessonId: string, results: ExerciseResult[]): Promise<string> {
  const attempt = await prisma.lessonAttempt.create({
    data: {
      lessonId,
      correct: results.filter(isRight).length,
      total: results.length,
      answers: results,
    },
    select: { id: true },
  });
  return attempt.id;
}
