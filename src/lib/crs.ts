/**
 * Language-related Express Entry CRS points, from IRCC's published criteria:
 * https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score/crs-criteria.html
 * (checked 2026-11-05; page modified 2026-11-03). Pure functions, no I/O.
 *
 * Covers the factors language moves directly: first and second official
 * language, the French-ability bonus, and the two skill-transferability
 * combinations that use language (education, foreign work experience).
 * Age, education itself, Canadian experience, job offers and nominations
 * are left out on purpose.
 */

export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type CrsSkill = (typeof SKILLS)[number];

/** CLB (English) or NCLC (French) per skill; 0 means no test / below 4. */
export type Levels = Record<CrsSkill, number>;

export type Education = "secondary" | "one-year" | "two-plus";
export type ForeignExperience = "none" | "1-2" | "3-plus";

export type CrsInput = {
  english: Levels;
  french: Levels;
  withSpouse: boolean;
  education: Education;
  foreignExperience: ForeignExperience;
};

/** Points per ability, first official language. */
export function firstLanguagePoints(level: number, withSpouse: boolean): number {
  if (level >= 10) return withSpouse ? 32 : 34;
  if (level === 9) return withSpouse ? 29 : 31;
  if (level === 8) return withSpouse ? 22 : 23;
  if (level === 7) return withSpouse ? 16 : 17;
  if (level === 6) return withSpouse ? 8 : 9;
  if (level >= 4) return 6;
  return 0;
}

/** Points per ability, second official language (same with or without spouse). */
export function secondLanguagePoints(level: number): number {
  if (level >= 9) return 6;
  if (level >= 7) return 3;
  if (level >= 5) return 1;
  return 0;
}

const SECOND_CAP = { withSpouse: 22, single: 24 };

const min = (l: Levels) => Math.min(...SKILLS.map((s) => l[s]));

/** "CLB 9+ on all four" → high, "CLB 7+ on all four" → mid, else none. */
function transferBand(first: Levels): "high" | "mid" | "none" {
  const lowest = min(first);
  if (lowest >= 9) return "high";
  if (lowest >= 7) return "mid";
  return "none";
}

const EDUCATION_POINTS: Record<Education, { mid: number; high: number }> = {
  secondary: { mid: 0, high: 0 },
  "one-year": { mid: 13, high: 25 },
  "two-plus": { mid: 25, high: 50 },
};

const EXPERIENCE_POINTS: Record<ForeignExperience, { mid: number; high: number }> = {
  none: { mid: 0, high: 0 },
  "1-2": { mid: 13, high: 25 },
  "3-plus": { mid: 25, high: 50 },
};

/** French bonus: NCLC 7+ in all four French skills; more with CLB 5+ in all four English. */
export function frenchBonus(english: Levels, french: Levels): number {
  if (min(french) < 7) return 0;
  return min(english) >= 5 ? 50 : 25;
}

export type CrsBreakdown = {
  /** Which language counts as first official language (the one worth more). */
  firstLanguage: "english" | "french";
  first: number;
  second: number;
  frenchBonus: number;
  educationTransfer: number;
  experienceTransfer: number;
  total: number;
};

function breakdownFor(input: CrsInput, firstLanguage: "english" | "french"): CrsBreakdown {
  const firstLevels = input[firstLanguage];
  const secondLevels = firstLanguage === "english" ? input.french : input.english;
  const first = SKILLS.reduce((n, s) => n + firstLanguagePoints(firstLevels[s], input.withSpouse), 0);
  const second = Math.min(
    SKILLS.reduce((n, s) => n + secondLanguagePoints(secondLevels[s]), 0),
    input.withSpouse ? SECOND_CAP.withSpouse : SECOND_CAP.single,
  );
  const band = transferBand(firstLevels);
  const educationTransfer = band === "none" ? 0 : EDUCATION_POINTS[input.education][band];
  const experienceTransfer = band === "none" ? 0 : EXPERIENCE_POINTS[input.foreignExperience][band];
  const bonus = frenchBonus(input.english, input.french);
  return {
    firstLanguage,
    first,
    second,
    frenchBonus: bonus,
    educationTransfer,
    experienceTransfer,
    total: first + second + bonus + educationTransfer + experienceTransfer,
  };
}

/** The candidate declares the first official language; take whichever scores higher. */
export function crsLanguagePoints(input: CrsInput): CrsBreakdown {
  const en = breakdownFor(input, "english");
  const fr = breakdownFor(input, "french");
  return fr.total > en.total ? fr : en;
}

export type NextStep = {
  language: "english" | "french";
  skill: CrsSkill;
  from: number;
  to: number;
  gain: number;
};

/** What one more level in each skill would add, biggest gains first. */
export function nextLevelGains(input: CrsInput): NextStep[] {
  const base = crsLanguagePoints(input).total;
  const steps: NextStep[] = [];
  for (const language of ["english", "french"] as const) {
    for (const skill of SKILLS) {
      const from = input[language][skill];
      if (from >= 12) continue;
      const to = from < 4 ? 4 : from + 1;
      const next = { ...input, [language]: { ...input[language], [skill]: to } };
      const gain = crsLanguagePoints(next).total - base;
      if (gain > 0) steps.push({ language, skill, from, to, gain });
    }
  }
  return steps.sort((a, b) => b.gain - a.gain);
}

export type Milestone = { label: string; gain: number };

/** Bigger jumps that need several skills to move together. */
export function milestones(input: CrsInput): Milestone[] {
  const base = crsLanguagePoints(input).total;
  const lift = (levels: Levels, floor: number): Levels =>
    Object.fromEntries(SKILLS.map((s) => [s, Math.max(levels[s], floor)])) as Levels;
  const out: Milestone[] = [];
  const add = (label: string, next: CrsInput) => {
    const gain = crsLanguagePoints(next).total - base;
    if (gain > 0) out.push({ label, gain });
  };
  if (min(input.english) < 9) add("All four English skills at CLB 9 or higher", { ...input, english: lift(input.english, 9) });
  if (min(input.english) < 10) add("All four English skills at CLB 10", { ...input, english: lift(input.english, 10) });
  if (min(input.french) < 7) add("All four French skills at NCLC 7 or higher", { ...input, french: lift(input.french, 7) });
  return out.sort((a, b) => b.gain - a.gain);
}
