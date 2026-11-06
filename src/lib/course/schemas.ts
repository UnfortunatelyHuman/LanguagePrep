import { z } from "zod";
import { fixesSchema, strengthsSchema } from "@/lib/rubric/schema";
import { CEFR_LEVELS, COURSE_LEVELS, FOCUS_SKILLS } from "./syllabus";

/**
 * zod schemas for every AI reply the French course uses. Descriptions travel to
 * the model through JSON Schema; refinements catch what JSON Schema can't
 * (an answer index past the options, a blank sentence with no blank) and are
 * sent back to the model for one corrective retry.
 */

const str = z.string().trim().min(1);
const options = z.array(str).min(3).max(4);
const answerIndex = z.number().int().min(0).max(3).describe("0-based index of the correct option");
const explanation = str.describe("One or two sentences in English: why the answer is right");

/** The blank marker in fill-in sentences and grammar cards. */
export const BLANK = "___";

export const McqExerciseSchema = z.object({
  type: z.literal("mcq"),
  prompt: str.describe("The question or sentence to complete; French, with English only for instructions"),
  options,
  answer: answerIndex,
  explanation,
});

export const BlankExerciseSchema = z.object({
  type: z.literal("blank"),
  sentence: str.describe(`A French sentence with exactly one "${BLANK}" where the missing word(s) go`),
  answers: z.array(str).min(1).max(3).describe("Every correct way to fill the blank, most natural first"),
  hint: z.string().trim().optional().describe("Optional hint in English, e.g. the infinitive to conjugate"),
  explanation,
});

export const ReorderExerciseSchema = z.object({
  type: z.literal("reorder"),
  sentence: str.describe("A correct French sentence of 4–12 words; the app shuffles its words"),
  translation: str.describe("English translation shown as the clue"),
});

export const TranslateExerciseSchema = z.object({
  type: z.literal("translate"),
  en: str.describe("A short English sentence that practises the lesson's point"),
  answers: z.array(str).min(1).max(3).describe("Acceptable French translations, most natural first"),
  explanation,
});

export const ListenExerciseSchema = z.object({
  type: z.literal("listen"),
  audio: str.describe("French sentence or two-line exchange read aloud by text-to-speech; not shown before answering"),
  question: str.describe("Question about what was heard, in French"),
  options,
  answer: answerIndex,
  explanation,
});

export const ExerciseSchema = z.discriminatedUnion("type", [
  McqExerciseSchema,
  BlankExerciseSchema,
  ReorderExerciseSchema,
  TranslateExerciseSchema,
  ListenExerciseSchema,
]);
export type Exercise = z.output<typeof ExerciseSchema>;
export type ExerciseType = Exercise["type"];
export const EXERCISE_TYPES: ExerciseType[] = ["mcq", "blank", "reorder", "translate", "listen"];

const blankCount = (s: string) => s.split(BLANK).length - 1;

/** What's wrong with one exercise beyond its shape, or null. */
export function exerciseProblem(ex: Exercise): string | null {
  if ((ex.type === "mcq" || ex.type === "listen") && ex.answer >= ex.options.length) {
    return `answer ${ex.answer} is past the last option`;
  }
  if ((ex.type === "mcq" || ex.type === "listen") && new Set(ex.options.map((o) => o.toLowerCase())).size !== ex.options.length) {
    return "options repeat";
  }
  if (ex.type === "blank" && blankCount(ex.sentence) !== 1) return `the sentence needs exactly one "${BLANK}"`;
  if (ex.type === "reorder") {
    const words = ex.sentence.split(/\s+/).length;
    if (words < 3 || words > 14) return "the sentence to reorder needs 3–14 words";
  }
  return null;
}

/** superRefine helper: report each bad exercise by its position. */
function checkExercises(list: Exercise[], ctx: z.RefinementCtx, path: (string | number)[]) {
  list.forEach((ex, i) => {
    const problem = exerciseProblem(ex);
    if (problem) ctx.addIssue({ code: "custom", path: [...path, i], message: `Exercise ${i + 1}: ${problem}` });
  });
}

