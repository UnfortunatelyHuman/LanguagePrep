import "server-only";
import { io } from "next/cache";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import { resolveTestSet } from "@/lib/generate/sets";
import { questionNumbers } from "@/lib/practice/numbering";
import type { PracticeSkill, Question, Section, Speaker, TestSet } from "@/lib/practice/types";
import { prisma } from "@/lib/prisma";

/**
 * The mistakes notebook: every reading/listening question answered wrong in a
 * saved test, with the passage or script it came from.
 *
 * A mistake is "learned" once it was answered correctly in a later full test,
 * or twice in a row in a retry here. Learned mistakes stay listed (filterable)
 * so the learner can see what they've fixed.
 */

/** Correct retries in a row that count a mistake as learned. */
export const LEARNED_STREAK = 2;

export type Mistake = {
  /** `${setId}:${questionId}` */
  key: string;
  setId: string;
  setTitle: string;
  skill: PracticeSkill;
  partTitle: string;
  number: number;
  question: Question;
  options: string[];
  /** The option picked the last time it was answered wrong (null: left blank). */
  chosen: number | null;
  /** The screen it was on: passage and/or audio clip, sibling questions included. */
  section: Section;
  speakers: Record<string, Speaker>;
  exam: TestSet["exam"];
  timesMissed: number;
  lastMissed: string;
  retryStreak: number;
  learned: boolean;
  /** Why it counts as learned, for the badge. */
  learnedBy: "retest" | "retry" | null;
};

type Located = { question: Question; section: Section; partTitle: string };

function locate(set: TestSet, questionId: string): Located | null {
  for (const part of set.parts) {
    for (const section of part.sections) {
      const question = section.questions.find((q) => q.id === questionId);
      if (question) return { question, section, partTitle: part.title };
    }
  }
  return null;
}

export async function listMistakes(track: Track): Promise<Mistake[]> {
  await io();
  const exam = examKey(track);
  const [responses, reviews] = await Promise.all([
    prisma.response.findMany({
      where: {
        questionId: { not: null },
        attempt: { exam, skill: { in: ["reading", "listening"] } },
      },
      select: {
        questionId: true,
        text: true,
        feedback: true,
        createdAt: true,
        attempt: { select: { task: true, skill: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.mistakeReview.findMany({ where: { exam } }),
  ]);

  // Per question: history of right/wrong in saved tests, oldest first.
  type History = {
    setId: string;
    skill: PracticeSkill;
    questionId: string;
    missed: number;
    lastWrong: { chosen: number | null; at: Date } | null;
    latestCorrect: boolean;
  };
  const history = new Map<string, History>();
  for (const r of responses) {
    const setId = r.attempt.task;
    if (!setId || !r.questionId) continue;
    const fb = r.feedback as { correct?: unknown } | null;
    if (typeof fb?.correct !== "boolean") continue;
    const key = `${setId}:${r.questionId}`;
    const h =
      history.get(key) ??
      ({ setId, skill: r.attempt.skill as PracticeSkill, questionId: r.questionId, missed: 0, lastWrong: null, latestCorrect: false } as History);
    if (!fb.correct) {
      h.missed += 1;
      const chosen = r.text === null ? null : Number(r.text);
      h.lastWrong = { chosen: Number.isInteger(chosen) ? chosen : null, at: r.createdAt };
    }
    h.latestCorrect = fb.correct;
    history.set(key, h);
  }

  const reviewByKey = new Map(reviews.map((r) => [`${r.setId}:${r.questionId}`, r]));
  const sets = new Map<string, TestSet | undefined>();
  const numbersBySet = new Map<string, Record<string, number>>();
  const mistakes: Mistake[] = [];

  for (const [key, h] of history) {
    if (!h.missed || !h.lastWrong) continue;
    if (!sets.has(h.setId)) sets.set(h.setId, await resolveTestSet(track, h.skill, h.setId));
    const set = sets.get(h.setId);
    if (!set) continue; // A deleted generated or user paper.
    const found = locate(set, h.questionId);
    if (!found) continue;
    if (!numbersBySet.has(set.id)) numbersBySet.set(set.id, questionNumbers(set));

    const review = reviewByKey.get(key);
    const retryStreak = review?.streak ?? 0;
    const learnedBy = h.latestCorrect ? "retest" : retryStreak >= LEARNED_STREAK ? "retry" : null;

    mistakes.push({
      key,
      setId: set.id,
      setTitle: set.title,
      skill: set.skill,
      partTitle: found.partTitle,
      number: numbersBySet.get(set.id)![h.questionId],
      question: found.question,
      options: found.question.options ?? found.section.options ?? [],
      chosen: h.lastWrong.chosen,
      section: found.section,
      speakers: set.speakers ?? {},
      exam: set.exam,
      timesMissed: h.missed,
      lastMissed: h.lastWrong.at.toISOString(),
      retryStreak,
      learned: learnedBy !== null,
      learnedBy,
    });
  }

  // Most-missed first, then most recent.
  return mistakes.sort(
    (a, b) => b.timesMissed - a.timesMissed || b.lastMissed.localeCompare(a.lastMissed),
  );
}
