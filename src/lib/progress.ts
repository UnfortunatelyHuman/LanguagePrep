import { io } from "next/cache";
import { examKey } from "@/lib/attempts";
import { getTrack, type Track } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import {
  LEVEL_TARGET,
  pickFocus,
  summarizeSkill,
  type ProgressSummary,
} from "@/lib/progress-summary";

export * from "@/lib/progress-summary";

/** All attempts on this track, grouped and summarized per skill. */
export async function progressSummary(track: Track): Promise<ProgressSummary> {
  await io();
  const attempts = await prisma.attempt.findMany({
    where: { exam: examKey(track) },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, estimatedLevel: true, task: true, skill: true },
  });

  const { skills: info, scale } = getTrack(track);
  const target = LEVEL_TARGET[track];
  const skills = info.map((s) =>
    summarizeSkill(
      s.id,
      s.name,
      attempts.filter((a) => a.skill === s.id),
      target,
    ),
  );
  return { target, scale, skills, focus: pickFocus(skills, target) };
}
