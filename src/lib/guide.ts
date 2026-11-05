import type { SkillId, Track } from "@/lib/exams";

/**
 * The exam guide: how each test is built, how it's scored, and what to do in
 * each part. Original summaries of the public test formats — check the
 * official sites (celpip.ca, france-education-international.fr, canada.ca)
 * before test day, as formats and tables can change.
 */

export type GuidePart = {
  name: string;
  /** Questions, words or prep/speaking time. */
  size: string;
  /** Time limit, when the part has its own. */
  time?: string;
  what: string;
};

export type GuideSkill = {
  id: SkillId;
  name: string;
  time: string;
  overview: string;
  parts: GuidePart[];
  scoring: string;
  strategies: string[];
};

export type Guide = {
  facts: { label: string; value: string }[];
  skills: GuideSkill[];
  levels: { title: string; columns: string[]; rows: string[][]; note: string };
  testDay: string[];
  plan: { text: string; href?: string }[];
};

export const GUIDES: Record<Track, Guide> = {
  en: {
    facts: [
      { label: "Format", value: "Computer-based, at a test centre; all four skills in one sitting" },
      { label: "Length", value: "About 3 hours" },
      { label: "Order", value: "Listening → Reading → Writing → Speaking" },
      { label: "Scores", value: "A CELPIP level (M, 1–12) per skill; CELPIP level = CLB level for IRCC" },
      { label: "Your target", value: "CELPIP 10 in every skill: IRCC looks at each skill on its own" },
      { label: "Valid for", value: "IRCC accepts results for 2 years from the test date" },
    ],
    skills: [
      {
        id: "listening",
        name: "Listening",
        time: "47–55 min",
        overview:
          "Recordings of everyday and work situations, each played once. In most parts the questions only appear after the recording, so you listen without knowing what will be asked.",
        parts: [
          { name: "Practice task", size: "1 question", what: "Unscored warm-up that shows how the screens work." },
          { name: "Part 1 · Problem solving", size: "8 questions", what: "A conversation in three sections where people sort out a problem." },
          { name: "Part 2 · Daily life conversation", size: "5 questions", what: "A conversation between two people in an everyday setting." },
          { name: "Part 3 · Listening for information", size: "6 questions", what: "One person explains something to another (a service, a process, a plan)." },
          { name: "Part 4 · News item", size: "5 questions", what: "A short news report about a local event." },
          { name: "Part 5 · Discussion", size: "8 questions", what: "A video of three people discussing a decision; track who thinks what." },
          { name: "Part 6 · Viewpoints", size: "6 questions", what: "A talk or report presenting an issue and opinions about it." },
        ],
        scoring: "38 scored questions. Your number correct converts to a CELPIP level; no marks are taken off for wrong answers.",
        strategies: [
          "Note who says what. Questions often ask what one particular person thinks, wants or will do next.",
          "The last decision counts: listen for “Actually…”, “On second thought…”, “Let's do that instead.”",
          "Wrong options often repeat exact words from the recording; the right one usually paraphrases.",
          "If you miss something, let it go: the clip won't replay, and dwelling on it costs the next question.",
          "Never leave a blank. Guess, then move on.",
        ],
      },
      {
        id: "reading",
        name: "Reading",
        time: "55–60 min",
        overview:
          "Four parts, each with its own timer on screen. When a part's time is up, or you move on, you can't go back to it.",
        parts: [
          { name: "Part 1 · Correspondence", size: "11 questions", time: "11 min", what: "A letter or email, then a reply with gaps to fill." },
          { name: "Part 2 · Apply a diagram", size: "8 questions", time: "9 min", what: "A diagram, schedule or price list and an email that refers to it." },
          { name: "Part 3 · Information", size: "9 questions", time: "10 min", what: "A text in lettered paragraphs; match each statement to its paragraph, or “not given”." },
          { name: "Part 4 · Viewpoints", size: "10 questions", time: "13 min", what: "An article with several opinions, then a reader's comment with gaps." },
        ],
        scoring: "38 questions. Number correct converts to a CELPIP level; about 33 or more correct is usually needed for a 10.",
        strategies: [
          "Read the questions first, then scan the text for the part each one is about.",
          "In Part 2, every gap depends on a detail in the diagram (a price, a time, a condition in the small print).",
          "In Part 3, “not given” is a real option: choose it when no paragraph actually says the statement.",
          "In Part 4, keep the writer's view apart from the views they report, and from the commenter's.",
          "Watch small words that change meaning: only, all, never, unless, except.",
        ],
      },
      {
        id: "writing",
        name: "Writing",
        time: "53 min",
        overview: "Two tasks typed on the computer. There is no spell-checker, and the word count is shown on screen.",
        parts: [
          { name: "Task 1 · Writing an email", size: "150–200 words", time: "27 min", what: "Reply to a situation and cover all three bullet points, in a tone that suits the reader." },
          { name: "Task 2 · Responding to survey questions", size: "150–200 words", time: "26 min", what: "Choose option A or B in a survey and argue for it." },
        ],
        scoring:
          "Each task is rated on content and coherence, vocabulary, readability, and task fulfilment, which together give your CELPIP writing level.",
        strategies: [
          "Spend 3–4 minutes planning: one paragraph per bullet point in Task 1.",
          "Stay inside 150–200 words. Too short hurts task fulfilment; far over wastes proofreading time.",
          "Match the register to the reader: a neighbour, a manager and a company each need a different tone.",
          "In Task 2, choose the option you can argue best (not necessarily your real opinion) and briefly answer the other side.",
          "Keep the last 3 minutes to proofread for verb tenses, articles and plurals.",
        ],
      },
      {
        id: "speaking",
        name: "Speaking",
        time: "15–20 min",
        overview:
          "Eight tasks answered into a microphone, with no examiner present. Each task gives you preparation time, then records you for a fixed time.",
        parts: [
          { name: "Task 1 · Giving advice", size: "30 s prep · 90 s", what: "Advise someone on a choice or problem." },
          { name: "Task 2 · Personal experience", size: "30 s prep · 60 s", what: "Tell the story of something that happened to you." },
          { name: "Task 3 · Describing a scene", size: "30 s prep · 60 s", what: "Describe a picture so the listener can see it." },
          { name: "Task 4 · Making predictions", size: "30 s prep · 60 s", what: "Say what will probably happen next in the same picture." },
          { name: "Task 5 · Comparing and persuading", size: "60 s prep · 60 s", what: "Pick one of two options, then persuade someone that yours beats their third option." },
          { name: "Task 6 · Difficult situation", size: "60 s prep · 60 s", what: "Choose one of two hard options and explain it to the person affected." },
          { name: "Task 7 · Expressing opinions", size: "30 s prep · 90 s", what: "Give and support your opinion on a question." },
          { name: "Task 8 · Unusual situation", size: "30 s prep · 60 s", what: "Describe something strange to someone who can't see it." },
        ],
        scoring:
          "Rated on content and coherence, vocabulary, listenability (pronunciation, rhythm, fluency) and task fulfilment.",
        strategies: [
          "Use prep time to choose 2–3 points, not to write sentences.",
          "Keep talking until the timer ends. An unfinished sentence is fine; long silence isn't.",
          "Speak to the person in the task (“Hi Sam, I think you should…”), not about them.",
          "For pictures, use place words (on the left, in the background, next to) and say what people are doing.",
          "Steady and clear beats fast: listenability is a quarter of the score.",
        ],
      },
    ],
    levels: {
      title: "What a 10 takes (approximate)",
      columns: ["Skill", "CLB 9", "CLB 10", "CLB 11"],
      rows: [
        ["Listening (out of 38)", "29+", "32+", "35+"],
        ["Reading (out of 38)", "31+", "33+", "35+"],
        ["Writing / Speaking", "Level 9", "Level 10", "Level 11"],
      ],
      note:
        "CELPIP doesn't publish an official raw-score table; these are the widely used estimates the app also uses. Writing and speaking are rated directly on the 1–12 scale.",
    },
    testDay: [
      "Bring the ID you registered with (usually your passport) and arrive at least 30 minutes early.",
      "Phones, bags and notes stay in a locker. You'll get something to write notes on.",
      "Headphones with a microphone are provided. Other candidates may be speaking at the same time, so practise with some background noise.",
      "Results usually appear in your online account within about a week; check celpip.ca for current timelines.",
    ],
    plan: [
      { text: "Read this guide, then take one built-in paper per skill as a baseline.", href: "" },
      { text: "Go through each paper's answer key: note the question types you miss.", href: "/reading" },
      { text: "Set your exam date and daily minutes for a day-by-day plan.", href: "/plan" },
      { text: "Practise writing and speaking several times a week and work on the 3 fixes from each AI review.", href: "/writing" },
      { text: "Learn the email and speaking phrases in the phrase bank.", href: "/phrases" },
      { text: "Add questions from your prep books under My papers.", href: "/papers" },
      { text: "In the last two weeks, take full mock exams with real timing.", href: "/mock" },
    ],
  },
  fr: {
    facts: [
      { label: "Format", value: "Computer-based for listening, reading and writing; speaking face to face with an examiner" },
      { label: "Length", value: "About 2 h 45 min: 35 + 60 + 60 + 12 minutes" },
      { label: "Scores", value: "Listening and reading on 100–699; writing and speaking on 0–20" },
      { label: "For IRCC", value: "Each score converts to an NCLC level, skill by skill" },
      { label: "Your target", value: "NCLC 7 in every skill: 458+ listening, 453+ reading, 10+/20 writing and speaking" },
      { label: "Valid for", value: "IRCC accepts results for 2 years from the test date" },
    ],
    skills: [
      {
        id: "listening",
        name: "Compréhension orale",
        time: "35 min",
        overview:
          "39 multiple-choice questions in one block, from A1 to C2. You read the question, then hear the recording once.",
        parts: [
          { name: "A1–A2 · questions 1–10", size: "≈10 questions", what: "Short everyday exchanges, announcements and phone messages: where, when, how much." },
          { name: "B1–B2 · questions 11–29", size: "≈19 questions", what: "Conversations, radio news and interviews: reasons, opinions, what will happen." },
          { name: "C1–C2 · questions 30–39", size: "≈10 questions", what: "Debates, reports, lectures and essays: implied meaning, tone, the speaker's real position." },
        ],
        scoring:
          "Harder questions are worth more points, so the last ten matter most. There's no penalty for wrong answers.",
        strategies: [
          "Read the question and all four options before the audio starts: you know what to listen for.",
          "Numbers are traps: a time, a price and a platform number may all be heard. Check which one the question asks for.",
          "From B2 up, the answer is almost never a phrase from the recording; look for the paraphrase.",
          "C1–C2: listen for concession words (certes, pourtant, toutefois, en revanche): the real opinion comes after them.",
          "Keep your focus to the end. The final questions are worth the most points.",
        ],
      },
      {
        id: "reading",
        name: "Compréhension écrite",
        time: "60 min",
        overview: "39 multiple-choice questions on documents of rising difficulty, from a shop sign to a philosophical essay.",
        parts: [
          { name: "A1–A2", size: "≈10 questions", what: "Signs, text messages, ads, short emails: find one fact." },
          { name: "B1–B2", size: "≈19 questions", what: "Articles, notices, rules, letters, reviews: purpose, conditions, opinions." },
          { name: "C1–C2", size: "≈10 questions", what: "Opinion pieces and essays: thesis, nuance, irony, what the author implies." },
        ],
        scoring: "Weighted by level and reported on 100–699, like listening. No penalty for wrong answers.",
        strategies: [
          "Budget time: under a minute each for A1–A2 so you have about 3 minutes for each C1–C2 text.",
          "Read the question first, then the text. For essays, find the sentence that states the author's position.",
          "Be careful with options that are true in general but aren't what this text says.",
          "Words like “sauf”, “à condition que”, “ne… que” and “toutefois” often decide the answer.",
          "Answer every question, even with a guess, before time runs out.",
        ],
      },
      {
        id: "writing",
        name: "Expression écrite",
        time: "60 min",
        overview: "Three tasks typed on the computer in one 60-minute block. You decide how to split the time.",
        parts: [
          { name: "Tâche 1 · Message", size: "60–120 mots", what: "A message to a friend, neighbour or colleague: describe, invite, inform, ask." },
          { name: "Tâche 2 · Article, lettre ou note", size: "120–150 mots", what: "Tell about an experience or event and give your impressions, for a blog, newspaper or community." },
          { name: "Tâche 3 · Comparer deux points de vue", size: "120–180 mots", what: "Two short documents with opposite views: summarise both (≈40–60 words), then give and justify your own opinion." },
        ],
        scoring:
          "Scored 0–20 overall. Graders look at task completion, organisation and connectors, range of vocabulary, and grammatical accuracy. NCLC 7 needs 10/20.",
        strategies: [
          "Rough timing: 10 minutes for task 1, 20 for task 2, 30 for task 3.",
          "Stay inside each word range. Writing too little is penalised.",
          "Choose tu or vous to suit the reader, and keep the same one all the way through.",
          "Use connectors to show structure: d'abord, ensuite, cependant, en effet, par conséquent, en somme.",
          "In task 3, summarise without copying sentences from the documents, then take a clear side.",
        ],
      },
      {
        id: "speaking",
        name: "Expression orale",
        time: "12 min",
        overview: "A face-to-face conversation with an examiner, recorded for grading, in three tasks.",
        parts: [
          { name: "Tâche 1 · Entretien dirigé", size: "2 min, no prep", what: "Answer questions about yourself: family, work, hobbies, plans." },
          { name: "Tâche 2 · Exercice en interaction", size: "2 min prep + 3 min 30", what: "A role-play: you ask the examiner questions to get information (renting, booking, buying…)." },
          { name: "Tâche 3 · Point de vue", size: "4 min 30, no prep", what: "Give and defend your opinion on a statement; the examiner may push back." },
        ],
        scoring: "Scored 0–20 overall on fluency, vocabulary, grammar, pronunciation and task completion. NCLC 7 needs 10/20.",
        strategies: [
          "Task 1: give more than the question asks: a detail, a reason, an example.",
          "Task 2: vary your questions (est-ce que…, inversion, combien, quand, pourquoi) and react to each answer.",
          "Task 3: state your position, give two or three arguments with examples, acknowledge the other side, then conclude.",
          "If you don't know a word, describe it (“c'est une chose qui sert à…”) and keep going.",
          "Formal vous with the examiner, unless the role-play says otherwise.",
        ],
      },
    ],
    levels: {
      title: "TCF Canada → NCLC (IRCC equivalency)",
      columns: ["NCLC", "Listening", "Reading", "Writing", "Speaking"],
      rows: [
        ["10+", "549–699", "549–699", "16–20", "16–20"],
        ["9", "523–548", "524–548", "14–15", "14–15"],
        ["8", "503–522", "499–523", "12–13", "12–13"],
        ["7 ← target", "458–502", "453–498", "10–11", "10–11"],
        ["6", "398–457", "406–452", "7–9", "7–9"],
        ["5", "369–397", "375–405", "6", "6"],
        ["4", "331–368", "342–374", "4–5", "4–5"],
      ],
      note: "Check the current table on canada.ca before relying on it; these are the values the app scores against.",
    },
    testDay: [
      "Bring the ID you registered with (usually your passport) and your convocation; arrive early.",
      "Listening, reading and writing are on a computer. Phones and notes stay outside the room.",
      "The speaking test is face to face and recorded. The examiner's role is to make you talk, so give long answers.",
      "Results usually arrive a few weeks after the test; ask your test centre for the current timeline.",
    ],
    plan: [
      { text: "Read this guide, then take one built-in paper per skill as a baseline.", href: "" },
      { text: "Study each paper's answer key, especially the B2–C2 questions you miss.", href: "/listening" },
      { text: "Set your exam date and daily minutes for a day-by-day plan.", href: "/plan" },
      { text: "Write all three tasks, and record the three speaking tasks, every week; apply the AI fixes.", href: "/writing" },
      { text: "Learn the connectors in the phrase bank: they lift writing and speaking scores fast.", href: "/phrases" },
      { text: "Add papers from your prep books or classes under My papers.", href: "/papers" },
      { text: "In the last two weeks, take full mock exams with real timing.", href: "/mock" },
    ],
  },
};
