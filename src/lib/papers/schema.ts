import { z } from "zod";

/**
 * Shape of a reading or listening paper the learner adds (by the form or as
 * JSON). It mirrors TestSet in lib/practice/types.ts; validateTestSet then
 * checks what a schema can't (answers in range, blanks, speakers…).
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const level = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

const Question = z.object({
  id: z.string().regex(/^[\w-]{1,40}$/, "question ids use letters, digits, - and _"),
  stem: z.string().trim().max(600).optional(),
  options: z.array(text(400)).min(2).max(6).optional(),
  answer: z.number().int().min(0),
  explanation: text(2000),
  level: level.optional(),
});

const Passage = z.object({
  label: z.string().trim().max(60).optional(),
  heading: z.string().trim().max(200).optional(),
  meta: z.array(z.object({ label: text(40), value: text(300) })).max(10).optional(),
  diagram: z
    .object({
      caption: z.string().max(200).optional(),
      columns: z.array(z.string().max(120)).min(1).max(10),
      rows: z.array(z.array(z.string().max(200)).max(10)).max(30),
      notes: z.array(z.string().max(300)).max(10).optional(),
    })
    .optional(),
  paragraphs: z.array(text(5000)).max(40),
  lettered: z.boolean().optional(),
});

const Section = z.object({
  id: z.string().regex(/^[\w-]{1,40}$/),
  instructions: z.string().trim().max(600).optional(),
  audio: z
    .object({
      context: z.string().trim().max(300).optional(),
      lines: z.array(z.object({ speaker: z.string().max(40), text: text(3000) })).min(1).max(80),
    })
    .optional(),
  passage: Passage.optional(),
  options: z.array(text(400)).min(2).max(8).optional(),
  questions: z.array(Question).min(1).max(20),
});

export const PaperSchema = z.object({
  id: z.string().max(80).optional(),
  exam: z.enum(["celpip", "tcf"]).optional(),
  skill: z.enum(["reading", "listening"]),
  title: text(120),
  summary: z.string().trim().max(300).default(""),
  speakers: z
    .record(z.string().max(40), z.object({ name: text(40), gender: z.enum(["female", "male"]) }))
    .optional(),
  questionsAfterAudio: z.boolean().optional(),
  parts: z
    .array(
      z.object({
        id: z.string().regex(/^[\w-]{1,40}$/),
        title: text(120),
        minutes: z.number().int().min(1).max(120),
        instructions: z.string().trim().max(600).optional(),
        sections: z.array(Section).min(1).max(60),
      }),
    )
    .min(1)
    .max(10),
});

export type PaperInput = z.infer<typeof PaperSchema>;

/** Readable list of what's wrong, for the editor. */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 6)
    .map((i) => `${i.path.join(".") || "paper"}: ${i.message}`)
    .join("\n");
}
