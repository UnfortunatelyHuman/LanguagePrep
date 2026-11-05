import type { Exam } from "@/lib/practice/types";

/**
 * Score scales and level mapping shared by the AI-graded skills (writing and
 * speaking). Safe for client and server.
 *
 * CELPIP rates each dimension on its 1–12 scale (CELPIP level = CLB level).
 * TCF Canada reports writing and speaking on 0–20; IRCC maps both with the
 * same table.
 */

export const SCORE_RANGE: Record<Exam, { min: number; max: number }> = {
  celpip: { min: 1, max: 12 },
  tcf: { min: 0, max: 20 },
};

export const RUBRIC_TARGET: Record<Exam, { label: string; level: number }> = {
  celpip: { label: "CLB 10", level: 10 },
  tcf: { label: "NCLC 7", level: 7 },
};

/** IRCC TCF Canada writing/speaking table: lowest /20 score for each NCLC level. */
const TCF_NCLC: [min: number, nclc: number][] = [
  [16, 10],
  [14, 9],
  [12, 8],
  [10, 7],
  [7, 6],
  [6, 5],
  [4, 4],
];

export function tcfRubricNclc(score: number): number | null {
  const whole = Math.floor(score);
  return TCF_NCLC.find(([min]) => whole >= min)?.[1] ?? null;
}

/**
 * Mean of the dimension scores and the level it maps to. The level rounds
 * down: a 9.5 average is a 9 with strengths, not a 10.
 */
export function rubricLevel(
  exam: Exam,
  scores: number[],
): { score: number; level: string; meetsTarget: boolean } {
  if (!scores.length) throw new Error("rubricLevel needs at least one score");
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const score = Math.round(mean * 10) / 10;
  const target = RUBRIC_TARGET[exam].level;

  if (exam === "celpip") {
    const clb = Math.floor(mean);
    return { score, level: `CLB ${clb}`, meetsTarget: clb >= target };
  }
  const nclc = tcfRubricNclc(mean);
  return {
    score,
    level: nclc === null ? "Below NCLC 4" : `NCLC ${nclc}`,
    meetsTarget: nclc !== null && nclc >= target,
  };
}
