import "server-only";
import { io } from "next/cache";
import { generateJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { placementFixture } from "./fixtures";
import { placementLevels, startUnitId, type Asked, type PoolItem, type SkillLevels } from "./placement";
import { placementPrompt } from "./prompts";
import { PLACEMENT_PER_SKILL, PLACEMENT_SKILLS, PlacementItemSchema, PlacementPoolSchema } from "./schemas";
import { CEFR_LEVELS, type Cefr } from "./syllabus";

/**
 * The placement question pool: 12 questions per level (3 per skill), written
 * by the AI once per level (5 requests in all, ever) and reused by retakes.
 */

const PER_LEVEL = PLACEMENT_PER_SKILL * PLACEMENT_SKILLS.length;

/** Levels whose questions haven't been written yet. */
export async function missingLevels(): Promise<Cefr[]> {
  await io();
  const counts = await prisma.placementQuestion.groupBy({ by: ["level"], _count: { _all: true } });
  const have = new Map(counts.map((c) => [c.level, c._count._all]));
  return CEFR_LEVELS.filter((l) => (have.get(l) ?? 0) < PER_LEVEL);
}

/** Write one level's questions (one AI request) unless they already exist. Throws AiError. */
export async function writeLevel(level: Cefr): Promise<void> {
  if ((await prisma.placementQuestion.count({ where: { level } })) >= PER_LEVEL) return;
  const { system, prompt } = placementPrompt(level);
  let model = "";
  const { items } = await generateJSON(prompt, PlacementPoolSchema, {
    system,
    temperature: 0.8,
    timeoutMs: 120_000,
    onModel: (m) => (model = m),
    mockFixture: () => placementFixture(level),
  });
  // A partial pool from an earlier failure is replaced, never topped up twice.
  await prisma.$transaction([
    prisma.placementQuestion.deleteMany({ where: { level } }),
    prisma.placementQuestion.createMany({
      data: items.map((item) => ({ level, skill: item.skill, data: item, model })),
    }),
  ]);
}

export async function loadPool(): Promise<PoolItem[]> {
  await io();
  const rows = await prisma.placementQuestion.findMany({ orderBy: { createdAt: "asc" } });
  return rows.flatMap((row) => {
    const parsed = PlacementItemSchema.safeParse(row.data);
    return parsed.success && (CEFR_LEVELS as readonly string[]).includes(row.level)
      ? [{ ...parsed.data, id: row.id, level: row.level as Cefr }]
      : [];
  });
}

export type StoredPlacement = { id: string; levels: SkillLevels; startUnitId: string; asked: Asked[]; createdAt: Date };

export async function placementHistory(): Promise<StoredPlacement[]> {
  await io();
  const rows = await prisma.placementResult.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map((r) => ({
    id: r.id,
    levels: r.levels as SkillLevels,
    startUnitId: r.startUnitId,
    asked: (r.answers ?? []) as Asked[],
    createdAt: r.createdAt,
  }));
}

export async function latestPlacement(): Promise<StoredPlacement | null> {
  return (await placementHistory())[0] ?? null;
}

/** Score the answers against the stored questions (never trusting the browser's marks) and save. */
export async function savePlacement(picks: { questionId: string; picked: number }[]): Promise<StoredPlacement> {
  const items = await prisma.placementQuestion.findMany({ where: { id: { in: picks.map((p) => p.questionId) } } });
  const byId = new Map(items.map((i) => [i.id, i]));
  const asked: Asked[] = picks.flatMap((p) => {
    const row = byId.get(p.questionId);
    const item = row && PlacementItemSchema.safeParse(row.data);
    if (!row || !item?.success) return [];
    return [{ questionId: row.id, skill: item.data.skill, level: row.level as Cefr, picked: p.picked, correct: p.picked === item.data.answer }];
  });
  const levels = placementLevels(asked);
  const row = await prisma.placementResult.create({
    data: { levels, answers: asked, startUnitId: startUnitId(levels) },
  });
  return { id: row.id, levels, startUnitId: row.startUnitId, asked, createdAt: row.createdAt };
}
