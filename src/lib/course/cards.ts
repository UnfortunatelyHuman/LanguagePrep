import "server-only";
import { io } from "next/cache";
import { prisma } from "@/lib/prisma";
import { studySettings } from "@/lib/study-settings";
import { wallClock } from "@/lib/time-zone";
import { findLesson } from "./lessons";
// Circular with phrase-cards, which is fine: each only calls the other at runtime.
import { syncSavedPhrases } from "./phrase-cards";
import { dayKey, review, type Grade } from "./srs";

/**
 * Review cards and the daily queue. Cards come from finished lessons, notes
 * imports, conversation corrections and the phrase bank; all share one queue.
 */

export const DEFAULT_NEW_PER_DAY = 10;

export type CardSource = "lesson" | "notes" | "chat" | "phrase-bank" | "saved-phrase";
export type NewCard = { kind: "vocab" | "grammar" | "phrase"; front: string; back: string; example?: string | null };

export type QueueCard = {
  id: string;
  kind: string;
  source: string;
  front: string;
  back: string;
  example: string | null;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  isNew: boolean;
};

/** Today in the learner's zone (the study plan's time zone setting). */
export async function today(): Promise<string> {
  const { timeZone } = await studySettings("fr");
  return dayKey(wallClock(new Date(), timeZone));
}

export async function courseSettings() {
  await io();
  const row = await prisma.courseSettings.findUnique({ where: { id: "fr" } });
  return { newCardsPerDay: row?.newCardsPerDay ?? DEFAULT_NEW_PER_DAY, ttsReplies: row?.ttsReplies ?? false };
}

export async function saveCourseSettings(data: { newCardsPerDay?: number; ttsReplies?: boolean }) {
  await prisma.courseSettings.upsert({ where: { id: "fr" }, create: { id: "fr", ...data }, update: data });
}

/** Add cards, skipping any that already exist for that source. Returns how many were new. */
export async function addCards(source: CardSource, sourceId: string, cards: NewCard[]): Promise<number> {
  const due = await today();
  const existing = new Set(
    (await prisma.reviewCard.findMany({ where: { source, sourceId }, select: { front: true } })).map((c) => c.front),
  );
  const fresh = cards.filter((c, i) => !existing.has(c.front) && cards.findIndex((d) => d.front === c.front) === i);
  if (!fresh.length) return 0;
  await prisma.reviewCard.createMany({
    data: fresh.map((c) => ({ source, sourceId, kind: c.kind, front: c.front, back: c.back, example: c.example ?? null, due })),
  });
  return fresh.length;
}

/** A finished lesson's vocabulary and grammar cards. */
export async function addLessonCards(lessonId: string): Promise<number> {
  const stored = await findLesson(lessonId);
  if (!stored) return 0;
  const { vocabulary, grammarCards } = stored.lesson;
  return addCards("lesson", lessonId, [
    ...vocabulary.map((v) => ({ kind: "vocab" as const, front: v.fr, back: v.en, example: v.exampleFr })),
    ...grammarCards.map((g) => ({ kind: "grammar" as const, front: g.sentence, back: g.answer, example: g.rule })),
  ]);
}

const toQueue = (c: {
  id: string;
  kind: string;
  source: string;
  front: string;
  back: string;
  example: string | null;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  introducedDay: string | null;
}): QueueCard => ({
  id: c.id,
  kind: c.kind,
  source: c.source,
  front: c.front,
  back: c.back,
  example: c.example,
  ease: c.ease,
  intervalDays: c.intervalDays,
  repetitions: c.repetitions,
  lapses: c.lapses,
  isNew: c.introducedDay === null,
});

/** Today's queue: every due card already started (oldest first), then new cards up to the daily limit. */
export async function dailyQueue(): Promise<{ cards: QueueCard[]; newLeft: number; newTotal: number }> {
  await io();
  // Phrases saved from TCF feedback before the course existed get their cards here.
  await syncSavedPhrases();
  const [day, { newCardsPerDay }] = await Promise.all([today(), courseSettings()]);
  const [due, introducedToday, newTotal] = await Promise.all([
    prisma.reviewCard.findMany({
      where: { due: { lte: day }, introducedDay: { not: null } },
      orderBy: [{ due: "asc" }, { lastReviewedAt: "asc" }],
    }),
    prisma.reviewCard.count({ where: { introducedDay: day } }),
    prisma.reviewCard.count({ where: { introducedDay: null } }),
  ]);
  const newLeft = Math.max(0, newCardsPerDay - introducedToday);
  const fresh = newLeft
    ? await prisma.reviewCard.findMany({ where: { introducedDay: null }, orderBy: { createdAt: "asc" }, take: newLeft })
    : [];
  return { cards: [...due, ...fresh].map(toQueue), newLeft, newTotal };
}

/** Counts for the dashboard: cards due today (including today's new ones) and all cards. */
export async function cardCounts(): Promise<{ due: number; total: number }> {
  const [{ cards }, total] = await Promise.all([dailyQueue(), prisma.reviewCard.count()]);
  return { due: cards.length, total };
}

/** Record one review; returns the card's next due day. */
export async function reviewCard(cardId: string, grade: Grade): Promise<string | null> {
  const card = await prisma.reviewCard.findUnique({ where: { id: cardId } });
  if (!card) return null;
  const day = await today();
  const next = review(card, grade, day);
  await prisma.$transaction([
    prisma.reviewCard.update({
      where: { id: cardId },
      data: { ...next, introducedDay: card.introducedDay ?? day, lastReviewedAt: new Date() },
    }),
    prisma.studyDay.upsert({ where: { day }, create: { day, reviews: 1 }, update: { reviews: { increment: 1 } } }),
  ]);
  return next.due;
}

/** Count today's course activity toward the streak. */
export async function countActivity(kind: "lessons" | "messages") {
  const day = await today();
  await prisma.studyDay.upsert({ where: { day }, create: { day, [kind]: 1 }, update: { [kind]: { increment: 1 } } });
}
