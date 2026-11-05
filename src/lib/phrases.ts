import celpipPhrases from "../../content/phrases/celpip.json";
import tcfPhrases from "../../content/phrases/tcf.json";
import type { Track } from "@/lib/exams";

/**
 * Phrase banks for each track: CELPIP email/speaking phrases and French
 * connectors. Validated at module load so a malformed file fails the build.
 */

export const REGISTERS = ["formal", "neutral", "informal"] as const;
export type Register = (typeof REGISTERS)[number];

export type Phrase = {
  /**
   * Stable key "<categoryId>:<slug of the phrase>", used by PhraseReview. Built
   * from the text, not the position, so adding or reordering phrases in the
   * JSON never moves a learner's marks onto a different phrase.
   */
  key: string;
  categoryId: string;
  phrase: string;
  /** When to use it, always in English. */
  meaning: string;
  example: string;
  register: Register;
};

export type PhraseCategory = {
  id: string;
  title: string;
  description: string;
  phrases: Phrase[];
};

type RawBank = {
  categories: {
    id: string;
    title: string;
    description: string;
    phrases: { phrase: string; meaning: string; example: string; register: string }[];
  }[];
};

function validate(name: string, raw: RawBank): PhraseCategory[] {
  const fail = (msg: string): never => {
    throw new Error(`Phrase bank ${name}: ${msg}`);
  };
  if (!Array.isArray(raw?.categories) || !raw.categories.length) fail("has no categories");

  const ids = new Set<string>();
  return raw.categories.map((c) => {
    if (!c.id?.trim() || !c.title?.trim() || !c.description?.trim()) fail("a category is missing id, title or description");
    if (ids.has(c.id)) fail(`duplicate category id ${c.id}`);
    ids.add(c.id);
    if (!Array.isArray(c.phrases) || !c.phrases.length) fail(`category ${c.id} is empty`);

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      phrases: c.phrases.map((p, i) => {
        if (!p.phrase?.trim() || !p.meaning?.trim() || !p.example?.trim()) {
          fail(`${c.id}:${i} is missing phrase, meaning or example`);
        }
        if (!(REGISTERS as readonly string[]).includes(p.register)) {
          fail(`${c.id}:${i} has an unknown register "${p.register}"`);
        }
        return {
          key: `${c.id}:${slug(p.phrase)}`,
          categoryId: c.id,
          phrase: p.phrase,
          meaning: p.meaning,
          example: p.example,
          register: p.register as Register,
        };
      }),
    };
  });
}

/** Lowercase ASCII slug: accents stripped, other runs of non-letters become "-". */
function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const BANKS: Record<Track, PhraseCategory[]> = {
  en: validate("celpip", celpipPhrases as RawBank),
  fr: validate("tcf", tcfPhrases as RawBank),
};

export function phraseCategories(track: Track): PhraseCategory[] {
  return BANKS[track];
}

export function allPhraseKeys(track: Track): Set<string> {
  return new Set(BANKS[track].flatMap((c) => c.phrases.map((p) => p.key)));
}
