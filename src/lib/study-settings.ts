import "server-only";
import { io } from "next/cache";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import type { PlanSettings } from "@/lib/study-plan";

export const DEFAULT_DAILY_MINUTES = 45;

/** Saved plan settings for this track, or the defaults. */
export async function studySettings(track: Track): Promise<PlanSettings> {
  await io();
  const row = await prisma.studySettings.findUnique({ where: { exam: examKey(track) } });
  return {
    examDate: row?.examDate ?? null,
    dailyMinutes: row?.dailyMinutes ?? DEFAULT_DAILY_MINUTES,
  };
}

/** Start of the most recent mock exam on this track, for the final-week plan. */
export async function lastMockStart(track: Track): Promise<Date | null> {
  await io();
  const row = await prisma.mockExam.findFirst({
    where: { exam: examKey(track) },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  return row?.startedAt ?? null;
}
