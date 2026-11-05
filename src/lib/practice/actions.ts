"use server";

import { revalidatePath } from "next/cache";
import { examKey } from "@/lib/attempts";
import { isTrack } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import { resolveTestSet } from "@/lib/generate/sets";
import { isPracticeSkill, totalMinutes } from "@/lib/practice/content";
import { sanitizeAnswers, scoreTest } from "@/lib/practice/scoring";
import type { TestResult } from "@/lib/practice/types";

/**
 * Score a finished reading or listening test on the server (the browser never
 * had the answers), save it as an Attempt with one Response per question, and
 * return the review.
 */
export async function submitAttempt(input: {
  track: string;
  skill: string;
  setId: string;
  answers: unknown;
  durationSeconds: unknown;
}): Promise<TestResult> {
  if (!isTrack(input.track)) throw new Error("Unknown track");
  if (!isPracticeSkill(input.skill)) throw new Error("Unknown skill");
  const set = await resolveTestSet(input.track, input.skill, input.setId);
  if (!set) throw new Error("Unknown practice set");

  const answers = sanitizeAnswers(set, input.answers);
  const result = scoreTest(set, answers);

  const maxSeconds = totalMinutes(set) * 60 + 300;
  const rawDuration = Number(input.durationSeconds);
  const durationSeconds = Number.isFinite(rawDuration)
    ? Math.min(maxSeconds, Math.max(0, Math.round(rawDuration)))
    : null;

  const attempt = await prisma.attempt.create({
    data: {
      exam: examKey(input.track),
      skill: set.skill,
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

  // Dashboard and practice index show the latest attempt.
  revalidatePath(`/${input.track}`, "layout");

  return { attemptId: attempt.id, ...result };
}
