import "server-only";
import { io } from "next/cache";
import { generateJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { addCards } from "./cards";
import { notesFixture } from "./fixtures";
import { notesPrompt } from "./prompts";
import { ExerciseSchema, NoteCardSchema, NotesSchema, type Exercise } from "./schemas";
import { z } from "zod";

/**
 * "My notes": pasted class notes (vocabulary lists, grammar rules) turned into
 * review cards and exercises. One AI request per ~5,000 characters.
 */

export const MAX_NOTES_CHARS = 15_000;
const CHUNK_CHARS = 5_000;
const MAX_CARDS = 30;

export type NoteCard = z.output<typeof NoteCardSchema>;
export type StoredNotes = {
  id: string;
  title: string;
  rawText: string;
  cards: NoteCard[];
  exercises: Exercise[];
  cardsAdded: boolean;
  createdAt: Date;
};

/** Split on blank lines (then lines) so no chunk cuts a note in half. */
export function chunk(text: string): string[] {
  const parts = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  const pieces = parts
    .flatMap((p) => (p.length > CHUNK_CHARS ? p.split("\n") : [p]))
    // A single line longer than a chunk is cut, never dropped.
    .flatMap((p) => (p.length > CHUNK_CHARS ? (p.match(new RegExp(`[\\s\\S]{1,${CHUNK_CHARS}}`, "g")) ?? []) : [p]));
  for (const part of pieces) {
    if (current && current.length + part.length + 2 > CHUNK_CHARS) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${part}` : part;
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

const toStored = (row: {
  id: string;
  title: string;
  rawText: string;
  cards: unknown;
  exercises: unknown;
  cardsAdded: boolean;
  createdAt: Date;
}): StoredNotes => ({
  ...row,
  cards: z.array(NoteCardSchema).catch([]).parse(row.cards),
  exercises: z.array(ExerciseSchema).catch([]).parse(row.exercises),
});

export async function listNotes(): Promise<StoredNotes[]> {
  await io();
  return (await prisma.noteImport.findMany({ orderBy: { createdAt: "desc" }, take: 50 })).map(toStored);
}

export async function getNotes(id: string): Promise<StoredNotes | null> {
  await io();
  const row = await prisma.noteImport.findUnique({ where: { id } });
  return row ? toStored(row) : null;
}

/** Turn notes into proposed cards and exercises (saved, not yet in the review queue). Throws AiError. */
export async function importNotes(title: string, text: string): Promise<string> {
  const cards: NoteCard[] = [];
  const exercises: Exercise[] = [];
  let model = "";
  let aiTitle = "";
  for (const part of chunk(text)) {
    const { system, prompt } = notesPrompt(title, part);
    const result = await generateJSON(prompt, NotesSchema, {
      system,
      temperature: 0.5,
      timeoutMs: 120_000,
      onModel: (m) => (model = m),
      mockFixture: () => notesFixture(title),
    });
    aiTitle ||= result.title;
    cards.push(...result.cards);
    exercises.push(...result.exercises);
  }
  const unique = cards.filter((c, i) => cards.findIndex((d) => d.front === c.front) === i).slice(0, MAX_CARDS);
  const row = await prisma.noteImport.create({
    data: { title: title || aiTitle || "My notes", rawText: text, cards: unique, exercises: exercises.slice(0, 10), model },
    select: { id: true },
  });
  return row.id;
}

/** Add the chosen proposed cards to the daily review. */
export async function addNoteCards(id: string, keep: number[]): Promise<number> {
  const notes = await getNotes(id);
  if (!notes) return 0;
  const chosen = notes.cards.filter((_, i) => keep.includes(i));
  const added = await addCards("notes", id, chosen);
  await prisma.noteImport.update({ where: { id }, data: { cardsAdded: true } });
  return added;
}

/** Delete an import and the cards from it that were never reviewed. */
export async function deleteNotes(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.reviewCard.deleteMany({ where: { source: "notes", sourceId: id, introducedDay: null } }),
    prisma.noteImport.deleteMany({ where: { id } }),
  ]);
}
