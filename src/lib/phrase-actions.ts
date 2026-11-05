"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { examKey } from "@/lib/attempts";
import { isTrack } from "@/lib/exams";
import { allPhraseKeys } from "@/lib/phrases";
import { prisma } from "@/lib/prisma";

const Input = z.object({
  track: z.string(),
  key: z.string().max(100),
  known: z.boolean(),
});

/** Save one self-test answer: whether the learner recalled the phrase. */
export async function recordPhraseReview(input: unknown): Promise<{ ok: boolean }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success || !isTrack(parsed.data.track)) return { ok: false };
  const { track, key, known } = parsed.data;
  if (!allPhraseKeys(track).has(key)) return { ok: false };

  const exam = examKey(track);
  await prisma.phraseReview.upsert({
    where: { exam_phraseKey: { exam, phraseKey: key } },
    create: { exam, phraseKey: key, known },
    update: { known, reviews: { increment: 1 } },
  });
  revalidatePath(`/${track}/phrases`);
  return { ok: true };
}
