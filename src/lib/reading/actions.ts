"use server";

import { revalidatePath } from "next/cache";
import { examKey } from "@/lib/attempts";
import { isTrack } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import { findReadingSet, totalMinutes } from "@/lib/reading/content";
import { sanitizeAnswers, scoreReading } from "@/lib/reading/scoring";
import type { ReadingResult } from "@/lib/reading/types";

/**
 * Score a finished reading test on the server (the browser never had the
 * answers), save it as an Attempt with one Response per question, and return
 * the review.
 */
export async function submitReadingAttempt(input: {
  track: string;
  setId: string;
  answers: unknown;
  durationSeconds: unknown;
}): Promise<ReadingResult> {
  if (!isTrack(input.track)) throw new Error("Unknown track");
  const set = findReadingSet(input.track, input.setId);
  if (!set) throw new Error("Unknown reading set");

  const answers = sanitizeAnswers(set, input.answers);
  const result = scoreReading(set, answers);

  const maxSeconds = totalMinutes(set) * 60 + 300;
  const rawDuration = Number(input.durationSeconds);
  const durationSeconds = Number.isFinite(rawDuration)
    ? Math.min(maxSeconds, Math.max(0, Math.round(rawDuration)))
    : null;

  const attempt = await prisma.attempt.create({
    data: {
      exam: examKey(input.track),
      skill: "reading",
      task: set.id,
      score: result.score,
      maxScore: result.maxScore,
      estimatedLevel: result.level,
      durationSeconds,
      responses: {
        create: Object.entries(result.review).map(([questionId, r]) => ({
          questionId,
          text: r.chosen === null ? null : String(r.chosen),
          feedback: { correct: r.chosen === r.answer, answer: r.answer },
        })),
      },
    },
    select: { id: true },
  });

  // Dashboard and reading index show the latest attempt.
  revalidatePath(`/${input.track}`, "layout");

  return { attemptId: attempt.id, ...result };
}
