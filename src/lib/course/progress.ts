import "server-only";
import { io } from "next/cache";
import { prisma } from "@/lib/prisma";
import { addDays } from "./srs";
import { cardCounts, today } from "./cards";
import { checkpointStatus } from "./checkpoints";
import { latestPlacement } from "./placement-store";
import { TaskFeedbackSchema } from "./schemas";
import { CEFR_LEVELS, COURSE_LEVELS, type Cefr, type CourseLevel, type CourseUnit } from "./syllabus";
import { allUnits } from "./units";

/**
 * Everything the course dashboard shows: where to continue, the streak,
 * cards due, and an estimated level per skill against the B2 target.
 */

export const COURSE_SKILLS = ["grammar", "vocabulary", "reading", "listening", "writing", "speaking"] as const;
export type CourseSkill = (typeof COURSE_SKILLS)[number];

export type SkillEstimate = { level: Cefr | null; source: string };

export type CourseProgress = {
  units: CourseUnit[];
  next: { unit: CourseUnit; lessonId: string; label: string } | null;
  startUnitId: string | null;
  completed: Set<string>;
  lessonsTotal: number;
  streak: number;
  activeToday: boolean;
  due: number;
  cards: number;
  skills: Record<CourseSkill, SkillEstimate>;
  checkpoints: Partial<Record<CourseLevel, { passed: boolean; best: number }>>;
};

const rank = (l: Cefr) => CEFR_LEVELS.indexOf(l);
const higher = (a: Cefr | null, b: Cefr | null) => (!a ? b : !b ? a : rank(a) >= rank(b) ? a : b);

/** Days in a row with course activity, ending today (or yesterday, if today has none yet). */
export function streakFrom(days: Set<string>, todayKey: string): { streak: number; activeToday: boolean } {
  const activeToday = days.has(todayKey);
  let day = activeToday ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return { streak, activeToday };
}

/** NCLC (TCF writing/speaking attempts) to the nearest CEFR level, roughly. */
function nclcToCefr(nclc: number): Cefr {
  if (nclc >= 9) return "C1";
  if (nclc >= 7) return "B2";
  if (nclc >= 5) return "B1";
  if (nclc >= 4) return "A2";
  return "A1";
}

/** Middle value of the recent estimates, so one lucky or bad answer doesn't swing it. */
function median(levels: Cefr[]): Cefr | null {
  if (!levels.length) return null;
  const sorted = [...levels].sort((a, b) => rank(a) - rank(b));
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

async function productiveEstimate(kind: "writing" | "speaking"): Promise<SkillEstimate> {
  const [tasks, attempts] = await Promise.all([
    prisma.lessonAttempt.findMany({
      where: { taskKind: kind, taskScore: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 3,
      select: { taskFeedback: true },
    }),
    prisma.attempt.findMany({
      where: { exam: "tcf", skill: kind, estimatedLevel: { startsWith: "NCLC" } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { estimatedLevel: true },
    }),
  ]);
  const fromTasks = tasks.flatMap((t) => {
    const parsed = TaskFeedbackSchema.pick({ cefr: true }).safeParse(t.taskFeedback);
    return parsed.success ? [parsed.data.cefr] : [];
  });
  const fromExam = attempts.flatMap((a) => {
    const n = Number(/NCLC (\d+)/.exec(a.estimatedLevel ?? "")?.[1]);
    return Number.isFinite(n) && n > 0 ? [nclcToCefr(n)] : [];
  });
  const exam = median(fromExam);
  const lessons = median(fromTasks);
  if (exam && (!lessons || rank(exam) >= rank(lessons))) return { level: exam, source: "TCF practice" };
  if (lessons) return { level: lessons, source: "lesson tasks" };
  return { level: null, source: "not measured yet" };
}

export async function courseProgress(): Promise<CourseProgress> {
  await io();
  const [units, placement, done, days, todayKey, counts, checkpoints, writing, speaking] = await Promise.all([
    allUnits(),
    latestPlacement(),
    prisma.lessonAttempt.findMany({ where: { completedAt: { not: null } }, select: { lessonId: true }, distinct: ["lessonId"] }),
    prisma.studyDay.findMany({ where: { OR: [{ lessons: { gt: 0 } }, { reviews: { gt: 0 } }, { messages: { gt: 0 } }] }, select: { day: true } }),
    today(),
    cardCounts(),
    checkpointStatus(),
    productiveEstimate("writing"),
    productiveEstimate("speaking"),
  ]);
  const completed = new Set(done.map((d) => d.lessonId));
  const startUnitId = placement?.startUnitId ?? null;

  // Continue from the placement's start unit: the first lesson there or after it not yet done.
  const startIndex = Math.max(0, units.findIndex((u) => u.id === startUnitId));
  const ordered = [...units.slice(startIndex), ...units.slice(0, startIndex)];
  let next: CourseProgress["next"] = null;
  for (const unit of ordered) {
    const lesson = unit.lessons.find((l) => !completed.has(l.id));
    if (lesson) {
      next = { unit, lessonId: lesson.id, label: lesson.label };
      break;
    }
  }

  // Placement levels, raised by passed checkpoints (grammar and vocabulary are what they test).
  const passed = COURSE_LEVELS.filter((l) => checkpoints[l]?.passed).at(-1) ?? null;
  const placed = (skill: "grammar" | "vocabulary" | "reading" | "listening"): SkillEstimate => {
    const fromPlacement = placement?.levels[skill] ?? null;
    const raised = skill === "grammar" || skill === "vocabulary" ? higher(fromPlacement, passed) : fromPlacement;
    return {
      level: raised,
      source: raised && raised !== fromPlacement ? `${passed} checkpoint` : fromPlacement ? "placement test" : "take the placement test",
    };
  };

  return {
    units,
    next,
    startUnitId,
    completed,
    lessonsTotal: units.length * 2,
    ...streakFrom(new Set(days.map((d) => d.day)), todayKey),
    due: counts.due,
    cards: counts.total,
    skills: {
      grammar: placed("grammar"),
      vocabulary: placed("vocabulary"),
      reading: placed("reading"),
      listening: placed("listening"),
      writing,
      speaking,
    },
    checkpoints,
  };
}
