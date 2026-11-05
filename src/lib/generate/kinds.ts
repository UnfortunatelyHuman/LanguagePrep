import type { SkillId, Track } from "@/lib/exams";

/** What the AI can write a fresh set for. Safe for client and server. */
export type GenerateKind =
  | "celpip-email"
  | "celpip-survey"
  | "celpip-speaking"
  | "celpip-reading"
  | "celpip-listening"
  | "tcf-writing"
  | "tcf-speaking"
  | "tcf-reading"
  | "tcf-listening";

export type GenerateOption = {
  kind: GenerateKind;
  skill: SkillId;
  label: string;
  description: string;
};

export const GENERATE_OPTIONS: Record<Track, GenerateOption[]> = {
  en: [
    {
      kind: "celpip-email",
      skill: "writing",
      label: "Writing Task 1: email",
      description: "A new situation with three points to cover; 27 minutes, 150–200 words.",
    },
    {
      kind: "celpip-survey",
      skill: "writing",
      label: "Writing Task 2: survey",
      description: "A new two-option survey question; 26 minutes, 150–200 words.",
    },
    {
      kind: "celpip-speaking",
      skill: "speaking",
      label: "Speaking: full 8-task test",
      description: "All eight tasks with fresh situations, scenes and options.",
    },
    {
      kind: "celpip-listening",
      skill: "listening",
      label: "Listening: mini test (2 parts)",
      description: "A daily-life conversation and a three-person discussion; 13 questions, about 13 minutes.",
    },
    {
      kind: "celpip-reading",
      skill: "reading",
      label: "Reading: mini test (2 parts)",
      description: "An email with its reply, and a viewpoints article with a reader's comment; 21 questions, 24 minutes.",
    },
  ],
  fr: [
    {
      kind: "tcf-writing",
      skill: "writing",
      label: "Expression écrite : 3 tâches",
      description: "A full paper: a message, an article or letter, and two opposing documents to compare.",
    },
    {
      kind: "tcf-speaking",
      skill: "speaking",
      label: "Expression orale : 3 tâches",
      description: "A fresh interview, role-play situation and opinion statement.",
    },
    {
      kind: "tcf-listening",
      skill: "listening",
      label: "Compréhension orale : mini test",
      description: "13 recordings from A1 to C2, scored on the 100–699 scale; about 12 minutes.",
    },
    {
      kind: "tcf-reading",
      skill: "reading",
      label: "Compréhension écrite : mini test",
      description: "13 documents from A1 to C2, scored on the 100–699 scale; 20 minutes.",
    },
  ],
};

export function findGenerateOption(track: Track, kind: string): GenerateOption | undefined {
  return GENERATE_OPTIONS[track].find((o) => o.kind === kind);
}

/** Generated set ids are "ai-" + the GeneratedSet row id, so they never clash with file sets. */
export const AI_SET_PREFIX = "ai-";

export function isGeneratedSetId(id: string): boolean {
  return id.startsWith(AI_SET_PREFIX);
}
