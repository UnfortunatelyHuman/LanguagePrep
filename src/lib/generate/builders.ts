import "server-only";
import { z } from "zod";
import type { TestSet } from "@/lib/practice/types";
import type { SpeakingSet } from "@/lib/speaking/types";
import type { WritingSet } from "@/lib/writing/types";
import type { GenerateKind } from "./kinds";
import { PRACTICE_BUILDERS } from "./practice-builders";
import { builder, summary, text, title, type Builder } from "./shared";

// Writing and speaking builders; listening and reading ones are in practice-builders.ts.
const sceneSchema = z.object({
  caption: text().describe("One sentence describing the whole picture"),
  items: z
    .array(z.object({ emoji: text().max(8).describe("One emoji"), label: text().describe("Something visible") }))
    .min(7)
    .max(9),
});
const optionSchema = z.object({ title: text(), details: z.array(text()).min(3).max(4) });


const celpipEmail = builder({
  schema: z.object({
    title,
    summary,
    scenario: text(80).describe("2–4 sentences, second person, a realistic everyday situation in Canada"),
    recipient: text().describe('Who to write to, e.g. "your landlord, Mr. Chen"'),
    bullets: z.array(text()).length(3).describe("The three things the email must do"),
  }),
  instructions:
    "Write a CELPIP Writing Task 1 (email) prompt. Vary the register: some prompts are formal (a company, a manager, a city office), some informal (a friend, a neighbour).",
  build: (id, d): WritingSet => ({
    id,
    exam: "celpip",
    title: d.title,
    summary: d.summary,
    minutes: 27,
    tasks: [
      {
        id: "task-1",
        kind: "celpip-email",
        label: "Task 1: Writing an Email",
        minWords: 150,
        maxWords: 200,
        scenario: d.scenario,
        instructions: `Write an email to ${d.recipient}. In your email, do the following:`,
        bullets: d.bullets,
      },
    ],
  }),
});

const celpipSurvey = builder({
  schema: z.object({
    title,
    summary,
    scenario: text(60).describe("2–3 sentences: who is asking residents/employees/parents and why"),
    optionA: text(20).describe("One concrete option, one sentence"),
    optionB: text(20).describe("A different, equally reasonable option, one sentence"),
  }),
  instructions:
    "Write a CELPIP Writing Task 2 (survey) prompt: a community, workplace or school decision with two balanced options, so either choice can be defended.",
  build: (id, d): WritingSet => ({
    id,
    exam: "celpip",
    title: d.title,
    summary: d.summary,
    minutes: 26,
    tasks: [
      {
        id: "task-2",
        kind: "celpip-survey",
        label: "Task 2: Responding to Survey Questions",
        minWords: 150,
        maxWords: 200,
        scenario: d.scenario,
        instructions: "Choose the option that you prefer. Explain the reasons for your choice.",
        options: [
          { id: "A", text: d.optionA },
          { id: "B", text: d.optionB },
        ],
      },
    ],
  }),
});

const tcfWriting = builder({
  schema: z.object({
    title: title.describe('French title starting "Série IA : " followed by the three themes'),
    summary,
    message: z.object({
      scenario: text().describe("French, one sentence: the situation"),
      instructions: text().describe("French: who to write to and the 2–3 things the message must do"),
    }),
    article: z.object({
      scenario: text().describe("French: the publication (blog, journal, forum) or the friend"),
      instructions: text().describe("French: what to tell/describe and what opinion or feeling to give"),
    }),
    debate: z.object({
      question: text().describe("French debate question, ending with ?"),
      document1: text(250).describe("French, 60–90 words, first-person view FOR"),
      document2: text(250).describe("French, 60–90 words, first-person view AGAINST"),
    }),
  }),
  instructions:
    "Write a full TCF Canada Expression écrite paper in French: task 1 a short message (60–120 words) to a friend, neighbour or colleague; task 2 an article, blog post or letter (120–150 words) telling an experience; task 3 two short opposing documents on a current social question.",
  build: (id, d): WritingSet => ({
    id,
    exam: "tcf",
    title: d.title,
    summary: d.summary,
    minutes: 60,
    tasks: [
      {
        id: "tache-1",
        kind: "tcf-message",
        label: "Tâche 1 : Message",
        minWords: 60,
        maxWords: 120,
        scenario: d.message.scenario,
        instructions: d.message.instructions,
      },
      {
        id: "tache-2",
        kind: "tcf-article",
        label: "Tâche 2 : Article",
        minWords: 120,
        maxWords: 150,
        scenario: d.article.scenario,
        instructions: d.article.instructions,
      },
      {
        id: "tache-3",
        kind: "tcf-argument",
        label: "Tâche 3 : Comparer deux points de vue",
        minWords: 120,
        maxWords: 180,
        scenario: d.debate.question,
        instructions:
          "Lisez les deux documents. Rédigez un texte de 120 à 180 mots. Dans une première partie (40 à 60 mots), présentez les deux points de vue. Dans une deuxième partie (80 à 120 mots), donnez votre opinion sur le sujet en la justifiant.",
        documents: [
          { title: "Document 1", text: d.debate.document1 },
          { title: "Document 2", text: d.debate.document2 },
        ],
      },
    ],
  }),
});

