import "server-only";
import { io } from "next/cache";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import { listMockExams } from "@/lib/mock";
import { prisma } from "@/lib/prisma";
import type { LatestMock, PlanSettings } from "@/lib/study-plan";

export const DEFAULT_DAILY_MINUTES = 45;

/** Saved plan settings for this track, or the defaults. */
export async function studySettings(track: Track): Promise<PlanSettings> {
  await io();
  const row = await prisma.studySettings.findUnique({ where: { exam: examKey(track) } });
  return {
    examDate: row?.examDate ?? null,
    dailyMinutes: row?.dailyMinutes ?? DEFAULT_DAILY_MINUTES,
    timeZone: row?.timeZone ?? null,
  };
}

/** The most recent mock exam on this track and whether it's finished, for the final-week plan. */
export async function latestMock(track: Track): Promise<LatestMock | null> {
  const [mock] = await listMockExams(track, 1);
  return mock ? { id: mock.id, startedAt: mock.startedAt, complete: mock.outcome.complete } : null;
}
