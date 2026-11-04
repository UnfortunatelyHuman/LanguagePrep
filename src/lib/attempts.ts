import { io } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Attempt } from "@/generated/prisma/client";
import type { SkillId, Track } from "@/lib/exams";

// better-sqlite3 is a synchronous driver, so these queries would otherwise
// finish during prerendering and bake the history into the static shell.
// `await io()` keeps them out of it; it is a no-op inside a "use cache" scope.

/** Value stored in Attempt.exam, derived from the track. */
export function examKey(track: Track): string {
  return track === "en" ? "celpip" : "tcf";
}

/** Most recent attempt for one skill, or null if the skill has never been practised. */
export async function latestAttempt(
  track: Track,
  skill: SkillId,
): Promise<Attempt | null> {
  await io();
  return prisma.attempt.findFirst({
    where: { exam: examKey(track), skill },
    orderBy: { createdAt: "desc" },
  });
}

export async function recentAttempts(track: Track, take = 8): Promise<Attempt[]> {
  await io();
  return prisma.attempt.findMany({
    where: { exam: examKey(track) },
    orderBy: { createdAt: "desc" },
    take,
  });
}
