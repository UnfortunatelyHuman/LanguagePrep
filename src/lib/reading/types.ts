/**
 * Shape of a reading test, as authored in /content/{celpip,tcf}/reading/*.json.
 *
 * A set has parts (CELPIP's four timed parts, or TCF's single 60-minute block).
 * A part has sections — one screen each: a passage and the questions about it.
 * A question whose id appears as `[[id]]` inside the passage is a fill-in blank
 * and is answered in place; every other question is listed below the passage.
 */

export type Exam = "celpip" | "tcf";

/** CEFR level of a TCF question, which sets how much it is worth. */
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Diagram = {
  caption?: string;
  columns: string[];
  rows: string[][];
  /** Fine print under the table, e.g. discounts and conditions. */
  notes?: string[];
};

export type Passage = {
  /** Kind of document, shown as a small label: "Email", "Article", "Affiche"… */
  label?: string;
  heading?: string;
  /** Header lines such as From / To / Subject. */
  meta?: { label: string; value: string }[];
  diagram?: Diagram;
  paragraphs: string[];
  /** Label paragraphs A, B, C… (CELPIP Reading for Information). */
  lettered?: boolean;
};

export type Question = {
  id: string;
  /** The question or the statement to match. Optional for inline blanks. */
  stem?: string;
  /** Falls back to the section's shared options when omitted. */
  options?: string[];
  /** Index into the options. */
  answer: number;
  /** Why the answer is right (and, where useful, why the others are not). */
  explanation: string;
  level?: CefrLevel;
};

export type Section = {
  id: string;
  instructions?: string;
  passage?: Passage;
  /** Options shared by every question in the section (e.g. paragraphs A–E). */
  options?: string[];
  questions: Question[];
};

export type Part = {
  id: string;
  title: string;
  minutes: number;
  instructions?: string;
  sections: Section[];
};

export type ReadingSet = {
  id: string;
  exam: Exam;
  title: string;
  summary: string;
  parts: Part[];
};

/* What the browser gets: the same set with answers and explanations removed. */

export type ClientQuestion = Omit<Question, "answer" | "explanation">;
export type ClientSection = Omit<Section, "questions"> & {
  questions: ClientQuestion[];
};
export type ClientPart = Omit<Part, "sections"> & { sections: ClientSection[] };
export type ClientReadingSet = Omit<ReadingSet, "parts"> & {
  parts: ClientPart[];
};

/** Question id → chosen option index. Unanswered questions are absent. */
export type Answers = Record<string, number>;

export type QuestionReview = {
  chosen: number | null;
  answer: number;
  explanation: string;
};

export type ReadingResult = {
  attemptId: string;
  correct: number;
  total: number;
  /** Raw correct (CELPIP) or the weighted 100–699 score (TCF). */
  score: number;
  maxScore: number;
  /** "CLB 9" / "NCLC 7", or "Below CLB 3" etc. */
  level: string;
  target: string;
  meetsTarget: boolean;
  /** Per part (CELPIP) or per CEFR level (TCF). */
  breakdown: { label: string; correct: number; total: number }[];
  review: Record<string, QuestionReview>;
};
