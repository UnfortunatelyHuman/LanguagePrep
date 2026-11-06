import type { Exercise } from "./schemas";

/**
 * Local answer checking for course exercises: no AI. Typed answers are
 * compared leniently: case, spacing, punctuation and apostrophe style never
 * matter; missing or wrong accents count as right with a note.
 */

export type Verdict = "correct" | "accents" | "wrong";

/** Typographic quotes and apostrophes to plain ones. */
const plain = (s: string) => s.replace(/[’‘`´]/g, "'").replace(/[«»“”"]/g, " ");

/** Lowercase, plain apostrophes, no punctuation, single spaces. */
export function normalize(s: string): string {
  return plain(s)
    .toLowerCase()
    .replace(/[.,!?;:…()\[\]-]/g, " ")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Compare a typed answer with every accepted answer. */
export function checkTyped(input: string, accepted: string[]): Verdict {
  const given = normalize(input);
  if (!given) return "wrong";
  const answers = accepted.map(normalize);
  if (answers.includes(given)) return "correct";
  if (answers.map(stripAccents).includes(stripAccents(given))) return "accents";
  return "wrong";
}

/** The words of a reorder sentence (end punctuation dropped; it's shown separately). */
export function reorderWords(sentence: string): { words: string[]; end: string } {
  const trimmed = sentence.trim();
  const end = /[.!?…]+$/.exec(trimmed)?.[0] ?? "";
  return { words: trimmed.slice(0, trimmed.length - end.length).split(/\s+/).filter(Boolean), end };
}

/** Deterministic shuffle (so server and client render the same order), never the original order. */
export function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let state = (seed * 9301 + 49297) % 233280 || 1;
  const random = () => (state = (state * 9301 + 49297) % 233280) / 233280;
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && out.every((v, i) => v === items[i])) out.push(out.shift()!);
  return out;
}

export function checkReorder(sentence: string, chosen: string[]): Verdict {
  const { words } = reorderWords(sentence);
  const want = normalize(words.join(" "));
  const got = normalize(chosen.join(" "));
  // Two identical words swapped are still the same sentence.
  return got === want ? "correct" : "wrong";
}

/** The answer to show after a wrong try. */
export function correctAnswer(ex: Exercise): string {
  switch (ex.type) {
    case "mcq":
    case "listen":
      return ex.options[ex.answer];
    case "blank":
      return ex.sentence.replace("___", ex.answers[0]);
    case "translate":
      return ex.answers[0];
    case "reorder":
      return ex.sentence;
  }
}

/** Per-exercise result saved with the attempt. */
export type ExerciseResult = {
  index: number;
  answer: string;
  verdict: Verdict;
  /** The learner overrode a "wrong" on a free translation. */
  overridden?: boolean;
};

export const isRight = (r: Pick<ExerciseResult, "verdict" | "overridden">) => r.verdict !== "wrong" || !!r.overridden;
