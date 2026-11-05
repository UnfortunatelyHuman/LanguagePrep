import type { Exam } from "@/lib/practice/types";

/**
 * Rubric dimensions and score-to-level mapping. Safe for client and server.
 *
 * CELPIP Writing is rated on four performance-standard dimensions, each on the
 * CELPIP 1–12 scale. TCF Expression écrite is reported on 0–20; we rate four
 * criteria on 0–20 and average them. Scales and level mapping: lib/rubric/levels.
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
