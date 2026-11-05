"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { examKey } from "@/lib/attempts";
import { isTrack } from "@/lib/exams";
import { allPhraseKeys } from "@/lib/phrases";
import { prisma } from "@/lib/prisma";
import { SAVED_PREFIX } from "@/lib/saved-phrases";

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
  const exam = examKey(track);

  if (key.startsWith(SAVED_PREFIX)) {
    const { count } = await prisma.savedPhrase.updateMany({
      where: { id: key.slice(SAVED_PREFIX.length), exam },
      data: { known, reviews: { increment: 1 } },
    });
    revalidatePath(`/${track}/phrases`);
    return { ok: count === 1 };
  }

  if (!allPhraseKeys(track).has(key)) return { ok: false };

  await prisma.phraseReview.upsert({
    where: { exam_phraseKey: { exam, phraseKey: key } },
    create: { exam, phraseKey: key, known },
    update: { known, reviews: { increment: 1 } },
  });
  revalidatePath(`/${track}/phrases`);
  return { ok: true };
}

const SaveInput = z.object({
  track: z.string(),
  source: z.enum(["writing", "speaking"]),
  // Fixes have no length limit, so long ones are clipped rather than refused.
  phrase: z.string().trim().min(1).transform((s) => s.slice(0, 600)),
  note: z.string().trim().transform((s) => s.slice(0, 1500)),
  before: z.string().trim().transform((s) => s.slice(0, 600)).optional(),
});

/** Save a fix from AI feedback to the phrase bank (saving the same phrase twice is a no-op). */
export async function savePhrase(input: unknown): Promise<{ ok: boolean }> {
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success || !isTrack(parsed.data.track)) return { ok: false };
  const { track, source, phrase, note, before } = parsed.data;
  const exam = examKey(track);
  await prisma.savedPhrase.upsert({
    where: { exam_phrase: { exam, phrase } },
    create: { exam, phrase, note, before: before || null, source },
    update: {},
  });
  revalidatePath(`/${track}/phrases`);
  return { ok: true };
}

/** Remove a saved phrase (and its self-test state) from the bank. */
export async function deleteSavedPhrase(input: unknown): Promise<{ ok: boolean }> {
  const parsed = z.object({ track: z.string(), key: z.string().max(100) }).safeParse(input);
  if (!parsed.success || !isTrack(parsed.data.track) || !parsed.data.key.startsWith(SAVED_PREFIX)) {
    return { ok: false };
  }
  const { track, key } = parsed.data;
  await prisma.savedPhrase.deleteMany({ where: { id: key.slice(SAVED_PREFIX.length), exam: examKey(track) } });
  revalidatePath(`/${track}/phrases`);
  return { ok: true };
}
