/**
 * SM-2 spaced repetition, as pure functions. Days are "YYYY-MM-DD" strings in
 * the learner's time zone, so "due today" never drifts with the server clock.
 */

export const GRADES = ["again", "hard", "good", "easy"] as const;
export type Grade = (typeof GRADES)[number];

/** SM-2 quality for each button. */
const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export type CardState = { ease: number; intervalDays: number; repetitions: number; lapses: number };

export const MIN_EASE = 1.3;
const EASY_BONUS = 1.3;

/** Add days to a "YYYY-MM-DD" day. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" of a Date's local fields (use wallClock first for the learner's zone). */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The card after a review. "Again" resets it (due again today, at the end of
 * the session); otherwise intervals go 1 day, 6 days, then × ease.
 */
export function review(card: CardState, grade: Grade, today: string): CardState & { due: string } {
  const q = QUALITY[grade];
  const ease = Math.max(MIN_EASE, card.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (q < 3) {
    return { ease, intervalDays: 0, repetitions: 0, lapses: card.lapses + 1, due: today };
  }
  const repetitions = card.repetitions + 1;
  let interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(card.intervalDays * ease);
  if (grade === "hard") interval = Math.max(1, Math.round(repetitions <= 2 ? interval : card.intervalDays * 1.2));
  if (grade === "easy") interval = Math.round(interval * EASY_BONUS) + (repetitions === 1 ? 2 : 0);
  interval = Math.max(1, interval);
  return { ease, intervalDays: interval, repetitions, lapses: card.lapses, due: addDays(today, interval) };
}

/** Next due, as words for the grade buttons ("today", "1 day", "6 days", "3 mo"). */
export function intervalLabel(days: number): string {
  if (days <= 0) return "today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
}
