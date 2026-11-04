import celpip1 from "../../../content/celpip/reading/set-1.json";
import celpip2 from "../../../content/celpip/reading/set-2.json";
import tcf1 from "../../../content/tcf/reading/set-1.json";
import type { Track } from "@/lib/exams";
import type { ClientReadingSet, ReadingSet } from "@/lib/reading/types";

/** Real question counts the sets must match. */
const EXPECTED_QUESTIONS = { celpip: 38, tcf: 39 } as const;

/**
 * Throw on authoring mistakes so a broken set fails the build instead of the
 * test: duplicate ids, out-of-range answers, blanks pointing nowhere, wrong counts.
 */
function validate(set: ReadingSet): ReadingSet {
  const fail = (msg: string) => {
    throw new Error(`Reading set "${set.id}": ${msg}`);
  };
  const ids = new Set<string>();
  let count = 0;

  for (const part of set.parts) {
    for (const section of part.sections) {
      const text = (section.passage?.paragraphs ?? []).join("\n");
      for (const match of text.matchAll(/\[\[([\w-]+)\]\]/g)) {
        if (!section.questions.some((q) => q.id === match[1])) {
          fail(`blank [[${match[1]}]] in ${section.id} has no question`);
        }
      }
      for (const q of section.questions) {
        if (ids.has(q.id)) fail(`duplicate question id ${q.id}`);
        ids.add(q.id);
        count += 1;
        const options = q.options ?? section.options;
        if (!options?.length) fail(`${q.id} has no options`);
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options!.length) {
          fail(`${q.id} answer is out of range`);
        }
        if (!q.explanation.trim()) fail(`${q.id} has no explanation`);
        if (set.exam === "tcf" && !q.level) fail(`${q.id} needs a CEFR level`);
      }
    }
  }
  if (count !== EXPECTED_QUESTIONS[set.exam]) {
    fail(`has ${count} questions, expected ${EXPECTED_QUESTIONS[set.exam]}`);
  }
  return set;
}

const SETS: Record<Track, ReadingSet[]> = {
  en: [celpip1, celpip2].map((s) => validate(s as ReadingSet)),
  fr: [tcf1].map((s) => validate(s as ReadingSet)),
};

export function readingSets(track: Track): ReadingSet[] {
  return SETS[track];
}

export function findReadingSet(track: Track, id: string): ReadingSet | undefined {
  return SETS[track].find((set) => set.id === id);
}

export function questionCount(set: ReadingSet): number {
  return set.parts.reduce(
    (n, part) => n + part.sections.reduce((m, s) => m + s.questions.length, 0),
    0,
  );
}

export function totalMinutes(set: ReadingSet): number {
  return set.parts.reduce((n, part) => n + part.minutes, 0);
}

/** The set without answers or explanations — those only come back after submitting. */
export function toClientSet(set: ReadingSet): ClientReadingSet {
  return {
    ...set,
    parts: set.parts.map((part) => ({
      ...part,
      sections: part.sections.map((section) => ({
        ...section,
        questions: section.questions.map((q) => ({
          id: q.id,
          stem: q.stem,
          options: q.options,
          level: q.level,
        })),
      })),
    })),
  };
}
