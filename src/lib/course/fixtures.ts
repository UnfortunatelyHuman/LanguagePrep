import type { CourseLevel, CourseUnit, Cefr } from "./syllabus";
import {
  PLACEMENT_PER_SKILL,
  PLACEMENT_SKILLS,
  type ChatTurn,
  type Lesson,
  type NotesResult,
  type PlacementItem,
  type TaskFeedback,
  type UnitSuggestion,
} from "./schemas";

/**
 * Deterministic, schema-valid answers used only when AI_PROVIDER=mock, so tests
 * exercise every course screen without spending quota. Each fixture echoes its
 * input (unit title, learner text) so screens show which call produced them.
 */

export function lessonFixture(unit: CourseUnit, part: "a" | "b"): Lesson {
  return {
    title: part === "a" ? `${unit.title} : la grammaire` : `${unit.title} : les mots`,
    objectives: [
      `Use ${part === "a" ? unit.grammar.split(";")[0] : "the key words for " + unit.vocabulary.toLowerCase()} in simple sentences`,
      `Practise for: ${unit.skillFocus.text}`,
    ],
    explanation: {
      intro: `(Mock lesson for ${unit.id}-${part}.) This lesson works on ${part === "a" ? unit.grammar : unit.vocabulary}.`,
      points: [
        {
          heading: "Être and avoir",
          text: "Être (to be) and avoir (to have) are irregular: learn their present forms by heart.",
          examples: [
            { fr: "Je suis étudiant.", en: "I am a student." },
            { fr: "Nous avons un chat.", en: "We have a cat." },
          ],
        },
        {
          heading: "Articles",
          text: "Every French noun has a gender: le / un for masculine, la / une for feminine.",
          examples: [{ fr: "Le livre et la table.", en: "The book and the table." }],
        },
      ],
      pitfalls: ["Saying « je suis 30 ans » instead of « j'ai 30 ans »."],
    },
    vocabulary: [
      ["le travail", "work", "Mon travail commence à 9 h.", "My work starts at 9."],
      ["la famille", "family", "Ma famille habite à Laval.", "My family lives in Laval."],
      ["un courriel", "an email", "J'envoie un courriel.", "I'm sending an email."],
      ["la fin de semaine", "the weekend", "La fin de semaine, je me repose.", "On weekends I rest."],
      ["le dépanneur", "the corner store", "Je vais au dépanneur.", "I'm going to the corner store."],
      ["une amie", "a friend (f)", "Une amie m'appelle.", "A friend is calling me."],
      ["le logement", "housing", "Le logement coûte cher.", "Housing is expensive."],
      ["parler", "to speak", "Je parle français.", "I speak French."],
    ].map(([fr, en, exampleFr, exampleEn]) => ({ fr, en, exampleFr, exampleEn })),
    exercises: [
      {
        type: "mcq",
        prompt: "Je ___ canadienne.",
        options: ["suis", "ai", "es", "a"],
        answer: 0,
        explanation: "« Je » takes « suis », the first-person form of être.",
      },
      {
        type: "blank",
        sentence: "Nous ___ deux enfants.",
        answers: ["avons"],
        hint: "avoir",
        explanation: "« Nous » takes « avons ».",
      },
      { type: "reorder", sentence: "Je travaille à Montréal depuis deux ans.", translation: "I have worked in Montreal for two years." },
      {
        type: "translate",
        en: "I am tired.",
        answers: ["Je suis fatigué.", "Je suis fatiguée."],
        explanation: "Être + adjective; add -e if you are a woman.",
      },
      {
        type: "listen",
        audio: "Bonjour, je m'appelle Julie et j'habite à Québec.",
        question: "Où habite Julie ?",
        options: ["À Montréal", "À Québec", "À Ottawa"],
        answer: 1,
        explanation: "She says « j'habite à Québec ».",
      },
      {
        type: "mcq",
        prompt: "Choose the right article: ___ maison",
        options: ["le", "la", "les"],
        answer: 1,
        explanation: "Maison is feminine: la maison.",
      },
      {
        type: "blank",
        sentence: "Elle ___ médecin.",
        answers: ["est"],
        explanation: "« Elle » takes « est ».",
      },
      { type: "reorder", sentence: "Nous avons un rendez-vous demain.", translation: "We have an appointment tomorrow." },
    ],
    grammarCards: [
      { sentence: "Tu ___ en retard.", answer: "es", rule: "Être with tu: es." },
      { sentence: "Ils ___ faim.", answer: "ont", rule: "Avoir faim = to be hungry; ils ont." },
      { sentence: "J'___ 30 ans.", answer: "ai", rule: "Age uses avoir: j'ai 30 ans." },
    ],
    task: {
      kind: unit.skillFocus.skill === "speaking" ? "speaking" : "writing",
      promptFr: "Présentez-vous : votre nom, votre ville, votre travail et ce que vous aimez.",
      promptEn: "Introduce yourself: your name, city, job and what you like.",
      points: ["Your name and city", "Your job", "One thing you like"],
      minWords: 20,
      maxWords: 60,
    },
    takeaways: ["Être for identity, avoir for age and possession.", "Learn nouns with their article.", "J'ai 30 ans, not je suis 30 ans."],
  };
}

