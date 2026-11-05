import celpipEmail from "../../../content/celpip/writing/task-1-email.json";
import celpipSurvey from "../../../content/celpip/writing/task-2-survey.json";
import tcfSet1 from "../../../content/tcf/writing/set-1.json";
import tcfSet2 from "../../../content/tcf/writing/set-2.json";
import tcfSet3 from "../../../content/tcf/writing/set-3.json";
import tcfSet4 from "../../../content/tcf/writing/set-4.json";
import type { Track } from "@/lib/exams";
import type { WritingKind, WritingSet } from "./types";

/** Word limits and timings of the real exams; content must match them. */
const KIND_RULES: Record<WritingKind, { min: number; max: number }> = {
  "celpip-email": { min: 150, max: 200 },
  "celpip-survey": { min: 150, max: 200 },
  "tcf-message": { min: 60, max: 120 },
  "tcf-article": { min: 120, max: 150 },
  "tcf-argument": { min: 120, max: 180 },
};

/** Throws if a writing set breaks the real exam's rules (build time for files, runtime for AI sets). */
export function validateWritingSet(set: WritingSet): WritingSet {
  const fail = (msg: string) => {
    throw new Error(`Writing set ${set.id}: ${msg}`);
  };
  if (!set.tasks.length) fail("has no tasks");
  if (set.exam === "tcf") {
    const kinds = set.tasks.map((t) => t.kind).join(",");
    if (kinds !== "tcf-message,tcf-article,tcf-argument") fail(`TCF needs tasks 1–3 in order, got ${kinds}`);
    if (set.minutes !== 60) fail("TCF Expression écrite is 60 minutes");
  } else {
    if (set.tasks.length !== 1) fail("a CELPIP set is one task");
    const expected = set.tasks[0].kind === "celpip-email" ? 27 : 26;
    if (set.minutes !== expected) fail(`should be ${expected} minutes`);
  }
  const ids = new Set<string>();
  for (const task of set.tasks) {
    if (ids.has(task.id)) fail(`duplicate task id ${task.id}`);
    ids.add(task.id);
    const rule = KIND_RULES[task.kind];
    if (!rule) fail(`unknown kind ${task.kind}`);
    if (task.minWords !== rule.min || task.maxWords !== rule.max) {
      fail(`${task.id} should be ${rule.min}–${rule.max} words`);
    }
    if (!task.scenario.trim() || !task.instructions.trim()) fail(`${task.id} is missing text`);
    if (task.kind === "celpip-email" && task.bullets?.length !== 3) fail(`${task.id} needs 3 bullets`);
    if (task.kind === "celpip-survey" && task.options?.length !== 2) fail(`${task.id} needs options A and B`);
    if (task.kind === "tcf-argument" && task.documents?.length !== 2) fail(`${task.id} needs 2 documents`);
  }
  return set;
}

const SETS: Record<Track, WritingSet[]> = {
  en: [...(celpipEmail as WritingSet[]), ...(celpipSurvey as WritingSet[])].map(validateWritingSet),
  fr: [tcfSet1, tcfSet2, tcfSet3, tcfSet4].map((s) => validateWritingSet(s as WritingSet)),
};

export function writingSets(track: Track): WritingSet[] {
  return SETS[track];
}

export function findWritingSet(track: Track, id: string): WritingSet | undefined {
  return SETS[track].find((s) => s.id === id);
}
