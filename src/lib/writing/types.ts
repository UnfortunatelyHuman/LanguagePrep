import type { Exam } from "@/lib/practice/types";

export type WritingKind =
  | "celpip-email"
  | "celpip-survey"
  | "tcf-message"
  | "tcf-article"
  | "tcf-argument";

export type WritingTask = {
  /** Unique within its set, e.g. "task-1" or "tache-3". */
  id: string;
  kind: WritingKind;
  /** "Task 1: Writing an Email", "Tâche 3 : Comparer deux points de vue". */
  label: string;
  minWords: number;
  maxWords: number;
  /** The situation. For TCF task 3, the debate question. */
  scenario: string;
  /** What to write. */
  instructions: string;
  /** CELPIP email: the three points to cover. */
  bullets?: string[];
  /** CELPIP survey: the two options to choose from. */
  options?: { id: "A" | "B"; text: string }[];
  /** TCF task 3: the two short opinion texts to compare. */
  documents?: { title: string; text: string }[];
};

/** One sitting: a single CELPIP task, or all three TCF tasks on one timer. */
export type WritingSet = {
  id: string;
  exam: Exam;
  title: string;
  summary: string;
  /** One timer for the whole set. */
  minutes: number;
  tasks: WritingTask[];
};

/** What the writer submitted for one task. */
export type TaskTexts = Record<string, string>;

export type DimensionResult = {
  id: string;
  label: string;
  score: number;
  max: number;
  comment: string;
};

export type Fix = {
  title: string;
  explanation: string;
  /** A phrase from the writer's text, and how to fix it. */
  before: string;
  after: string;
};

export type TaskFeedback = {
  taskId: string;
  text: string;
  wordCount: number;
  /** The writer's text with every error fixed, in the exam's language. */
  corrected: string;
  comment: string;
};

/** Everything the results page needs, live or reloaded from history. */
export type WritingResult = {
  attemptId: string;
  /** Mean of the dimension scores, one decimal. */
  score: number;
  maxScore: number;
  /** "CLB 9", "NCLC 7", "Below NCLC 4". */
  level: string;
  target: string;
  meetsTarget: boolean;
  dimensions: DimensionResult[];
  strengths: string[];
  fixes: Fix[];
  tasks: TaskFeedback[];
  summary: string;
  /** Model that graded it, e.g. "gemini-2.5-flash". */
  model: string;
  durationSeconds: number | null;
  createdAt: string;
};

/** Error body /api/feedback returns, safe to show as-is. */
export type FeedbackErrorKind =
  | "missing_key"
  | "auth"
  | "rate_limit"
  | "config"
  | "invalid_response"
  | "provider"
  | "too_short"
  | "bad_request"
  | "server";

export type FeedbackError = {
  kind: FeedbackErrorKind;
  message: string;
  retryAfterSeconds?: number;
};
