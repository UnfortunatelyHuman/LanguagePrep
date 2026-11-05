import "server-only";
import { io } from "next/cache";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import { USER_SET_PREFIX, isUserSetId } from "@/lib/generate/kinds";
import { questionCount, validateTestSet } from "@/lib/practice/content";
import type { PracticeSkill, TestSet } from "@/lib/practice/types";
import { prisma } from "@/lib/prisma";
import { PaperSchema, describeIssues } from "./schema";

/** Most questions one added paper may hold (a full TCF paper is 39, CELPIP 38). */
export const MAX_QUESTIONS = 80;

export type UserPaperSummary = {
  setId: string;
  skill: PracticeSkill;
  title: string;
  summary: string;
  questions: number;
  minutes: number;
  createdAt: Date;
};

/**
 * Turn whatever the learner submitted into a valid TestSet for this track, or
 * a message saying what to fix. The id and exam always come from the app.
 */
export function normalizePaper(
  track: Track,
  raw: unknown,
  setId: string,
): { set: TestSet } | { error: string } {
  const parsed = PaperSchema.safeParse(raw);
  if (!parsed.success) return { error: describeIssues(parsed.error) };
  const set = { ...parsed.data, id: setId, exam: examKey(track) } as TestSet;
  if (set.skill === "listening" && !set.speakers) {
    return { error: "A listening paper needs a \"speakers\" list for its audio lines." };
  }
  try {
    validateTestSet(set, set.skill, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message.replace(/^Practice set "[^"]*": /, "") };
  }
  if (questionCount(set) > MAX_QUESTIONS) {
    return { error: `A paper can have at most ${MAX_QUESTIONS} questions.` };
  }
  return { set };
}

const rowId = (setId: string) => setId.slice(USER_SET_PREFIX.length);

/** The learner's own papers for this track, newest first. */
export async function listUserPapers(track: Track, skill?: PracticeSkill): Promise<UserPaperSummary[]> {
  await io();
  const rows = await prisma.generatedSet.findMany({
    where: { exam: examKey(track), source: "user", ...(skill ? { skill } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.flatMap((r) => {
    const set = r.data as TestSet;
    if (!set?.parts) return [];
    return [
      {
        setId: `${USER_SET_PREFIX}${r.id}`,
        skill: r.skill as PracticeSkill,
        title: r.title,
        summary: set.summary ?? "",
        questions: questionCount(set),
        minutes: set.parts.reduce((n, p) => n + p.minutes, 0),
        createdAt: r.createdAt,
      },
    ];
  });
}

/** One of the learner's papers (any skill), or null. */
export async function getUserPaper(track: Track, setId: string): Promise<TestSet | null> {
  if (!isUserSetId(setId)) return null;
  await io();
  const row = await prisma.generatedSet.findFirst({
    where: { id: rowId(setId), exam: examKey(track), source: "user" },
    select: { data: true },
  });
  return (row?.data as TestSet | undefined) ?? null;
}

/** Create (no setId) or replace one of the learner's papers. Returns its set id. */
export async function saveUserPaper(
  track: Track,
  raw: unknown,
  existingId?: string,
): Promise<{ setId: string; skill: PracticeSkill } | { error: string }> {
  const exam = examKey(track);

  if (existingId) {
    if (!isUserSetId(existingId)) return { error: "That paper can't be edited." };
    const found = await prisma.generatedSet.findFirst({
      where: { id: rowId(existingId), exam, source: "user" },
      select: { skill: true },
    });
    if (!found) return { error: "That paper no longer exists." };
    const result = normalizePaper(track, raw, existingId);
    if ("error" in result) return result;
    if (result.set.skill !== found.skill) {
      return { error: `This is a ${found.skill} paper; its skill can't be changed.` };
    }
    await prisma.generatedSet.update({
      where: { id: rowId(existingId) },
      data: { title: result.set.title, data: result.set },
    });
    return { setId: existingId, skill: result.set.skill };
  }

  // Check before creating the row, so a broken paper never leaves one behind.
  const check = normalizePaper(track, raw, `${USER_SET_PREFIX}check`);
  if ("error" in check) return check;
  const row = await prisma.generatedSet.create({
    data: { exam, source: "user", skill: check.set.skill, title: check.set.title, data: {} },
    select: { id: true },
  });
  const setId = `${USER_SET_PREFIX}${row.id}`;
  await prisma.generatedSet.update({
    where: { id: row.id },
    data: { data: { ...check.set, id: setId } },
  });
  return { setId, skill: check.set.skill };
}

export async function deleteUserPaper(track: Track, setId: string): Promise<boolean> {
  if (!isUserSetId(setId)) return false;
  const { count } = await prisma.generatedSet.deleteMany({
    where: { id: rowId(setId), exam: examKey(track), source: "user" },
  });
  return count > 0;
}
