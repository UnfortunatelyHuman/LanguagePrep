import rawSyllabus from "../../../content/french-course/syllabus.json";
import rawScenarios from "../../../content/french-course/scenarios.json";

/**
 * The French course syllabus (A1 → B2) and the conversation scenarios: hand-
 * written topic lists in content/french-course/. Lesson content is generated
 * from these topics on demand; nothing here is lesson material.
 *
 * Validated at module load so a malformed file fails the build.
 */

/** Levels the course teaches. */
export const COURSE_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

/** Levels the placement test can report (one above the course). */
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Cefr = (typeof CEFR_LEVELS)[number];

export const FOCUS_SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type FocusSkill = (typeof FOCUS_SKILLS)[number];

/** Lesson A starts from the grammar point, lesson B from the vocabulary and skill focus. */
export type LessonPart = "a" | "b";

export type CourseLesson = {
  /** "u07-a" */
  id: string;
  unitId: string;
  part: LessonPart;
  label: string;
};

export type CourseUnit = {
  /** "u07" */
  id: string;
  /** Position in the course, 1-based. */
  number: number;
  level: CourseLevel;
  title: string;
  grammar: string;
  vocabulary: string;
  skillFocus: { skill: FocusSkill; text: string };
  lessons: [CourseLesson, CourseLesson];
};

export type Scenario = {
  id: string;
  level: CourseLevel;
  title: string;
  situation: string;
  partnerRole: string;
  goal: string;
};

const isLevel = (v: unknown): v is CourseLevel => COURSE_LEVELS.includes(v as CourseLevel);
const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function fail(file: string, message: string): never {
  throw new Error(`content/french-course/${file}: ${message}`);
}

export function lessonsFor(unitId: string): [CourseLesson, CourseLesson] {
  return [
    { id: `${unitId}-a`, unitId, part: "a", label: "Lesson A · grammar" },
    { id: `${unitId}-b`, unitId, part: "b", label: "Lesson B · vocabulary and skills" },
  ];
}

function loadSyllabus(): { goals: Record<CourseLevel, string>; units: CourseUnit[] } {
  const raw = rawSyllabus as { levels?: unknown; units?: unknown };
  if (!Array.isArray(raw.levels) || !Array.isArray(raw.units)) fail("syllabus.json", "needs levels and units arrays");

  const goals = {} as Record<CourseLevel, string>;
  for (const l of raw.levels as { id?: unknown; goal?: unknown }[]) {
    if (!isLevel(l.id) || !text(l.goal)) fail("syllabus.json", `bad level entry ${JSON.stringify(l)}`);
    goals[l.id] = (l.goal as string).trim();
  }
  for (const level of COURSE_LEVELS) if (!goals[level]) fail("syllabus.json", `level ${level} has no goal`);

  const ids = new Set<string>();
  let lastLevel = 0;
  const units = (raw.units as Record<string, unknown>[]).map((u, i): CourseUnit => {
    const where = `unit ${i + 1}`;
    if (typeof u.id !== "string" || !/^u\d{2,3}$/.test(u.id)) fail("syllabus.json", `${where}: id must look like "u07"`);
    if (ids.has(u.id)) fail("syllabus.json", `duplicate unit id ${u.id}`);
    ids.add(u.id);
    if (!isLevel(u.level)) fail("syllabus.json", `${u.id}: level must be one of ${COURSE_LEVELS.join(", ")}`);
    const levelIndex = COURSE_LEVELS.indexOf(u.level);
    if (levelIndex < lastLevel) fail("syllabus.json", `${u.id}: units must be in level order`);
    lastLevel = levelIndex;
    for (const key of ["title", "grammar", "vocabulary"] as const) {
      if (!text(u[key])) fail("syllabus.json", `${u.id}: ${key} is missing`);
    }
    const focus = u.skillFocus as { skill?: unknown; text?: unknown } | undefined;
    if (!FOCUS_SKILLS.includes(focus?.skill as FocusSkill) || !text(focus?.text)) {
      fail("syllabus.json", `${u.id}: skillFocus needs a skill (${FOCUS_SKILLS.join(", ")}) and a text`);
    }
    return {
      id: u.id,
      number: i + 1,
      level: u.level,
      title: (u.title as string).trim(),
      grammar: (u.grammar as string).trim(),
      vocabulary: (u.vocabulary as string).trim(),
      skillFocus: { skill: focus!.skill as FocusSkill, text: (focus!.text as string).trim() },
      lessons: lessonsFor(u.id),
    };
  });
  for (const level of COURSE_LEVELS) {
    if (!units.some((u) => u.level === level)) fail("syllabus.json", `level ${level} has no units`);
  }
  return { goals, units };
}

function loadScenarios(): Scenario[] {
  const raw = rawScenarios as { scenarios?: unknown };
  if (!Array.isArray(raw.scenarios) || !raw.scenarios.length) fail("scenarios.json", "needs a scenarios array");
  const ids = new Set<string>();
  return (raw.scenarios as Record<string, unknown>[]).map((s, i) => {
    if (!text(s.id) || ids.has(s.id as string)) fail("scenarios.json", `scenario ${i + 1}: missing or duplicate id`);
    ids.add(s.id as string);
    if (!isLevel(s.level)) fail("scenarios.json", `${s.id}: bad level`);
    for (const key of ["title", "situation", "partnerRole", "goal"] as const) {
      if (!text(s[key])) fail("scenarios.json", `${s.id}: ${key} is missing`);
    }
    return {
      id: s.id as string,
      level: s.level,
      title: (s.title as string).trim(),
      situation: (s.situation as string).trim(),
      partnerRole: (s.partnerRole as string).trim(),
      goal: (s.goal as string).trim(),
    };
  });
}

const syllabus = loadSyllabus();

/** What each level lets you do, in English. */
export const LEVEL_GOALS = syllabus.goals;
/** Built-in units, in course order. */
export const UNITS: readonly CourseUnit[] = syllabus.units;
export const SCENARIOS: readonly Scenario[] = loadScenarios();

/** Built-in units only; units the learner added are looked up with `findUnit` in units.ts. */
export const getUnit = (id: string) => UNITS.find((u) => u.id === id);

export const unitsAt = (level: CourseLevel) => UNITS.filter((u) => u.level === level);
export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id);
