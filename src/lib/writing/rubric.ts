import type { Exam } from "@/lib/practice/types";

/**
 * Rubric dimensions and score-to-level mapping. Safe for client and server.
 *
 * CELPIP Writing is rated on four performance-standard dimensions, each on the
 * CELPIP 1–12 scale (CELPIP level = CLB level).
 * TCF Expression écrite is reported on 0–20; we rate four criteria on 0–20 and
 * average them, then map with IRCC's TCF Canada writing table.
 */
export type Dimension = {
  id: string;
  label: string;
  /** What raters look at, used in the prompt and shown under the score. */
  looksAt: string;
};

export const DIMENSIONS: Record<Exam, Dimension[]> = {
  celpip: [
    {
      id: "content",
      label: "Content / Coherence",
      looksAt:
        "Number and quality of ideas, how well they are developed with specific details and examples, and logical organization (paragraphing, sequencing, transitions).",
    },
    {
      id: "vocabulary",
      label: "Vocabulary",
      looksAt:
        "Range, precision and naturalness of word choice; idiomatic, accurate collocations; correct word forms and spelling.",
    },
    {
      id: "readability",
      label: "Readability",
      looksAt:
        "Grammar and sentence structure (range and accuracy), punctuation, cohesive devices, and how easy the text is to follow.",
    },
    {
      id: "task",
      label: "Task Fulfillment",
      looksAt:
        "Whether every required point is fully addressed, the register and tone fit the reader and purpose, the length is 150–200 words, and the response is relevant throughout.",
    },
  ],
  tcf: [
    {
      id: "task",
      label: "Task achievement (réalisation de la tâche)",
      looksAt:
        "Every instruction followed for all three tasks, the right text type and register, the word limits respected, and in task 3 a faithful summary of both documents plus a justified personal opinion.",
    },
    {
      id: "coherence",
      label: "Coherence & cohesion",
      looksAt:
        "Logical progression, paragraphing, and accurate use of connectors (d'abord, cependant, en effet, par conséquent…) and references.",
    },
    {
      id: "vocabulary",
      label: "Vocabulary (lexique)",
      looksAt:
        "Range and precision of vocabulary, appropriate register, spelling and accents, absence of anglicisms.",
    },
    {
      id: "grammar",
      label: "Grammar (morphosyntaxe)",
      looksAt:
        "Range and control of structures: agreement, verb tenses and moods (subjunctive, conditional), pronouns, prepositions, complex sentences.",
    },
  ],
};

export const SCORE_RANGE: Record<Exam, { min: number; max: number }> = {
  celpip: { min: 1, max: 12 },
  tcf: { min: 0, max: 20 },
};

export const WRITING_TARGET: Record<Exam, { label: string; level: number }> = {
  celpip: { label: "CLB 10", level: 10 },
  tcf: { label: "NCLC 7", level: 7 },
};

/** IRCC TCF Canada writing table: lowest /20 score for each NCLC level. */
const TCF_NCLC: [min: number, nclc: number][] = [
  [16, 10],
  [14, 9],
  [12, 8],
  [10, 7],
  [7, 6],
  [6, 5],
  [4, 4],
];

export function tcfWritingNclc(score: number): number | null {
  const whole = Math.floor(score);
  return TCF_NCLC.find(([min]) => whole >= min)?.[1] ?? null;
}

/**
 * Mean of the dimension scores and the level it maps to. The level rounds
 * down: a 9.5 average is a 9 with strengths, not a 10.
 */
export function writingLevel(
  exam: Exam,
  scores: number[],
): { score: number; level: string; meetsTarget: boolean } {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const score = Math.round(mean * 10) / 10;
  const target = WRITING_TARGET[exam].level;

  if (exam === "celpip") {
    const clb = Math.floor(mean);
    return { score, level: `CLB ${clb}`, meetsTarget: clb >= target };
  }
  const nclc = tcfWritingNclc(mean);
  return {
    score,
    level: nclc === null ? "Below NCLC 4" : `NCLC ${nclc}`,
    meetsTarget: nclc !== null && nclc >= target,
  };
}
