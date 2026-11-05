import type { SkillId, Track } from "@/lib/exams";
import { pickFocus, type SkillProgress } from "@/lib/progress-summary";

/**
 * Today's study plan, from where each skill stands. Pure (no database, no
 * clock, no randomness): the same inputs always give the same plan, so it can
 * be unit-checked and doesn't reshuffle on every page load.
 */

export type PlanSettings = {
  /** Stored as UTC midnight of the chosen calendar day. */
  examDate: Date | null;
  dailyMinutes: number;
  /** IANA zone whose calendar day is "today"; null means the server's zone. */
  timeZone: string | null;
};

export type PlanBlock = {
  skill: SkillId | "phrases" | "mock" | "review";
  activity: string;
  minutes: number;
  href: string;
  why: string;
};

export type PlanMode = "normal" | "final-week" | "taper" | "exam-day";

export type StudyPlan = {
  /** Calendar days until the exam; null when no (future) date is set. */
  daysLeft: number | null;
  mode: PlanMode;
  blocks: PlanBlock[];
  /** Extra guidance shown above the blocks. */
  note: string | null;
};

export type PlanInput = {
  track: Track;
  skills: SkillProgress[];
  target: number;
  settings: PlanSettings;
  /** "Now", passed in so the plan stays pure. Its local calendar day is "today". */
  today: Date;
  /** Reading/listening sets to rotate through, with their full length. */
  sets: Partial<Record<SkillId, { id: string; minutes: number }[]>>;
  /** The most recent mock exam, if any. */
  lastMock: LatestMock | null;
};

export type LatestMock = { id: string; startedAt: Date; complete: boolean };

export const MIN_DAILY_MINUTES = 15;
export const MAX_DAILY_MINUTES = 240;

const DAY_MS = 86_400_000;
/** Practice older than this counts as "getting rusty". */
const STALE_DAYS = 3;
const FINAL_WEEK = 7;
const TAPER_DAYS = 2;

/** Days from today's local calendar date to a UTC-midnight date. */
export function daysUntil(today: Date, date: Date): number {
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((end - start) / DAY_MS);
}

function dayOfYear(d: Date): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / DAY_MS);
}

/** Whole local calendar days since `then` (yesterday 9 pm is 1 day ago at 8 am today). */
function daysSince(today: Date, then: Date): number {
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((a - b) / DAY_MS);
}

/** Round down to 5 minutes, never below 5. */
const round5 = (n: number) => Math.max(5, Math.floor(n / 5) * 5);

type Ranked = { skill: SkillProgress; priority: number; why: string; below: boolean };

/** Order skills by how much they need attention today, with the reason. */
function rankSkills(input: PlanInput): Ranked[] {
  const { skills, target, today } = input;
  const focus = pickFocus(skills, target)?.skill;

  return skills
    .map((s) => {
      let priority = 0;
      const reasons: string[] = [];
      const below = s.recentAverage === null || s.recentAverage < target;
      if (!s.latest) {
        priority += 100;
        reasons.push("not practised yet");
      } else {
        const since = daysSince(today, s.latest.date);
        if (since >= STALE_DAYS) {
          priority += 30;
          reasons.push(`last practised ${since} days ago`);
        }
        if (below) {
          priority += Math.round((target - s.recentAverage!) * 10);
          reasons.push(`recent average ${s.recentAverage}, target ${target}`);
        } else {
          reasons.push(`at target (${s.recentAverage}); keep it sharp`);
        }
      }
      if (s.skill === focus) {
        priority += 50;
        reasons.unshift("your focus skill");
      }
      const why = reasons.join("; ");
      return { skill: s, priority, why: why.charAt(0).toUpperCase() + why.slice(1), below };
    })
    .sort((a, b) => b.priority - a.priority);
}

/** What to do in a skill block of this length, and where. */
function skillBlock(input: PlanInput, r: Ranked, minutes: number): PlanBlock {
  const { track, today } = input;
  const skill = r.skill.skill;
  const base = `/${track}/${skill}`;

  if (skill === "listening" || skill === "reading") {
    const sets = input.sets[skill] ?? [];
    // Rotate through sets by day so consecutive days use different material.
    const set = sets.length ? sets[dayOfYear(today) % sets.length] : null;
    const full = set !== null && minutes >= set.minutes;
    return {
      skill,
      minutes,
      href: set ? `${base}/${set.id}` : base,
      activity: full
        ? `Do a full timed ${skill} set`
        : `Do one or two ${skill} parts under time, then read every explanation`,
      why: r.why,
    };
  }
  if (skill === "writing") {
    const taskMinutes = track === "en" ? 27 : 60;
    return {
      skill,
      minutes,
      href: base,
      activity:
        minutes >= taskMinutes
          ? "Write one timed task and study the AI corrections"
          : "Plan a writing prompt in outline, then reread your last corrected version",
      why: r.why,
    };
  }
  return {
    skill,
    minutes,
    href: base,
    activity: minutes >= 20 ? "Record a full speaking test and listen back" : "Record two or three speaking tasks",
    why: r.why,
  };
}

