import "server-only";
import { io } from "next/cache";
import { z } from "zod";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import { resolveWritingSet } from "@/lib/generate/sets";
import { keepParagraphs } from "./diff";
import type { GradedWriting } from "./grade";
import { RUBRIC_TARGET, SCORE_RANGE, rubricLevel } from "@/lib/rubric/levels";
import { dimensionRows } from "@/lib/rubric/schema";
import { DIMENSIONS } from "./rubric";
import { countWords } from "./words";
import type { TaskTexts, WritingResult, WritingSet } from "./types";

/**
 * Storage layout: one Response per task (text + per-task feedback) and one
 * Response with questionId "summary" holding the rubric scores and advice.
 */
const SUMMARY_ID = "summary";

const TaskFeedbackJson = z.object({
  wordCount: z.number(),
  corrected: z.string(),
  comment: z.string(),
});

const SummaryJson = z.object({
  dimensions: z.array(
    z.object({ id: z.string(), label: z.string(), score: z.number(), max: z.number(), comment: z.string() }),
  ),
  strengths: z.array(z.string()),
  fixes: z.array(
    z.object({ title: z.string(), explanation: z.string(), before: z.string(), after: z.string() }),
  ),
  summary: z.string(),
  model: z.string(),
});

/** Turn a graded set into a result, save it as an Attempt, and return it. */
export async function saveWritingAttempt(input: {
  track: Track;
  set: WritingSet;
  texts: TaskTexts;
  graded: GradedWriting;
  durationSeconds: number | null;
}): Promise<WritingResult> {
  const { track, set, texts, graded, durationSeconds } = input;
  const max = SCORE_RANGE[set.exam].max;

  const dimensions = dimensionRows(set.exam, DIMENSIONS[set.exam], graded.dimensions);
  const { score, level, meetsTarget } = rubricLevel(
    set.exam,
    dimensions.map((d) => d.score),
  );

  const byTask = new Map(graded.tasks.map((t) => [t.taskId, t]));
  const tasks = set.tasks.map((task) => {
    const text = texts[task.id] ?? "";
    return {
      taskId: task.id,
      text,
      wordCount: countWords(text),
      corrected: keepParagraphs(text, byTask.get(task.id)?.corrected ?? ""),
      comment: byTask.get(task.id)?.comment ?? "",
    };
  });

  const summary: z.infer<typeof SummaryJson> = {
    dimensions,
    strengths: graded.strengths,
    fixes: graded.fixes,
    summary: graded.summary,
    model: graded.model,
  };

  const attempt = await prisma.attempt.create({
    data: {
      exam: examKey(track),
      skill: "writing",
      task: set.id,
      score,
      maxScore: max,
      estimatedLevel: level,
      durationSeconds,
      responses: {
        create: [
          ...tasks.map((t) => ({
            questionId: t.taskId,
            text: t.text,
            feedback: { wordCount: t.wordCount, corrected: t.corrected, comment: t.comment },
          })),
          { questionId: SUMMARY_ID, feedback: summary },
        ],
      },
    },
    select: { id: true, createdAt: true },
  });

  return {
    attemptId: attempt.id,
    score,
    maxScore: max,
    level,
    target: RUBRIC_TARGET[set.exam].label,
    meetsTarget,
    ...summary,
    tasks,
    durationSeconds,
    createdAt: attempt.createdAt.toISOString(),
  };
}

/** Reload a saved writing attempt for the review page, or null if it's gone or unreadable. */
export async function loadWritingAttempt(
  track: Track,
  attemptId: string,
): Promise<{ set: WritingSet; result: WritingResult } | null> {
  await io();
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, exam: examKey(track), skill: "writing" },
    include: { responses: true },
  });
  if (!attempt?.task) return null;
  const set = await resolveWritingSet(track, attempt.task);
  if (!set) return null;

  const summaryRow = attempt.responses.find((r) => r.questionId === SUMMARY_ID);
  const summary = SummaryJson.safeParse(summaryRow?.feedback);
  if (!summary.success) return null;

  const tasks = set.tasks.map((task) => {
    const row = attempt.responses.find((r) => r.questionId === task.id);
    const fb = TaskFeedbackJson.safeParse(row?.feedback);
    const text = row?.text ?? "";
    return {
      taskId: task.id,
      text,
      wordCount: fb.success ? fb.data.wordCount : countWords(text),
      corrected: fb.success ? fb.data.corrected : "",
      comment: fb.success ? fb.data.comment : "",
    };
  });

  const { level, meetsTarget } = rubricLevel(
    set.exam,
    summary.data.dimensions.map((d) => d.score),
  );

  return {
    set,
    result: {
      attemptId: attempt.id,
      score: attempt.score ?? 0,
      maxScore: attempt.maxScore ?? SCORE_RANGE[set.exam].max,
      level: attempt.estimatedLevel ?? level,
      target: RUBRIC_TARGET[set.exam].label,
      meetsTarget,
      ...summary.data,
      tasks,
      durationSeconds: attempt.durationSeconds,
      createdAt: attempt.createdAt.toISOString(),
    },
  };
}