const example = z.object({ fr: str, en: str });

export const GrammarCardSchema = z.object({
  sentence: str.describe(`French sentence with one "${BLANK}" testing the grammar point`),
  answer: str.describe("What goes in the blank"),
  rule: str.describe("The rule in one short English sentence"),
});

export const VocabItemSchema = z.object({
  fr: str.describe("Word or expression, with its article for nouns (le, la, l', un, une)"),
  en: str,
  exampleFr: str.describe("Short natural French example sentence using it"),
  exampleEn: str,
});

export const LessonSchema = z
  .object({
    title: str.describe("Lesson title in French, 2–6 words"),
    objectives: z.array(str).min(2).max(3).describe("What I'll be able to do, in English, starting with a verb"),
    explanation: z.object({
      intro: str.describe("One or two English sentences: what this is and when it's used"),
      points: z
        .array(z.object({ heading: str, text: str.describe("Clear English explanation"), examples: z.array(example).min(1).max(4) }))
        .min(2)
        .max(4),
      pitfalls: z.array(str).min(1).max(3).describe("Common mistakes English speakers make, in English"),
    }),
    vocabulary: z.array(VocabItemSchema).min(8).max(12),
    exercises: z.array(ExerciseSchema).min(8).max(10),
    grammarCards: z.array(GrammarCardSchema).length(3),
    task: z.object({
      kind: z.enum(["writing", "speaking"]),
      promptFr: str.describe("The task in French, TCF style"),
      promptEn: str.describe("The same task in English"),
      points: z.array(str).min(2).max(4).describe("What to include, in English"),
      minWords: z.number().int().min(20).max(150),
      maxWords: z.number().int().min(40).max(200),
    }),
    takeaways: z.array(str).length(3).describe("Three things to remember, in English"),
  })
  .superRefine((lesson, ctx) => {
    checkExercises(lesson.exercises, ctx, ["exercises"]);
    const types = new Set(lesson.exercises.map((e) => e.type));
    if (types.size < 4) {
      ctx.addIssue({ code: "custom", path: ["exercises"], message: "Use at least 4 different exercise types" });
    }
    const words = lesson.vocabulary.map((v) => v.fr.toLowerCase());
    if (new Set(words).size !== words.length) {
      ctx.addIssue({ code: "custom", path: ["vocabulary"], message: "Vocabulary items must be unique" });
    }
    lesson.grammarCards.forEach((c, i) => {
      if (blankCount(c.sentence) !== 1) {
        ctx.addIssue({ code: "custom", path: ["grammarCards", i], message: `Each card sentence needs exactly one "${BLANK}"` });
      }
    });
    if (lesson.task.maxWords <= lesson.task.minWords) {
      ctx.addIssue({ code: "custom", path: ["task", "maxWords"], message: "maxWords must be above minWords" });
    }
  });
export type Lesson = z.output<typeof LessonSchema>;

/** Grading of a lesson's mini writing or speaking task, on the TCF 0–20 scale. */
export const TaskFeedbackSchema = z.object({
  strengths: strengthsSchema,
  fixes: fixesSchema,
  corrected: str.describe("The learner's text with every error corrected, changing as little as possible"),
  summary: str.describe("Two sentences in English: overall verdict and the single biggest lever"),
  cefr: z.enum(CEFR_LEVELS).describe("CEFR level this answer shows"),
  score: z.number().int().min(0).max(20).describe("TCF Canada 0–20 scale; 10 is about B2 / NCLC 7"),
});
export type TaskFeedback = z.output<typeof TaskFeedbackSchema>;

export const PLACEMENT_SKILLS = ["grammar", "vocabulary", "reading", "listening"] as const;
export type PlacementSkill = (typeof PLACEMENT_SKILLS)[number];
export const PLACEMENT_PER_SKILL = 3;

