import "server-only";
import { z } from "zod";
import type { AudioLine, CefrLevel, Question, Section, Speaker, TestSet } from "@/lib/practice/types";
import { builder, summary, text, title } from "./shared";

/**
 * Builders for AI listening and reading sets. These are mini papers (about a
 * third of the real length) in the real formats: CELPIP parts with their own
 * timers, TCF questions climbing from A1 to C2. The model writes passages,
 * scripts and questions; ids, levels, timings and speaker keys come from here.
 */

const mcq = z.object({
  stem: text().describe("The question"),
  options: z.array(text()).length(4).describe("Four plausible options, exactly one correct"),
  answer: z.number().int().min(0).max(3).describe("Index of the correct option"),
  explanation: text(20).describe(
    "In English: why the answer is right, quoting the text, and why a tempting wrong option is wrong. Options are shuffled later, so name options by their content, never by letter or position",
  ),
});
type Mcq = z.infer<typeof mcq>;

const voice = z.object({ name: text().max(30), gender: z.enum(["female", "male"]) });

/**
 * Put the right answer in a random position, since models favour the first
 * slot. Server-side, at generation time only, so the saved set is stable.
 */
function shuffled(q: Mcq): { options: string[]; answer: number } {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

function question(id: string, q: Mcq, level?: CefrLevel): Question {
  return { id, stem: q.stem, ...shuffled(q), explanation: q.explanation, ...(level ? { level } : {}) };
}

/** Turn a clip's speakers (by position) into set-wide speaker keys. */
function clip(
  prefix: string,
  voices: z.infer<typeof voice>[],
  lines: { speaker: number; text: string }[],
  speakers: Record<string, Speaker>,
): AudioLine[] {
  voices.forEach((v, i) => (speakers[`${prefix}-${i}`] = { name: v.name, gender: v.gender }));
  return lines.map((l) => ({ speaker: `${prefix}-${Math.min(l.speaker, voices.length - 1)}`, text: l.text }));
}

const line = (max: number) =>
  z.object({ speaker: z.number().int().min(0).max(max).describe("Index into this clip's speakers"), text: text() });

/* ---------- CELPIP Reading: Part 1 (correspondence) + Part 4 (viewpoints) ---------- */

const celpipReading = builder({
  schema: z.object({
    title,
    summary,
    email: z.object({
      from: text(),
      to: text(),
      subject: text(),
      paragraphs: z.array(text(80)).min(4).max(5).describe("A personal or work email, 230–300 words in total"),
      questions: z.array(mcq).length(6).describe("About details, purpose and implied meaning of the email"),
    }),
    reply: z.object({
      paragraphs: z.array(text(60)).min(2).max(3).describe("The reply from the recipient, 120–160 words"),
      questions: z.array(mcq).length(5).describe("About what the reply says and how it relates to the first email"),
    }),
    article: z.object({
      heading: text(),
      paragraphs: z.array(text(100)).min(5).max(6).describe("A balanced news feature presenting two named people's opposing views, 400–480 words"),
      questions: z.array(mcq).length(5).describe("About each person's position, reasons and the article's details"),
    }),
    comment: z.object({
      author: text().describe("A reader's name and town"),
      paragraphs: z.array(text(60)).min(1).max(2).describe("A reader's comment reacting to the article, 100–140 words"),
      questions: z.array(mcq).length(5).describe("About the reader's view and which person in the article they agree with"),
    }),
  }),
  instructions:
    "Write a CELPIP Reading mini test: Part 1 (an email and its reply) and Part 4 (a viewpoints article and a reader's comment). Questions must be answerable only from the texts, with distractors that use words from the text but are wrong.",
  build: (id, d): TestSet => {
    const qs = (prefix: string, list: Mcq[]) => list.map((q, i) => question(`${prefix}-q${i + 1}`, q));
    return {
      id,
      exam: "celpip",
      skill: "reading",
      title: d.title,
      summary: d.summary,
      parts: [
        {
          id: "p1",
          title: "Part 1: Reading Correspondence",
          minutes: 11,
          instructions: "Read the email and the reply. Choose the best answer to each question.",
          sections: [
            {
              id: "p1-email",
              passage: {
                label: "Email",
                meta: [
                  { label: "From", value: d.email.from },
                  { label: "To", value: d.email.to },
                  { label: "Subject", value: d.email.subject },
                ],
                paragraphs: d.email.paragraphs,
              },
              questions: qs("p1a", d.email.questions),
            },
            {
              id: "p1-reply",
              passage: { label: "Reply", paragraphs: d.reply.paragraphs },
              questions: qs("p1b", d.reply.questions),
            },
          ],
        },
        {
          id: "p4",
          title: "Part 4: Reading for Viewpoints",
          minutes: 13,
          instructions: "Read the article and the reader's comment. Choose the best answer to each question.",
          sections: [
            {
              id: "p4-article",
              passage: { label: "Article", heading: d.article.heading, paragraphs: d.article.paragraphs },
              questions: qs("p4a", d.article.questions),
            },
            {
              id: "p4-comment",
              passage: { label: "Reader's comment", paragraphs: [...d.comment.paragraphs, `— ${d.comment.author}`] },
              questions: qs("p4b", d.comment.questions),
            },
          ],
        },
      ],
    };
  },
});

/* ---------- CELPIP Listening: Part 2 (daily-life conversation) + Part 5 (discussion) ---------- */

const celpipListening = builder({
  schema: z.object({
    title,
    summary,
    conversation: z.object({
      context: text().describe('What the listener is about to hear, e.g. "Maria calls a car repair shop."'),
      speakers: z.array(voice).length(2),
      lines: z.array(line(1)).min(10).max(16).describe("A natural phone or in-person conversation, 280–380 words"),
      questions: z.array(mcq).length(5),
    }),
    discussion: z.object({
      context: text().describe("Who is meeting and why"),
      speakers: z.array(voice).length(3).describe("Three people with distinct names; at least one of each gender"),
      lines: z.array(line(2)).min(14).max(22).describe("A work or community meeting where three people disagree and reach a decision, 450–600 words"),
      questions: z.array(mcq).length(8).describe("About who said what, opinions, and the final decision"),
    }),
  }),
  instructions:
    "Write a CELPIP Listening mini test: Part 2 (a daily-life conversation) and Part 5 (a three-person discussion). Scripts are spoken aloud by text-to-speech, so write natural spoken English without stage directions, and never put the answers in the context line.",
  build: (id, d): TestSet => {
    const speakers: Record<string, Speaker> = {};
    const qs = (prefix: string, list: Mcq[]) => list.map((q, i) => question(`${prefix}-q${i + 1}`, q));
    const conversation: Section = {
      id: "p2-s1",
      audio: { context: d.conversation.context, lines: clip("c", d.conversation.speakers, d.conversation.lines, speakers) },
      questions: qs("p2", d.conversation.questions),
    };
    const discussion: Section = {
      id: "p5-s1",
      audio: { context: d.discussion.context, lines: clip("d", d.discussion.speakers, d.discussion.lines, speakers) },
      questions: qs("p5", d.discussion.questions),
    };
    return {
      id,
      exam: "celpip",
      skill: "listening",
      title: d.title,
      summary: d.summary,
      speakers,
      questionsAfterAudio: true,
      parts: [
        {
          id: "p2",
          title: "Part 2: Listening to a Daily Life Conversation",
          minutes: 5,
          instructions: "You will hear a conversation once. Then answer the questions.",
          sections: [conversation],
        },
        {
          id: "p5",
          title: "Part 5: Listening to a Discussion",
          minutes: 8,
          instructions: "You will hear a discussion once. Then answer the questions.",
          sections: [discussion],
        },
      ],
    };
  },
});

/* ---------- TCF: 13 questions, A1 → C2, the real paper's mix in miniature ---------- */

/** One third of the 39-question paper, keeping its climb and level mix. */
const TCF_LEVELS: CefrLevel[] = ["A1", "A1", "A2", "A2", "B1", "B1", "B1", "B2", "B2", "B2", "C1", "C1", "C2"];
const levelPlan = TCF_LEVELS.map((l, i) => `${i + 1}: ${l}`).join(", ");

const tcfReading = builder({
  schema: z.object({
    title: title.describe('French title starting "Série IA : "'),
    summary,
    items: z
      .array(
        z.object({
          label: text().max(40).describe('French document type: "Affiche", "Courriel", "Article", "Petite annonce"…'),
          paragraphs: z.array(text()).min(1).max(3).describe("The French document; longer and denser as the level rises"),
          question: mcq.describe("French stem and options; English explanation"),
        }),
      )
      .length(TCF_LEVELS.length),
  }),
  instructions: `Write a TCF Canada Compréhension écrite mini paper: ${TCF_LEVELS.length} short French documents, one question each, in this exact difficulty order (${levelPlan}). A1–A2: signs, notices, short messages (15–50 words). B1–B2: emails, ads, news items (60–130 words). C1–C2: opinion pieces and essays with nuance and implicit meaning (120–180 words).`,
  build: (id, d): TestSet => ({
    id,
    exam: "tcf",
    skill: "reading",
    title: d.title,
    summary: d.summary,
    parts: [
      {
        id: "ce",
        title: "Compréhension écrite",
        minutes: 20,
        instructions: "Lisez chaque document, puis choisissez la bonne réponse. Les questions sont de plus en plus difficiles.",
        sections: d.items.map((item, i) => ({
          id: `d${i + 1}`,
          passage: { label: item.label, paragraphs: item.paragraphs },
          questions: [question(`ia-ce-q${i + 1}`, item.question, TCF_LEVELS[i])],
        })),
      },
    ],
  }),
});

const VOICES: Record<"f" | "h", Speaker> = {
  f: { name: "Femme", gender: "female" },
  h: { name: "Homme", gender: "male" },
};

/** "F: Bonjour…\nH: Oui…" → lines with a voice each. Lines without a prefix are dropped. */
export function parseScript(script: string): { voice: "f" | "h"; text: string }[] {
  return script.split(/\n+/).flatMap((raw) => {
    const m = /^\s*([FH])\s*:\s*(.+?)\s*$/i.exec(raw);
    return m ? [{ voice: m[1].toLowerCase() as "f" | "h", text: m[2] }] : [];
  });
}

const tcfListening = builder({
  schema: z.object({
    title: title.describe('French title starting "Série IA : "'),
    summary,
    items: z
      .array(
        z.object({
          context: text().max(80).describe('French, very short: "Dans un magasin.", "Une annonce.", "À la radio."'),
          // One string per script: 13 nested line arrays made the schema too large for Gemini (HTTP 400).
          script: text()
            .refine((s) => parseScript(s).length > 0, 'Each line must start with "F:" or "H:"')
            .describe('French script, one line per turn, each starting "F: " (a woman) or "H: " (a man); 1–2 lines for A1–A2, up to 8 for C1–C2'),
          question: mcq.describe("French stem and options; English explanation"),
        }),
      )
      .length(TCF_LEVELS.length),
  }),
  instructions: `Write a TCF Canada Compréhension orale mini paper: ${TCF_LEVELS.length} short French recordings (read aloud by text-to-speech), one question each, in this exact difficulty order (${levelPlan}). A1–A2: everyday exchanges and announcements (1–3 lines). B1–B2: conversations, messages and radio items. C1–C2: debates and interviews with implicit opinions. No stage directions.`,
  build: (id, d): TestSet => {
    const speakers: Record<string, Speaker> = {};
    return {
      id,
      exam: "tcf",
      skill: "listening",
      title: d.title,
      summary: d.summary,
      speakers,
      questionsAfterAudio: false,
      parts: [
        {
          id: "co",
          title: "Compréhension orale",
          minutes: 12,
          instructions:
            "Lisez la question, écoutez l'enregistrement (une seule écoute), puis choisissez la bonne réponse. Les questions sont de plus en plus difficiles.",
          sections: d.items.map((item, i) => {
            const prefix = `a${i + 1}`;
            const lines = parseScript(item.script);
            for (const l of lines) speakers[`${prefix}-${l.voice}`] = VOICES[l.voice];
            return {
              id: prefix,
              audio: { context: item.context, lines: lines.map((l) => ({ speaker: `${prefix}-${l.voice}`, text: l.text })) },
              questions: [question(`ia-co-q${i + 1}`, item.question, TCF_LEVELS[i])],
            };
          }),
        },
      ],
    };
  },
});

export const PRACTICE_BUILDERS = {
  "celpip-reading": celpipReading,
  "celpip-listening": celpipListening,
  "tcf-reading": tcfReading,
  "tcf-listening": tcfListening,
};
