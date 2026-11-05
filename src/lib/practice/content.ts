import celpipReading1 from "../../../content/celpip/reading/set-1.json";
import celpipReading2 from "../../../content/celpip/reading/set-2.json";
import celpipListening1 from "../../../content/celpip/listening/set-1.json";
import celpipListening2 from "../../../content/celpip/listening/set-2.json";
import tcfReading1 from "../../../content/tcf/reading/set-1.json";
import tcfReading2 from "../../../content/tcf/reading/set-2.json";
import tcfReading3 from "../../../content/tcf/reading/set-3.json";
import tcfListening1 from "../../../content/tcf/listening/set-1.json";
import tcfListening2 from "../../../content/tcf/listening/set-2.json";
import tcfListening3 from "../../../content/tcf/listening/set-3.json";
import type { Track } from "@/lib/exams";
import type { ClientTestSet, PracticeSkill, TestSet } from "@/lib/practice/types";

/** Real question counts the sets must match: CELPIP 38 per skill, TCF 39. */
const EXPECTED_QUESTIONS = { celpip: 38, tcf: 39 } as const;

/**
 * Throw on authoring mistakes so a broken set fails the build instead of the
 * test: duplicate ids, out-of-range answers, blanks pointing nowhere, unknown
 * speakers, missing audio, wrong counts. AI-generated mini sets pass
 * `fullLength: false`, since they are deliberately shorter than the real paper.
 */
export function validateTestSet(set: TestSet, skill: PracticeSkill, fullLength = true): TestSet {
  const fail = (msg: string) => {
    throw new Error(`Practice set "${set.id}": ${msg}`);
  };
  if (set.skill !== skill) fail(`skill should be "${skill}"`);
  const ids = new Set<string>();
  let count = 0;

  for (const part of set.parts) {
    for (const section of part.sections) {
      if (skill === "listening") {
        if (!section.audio?.lines.length) fail(`${section.id} has no audio`);
        for (const line of section.audio!.lines) {
          if (!set.speakers?.[line.speaker]) {
            fail(`${section.id} uses unknown speaker "${line.speaker}"`);
          }
        }
      }
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
  if (!count) fail("has no questions");
  if (fullLength && count !== EXPECTED_QUESTIONS[set.exam]) {
    fail(`has ${count} questions, expected ${EXPECTED_QUESTIONS[set.exam]}`);
  }
  return set;
}

const load = (skill: PracticeSkill, sets: unknown[]) =>
  sets.map((s) => validateTestSet(s as TestSet, skill));

const SETS: Record<Track, Record<PracticeSkill, TestSet[]>> = {
  en: {
    reading: load("reading", [celpipReading1, celpipReading2]),
    listening: load("listening", [celpipListening1, celpipListening2]),
  },
  fr: {
    reading: load("reading", [tcfReading1, tcfReading2, tcfReading3]),
    listening: load("listening", [tcfListening1, tcfListening2, tcfListening3]),
  },
};

export const PRACTICE_SKILLS: PracticeSkill[] = ["reading", "listening"];

export function isPracticeSkill(value: string): value is PracticeSkill {
  return (PRACTICE_SKILLS as string[]).includes(value);
}

export function testSets(track: Track, skill: PracticeSkill): TestSet[] {
  return SETS[track][skill];
}

export function findTestSet(
  track: Track,
  skill: PracticeSkill,
  id: string,
): TestSet | undefined {
  return SETS[track][skill].find((set) => set.id === id);
}

export function questionCount(set: TestSet): number {
  return set.parts.reduce(
    (n, part) => n + part.sections.reduce((m, s) => m + s.questions.length, 0),
    0,
  );
}

export function totalMinutes(set: TestSet): number {
  return set.parts.reduce((n, part) => n + part.minutes, 0);
}

/**
 * The set without answers or explanations — those only come back after
 * submitting. Listening scripts do ship (the browser has to speak them), but
 * the UI keeps them hidden until the review.
 */
export function toClientSet(set: TestSet): ClientTestSet {
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
