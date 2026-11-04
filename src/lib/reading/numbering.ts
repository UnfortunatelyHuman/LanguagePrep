import type { ClientReadingSet, ClientSection } from "@/lib/reading/types";

/** Question id → its 1-based number across the whole set, in exam order. */
export function questionNumbers(set: ClientReadingSet): Record<string, number> {
  const numbers: Record<string, number> = {};
  let n = 0;
  for (const part of set.parts) {
    for (const section of part.sections) {
      for (const q of section.questions) numbers[q.id] = ++n;
    }
  }
  return numbers;
}

const BLANK = /\[\[([\w-]+)\]\]/g;

/** Ids of questions answered inline as blanks in this section's passage. */
export function blankIds(section: ClientSection): Set<string> {
  const text = (section.passage?.paragraphs ?? []).join("\n");
  return new Set([...text.matchAll(BLANK)].map((m) => m[1]));
}

/** Split a paragraph into text runs and blank references. */
export function splitBlanks(
  paragraph: string,
): ({ text: string } | { blank: string })[] {
  return paragraph
    .split(/(\[\[[\w-]+\]\])/)
    .filter(Boolean)
    .map((chunk) => {
      const match = /^\[\[([\w-]+)\]\]$/.exec(chunk);
      return match ? { blank: match[1] } : { text: chunk };
    });
}

export function optionsFor(section: ClientSection, questionId: string): string[] {
  const q = section.questions.find((x) => x.id === questionId);
  return q?.options ?? section.options ?? [];
}

export const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
