import "server-only";
import { cache } from "react";
import type { Track } from "@/lib/exams";
import { testSets, totalMinutes } from "@/lib/practice/content";
import { progressSummary, type ProgressSummary } from "@/lib/progress";
import { buildStudyPlan, type PlanSettings, type StudyPlan } from "@/lib/study-plan";
import { latestMock, studySettings } from "@/lib/study-settings";
import { wallClock } from "@/lib/time-zone";

export type TodayPlan = {
  plan: StudyPlan;
  settings: PlanSettings;
  summary: ProgressSummary;
  /** "Now" as a wall-clock date in the learner's zone. */
  today: Date;
};

/**
 * Today's plan with everything it was built from. Shared by the study plan
 * page and the dashboard, so both always show the same next step.
 */
export const todayPlan = cache(async function todayPlan(track: Track): Promise<TodayPlan> {
  const [summary, settings, lastMock] = await Promise.all([
    progressSummary(track),
    studySettings(track),
    latestMock(track),
  ]);
  // Read after the database calls, so it's request time, not build time. Every
  // date the plan compares is shifted to the learner's zone, so "today" and
  // "3 days ago" follow their calendar rather than the server's.
  const zone = settings.timeZone;
  const today = wallClock(new Date(), zone);
  const skills = summary.skills.map((s) =>
    s.latest ? { ...s, latest: { ...s.latest, date: wallClock(s.latest.date, zone) } } : s,
  );

  const sets = Object.fromEntries(
    (["listening", "reading"] as const).map((skill) => [
      skill,
      testSets(track, skill).map((s) => ({ id: s.id, minutes: totalMinutes(s) })),
    ]),
  );
  const plan = buildStudyPlan({
    track,
    skills,
    target: summary.target,
    settings,
    today,
    sets,
    lastMock: lastMock && { ...lastMock, startedAt: wallClock(lastMock.startedAt, zone) },
  });
  return { plan, settings, summary, today };
});
