import { z } from "zod";
import type { Exam } from "@/lib/practice/types";
import type { Dimension } from "@/lib/writing/rubric";
import { SCORE_RANGE } from "./levels";

/**
 * Zod pieces shared by every AI rubric grader. Comments come before scores so
 * the model reasons first; descriptions travel to the model via JSON Schema.
 */

export function dimensionsSchema(exam: Exam, dimensions: Dimension[]) {
  const range = SCORE_RANGE[exam];
  const dimension = z.object({
    comment: z.string().min(1).describe("Specific justification, citing the candidate's words"),
    score: z.number().int().min(range.min).max(range.max),
  });
  return z.object(Object.fromEntries(dimensions.map((d) => [d.id, dimension])));
}

export const strengthsSchema = z.array(z.string().min(1)).min(1).max(4);

export const fixesSchema = z
  .array(
    z.object({
      title: z.string().min(1),
      explanation: z.string().min(1),
      before: z.string().describe("Exact phrase quoted from the candidate"),
      after: z.string().describe("The improved phrase"),
    }),
  )
  .length(3);

export const summarySchema = z
  .string()
  .min(1)
  .describe(
    "Two sentences: overall verdict and the single biggest lever. Don't state a level number; the app computes it.",
  );

/** One entry per task id, each exactly once. */
export function perTaskSchema<T extends z.ZodRawShape>(taskIds: string[], shape: T) {
  return z
    .array(z.object({ taskId: z.enum(taskIds as [string, ...string[]]), ...shape }))
    .length(taskIds.length)
    .refine((tasks) => new Set(tasks.map((t) => (t as { taskId: string }).taskId)).size === taskIds.length, {
      message: "Each task must appear exactly once",
    });
}

/** Turn the model's keyed dimension scores into display rows, in rubric order. */
export function dimensionRows(
  exam: Exam,
  dimensions: Dimension[],
  graded: Record<string, { score: number; comment: string }>,
) {
  const max = SCORE_RANGE[exam].max;
  return dimensions.map((d) => ({
    id: d.id,
    label: d.label,
    score: graded[d.id].score,
    max,
    comment: graded[d.id].comment,
  }));
}