function phraseBlock(track: Track, minutes: number): PlanBlock {
  return {
    skill: "phrases",
    minutes,
    href: `/${track}/phrases`,
    activity: "Self-test the phrase bank (phrases you're still learning come first)",
    why: track === "fr" ? "Connectors raise coherence scores in both writing and speaking" : "Ready phrases save time and lift vocabulary scores",
  };
}

/** Normal days: 1–3 skill blocks by priority, plus phrases, filling the budget. */
function normalBlocks(input: PlanInput, budget: number): PlanBlock[] {
  const ranked = rankSkills(input);
  const phraseMinutes = budget >= 40 ? 10 : 5;
  const rest = budget - phraseMinutes;
  const count = rest >= 90 ? 3 : rest >= 40 ? 2 : 1;
  const chosen = ranked.slice(0, count);

  // Below-target skills get half again as much time.
  const weights = chosen.map((r) => (r.below ? 1.5 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const minutes = weights.map((w) => round5((rest * w) / total));
  // Give rounding leftovers to the top-priority block so the plan fills the budget.
  minutes[0] += Math.max(0, rest - minutes.reduce((a, b) => a + b, 0));

  return [...chosen.map((r, i) => skillBlock(input, r, minutes[i])), phraseBlock(input.track, phraseMinutes)];
}

export function buildStudyPlan(input: PlanInput): StudyPlan {
  const { track, settings, today } = input;
  const budget = Math.min(MAX_DAILY_MINUTES, Math.max(MIN_DAILY_MINUTES, Math.round(settings.dailyMinutes)));
  const rawDays = settings.examDate ? daysUntil(today, settings.examDate) : null;

  if (rawDays !== null && rawDays < 0) {
    return {
      daysLeft: null,
      mode: "normal",
      blocks: normalBlocks(input, budget),
      note: "Your exam date has passed. Update it below to get a countdown plan.",
    };
  }
  const daysLeft = rawDays;

  if (daysLeft === 0) {
    return {
      daysLeft,
      mode: "exam-day",
      blocks: [phraseBlock(track, 10)],
      note: "Exam day. Skip practice: a quick look at your phrases, then rest, eat, and arrive early.",
    };
  }

  if (daysLeft !== null && daysLeft <= TAPER_DAYS) {
    // Review only makes sense for a skill that has feedback to reread.
    const weakest = rankSkills(input).find((r) => r.skill.latest);
    const reviewMinutes = Math.min(20, budget - 5);
    return {
      daysLeft,
      mode: "taper",
      blocks: [
        {
          skill: "review",
          minutes: reviewMinutes,
          href: weakest ? `/${track}/${weakest.skill.skill}` : `/${track}/progress`,
          activity: weakest
            ? `Reread your latest ${weakest.skill.name.toLowerCase()} feedback and fixes in its history`
            : "Look over the exam format for each skill once more",
          why: "Light review only now; new full tests this close to the exam mostly add fatigue",
        },
        phraseBlock(track, Math.min(15, budget - reviewMinutes)),
      ],
      note: `${daysLeft} day${daysLeft === 1 ? "" : "s"} to go. Keep it light and sleep well.`,
    };
  }

  if (daysLeft !== null && daysLeft <= FINAL_WEEK) {
    // Calendar days, like `today`: startedAt is wall-clock time in the learner's zone.
    const mock =
      input.lastMock && daysUntil(input.lastMock.startedAt, settings.examDate!) <= FINAL_WEEK ? input.lastMock : null;
    if (!mock) {
      return {
        daysLeft,
        mode: "final-week",
        blocks: [
          {
            skill: "mock",
            minutes: Math.max(budget - 10, 5),
            href: `/${track}/mock`,
            activity:
              budget >= 170
                ? "Take a full mock exam, all four skills in order"
                : "Start a full mock exam; finish the remaining skills tomorrow",
            why: "One full rehearsal in the final week shows your stamina and pacing under exam conditions",
          },
          phraseBlock(track, 10),
        ],
        note: `${daysLeft} days to go: time for one full mock exam.`,
      };
    }
    if (!mock.complete) {
      return {
        daysLeft,
        mode: "final-week",
        blocks: [
          {
            skill: "mock",
            minutes: Math.max(budget - 10, 5),
            href: `/${track}/mock/${mock.id}`,
            activity: "Finish the remaining steps of your mock exam",
            why: "A half-done rehearsal doesn't show your stamina; complete it before switching to targeted practice",
          },
          phraseBlock(track, 10),
        ],
        note: `${daysLeft} days to go: finish your mock exam first.`,
      };
    }
    return {
      daysLeft,
      mode: "final-week",
      blocks: normalBlocks(input, budget),
      note: `${daysLeft} days to go. Mock exam done; now target the weak spots it showed.`,
    };
  }

  return {
    daysLeft,
    mode: "normal",
    blocks: normalBlocks(input, budget),
    note: daysLeft === null ? "Set your exam date below to get a countdown plan." : null,
  };
}
