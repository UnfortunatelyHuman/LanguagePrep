import "server-only";
import { io } from "next/cache";
import { examKey } from "@/lib/attempts";
import { getTrack, type SkillId, type Track } from "@/lib/exams";
import {
  MockStepsSchema,
  chooseSteps,
  mockOutcome,
  stepStatuses,
  type MockAttempt,
  type MockOutcome,
  type MockStep,
  type StepPool,
  type StepStatus,
} from "@/lib/mock-plan";
import { testSets } from "@/lib/practice/content";
import { prisma } from "@/lib/prisma";
import { speakingSets } from "@/lib/speaking/content";
import { writingSets } from "@/lib/writing/content";

/** Fields of Attempt the mock logic reads. */
const ATTEMPT_FIELDS = {
  id: true,
  skill: true,
  task: true,
  createdAt: true,
  estimatedLevel: true,
  score: true,
  maxScore: true,
} as const;

/**
 * The real exam's order, one pool of candidate sets per step. CELPIP writing
 * is two separately timed tasks, so it takes two steps.
 */
function stepPools(track: Track): StepPool[] {
  const ids = (sets: { id: string }[]) => sets.map((s) => s.id);
  const writing = writingSets(track);
  const writingPools: StepPool[] =
    track === "en"
      ? [
          { skill: "writing", setIds: ids(writing.filter((s) => s.tasks[0].kind === "celpip-email")) },
          { skill: "writing", setIds: ids(writing.filter((s) => s.tasks[0].kind === "celpip-survey")) },
        ]
      : [{ skill: "writing", setIds: ids(writing) }];

  return [
    { skill: "listening", setIds: ids(testSets(track, "listening")) },
    { skill: "reading", setIds: ids(testSets(track, "reading")) },
    ...writingPools,
    { skill: "speaking", setIds: ids(speakingSets(track)) },
  ];
}

/** Display info for a step's set: title, and what part of the skill it is. */
export function stepInfo(track: Track, step: MockStep): { title: string; detail: string | null } {
  if (step.skill === "listening" || step.skill === "reading") {
    const set = testSets(track, step.skill).find((s) => s.id === step.setId);
    return { title: set?.title ?? step.setId, detail: null };
  }
  if (step.skill === "writing") {
    const set = writingSets(track).find((s) => s.id === step.setId);
    const kind = set?.tasks[0].kind;
    const detail =
      kind === "celpip-email" ? "Task 1: email" : kind === "celpip-survey" ? "Task 2: survey response" : null;
    return { title: set?.title ?? step.setId, detail };
  }
  const set = speakingSets(track).find((s) => s.id === step.setId);
  return { title: set?.title ?? step.setId, detail: null };
}

/** Skill label in the exam's own wording ("Compréhension orale"…). */
export function skillName(track: Track, skill: SkillId): string {
  return getTrack(track).skills.find((s) => s.id === skill)?.name ?? skill;
}

async function trackAttempts(track: Track): Promise<MockAttempt[]> {
  return prisma.attempt.findMany({ where: { exam: examKey(track) }, select: ATTEMPT_FIELDS });
}

/** Create a mock exam with the least recently practised set for each step. */
export async function createMockExam(track: Track): Promise<string> {
  const steps = chooseSteps(stepPools(track), await trackAttempts(track));
  const mock = await prisma.mockExam.create({
    data: { exam: examKey(track), steps },
    select: { id: true },
  });
  return mock.id;
}

export type MockView = {
  id: string;
  startedAt: Date;
  steps: StepStatus[];
  outcome: MockOutcome;
};

/**
 * Bring a stored mock up to date with the attempts made since it started.
 * Records completedAt the first time every step is done (idempotent).
 */
async function toView(
  track: Track,
  mock: { id: string; steps: unknown; startedAt: Date; completedAt: Date | null },
  attempts: MockAttempt[],
): Promise<MockView | null> {
  const parsed = MockStepsSchema.safeParse(mock.steps);
  if (!parsed.success) return null;
  const steps = stepStatuses(parsed.data, mock.startedAt, attempts);
  const outcome = mockOutcome(track, steps);
  if (outcome.complete && !mock.completedAt && outcome.finishedAt) {
    await prisma.mockExam.updateMany({
      where: { id: mock.id, completedAt: null },
      data: { completedAt: outcome.finishedAt },
    });
  }
  return { id: mock.id, startedAt: mock.startedAt, steps, outcome };
}

/** One mock exam on this track, or null if it doesn't exist (or belongs to the other track). */
export async function loadMockExam(track: Track, id: string): Promise<MockView | null> {
  await io();
  const mock = await prisma.mockExam.findFirst({ where: { id, exam: examKey(track) } });
  if (!mock) return null;
  return toView(track, mock, await trackAttempts(track));
}

/** Recent mock exams on this track, newest first. */
export async function listMockExams(track: Track, take = 10): Promise<MockView[]> {
  await io();
  const mocks = await prisma.mockExam.findMany({
    where: { exam: examKey(track) },
    orderBy: { startedAt: "desc" },
    take,
  });
  if (!mocks.length) return [];
  const attempts = await trackAttempts(track);
  const views = await Promise.all(mocks.map((m) => toView(track, m, attempts)));
  return views.filter((v): v is MockView => v !== null);
}
