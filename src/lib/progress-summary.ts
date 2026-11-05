import type { SkillId, Track } from "@/lib/exams";

/**
 * Pure progress maths (no database), so it can be unit-tested and reused by
 * the progress page and the study plan.
 */

/** CLB/NCLC target per track (CLB 10 for CELPIP, NCLC 7 for TCF). */
export const LEVEL_TARGET: Record<Track, number> = { en: 10, fr: 7 };

/** Every estimate we store reads "CLB 8", "NCLC 7", "Below CLB 3" or "Below NCLC 4". */
export function parseLevel(label: string | null): number | null {
  if (!label) return null;
  const match = /(\d+)/.exec(label);
  if (!match) return null;
  const n = Number(match[1]);
  // "Below X n" sits one step under n on the chart.
  return /^below/i.test(label.trim()) ? n - 1 : n;
}

export type TrendPoint = {
  id: string;
  date: Date;
  level: number;
  label: string;
  task: string | null;
};

export type SkillProgress = {
  skill: SkillId;
  name: string;
  points: TrendPoint[];
  latest: TrendPoint | null;
  /** Mean level of the last three attempts, one decimal; steadier than one result. */
  recentAverage: number | null;
  /** Latest minus the first of the last five attempts; positive is improvement. */
  change: number | null;
  meetsTarget: boolean;
};

export type ProgressSummary = {
  target: number;
  scale: "CLB" | "NCLC";
  skills: SkillProgress[];
  /** Skill to focus on next: lowest recent level, or one never practised. */
  focus: { skill: SkillId; reason: string } | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Turn one skill's attempts (any order) into its trend and summary numbers. */
export function summarizeSkill(
  skill: SkillId,
  name: string,
  attempts: { id: string; createdAt: Date; estimatedLevel: string | null; task: string | null }[],
  target: number,
): SkillProgress {
  const points = attempts
    .flatMap((a) => {
      const level = parseLevel(a.estimatedLevel);
      return level === null
        ? []
        : [{ id: a.id, date: a.createdAt, level, label: a.estimatedLevel!, task: a.task }];
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const latest = points.at(-1) ?? null;
  const recent = points.slice(-3);
  const recentAverage = recent.length
    ? round1(recent.reduce((n, p) => n + p.level, 0) / recent.length)
    : null;
  const window = points.slice(-5);
  const change = window.length >= 2 ? window.at(-1)!.level - window[0].level : null;

  return {
    skill,
    name,
    points,
    latest,
    recentAverage,
    change,
    meetsTarget: recentAverage !== null && recentAverage >= target,
  };
}

/**
 * Weakest skill first: one never practised beats everything (we know nothing);
 * otherwise the lowest recent average, ties broken by the stalest practice.
 */
export function pickFocus(skills: SkillProgress[], target: number): ProgressSummary["focus"] {
  const untried = skills.find((s) => !s.points.length);
  if (untried) {
    return { skill: untried.skill, reason: `You haven't practised ${untried.name.toLowerCase()} yet.` };
  }
  const weakest = [...skills].sort(
    (a, b) =>
      a.recentAverage! - b.recentAverage! ||
      a.latest!.date.getTime() - b.latest!.date.getTime(),
  )[0];
  if (!weakest) return null;
  const gap = round1(target - weakest.recentAverage!);
  return {
    skill: weakest.skill,
    reason:
      gap > 0
        ? `Your lowest recent average (${weakest.recentAverage}), ${gap} below the target of ${target}.`
        : `Every skill is at target; ${weakest.name.toLowerCase()} has the least margin (${weakest.recentAverage}).`,
  };
}

