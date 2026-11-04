/**
 * Exam metadata for the two tests on the Express Entry path, kept in one place so
 * the dashboard, the test runners and the progress charts all agree.
 *
 * Structure and timings mirror the official formats. The TCF band minimums are
 * approximate and must be verified on canada.ca before relying on them.
 */

export const TRACKS = ["en", "fr"] as const;
export type Track = (typeof TRACKS)[number];

export type SkillId = "listening" | "reading" | "writing" | "speaking";

export type Skill = {
  id: SkillId;
  /** Label in the exam's own language, e.g. "Compréhension orale". */
  name: string;
  /** How the real exam is built, so practice can mirror it. */
  structure: string;
  /** Official time limit, as displayed. */
  time: string;
  /** What we are aiming for in this skill. */
  target: string;
  /** Extra qualifier on the target, shown smaller. */
  targetNote?: string;
};

export type ExamTrack = {
  track: Track;
  /** "English" / "French" — the language being tested. */
  language: string;
  /** Short switch label. */
  shortLabel: string;
  exam: string;
  examFull: string;
  /** Band scale IRCC uses for this language. */
  scale: "CLB" | "NCLC";
  /** One-line statement of the goal. */
  goal: string;
  /** Why this goal matters for the application. */
  why: string;
  totalTime: string;
  skills: Skill[];
};

export const EXAM_TRACKS: Record<Track, ExamTrack> = {
  en: {
    track: "en",
    language: "English",
    shortLabel: "EN",
    exam: "CELPIP",
    examFull: "CELPIP-General",
    scale: "CLB",
    goal: "10 in every skill (CLB 10)",
    why: "IRCC scores each of the four skills separately, so every skill needs its own 10 — a 10 average is not enough.",
    totalTime: "about 3 hours, computer-based",
    skills: [
      {
        id: "listening",
        name: "Listening",
        structure:
          "Practice task + 6 scored parts: problem solving, daily-life conversation, information, news item, discussion, viewpoints (38 questions)",
        time: "47–55 min",
        target: "10",
        targetNote: "plays once only",
      },
      {
        id: "reading",
        name: "Reading",
        structure: "4 parts: correspondence, diagram, information, viewpoints",
        time: "55–60 min",
        target: "10",
      },
      {
        id: "writing",
        name: "Writing",
        structure:
          "Task 1: email (27 min). Task 2: survey response, pick an option (26 min). Both 150–200 words",
        time: "53 min",
        target: "10",
        targetNote: "scored 1–12 on 4 rubric traits",
      },
      {
        id: "speaking",
        name: "Speaking",
        structure:
          "8 tasks: advice, personal experience, describing a scene, predictions, comparing & persuading, difficult situation, opinions, unusual situation",
        time: "15–20 min",
        target: "10",
        targetNote: "30–60 s prep, 60–90 s speaking",
      },
    ],
  },
  fr: {
    track: "fr",
    language: "French",
    shortLabel: "FR",
    exam: "TCF Canada",
    examFull: "TCF Canada",
    scale: "NCLC",
    goal: "NCLC 7 in every skill",
    why: "NCLC 7 across all four skills unlocks the French CRS bonus and makes you eligible for French-language category draws.",
    totalTime: "about 2 hours 45 minutes across the four skills",
    skills: [
      {
        id: "listening",
        name: "Compréhension orale",
        structure: "39 multiple-choice questions, rising in difficulty from A1 to C2",
        time: "35 min",
        target: "458+",
        targetNote: "approximate NCLC 7 floor",
      },
      {
        id: "reading",
        name: "Compréhension écrite",
        structure: "39 multiple-choice questions, rising in difficulty from A1 to C2",
        time: "60 min",
        target: "453+",
        targetNote: "approximate NCLC 7 floor",
      },
      {
        id: "writing",
        name: "Expression écrite",
        structure:
          "3 tasks: short message (60–120 words), article or letter (120–150), argumentative comparison of 2 documents (120–180)",
        time: "60 min",
        target: "10/20",
        targetNote: "approximate NCLC 7 floor",
      },
      {
        id: "speaking",
        name: "Expression orale",
        structure:
          "3 tasks: guided interview (2 min), interactive role-play with prep (5.5 min), express an opinion (4.5 min)",
        time: "12 min",
        target: "10/20",
        targetNote: "approximate NCLC 7 floor",
      },
    ],
  },
};

export function isTrack(value: string): value is Track {
  return (TRACKS as readonly string[]).includes(value);
}

export function getTrack(track: Track): ExamTrack {
  return EXAM_TRACKS[track];
}

/** The other track, for the switch. */
export function otherTrack(track: Track): Track {
  return track === "en" ? "fr" : "en";
}
