import "server-only";
import { io } from "next/cache";
import { generateJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { unitsFixture } from "./fixtures";
import { unitsPrompt } from "./prompts";
import { UnitSuggestionSchema, UnitSuggestionsSchema, type UnitSuggestion } from "./schemas";
import {
  COURSE_LEVELS,
  FOCUS_SKILLS,
  UNITS,
  lessonsFor,
  type CourseLevel,
  type CourseLesson,
  type CourseUnit,
  type FocusSkill,
} from "./syllabus";

/**
 * The full syllabus: the built-in units from syllabus.json plus units the
 * learner added (stored in CourseUnit, ids "my-u01"…), each placed at the end
 * of its level. Lesson content for added units is generated the same way.
 */

export const USER_UNIT_PREFIX = "my-u";
export const isUserUnitId = (id: string) => id.startsWith(USER_UNIT_PREFIX);

type Row = {
  id: string;
  level: string;
  title: string;
  grammar: string;
  vocabulary: string;
  focusSkill: string;
  focusText: string;
};

const toUnit = (row: Row, number: number): CourseUnit => ({
  id: row.id,
  number,
  level: (COURSE_LEVELS as readonly string[]).includes(row.level) ? (row.level as CourseLevel) : "B2",
  title: row.title,
  grammar: row.grammar,
  vocabulary: row.vocabulary,
  skillFocus: {
    skill: (FOCUS_SKILLS as readonly string[]).includes(row.focusSkill) ? (row.focusSkill as FocusSkill) : "writing",
    text: row.focusText,
  },
  lessons: lessonsFor(row.id),
});

/** Every unit in course order (by level; added units after the built-in ones), numbered 1…n. */
export async function allUnits(): Promise<CourseUnit[]> {
  await io();
  const rows = await prisma.courseUnit.findMany({ orderBy: { createdAt: "asc" } });
  const added = rows.map((r) => toUnit(r, 0));
  const merged = COURSE_LEVELS.flatMap((level) => [
    ...UNITS.filter((u) => u.level === level),
    ...added.filter((u) => u.level === level),
  ]);
  return merged.map((u, i) => ({ ...u, number: i + 1 }));
}

export async function findUnit(id: string): Promise<CourseUnit | undefined> {
  return (await allUnits()).find((u) => u.id === id);
}

export async function findCourseLesson(lessonId: string): Promise<{ unit: CourseUnit; lesson: CourseLesson } | undefined> {
  const unit = await findUnit(lessonId.replace(/-[ab]$/, ""));
  const lesson = unit?.lessons.find((l) => l.id === lessonId);
  return unit && lesson ? { unit, lesson } : undefined;
}

export async function nextLessonAfter(lessonId: string): Promise<string | null> {
  const all = (await allUnits()).flatMap((u) => u.lessons.map((l) => l.id));
  const i = all.indexOf(lessonId);
  return i >= 0 && i + 1 < all.length ? all[i + 1] : null;
}

/** One AI request: 1–5 unit suggestions for what the learner asked for. Throws AiError. */
export async function suggestUnits(request: string): Promise<UnitSuggestion[]> {
  const { system, prompt } = unitsPrompt(request, await allUnits());
  const { units } = await generateJSON(prompt, UnitSuggestionsSchema, {
    system,
    temperature: 0.7,
    mockFixture: () => unitsFixture(),
  });
  return units;
}

async function nextIds(count: number): Promise<string[]> {
  const rows = await prisma.courseUnit.findMany({ select: { id: true } });
  let n = Math.max(0, ...rows.map((r) => Number(r.id.slice(USER_UNIT_PREFIX.length)) || 0));
  return Array.from({ length: count }, () => `${USER_UNIT_PREFIX}${String(++n).padStart(2, "0")}`);
}

const toData = (u: UnitSuggestion) => ({
  level: u.level,
  title: u.title,
  grammar: u.grammar,
  vocabulary: u.vocabulary,
  focusSkill: u.skillFocus.skill,
  focusText: u.skillFocus.text,
});

/** Save new units (validated with the same schema the AI must follow). */
export async function addUnits(units: UnitSuggestion[], source: "ai" | "user"): Promise<string[]> {
  const valid = units.map((u) => UnitSuggestionSchema.parse(u));
  const ids = await nextIds(valid.length);
  await prisma.courseUnit.createMany({ data: valid.map((u, i) => ({ id: ids[i], source, ...toData(u) })) });
  return ids;
}

export async function updateUnit(id: string, unit: UnitSuggestion): Promise<boolean> {
  if (!isUserUnitId(id)) return false;
  const { count } = await prisma.courseUnit.updateMany({ where: { id }, data: toData(UnitSuggestionSchema.parse(unit)) });
  return count === 1;
}

/** Delete an added unit with its cached lessons, their attempts and their review cards. */
export async function deleteUnit(id: string): Promise<void> {
  if (!isUserUnitId(id)) return;
  const lessonIds = lessonsFor(id).map((l) => l.id);
  await prisma.$transaction([
    prisma.reviewCard.deleteMany({ where: { source: "lesson", sourceId: { in: lessonIds } } }),
    prisma.courseLesson.deleteMany({ where: { id: { in: lessonIds } } }),
    prisma.courseUnit.deleteMany({ where: { id } }),
  ]);
}
