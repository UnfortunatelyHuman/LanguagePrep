import { z } from "zod";
import type { SkillId, Track } from "@/lib/exams";
import { LEVEL_TARGET, parseLevel } from "@/lib/progress-summary";

/**
 * Pure mock-exam logic (no database): choosing sets, matching attempts to
 * steps, and summarizing the result. Unit-testable; lib/mock.ts does the I/O.
 */

export const SKILL_IDS = ["listening", "reading", "writing", "speaking"] as const;

export const MockStepSchema = z.object({
  skill: z.enum(SKILL_IDS),
  setId: z.string().min(1),
});
export const MockStepsSchema = z.array(MockStepSchema).min(1);

export type MockStep = z.infer<typeof MockStepSchema>;

/** One slot of the exam: which skill, and the candidate sets to pick from (content order). */
export type StepPool = { skill: SkillId; setIds: string[] };

/** Smallest slice of an Attempt this module needs. */
export type MockAttempt = {
  id: string;
  skill: string;
  task: string | null;
  createdAt: Date;
  estimatedLevel: string | null;
  score: number | null;
  maxScore: number | null;
};

/**
 * The set to use from a pool: never attempted first, otherwise the one whose
 * last attempt is oldest. Ties keep content order, so the choice is stable.
 */
export function leastRecentSet(setIds: string[], lastAttempt: Map<string, Date>): string {
  if (!setIds.length) throw new Error("A mock exam step has no sets to choose from");
  let best = setIds[0];
  let bestTime = lastAttempt.get(best)?.getTime() ?? -Infinity;
  for (const id of setIds.slice(1)) {
    const time = lastAttempt.get(id)?.getTime() ?? -Infinity;
    if (time < bestTime) {
      best = id;
      bestTime = time;
    }
  }
  return best;
}

/** Latest attempt date per (skill, set id), keyed "skill:setId". */
export function lastAttemptBySet(attempts: MockAttempt[]): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const a of attempts) {
    if (!a.task) continue;
    const key = `${a.skill}:${a.task}`;
    const prev = map.get(key);
    if (!prev || a.createdAt > prev) map.set(key, a.createdAt);
  }
  return map;
}

/** Pick one set per pool, in exam order. */
export function chooseSteps(pools: StepPool[], attempts: MockAttempt[]): MockStep[] {
  const last = lastAttemptBySet(attempts);
  return pools.map((pool) => {
    const perSet = new Map<string, Date>();
    for (const id of pool.setIds) {
      const date = last.get(`${pool.skill}:${id}`);
      if (date) perSet.set(id, date);
    }
    return { skill: pool.skill, setId: leastRecentSet(pool.setIds, perSet) };
  });
}

export type StepStatus = MockStep & {
  /** The first attempt at this set since the mock started: the one that counts. */
  attempt: MockAttempt | null;
};

/**
 * Match each step to the first attempt at its set made at or after the mock
 * started. The first one counts, as in a real sitting; later retries don't
 * improve the mock result.
 */
export function stepStatuses(steps: MockStep[], startedAt: Date, attempts: MockAttempt[]): StepStatus[] {
  const sorted = [...attempts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return steps.map((step) => ({
    ...step,
    attempt:
      sorted.find(
        (a) => a.skill === step.skill && a.task === step.setId && a.createdAt >= startedAt,
      ) ?? null,
  }));
}

export type SkillOutcome = {
  skill: SkillId;
  /** Numeric level used for comparison (lowest step of the skill). */
  level: number | null;
  /** Label of that lowest step, e.g. "CLB 9". */
  label: string | null;
  meetsTarget: boolean;
};

export type MockOutcome = {
  complete: boolean;
  done: number;
  total: number;
  target: number;
  skills: SkillOutcome[];
  /** Lowest-level skill once complete; ties keep exam order. */
  weakest: SkillId | null;
  /** When the last step was finished, if complete. */
  finishedAt: Date | null;
};

/**
 * Per-skill result of a mock. A skill with several steps (CELPIP writing has
 * two tasks) takes its lowest level: one weak task drags the skill down.
 */
export function mockOutcome(track: Track, statuses: StepStatus[]): MockOutcome {
  const target = LEVEL_TARGET[track];
  const done = statuses.filter((s) => s.attempt).length;
  const complete = done === statuses.length;

  const skillOrder = [...new Set(statuses.map((s) => s.skill))];
  const skills: SkillOutcome[] = skillOrder.map((skill) => {
    let level: number | null = null;
    let label: string | null = null;
    for (const s of statuses.filter((st) => st.skill === skill)) {
      const n = parseLevel(s.attempt?.estimatedLevel ?? null);
      if (n !== null && (level === null || n < level)) {
        level = n;
        label = s.attempt!.estimatedLevel;
      }
    }
    return { skill, level, label, meetsTarget: level !== null && level >= target };
  });

  let weakest: SkillId | null = null;
  if (complete) {
    let low = Infinity;
    for (const s of skills) {
      if (s.level !== null && s.level < low) {
        low = s.level;
        weakest = s.skill;
      }
    }
  }

  const finishedAt = complete
    ? new Date(Math.max(...statuses.map((s) => s.attempt!.createdAt.getTime())))
    : null;

  return { complete, done, total: statuses.length, target, skills, weakest, finishedAt };
}
