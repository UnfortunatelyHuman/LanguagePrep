import { PLACEMENT_SKILLS, type PlacementItem, type PlacementSkill } from "./schemas";
import { CEFR_LEVELS, COURSE_LEVELS, unitsAt, type Cefr, type CourseLevel } from "./syllabus";

/**
 * The adaptive placement test, as pure functions (run in the browser, checked
 * again on the server). Each skill climbs a staircase: start at A2, one level
 * up after a right answer, one down after a wrong one. Skills take turns.
 */

export const QUESTIONS_PER_SKILL = 5;
export const START_LEVEL: Cefr = "A2";

export type PoolItem = PlacementItem & { id: string; level: Cefr };

export type Asked = { questionId: string; skill: PlacementSkill; level: Cefr; picked: number; correct: boolean };

export type SkillLevels = Record<PlacementSkill, Cefr>;

const step = (level: Cefr, up: boolean): Cefr => {
  const i = CEFR_LEVELS.indexOf(level) + (up ? 1 : -1);
  return CEFR_LEVELS[Math.max(0, Math.min(CEFR_LEVELS.length - 1, i))];
};

/** Skill of the n-th question (0-based): skills take turns. */
export const skillAt = (n: number): PlacementSkill => PLACEMENT_SKILLS[n % PLACEMENT_SKILLS.length];
export const TOTAL_QUESTIONS = QUESTIONS_PER_SKILL * PLACEMENT_SKILLS.length;

/** Level of the next question for a skill, from its answers so far. */
export function nextLevel(asked: Asked[], skill: PlacementSkill): Cefr {
  const mine = asked.filter((a) => a.skill === skill);
  const last = mine.at(-1);
  return last ? step(last.level, last.correct) : START_LEVEL;
}

/**
 * Pick the next question: right skill and level, not asked in this test,
 * preferring ones not seen in earlier tests. If that level has run out, the
 * nearest level that hasn't.
 */
export function pickQuestion(pool: PoolItem[], asked: Asked[], seen: Set<string>): PoolItem | null {
  const skill = skillAt(asked.length);
  const level = nextLevel(asked, skill);
  const used = new Set(asked.map((a) => a.questionId));
  const free = pool.filter((q) => q.skill === skill && !used.has(q.id));
  const byDistance = [...CEFR_LEVELS].sort(
    (a, b) => Math.abs(CEFR_LEVELS.indexOf(a) - CEFR_LEVELS.indexOf(level)) - Math.abs(CEFR_LEVELS.indexOf(b) - CEFR_LEVELS.indexOf(level)),
  );
  for (const l of byDistance) {
    const at = free.filter((q) => q.level === l);
    if (at.length) return at.find((q) => !seen.has(q.id)) ?? at[0];
  }
  return null;
}

/** A skill's level: the highest with at least 2 right answers at that level or above (A1 if none). */
export function skillLevel(asked: Asked[], skill: PlacementSkill): Cefr {
  const right = asked.filter((a) => a.skill === skill && a.correct);
  for (const level of [...CEFR_LEVELS].reverse()) {
    const atOrAbove = right.filter((a) => CEFR_LEVELS.indexOf(a.level) >= CEFR_LEVELS.indexOf(level));
    if (atOrAbove.length >= 2) return level;
  }
  return "A1";
}

export function placementLevels(asked: Asked[]): SkillLevels {
  return Object.fromEntries(PLACEMENT_SKILLS.map((s) => [s, skillLevel(asked, s)])) as SkillLevels;
}

/** Course level to start from: the lower of grammar and vocabulary (the course order follows grammar). */
export function startLevel(levels: SkillLevels): CourseLevel {
  const lowest = CEFR_LEVELS[Math.min(CEFR_LEVELS.indexOf(levels.grammar), CEFR_LEVELS.indexOf(levels.vocabulary))];
  return (COURSE_LEVELS as readonly string[]).includes(lowest) ? (lowest as CourseLevel) : "B2";
}

export const startUnitId = (levels: SkillLevels) => unitsAt(startLevel(levels))[0].id;

/** One line per level for the result screen. */
export const LEVEL_MEANING: Record<Cefr, string> = {
  A1: "Beginner: simple everyday phrases.",
  A2: "Elementary: routine tasks and familiar topics.",
  B1: "Intermediate: the main points of clear everyday language.",
  B2: "Upper intermediate: the NCLC 7 target; detailed, argued language.",
  C1: "Advanced: above the course target.",
};
