import type {
  Answers,
  CefrLevel,
  QuestionReview,
  ReadingResult,
  ReadingSet,
} from "@/lib/reading/types";

/*
 * Neither test publishes an exact raw-to-level table, so these are the widely
 * used approximations. They are a study guide, not a prediction of an official
 * result — the UI says so next to every level it shows.
 */

/** CELPIP Reading: minimum correct answers out of 38 for each CELPIP level (= CLB). */
const CELPIP_BANDS: { min: number; level: number }[] = [
  { min: 37, level: 12 },
  { min: 35, level: 11 },
  { min: 33, level: 10 },
  { min: 31, level: 9 },
  { min: 28, level: 8 },
  { min: 24, level: 7 },
  { min: 19, level: 6 },
  { min: 15, level: 5 },
  { min: 10, level: 4 },
  { min: 8, level: 3 },
];
const CELPIP_RAW_MAX = 38;
export const CELPIP_TARGET = 10;

/** TCF points per question by difficulty; a full 39-question paper adds up to 699. */
export const TCF_POINTS: Record<CefrLevel, number> = {
  A1: 3,
  A2: 9,
  B1: 15,
  B2: 21,
  C1: 26,
  C2: 33,
};
const TCF_MIN = 100;
const TCF_MAX = 699;

/** TCF Canada Compréhension écrite score → NCLC, per IRCC's equivalency table. */
const TCF_READING_NCLC: { min: number; level: number }[] = [
  { min: 549, level: 10 },
  { min: 524, level: 9 },
  { min: 499, level: 8 },
  { min: 453, level: 7 },
  { min: 406, level: 6 },
  { min: 375, level: 5 },
  { min: 342, level: 4 },
];
export const TCF_TARGET = 7;

export function celpipLevel(correct: number, total: number): number | null {
  // Scale if a set ever has a different length than the real 38.
  const raw = Math.round((correct / total) * CELPIP_RAW_MAX);
  return CELPIP_BANDS.find((band) => raw >= band.min)?.level ?? null;
}

export function tcfNclc(score: number): number | null {
  return TCF_READING_NCLC.find((band) => score >= band.min)?.level ?? null;
}

function optionCount(set: ReadingSet, questionId: string): number {
  for (const part of set.parts) {
    for (const section of part.sections) {
      const question = section.questions.find((q) => q.id === questionId);
      if (question) return (question.options ?? section.options ?? []).length;
    }
  }
  return 0;
}

/** Keep only answers to real questions with an in-range option index. */
export function sanitizeAnswers(set: ReadingSet, raw: unknown): Answers {
  if (typeof raw !== "object" || raw === null) return {};
  const answers: Answers = {};
  for (const [id, value] of Object.entries(raw)) {
    const count = optionCount(set, id);
    if (Number.isInteger(value) && value >= 0 && value < count) {
      answers[id] = value;
    }
  }
  return answers;
}

export function scoreReading(
  set: ReadingSet,
  answers: Answers,
): Omit<ReadingResult, "attemptId"> {
  const review: Record<string, QuestionReview> = {};
  const byLevel = new Map<CefrLevel, { correct: number; total: number }>();
  const byPart: ReadingResult["breakdown"] = [];
  let correct = 0;
  let total = 0;
  let points = 0;

  for (const part of set.parts) {
    const partTally = { label: part.title, correct: 0, total: 0 };
    for (const section of part.sections) {
      for (const question of section.questions) {
        const chosen = answers[question.id] ?? null;
        const isRight = chosen === question.answer;
        review[question.id] = {
          chosen,
          answer: question.answer,
          explanation: question.explanation,
        };

        total += 1;
        partTally.total += 1;
        if (isRight) {
          correct += 1;
          partTally.correct += 1;
        }

        if (question.level) {
          const tally = byLevel.get(question.level) ?? { correct: 0, total: 0 };
          tally.total += 1;
          if (isRight) {
            tally.correct += 1;
            points += TCF_POINTS[question.level];
          }
          byLevel.set(question.level, tally);
        }
      }
    }
    byPart.push(partTally);
  }

  if (set.exam === "celpip") {
    const level = celpipLevel(correct, total);
    return {
      correct,
      total,
      score: correct,
      maxScore: total,
      level: level === null ? "Below CLB 3" : `CLB ${level}`,
      target: `CLB ${CELPIP_TARGET}`,
      meetsTarget: level !== null && level >= CELPIP_TARGET,
      breakdown: byPart,
      review,
    };
  }

  const score = Math.min(TCF_MAX, Math.max(TCF_MIN, points));
  const level = tcfNclc(score);
  return {
    correct,
    total,
    score,
    maxScore: TCF_MAX,
    level: level === null ? "Below NCLC 4" : `NCLC ${level}`,
    target: `NCLC ${TCF_TARGET}`,
    meetsTarget: level !== null && level >= TCF_TARGET,
    breakdown: [...byLevel].map(([label, tally]) => ({ label, ...tally })),
    review,
  };
}
