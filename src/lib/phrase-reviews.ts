import "server-only";
import { io } from "next/cache";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import { prisma } from "@/lib/prisma";

export type ReviewState = Record<string, { known: boolean; reviews: number }>;

/** Self-test state for every reviewed phrase on this track, keyed by phrase key. */
export async function phraseReviewState(track: Track): Promise<ReviewState> {
  await io();
  const rows = await prisma.phraseReview.findMany({
    where: { exam: examKey(track) },
    select: { phraseKey: true, known: true, reviews: true },
  });
  return Object.fromEntries(rows.map((r) => [r.phraseKey, { known: r.known, reviews: r.reviews }]));
}
