"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { examKey } from "@/lib/attempts";
import { isTrack } from "@/lib/exams";
import { prisma } from "@/lib/prisma";

const Input = z.object({
  track: z.string(),
  setId: z.string().min(1).max(120),
  questionId: z.string().min(1).max(120),
  correct: z.boolean(),
});

/**
 * Record one retry of a past mistake. A correct retry extends the streak, a
 * wrong one resets it. Only questions that were actually missed in a saved
 * test can be recorded.
 */
export async function recordMistakeRetry(input: unknown): Promise<{ ok: boolean; streak: number }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success || !isTrack(parsed.data.track)) return { ok: false, streak: 0 };
  const { track, setId, questionId, correct } = parsed.data;
  const exam = examKey(track);

  const missed = await prisma.response.findFirst({
    where: { questionId, attempt: { exam, task: setId } },
    select: { id: true },
  });
  if (!missed) return { ok: false, streak: 0 };

  const row = await prisma.mistakeReview.upsert({
    where: { exam_setId_questionId: { exam, setId, questionId } },
    create: { exam, setId, questionId, streak: correct ? 1 : 0, retries: 1 },
    update: { streak: correct ? { increment: 1 } : 0, retries: { increment: 1 } },
  });
  revalidatePath(`/${track}/review`);
  return { ok: true, streak: row.streak };
}