export function taskFeedbackFixture(answer: string): TaskFeedback {
  return {
    strengths: ["Answers every part of the task", "Clear, simple sentences"],
    fixes: [
      { title: "Age uses avoir", explanation: "In French you « have » an age.", before: "je suis 30 ans", after: "j'ai 30 ans" },
      { title: "Article with jobs", explanation: "No article after être for a profession.", before: "je suis un ingénieur", after: "je suis ingénieur" },
      { title: "Add a connector", explanation: "Link ideas with « et », « mais », « parce que ».", before: "J'aime le sport. J'aime lire.", after: "J'aime le sport et la lecture." },
    ],
    corrected: answer.trim() || "(no answer)",
    summary: "(Mock feedback.) A clear answer at the lesson's level. Develop each point with one more detail.",
    cefr: "A2",
    score: 8,
  };
}

const LEVEL_WORDS: Record<Cefr, string> = { A1: "simple", A2: "facile", B1: "moyen", B2: "avancé", C1: "expert" };

export function placementFixture(level: Cefr): { items: PlacementItem[] } {
  const items: PlacementItem[] = [];
  for (const skill of PLACEMENT_SKILLS) {
    for (let i = 0; i < PLACEMENT_PER_SKILL; i++) {
      items.push({
        skill,
        ...(skill === "reading" ? { passage: `Texte ${LEVEL_WORDS[level]} n° ${i + 1} : la bibliothèque ferme à 18 h le samedi.` } : {}),
        ...(skill === "listening" ? { audio: `La bibliothèque ferme à 18 heures le samedi.` } : {}),
        stem: `[${level} ${skill} ${i + 1}] À quelle heure ferme la bibliothèque le samedi ?`,
        options: ["À 16 h", "À 17 h", "À 18 h", "À 19 h"],
        answer: 2,
        explanation: `(Mock ${level} question.) The text says 18 h.`,
      });
    }
  }
  return { items };
}

export function chatFixture(message: string, turn: number): ChatTurn {
  const ok = !/je suis \d+ ans/i.test(message);
  return {
    correction: ok
      ? { ok: true, corrected: "", notes: [] }
      : {
          ok: false,
          corrected: message.replace(/je suis (\d+) ans/i, "j'ai $1 ans"),
          notes: [{ wrong: "je suis … ans", right: "j'ai … ans", why: "Age uses avoir in French." }],
        },
    reply: turn % 2 === 0 ? "Ah, intéressant ! Et qu'est-ce que vous faites dans la vie ?" : "D'accord. Vous habitez ici depuis longtemps ?",
    replyEn: turn % 2 === 0 ? "Oh, interesting! And what do you do for a living?" : "OK. Have you lived here long?",
    newWords: [{ fr: "dans la vie", en: "for a living" }],
    ended: false,
  };
}

export function notesFixture(title: string): NotesResult {
  return {
    title: title || "Mes notes",
    cards: [
      { kind: "vocab", front: "un rendez-vous", back: "an appointment", example: "J'ai un rendez-vous chez le dentiste." },
      { kind: "vocab", front: "la fin de semaine", back: "the weekend", example: "Bonne fin de semaine !" },
      { kind: "grammar", front: "Il faut que tu ___ (venir).", back: "viennes", example: "Il faut que + subjonctif." },
    ],
    exercises: [
      {
        type: "mcq",
        prompt: "Un rendez-vous, c'est…",
        options: ["an appointment", "a restaurant", "a holiday"],
        answer: 0,
        explanation: "Rendez-vous means an appointment or a meeting.",
      },
      {
        type: "blank",
        sentence: "Il faut que tu ___ demain.",
        answers: ["viennes"],
        hint: "venir",
        explanation: "Il faut que is followed by the subjunctive.",
      },
    ],
  };
}

export function unitsFixture(level: CourseLevel = "B2"): { units: UnitSuggestion[] } {
  return {
    units: [
      {
        level,
        title: "Le français au bureau",
        grammar: "Subjonctif passé",
        vocabulary: "Office life, meetings and deadlines",
        skillFocus: { skill: "writing", text: "Write a formal email to a manager" },
      },
    ],
  };
}