const celpipSpeaking = builder({
  schema: z.object({
    title,
    summary,
    advice: z.object({ prompt: text(60), points: z.array(text()).length(3) }),
    experience: z.object({ prompt: text(40), points: z.array(text()).length(3) }),
    scene: sceneSchema.describe("A busy, detailed everyday scene for tasks 3 and 4"),
    compare: z.object({
      prompt: text(60).describe("The situation, ending with: choose the option you prefer"),
      optionA: optionSchema,
      optionB: optionSchema,
      rival: z.object({
        who: text().max(40).describe('Who prefers a third option, e.g. "Your sister"'),
        intro: text().describe('One sentence, e.g. "Your sister has found a third apartment and prefers it."'),
        title: text(),
        details: z.array(text()).min(3).max(4),
      }).describe("A third, different option that a family member or friend prefers; the candidate argues against it"),
    }),
    difficult: z.object({
      prompt: text(80).describe("A dilemma; the speaker chooses one of two people/approaches to talk to"),
      optionA: optionSchema,
      optionB: optionSchema,
    }),
    opinion: z.object({ prompt: text(60), points: z.array(text()).length(3) }),
    unusual: z.object({
      prompt: text(60).describe("You see an unusual object and describe it to someone on the phone"),
      scene: sceneSchema.describe("The unusual object: its parts, colours, size and features"),
    }),
  }),
  instructions:
    "Write a full CELPIP Speaking test (8 tasks) with fresh everyday Canadian situations. Each task must be self-contained and answerable from general experience.",
  build: (id, d): SpeakingSet => {
    const option = (o: z.infer<typeof optionSchema>, key: "A" | "B") => ({ id: key, title: o.title, details: o.details });
    return {
      id,
      exam: "celpip",
      title: d.title,
      summary: d.summary,
      tasks: [
        { id: "task-1", kind: "celpip-advice", label: "Task 1: Giving Advice", prepSeconds: 30, speakSeconds: 90, prompt: d.advice.prompt, points: d.advice.points },
        { id: "task-2", kind: "celpip-experience", label: "Task 2: Talking about a Personal Experience", prepSeconds: 30, speakSeconds: 60, prompt: d.experience.prompt, points: d.experience.points },
        {
          id: "task-3", kind: "celpip-scene", label: "Task 3: Describing a Scene", prepSeconds: 30, speakSeconds: 60,
          prompt: "Describe some things that are happening in the picture as well as you can. The person you are speaking to cannot see the picture.",
          scene: d.scene,
        },
        {
          id: "task-4", kind: "celpip-predictions", label: "Task 4: Making Predictions", prepSeconds: 30, speakSeconds: 60,
          prompt: "In this picture, what do you think will most probably happen next? Describe what you think will happen to the people and things you see.",
          scene: d.scene,
        },
        {
          id: "task-5", kind: "celpip-compare", label: "Task 5: Comparing and Persuading", chooseSeconds: 60, prepSeconds: 60, speakSeconds: 60,
          prompt: d.compare.prompt, options: [option(d.compare.optionA, "A"), option(d.compare.optionB, "B")], rival: d.compare.rival,
        },
        {
          id: "task-6", kind: "celpip-difficult", label: "Task 6: Dealing with a Difficult Situation", prepSeconds: 60, speakSeconds: 60,
          prompt: d.difficult.prompt, options: [option(d.difficult.optionA, "A"), option(d.difficult.optionB, "B")],
        },
        { id: "task-7", kind: "celpip-opinion", label: "Task 7: Expressing Opinions", prepSeconds: 30, speakSeconds: 90, prompt: d.opinion.prompt, points: d.opinion.points },
        { id: "task-8", kind: "celpip-unusual", label: "Task 8: Describing an Unusual Situation", prepSeconds: 30, speakSeconds: 60, prompt: d.unusual.prompt, scene: d.unusual.scene },
      ],
    };
  },
});

const tcfSpeaking = builder({
  schema: z.object({
    title: title.describe('French title starting "Série IA : " followed by the themes'),
    summary,
    interviewQuestions: z.array(text()).min(5).max(6).describe("French examiner questions about the candidate's life"),
    roleplay: z.object({
      situation: text(80).describe("French: the situation and who the candidate is calling or meeting"),
      toFindOut: z.array(text()).min(4).max(5).describe("French: things the candidate must ask about"),
    }),
    opinion: z.object({
      statement: text(20).describe("French debatable statement, without quotes"),
      angles: z.array(text()).min(2).max(3).describe("French: angles to consider"),
    }),
  }),
  instructions:
    "Write a full TCF Canada Expression orale set in French: guided-interview questions, a role-play where the candidate must ask questions to get information, and a debatable statement.",
  build: (id, d): SpeakingSet => ({
    id,
    exam: "tcf",
    title: d.title,
    summary: d.summary,
    tasks: [
      {
        id: "tache-1", kind: "tcf-interview", label: "Tâche 1 : Entretien dirigé", prepSeconds: 0, speakSeconds: 120,
        prompt: "Présentez-vous. L'examinateur vous pose des questions sur vous, votre vie et vos projets.",
        points: d.interviewQuestions,
      },
      {
        id: "tache-2", kind: "tcf-roleplay", label: "Tâche 2 : Exercice en interaction", prepSeconds: 120, speakSeconds: 210,
        prompt: `${d.roleplay.situation} Posez des questions pour obtenir les informations suivantes.`,
        points: d.roleplay.toFindOut,
      },
      {
        id: "tache-3", kind: "tcf-opinion", label: "Tâche 3 : Expression d'un point de vue", prepSeconds: 0, speakSeconds: 270,
        prompt: `« ${d.opinion.statement.replace(/^[«"\s]+|[»"\s]+$/g, "")} » Qu'en pensez-vous ?`,
        points: d.opinion.angles,
      },
    ],
  }),
});

export const BUILDERS = {
  "celpip-email": celpipEmail,
  "celpip-survey": celpipSurvey,
  "tcf-writing": tcfWriting,
  "celpip-speaking": celpipSpeaking,
  "tcf-speaking": tcfSpeaking,
  ...PRACTICE_BUILDERS,
} satisfies Record<GenerateKind, Builder<z.ZodType, WritingSet | SpeakingSet | TestSet>>;