export const PlacementItemSchema = z.object({
  skill: z.enum(PLACEMENT_SKILLS),
  passage: z.string().trim().optional().describe("Reading only: the short French text (1–6 sentences, longer at higher levels)"),
  audio: z.string().trim().optional().describe("Listening only: what text-to-speech reads aloud, in French"),
  stem: str.describe("The question, in French"),
  options: z.array(str).length(4),
  answer: answerIndex,
  explanation,
});
export type PlacementItem = z.output<typeof PlacementItemSchema>;

export const PlacementPoolSchema = z
  .object({ items: z.array(PlacementItemSchema).length(PLACEMENT_SKILLS.length * PLACEMENT_PER_SKILL) })
  .superRefine(({ items }, ctx) => {
    for (const skill of PLACEMENT_SKILLS) {
      const count = items.filter((i) => i.skill === skill).length;
      if (count !== PLACEMENT_PER_SKILL) {
        ctx.addIssue({ code: "custom", path: ["items"], message: `Need exactly ${PLACEMENT_PER_SKILL} ${skill} items, got ${count}` });
      }
    }
    items.forEach((item, i) => {
      if (item.skill === "reading" && !item.passage) {
        ctx.addIssue({ code: "custom", path: ["items", i, "passage"], message: "Reading items need a passage" });
      }
      if (item.skill === "listening" && !item.audio) {
        ctx.addIssue({ code: "custom", path: ["items", i, "audio"], message: "Listening items need audio text" });
      }
      if (new Set(item.options.map((o) => o.toLowerCase())).size !== 4) {
        ctx.addIssue({ code: "custom", path: ["items", i, "options"], message: "Options must differ" });
      }
    });
  });

export const ChatTurnSchema = z.object({
  correction: z.object({
    ok: z.boolean().describe("True when the learner's message had no real mistakes"),
    corrected: z.string().trim().describe("The learner's message corrected (empty when ok)"),
    notes: z
      .array(z.object({ wrong: str, right: str, why: str.describe("Short, kind English explanation") }))
      .max(3),
  }),
  reply: str.describe("Your next line in the conversation, in French, at the learner's level: 1–3 sentences"),
  replyEn: str.describe("English translation of the reply"),
  newWords: z.array(z.object({ fr: str, en: str })).max(3).describe("Useful words from your reply worth learning"),
  ended: z.boolean().describe("True when the conversation has reached a natural end"),
});
export type ChatTurn = z.output<typeof ChatTurnSchema>;

export const NoteCardSchema = z.object({
  kind: z.enum(["vocab", "grammar"]),
  front: str.describe(`vocab: the French word or expression; grammar: a French sentence with one "${BLANK}"`),
  back: str.describe("vocab: English meaning; grammar: what goes in the blank"),
  example: z.string().trim().optional().describe("vocab: a short French example; grammar: the rule in English"),
});

export const NotesSchema = z
  .object({
    title: str.describe("Short title for these notes"),
    cards: z.array(NoteCardSchema).min(1).max(30),
    exercises: z.array(ExerciseSchema).max(10),
  })
  .superRefine((notes, ctx) => {
    checkExercises(notes.exercises, ctx, ["exercises"]);
    notes.cards.forEach((c, i) => {
      if (c.kind === "grammar" && blankCount(c.front) !== 1) {
        ctx.addIssue({ code: "custom", path: ["cards", i, "front"], message: `Grammar cards need exactly one "${BLANK}"` });
      }
    });
  });
export type NotesResult = z.output<typeof NotesSchema>;

export const UnitSuggestionSchema = z.object({
  level: z.enum(COURSE_LEVELS),
  title: str.describe("Short unit title in French"),
  grammar: str.describe("The grammar point, in English"),
  vocabulary: str.describe("The vocabulary theme, in English"),
  skillFocus: z.object({ skill: z.enum(FOCUS_SKILLS), text: str.describe("The TCF skill focus, in English") }),
});
export const UnitSuggestionsSchema = z.object({ units: z.array(UnitSuggestionSchema).min(1).max(5) });
export type UnitSuggestion = z.output<typeof UnitSuggestionSchema>;
