import "server-only";
import { io } from "next/cache";
import { generateJSON } from "@/lib/ai";
import { examKey } from "@/lib/attempts";
import type { Track } from "@/lib/exams";
import type { SkillId } from "@/lib/exams";
import { findTestSet, validateTestSet } from "@/lib/practice/content";
import type { PracticeSkill, TestSet } from "@/lib/practice/types";
import { prisma } from "@/lib/prisma";
import { findSpeakingSet, validateSpeakingSet } from "@/lib/speaking/content";
import type { SpeakingSet } from "@/lib/speaking/types";
import { findWritingSet, validateWritingSet } from "@/lib/writing/content";
import type { WritingSet } from "@/lib/writing/types";
import { BUILDERS } from "./builders";
import { AI_SET_PREFIX, USER_SET_PREFIX, isGeneratedSetId, isUserSetId, type GenerateOption } from "./kinds";

/** The AI's set broke the exam format (as opposed to a provider or database failure). */
export class SetFormatError extends Error {
  constructor(cause: unknown) {
    super("Generated set failed validation", { cause });
    this.name = "SetFormatError";
  }
}

const SYSTEM = `You write ORIGINAL practice material for Canadian immigration language tests (CELPIP-General and TCF Canada).
Never copy or paraphrase official or commercial prep material. Use realistic, everyday Canadian situations
(work, housing, community, family, services), neutral and inclusive, no brand names, no sensitive or
political hot-button topics. French must be natural, correct Canadian-friendly French with all accents.`;

/** How many recent titles to show the model so it doesn't repeat itself. */
const AVOID_RECENT = 12;

/**
 * Ask the AI for a fresh set of one kind, validate it against the real exam
 * format (listening/reading: a shorter paper in the real format), and save it. Throws AiError (provider problems) or Error (a set
 * that fails validation, which shouldn't happen given the schema).
 */
export async function generateSet(
  track: Track,
  option: GenerateOption,
  topic: string,
): Promise<{ id: string; skill: GenerateOption["skill"] }> {
  const exam = examKey(track);
  const recent = await prisma.generatedSet.findMany({
    where: { exam, skill: option.skill },
    orderBy: { createdAt: "desc" },
    take: AVOID_RECENT,
    select: { title: true },
  });

  const b = BUILDERS[option.kind];
  const prompt = [
    b.instructions,
    topic ? `Theme requested by the learner: ${topic}` : "Pick a theme yourself.",
    recent.length ? `Avoid these themes already used: ${recent.map((r) => r.title).join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const data = await generateJSON(prompt, b.schema, { system: SYSTEM, temperature: 0.9 });

  // The id is fixed before saving so the stored JSON and the row agree.
  const row = await prisma.generatedSet.create({
    data: { exam, skill: option.skill, title: "pending", data: {} },
    select: { id: true },
  });
  const setId = `${AI_SET_PREFIX}${row.id}`;
  try {
    // Builders are typed per kind; the union here is safe because b and data match.
    const set = (b.build as (id: string, d: unknown) => WritingSet | SpeakingSet | TestSet)(setId, data);
    try {
      if (option.skill === "writing") validateWritingSet(set as WritingSet);
      else if (option.skill === "speaking") validateSpeakingSet(set as SpeakingSet);
      else validateTestSet(set as TestSet, option.skill, false);
    } catch (error) {
      throw new SetFormatError(error);
    }
    await prisma.generatedSet.update({ where: { id: row.id }, data: { title: set.title, data: set } });
  } catch (error) {
    await prisma.generatedSet.delete({ where: { id: row.id } }).catch(() => undefined);
    throw error;
  }
  return { id: setId, skill: option.skill };
}

/** A stored set: "ai-…" ids are generated sets, "my-…" ids are papers the learner added. */
async function loadGenerated(track: Track, skill: SkillId, setId: string) {
  const [prefix, source] = isGeneratedSetId(setId)
    ? [AI_SET_PREFIX, "ai"]
    : isUserSetId(setId)
      ? [USER_SET_PREFIX, "user"]
      : [null, null];
  if (!prefix) return null;
  await io();
  const row = await prisma.generatedSet.findFirst({
    where: { id: setId.slice(prefix.length), exam: examKey(track), skill, source },
    select: { data: true },
  });
  return row?.data ?? null;
}

/** A writing set from the content files or, for "ai-…" ids, from the database. */
export async function resolveWritingSet(track: Track, setId: string): Promise<WritingSet | undefined> {
  const fromFile = findWritingSet(track, setId);
  if (fromFile) return fromFile;
  const data = await loadGenerated(track, "writing", setId);
  if (!data) return undefined;
  try {
    return validateWritingSet(data as WritingSet);
  } catch {
    return undefined;
  }
}

/** A speaking set from the content files or, for "ai-…" ids, from the database. */
export async function resolveSpeakingSet(track: Track, setId: string): Promise<SpeakingSet | undefined> {
  const fromFile = findSpeakingSet(track, setId);
  if (fromFile) return fromFile;
  const data = await loadGenerated(track, "speaking", setId);
  if (!data) return undefined;
  try {
    return validateSpeakingSet(data as SpeakingSet);
  } catch {
    return undefined;
  }
}

/** A listening or reading set from the content files or, for "ai-…" and "my-…" ids, from the database. */
export async function resolveTestSet(track: Track, skill: PracticeSkill, setId: string): Promise<TestSet | undefined> {
  const fromFile = findTestSet(track, skill, setId);
  if (fromFile) return fromFile;
  const data = await loadGenerated(track, skill, setId);
  if (!data) return undefined;
  try {
    return validateTestSet(data as TestSet, skill, false);
  } catch {
    return undefined;
  }
}

export type GeneratedSummary = {
  setId: string;
  skill: SkillId;
  title: string;
  summary: string;
  createdAt: Date;
};

/** Generated sets for this track, newest first. */
export async function listGeneratedSets(track: Track, skill?: SkillId): Promise<GeneratedSummary[]> {
  await io();
  const rows = await prisma.generatedSet.findMany({
    where: { exam: examKey(track), source: "ai", ...(skill ? { skill } : {}), NOT: { title: "pending" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    setId: `${AI_SET_PREFIX}${r.id}`,
    skill: r.skill as SkillId,
    title: r.title,
    summary: (r.data as { summary?: string }).summary ?? "",
    createdAt: r.createdAt,
  }));
}
