import type { Exam } from "@/lib/practice/types";
import type { Dimension } from "@/lib/writing/rubric";

/**
 * Speaking is graded on fluency, vocabulary, grammar and task completion
 * (CLAUDE.md). For CELPIP these cover its official dimensions: Listenability
 * is split into fluency and grammar, and Content/Coherence is folded into
 * task completion. Scales and level mapping live in lib/rubric/levels.
 */
export const SPEAKING_DIMENSIONS: Record<Exam, Dimension[]> = {
  celpip: [
    {
      id: "fluency",
      label: "Fluency & delivery",
      looksAt:
        "Pace (words per minute), hesitations, fillers (um, uh, like), false starts and self-corrections, and whether the answer flows naturally for the full time.",
    },
    {
      id: "vocabulary",
      label: "Vocabulary",
      looksAt: "Range, precision and naturalness of word choice and idiomatic expressions.",
    },
    {
      id: "grammar",
      label: "Grammar",
      looksAt: "Range and accuracy of sentence structures and verb forms, as heard in the transcript.",
    },
    {
      id: "task",
      label: "Task completion & coherence",
      looksAt:
        "Every part of the task answered, ideas developed with detail and examples, logical order with clear transitions, appropriate tone for the listener.",
    },
  ],
  tcf: [
    {
      id: "fluency",
      label: "Fluency (aisance)",
      looksAt: "Pace, hesitations, fillers (euh, bah), reformulations, and sustained speech for the full time.",
    },
    {
      id: "vocabulary",
      label: "Vocabulary (lexique)",
      looksAt: "Range and precision, appropriate register (tu/vous), absence of anglicisms.",
    },
    {
      id: "grammar",
      label: "Grammar (morphosyntaxe)",
      looksAt: "Agreement, tenses and moods, question forms (inversion, est-ce que), pronouns, negation.",
    },
    {
      id: "task",
      label: "Task completion & coherence",
      looksAt:
        "Interview answers developed, role-play questions that obtain the needed information politely, an opinion argued with reasons and examples, logical structure.",
    },
  ],
};

/** Words per minute from a transcript and its recording length. */
export function wordsPerMinute(words: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((words / seconds) * 60);
}
