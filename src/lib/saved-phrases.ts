import "server-only";
import { io } from "next/cache";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import type { PhraseCategory } from "@/lib/phrases";
import { prisma } from "@/lib/prisma";

/** Phrase-bank keys of saved phrases are "mine:<row id>", so they never clash with file phrases. */
export const SAVED_PREFIX = "mine:";
export const SAVED_CATEGORY_ID = "mine";

/**
 * Phrases the learner saved from AI feedback, shaped as one phrase-bank
 * category (newest first) plus their self-test marks. Null when none are saved.
 */
export async function savedPhraseCategory(
  track: Track,
): Promise<{ category: PhraseCategory; known: Record<string, boolean> } | null> {
  await io();
  const rows = await prisma.savedPhrase.findMany({
    where: { exam: examKey(track) },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  if (!rows.length) return null;
  const category: PhraseCategory = {
    id: SAVED_CATEGORY_ID,
    title: "Saved from feedback",
    description:
      "Fixes you saved from writing and speaking feedback. The self-test shows what you said; recall the better version.",
    phrases: rows.map((r) => ({
      key: `${SAVED_PREFIX}${r.id}`,
      categoryId: SAVED_CATEGORY_ID,
      phrase: r.phrase,
      meaning: r.before ? `Instead of “${r.before}”` : r.note,
      example: r.note,
      register: "neutral",
      saved: true,
    })),
  };
  const known = Object.fromEntries(
    rows.filter((r) => r.known !== null).map((r) => [`${SAVED_PREFIX}${r.id}`, r.known!]),
  );
  return { category, known };
}
