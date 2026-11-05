import "server-only";
import { io } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wallClock } from "@/lib/time-zone";

/**
 * Practice activity per calendar day, across both exams: what the dashboard's
 * streak and heatmap are drawn from. Days follow the learner's time zone.
 */

export type ActivityDay = {
  /** YYYY-MM-DD in the learner's zone. */
  date: string;
  /** Saved attempts (tests, writing, speaking) that day. */
  count: number;
  /** Minutes spent, from the attempts that recorded a duration. */
  minutes: number;
};

export type Activity = {
  /** Oldest first, ending today; always whole weeks starting on Monday. */
  days: ActivityDay[];
  /** Consecutive days with practice, ending today (or yesterday, if today is still empty). */
  streak: number;
  longestStreak: number;
  /** Days with practice in the last 7 days. */
  activeThisWeek: number;
  totalAttempts: number;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Pure part, so it can be checked without a database. */
export function buildActivity(
  attempts: { createdAt: Date; durationSeconds: number | null }[],
  today: Date,
  weeks: number,
): Activity {
  const byDay = new Map<string, { count: number; seconds: number }>();
  for (const a of attempts) {
    const key = iso(a.createdAt);
    const cur = byDay.get(key) ?? { count: 0, seconds: 0 };
    cur.count += 1;
    cur.seconds += a.durationSeconds ?? 0;
    byDay.set(key, cur);
  }

  // Grid starts on the Monday `weeks - 1` weeks before this week's Monday.
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekday = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - weekday - (weeks - 1) * 7);

  const days: ActivityDay[] = [];
  const todayKey = iso(today);
  for (const d = new Date(start); ; d.setDate(d.getDate() + 1)) {
    const key = iso(d);
    const v = byDay.get(key);
    days.push({ date: key, count: v?.count ?? 0, minutes: Math.round((v?.seconds ?? 0) / 60) });
    if (key === todayKey) break;
  }

  // Streaks over every practised day, not only the visible grid.
  const keys = [...byDay.keys()].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const [y, m, dd] = k.split("-").map(Number);
    const cur = new Date(y, m - 1, dd);
    run = prev && Math.round((cur.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = cur;
  }

  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!byDay.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (byDay.has(iso(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const activeThisWeek = days.slice(-7).filter((d) => d.count > 0).length;
  return { days, streak, longestStreak: longest, activeThisWeek, totalAttempts: attempts.length };
}

export async function activity(timeZone: string | null, weeks = 16): Promise<Activity> {
  await io();
  const rows = await prisma.attempt.findMany({
    select: { createdAt: true, durationSeconds: true },
    orderBy: { createdAt: "asc" },
  });
  const today = wallClock(new Date(), timeZone);
  return buildActivity(
    rows.map((r) => ({ ...r, createdAt: wallClock(r.createdAt, timeZone) })),
    today,
    weeks,
  );
}
