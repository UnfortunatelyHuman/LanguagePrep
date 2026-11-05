import type { Exam } from "@/lib/practice/types";
import type { Fix } from "@/lib/writing/types";

export type SpeakingKind =
  | "celpip-advice"
  | "celpip-experience"
  | "celpip-scene"
  | "celpip-predictions"
  | "celpip-compare"
  | "celpip-difficult"
  | "celpip-opinion"
  | "celpip-unusual"
  | "tcf-interview"
  | "tcf-roleplay"
  | "tcf-opinion";

/** A picture prompt, drawn as a card of labelled emoji (we ship no photos). */
export type Scene = {
  /** One-line description of the setting, e.g. "A busy farmers' market on a Saturday morning". */
  caption: string;
  /** 6–10 things visible in the picture, each with an emoji. */
  items: { emoji: string; label: string }[];
};

export type SpeakingOption = {
  id: "A" | "B";
  title: string;
  /** 3–4 facts about the option (price, features…). */
  details: string[];
};

export type SpeakingTask = {
  /** Unique within its set, e.g. "task-3" or "tache-2". */
  id: string;
  kind: SpeakingKind;
  /** "Task 1: Giving Advice", "Tâche 2 : Exercice en interaction". */
  label: string;
  /** CELPIP task 5 only: time to pick an option before preparing. */
  chooseSeconds?: number;
  prepSeconds: number;
  speakSeconds: number;
  /** The situation and what to talk about. */
  prompt: string;
  /** Guiding points or questions to cover. */
  points?: string[];
  /** Picture tasks (CELPIP 3, 4 and 8). */
  scene?: Scene;
  /** Choice tasks (CELPIP 5 and 6). */
  options?: SpeakingOption[];
};

export type SpeakingSet = {
  id: string;
  exam: Exam;
  title: string;
  summary: string;
  tasks: SpeakingTask[];
};

/** One recorded answer as the browser sends it. */
export type SpokenAnswer = {
  taskId: string;
  transcript: string;
  /** Seconds actually spoken (recording length). */
  seconds: number;
  /** CELPIP 5/6: the option chosen. */
  choice?: "A" | "B";
};

export type SpeakingTaskFeedback = {
  taskId: string;
  transcript: string;
  seconds: number;
  wordsPerMinute: number;
  choice?: "A" | "B";
  /** Response id whose audio can be fetched, if a recording was kept. */
  audioId: string | null;
  comment: string;
  /** A better version of what was said, in the exam's language. */
  improved: string;
};

export type SpeakingDimension = {
  id: string;
  label: string;
  score: number;
  max: number;
  comment: string;
};

export type SpeakingResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  level: string;
  target: string;
  meetsTarget: boolean;
  dimensions: SpeakingDimension[];
  strengths: string[];
  fixes: Fix[];
  tasks: SpeakingTaskFeedback[];
  summary: string;
  model: string;
  createdAt: string;
};
