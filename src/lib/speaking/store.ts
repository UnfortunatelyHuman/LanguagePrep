import "server-only";
import { io } from "next/cache";
import { z } from "zod";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import { RUBRIC_TARGET, SCORE_RANGE, rubricLevel } from "@/lib/rubric/levels";
import { dimensionRows } from "@/lib/rubric/schema";
import { countWords } from "@/lib/writing/words";
import { resolveSpeakingSet } from "@/lib/generate/sets";
import type { GradedSpeaking } from "./grade";
import { saveRecording } from "./recordings";
import { SPEAKING_DIMENSIONS, wordsPerMinute } from "./rubric";
import type { SpeakingResult, SpeakingSet, SpeakingTaskFeedback, SpokenAnswer } from "./types";

/**
 * Storage layout, like writing: one Response per answered task (transcript,
 * audio file, per-task feedback) plus one "summary" Response with the rubric.
 */
const SUMMARY_ID = "summary";

const TaskJson = z.object({
  seconds: z.number(),
  wordsPerMinute: z.number(),
  choice: z.enum(["A", "B"]).optional(),
  comment: z.string(),
  improved: z.string(),
});

const SummaryJson = z.object({
  taskIds: z.array(z.string()),
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

/** Save a graded speaking attempt (and its recordings) and return the result. */
export async function saveSpeakingAttempt(input: {
  track: Track;
  set: SpeakingSet;
  answers: SpokenAnswer[];
  audio: Map<string, File>;
  graded: GradedSpeaking;
  durationSeconds: number | null;
}): Promise<SpeakingResult> {
  const { track, set, answers, audio, graded, durationSeconds } = input;
  const dimensions = dimensionRows(set.exam, SPEAKING_DIMENSIONS[set.exam], graded.dimensions);
  const { score, level, meetsTarget } = rubricLevel(
    set.exam,
    dimensions.map((d) => d.score),
  );
  const byTask = new Map(graded.tasks.map((t) => [t.taskId, t]));

  const tasks = answers.map((a) => ({
    answer: a,
    json: {
      seconds: Math.round(a.seconds),
      wordsPerMinute: wordsPerMinute(countWords(a.transcript), a.seconds),
      choice: a.choice,
      comment: byTask.get(a.taskId)?.comment ?? "",
      improved: byTask.get(a.taskId)?.improved ?? "",
    } satisfies z.infer<typeof TaskJson>,
  }));

  const summary: z.infer<typeof SummaryJson> = {
    taskIds: answers.map((a) => a.taskId),
    dimensions,
    strengths: graded.strengths,
    fixes: graded.fixes,
    summary: graded.summary,
    model: graded.model,
  };

  const attempt = await prisma.attempt.create({
    data: {
      exam: examKey(track),
      skill: "speaking",
      task: set.id,
      score,
      maxScore: SCORE_RANGE[set.exam].max,
      estimatedLevel: level,
      durationSeconds,
      responses: {
        create: [
          ...tasks.map((t) => ({ questionId: t.answer.taskId, text: t.answer.transcript, feedback: t.json })),
          { questionId: SUMMARY_ID, feedback: summary },
        ],
      },
    },
    select: { id: true, createdAt: true, responses: { select: { id: true, questionId: true } } },
  });

  // Recordings are written after the rows exist so files are named by response id.
  // A failed write loses only that playback, never the feedback.
  const audioIds = new Map<string, string>();
  for (const response of attempt.responses) {
    const file = response.questionId ? audio.get(response.questionId) : undefined;
    if (!file) continue;
    try {
      const name = await saveRecording(response.id, file);
      await prisma.response.update({ where: { id: response.id }, data: { audioPath: name } });
      audioIds.set(response.questionId!, response.id);
    } catch (error) {
      console.error(`[speaking] couldn't save recording for ${response.questionId}`, error);
    }
  }

  return {
    attemptId: attempt.id,
    score,
    maxScore: SCORE_RANGE[set.exam].max,
    level,
    target: RUBRIC_TARGET[set.exam].label,
    meetsTarget,
    dimensions,
    strengths: summary.strengths,
    fixes: summary.fixes,
    summary: summary.summary,
    model: summary.model,
    tasks: tasks.map((t) => ({
      taskId: t.answer.taskId,
      transcript: t.answer.transcript,
      audioId: audioIds.get(t.answer.taskId) ?? null,
      ...t.json,
    })),
    createdAt: attempt.createdAt.toISOString(),
  };
}

/** Reload a saved speaking attempt for the review page, or null if it's gone or unreadable. */
export async function loadSpeakingAttempt(
  track: Track,
  attemptId: string,
): Promise<{ set: SpeakingSet; result: SpeakingResult } | null> {
  await io();
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, exam: examKey(track), skill: "speaking" },
    include: { responses: true },
  });
  if (!attempt?.task) return null;
  const set = await resolveSpeakingSet(track, attempt.task);
  if (!set) return null;

  const summaryRow = attempt.responses.find((r) => r.questionId === SUMMARY_ID);
  const summary = SummaryJson.safeParse(summaryRow?.feedback);
  if (!summary.success) return null;

  const tasks: SpeakingTaskFeedback[] = summary.data.taskIds.flatMap((taskId) => {
    const row = attempt.responses.find((r) => r.questionId === taskId);
    const json = TaskJson.safeParse(row?.feedback);
    if (!row || !json.success) return [];
    return [{ taskId, transcript: row.text ?? "", audioId: row.audioPath ? row.id : null, ...json.data }];
  });

  const { level, meetsTarget } = rubricLevel(
    set.exam,
    summary.data.dimensions.map((d) => d.score),
  );
  const { dimensions, strengths, fixes, summary: verdict, model } = summary.data;

  return {
    set,
    result: {
      attemptId: attempt.id,
      score: attempt.score ?? 0,
      maxScore: attempt.maxScore ?? SCORE_RANGE[set.exam].max,
      level: attempt.estimatedLevel ?? level,
      target: RUBRIC_TARGET[set.exam].label,
      meetsTarget,
      dimensions,
      strengths,
      fixes,
      summary: verdict,
      model,
      tasks,
      createdAt: attempt.createdAt.toISOString(),
    },
  };
}

/** The stored recording for one response, if it belongs to a speaking attempt. */
export async function recordingFileName(responseId: string): Promise<string | null> {
  const row = await prisma.response.findFirst({
    where: { id: responseId, attempt: { skill: "speaking" } },
    select: { audioPath: true },
  });
  return row?.audioPath ?? null;
}
