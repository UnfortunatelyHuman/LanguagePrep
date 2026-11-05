import type { Track } from "@/lib/exams";
import type { AudioLine, CefrLevel, PracticeSkill, Speaker, TestSet } from "@/lib/practice/types";

/**
 * The form editor's model of a paper, and the conversions to and from the
 * stored TestSet. Safe for client and server.
 *
 * The form covers the common shape: one timed block of documents (reading) or
 * recordings (listening), each with its own questions. Papers that use more
 * (several parts, diagrams, fill-in blanks…) are edited as JSON instead.
 */

export type DraftQuestion = {
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  level: CefrLevel;
};

export type DraftDoc = {
  /** Reading: kind of document, heading and text (blank line = new paragraph). */
  label: string;
  heading: string;
  text: string;
  /** Listening: what you're about to hear, and the script, one "Speaker: line" per line. */
  context: string;
  transcript: string;
  questions: DraftQuestion[];
};

export type Draft = {
  skill: PracticeSkill;
  title: string;
  summary: string;
  minutes: number;
  instructions: string;
  docs: DraftDoc[];
};

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Voices a listening paper can use. Names are what you type before the colon. */
export const VOICES: Record<Track, Record<string, Speaker>> = {
  en: {
    woman: { name: "Woman", gender: "female" },
    man: { name: "Man", gender: "male" },
    woman2: { name: "Woman 2", gender: "female" },
    man2: { name: "Man 2", gender: "male" },
    narrator: { name: "Narrator", gender: "female" },
  },
  fr: {
    femme: { name: "Femme", gender: "female" },
    homme: { name: "Homme", gender: "male" },
    femme2: { name: "Femme 2", gender: "female" },
    homme2: { name: "Homme 2", gender: "male" },
    annonce: { name: "Annonce", gender: "female" },
  },
};

export function emptyQuestion(level: CefrLevel = "B1"): DraftQuestion {
  return { stem: "", options: ["", "", "", ""], answer: 0, explanation: "", level };
}

export function emptyDoc(): DraftDoc {
  return { label: "", heading: "", text: "", context: "", transcript: "", questions: [emptyQuestion()] };
}

export function emptyDraft(track: Track, skill: PracticeSkill): Draft {
  return {
    skill,
    title: "",
    summary: "",
    minutes: track === "fr" ? (skill === "reading" ? 60 : 35) : skill === "reading" ? 15 : 10,
    instructions: "",
    docs: [emptyDoc()],
  };
}

/** "Woman 2: Hello" → speaker key + text. Unlabelled lines continue the previous speaker. */
export function parseTranscript(track: Track, transcript: string): { lines: AudioLine[]; unknown: string[] } {
  const voices = Object.entries(VOICES[track]);
  const byName = new Map<string, string>();
  for (const [key, v] of voices) {
    byName.set(v.name.toLowerCase(), key);
    byName.set(key.toLowerCase(), key);
  }
  const lines: AudioLine[] = [];
  const unknown: string[] = [];
  let current = voices[0][0];
  for (const raw of transcript.split("\n")) {
    const row = raw.trim();
    if (!row) continue;
    const match = /^([^:]{1,20}):\s*(.*)$/.exec(row);
    const key = match ? byName.get(match[1].trim().toLowerCase()) : undefined;
    if (match && key) {
      current = key;
      if (match[2].trim()) lines.push({ speaker: key, text: match[2].trim() });
    } else {
      // "Women: …" looks like a mistyped speaker; "Attention : …" (French spacing) is just text.
      if (match && !/\s$/.test(match[1]) && /^[\p{L}]+( \d)?$/u.test(match[1].trim())) {
        unknown.push(match[1].trim());
      }
      lines.push({ speaker: current, text: row });
    }
  }
  return { lines, unknown: [...new Set(unknown)] };
}

/** Problems to fix before saving, in plain words. Empty when the draft is fine. */
export function draftProblems(track: Track, draft: Draft): string[] {
  const problems: string[] = [];
  if (!draft.title.trim()) problems.push("Give the paper a title.");
  if (!(draft.minutes >= 1 && draft.minutes <= 120)) problems.push("The time limit must be 1–120 minutes.");
  if (!draft.docs.length) problems.push("Add at least one document or recording.");
  draft.docs.forEach((doc, i) => {
    const where = `${draft.skill === "reading" ? "Document" : "Recording"} ${i + 1}`;
    if (draft.skill === "reading" && !doc.text.trim()) problems.push(`${where}: the text is empty.`);
    if (draft.skill === "listening") {
      if (!parseTranscript(track, doc.transcript).lines.length) problems.push(`${where}: the script is empty.`);
    }
    if (!doc.questions.length) problems.push(`${where}: add at least one question.`);
    doc.questions.forEach((q, j) => {
      const at = `${where}, question ${j + 1}`;
      const filled = q.options.filter((o) => o.trim());
      if (!q.stem.trim()) problems.push(`${at}: write the question.`);
      if (filled.length < 2) problems.push(`${at}: give at least two answer options.`);
      if (!q.options[q.answer]?.trim()) problems.push(`${at}: the option marked correct is empty.`);
    });
  });
  return problems;
}

/** The draft as a paper the server accepts (no id or exam: the server adds them). */
export function draftToPaper(track: Track, draft: Draft): Omit<TestSet, "id" | "exam"> {
  const listening = draft.skill === "listening";
  return {
    skill: draft.skill,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    ...(listening ? { speakers: VOICES[track], questionsAfterAudio: false } : {}),
    parts: [
      {
        id: "p1",
        title: draft.title.trim() || "Paper",
        minutes: Math.round(draft.minutes),
        ...(draft.instructions.trim() ? { instructions: draft.instructions.trim() } : {}),
        sections: draft.docs.map((doc, i) => ({
          id: `s${i + 1}`,
          ...(listening
            ? {
                audio: {
                  ...(doc.context.trim() ? { context: doc.context.trim() } : {}),
                  lines: parseTranscript(track, doc.transcript).lines,
                },
              }
            : {
                passage: {
                  ...(doc.label.trim() ? { label: doc.label.trim() } : {}),
                  ...(doc.heading.trim() ? { heading: doc.heading.trim() } : {}),
                  paragraphs: doc.text
                    .split(/\n\s*\n/)
                    .map((p) => p.trim())
                    .filter(Boolean),
                },
              }),
          questions: doc.questions.map((q, j) => {
            // Drop empty options, keeping the correct one pointed at the right text.
            const kept = q.options.map((text, k) => ({ text: text.trim(), k })).filter((o) => o.text);
            return {
              id: `q${i + 1}-${j + 1}`,
              stem: q.stem.trim(),
              options: kept.map((o) => o.text),
              answer: Math.max(0, kept.findIndex((o) => o.k === q.answer)),
              explanation: q.explanation.trim() || "No explanation was added for this question.",
              ...(track === "fr" ? { level: q.level } : {}),
            };
          }),
        })),
      },
    ],
  };
}

const BLANK = /\[\[[\w-]+\]\]/;

/** The paper back as a draft, or null when it uses things the form can't show. */
export function paperToDraft(track: Track, set: TestSet): Draft | null {
  if (set.parts.length !== 1) return null;
  const part = set.parts[0];
  const voices = VOICES[track];
  const docs: DraftDoc[] = [];
  for (const s of part.sections) {
    if (s.options || s.instructions) return null;
    const p = s.passage;
    if (p && (p.diagram || p.meta?.length || p.lettered || p.paragraphs.some((x) => BLANK.test(x)))) return null;
    if (set.skill === "listening" && (p || !s.audio)) return null;
    if (s.audio?.lines.some((l) => !voices[l.speaker])) return null;
    if (s.questions.some((q) => !q.options || !q.stem)) return null;
    docs.push({
      label: p?.label ?? "",
      heading: p?.heading ?? "",
      text: p?.paragraphs.join("\n\n") ?? "",
      context: s.audio?.context ?? "",
      transcript: s.audio?.lines.map((l) => `${voices[l.speaker].name}: ${l.text}`).join("\n") ?? "",
      questions: s.questions.map((q) => ({
        stem: q.stem ?? "",
        options: [...q.options!],
        answer: q.answer,
        explanation: q.explanation === "No explanation was added for this question." ? "" : q.explanation,
        level: q.level ?? "B1",
      })),
    });
  }
  return {
    skill: set.skill,
    title: set.title,
    summary: set.summary ?? "",
    minutes: part.minutes,
    instructions: part.instructions ?? "",
    docs,
  };
}

/** A small, complete example paper to download and copy. */
export function templatePaper(track: Track, skill: PracticeSkill) {
  const fr = track === "fr";
  const q = (stem: string, options: string[], answer: number, explanation: string, level: CefrLevel): DraftQuestion => ({
    stem,
    options,
    answer,
    explanation,
    level,
  });
  const draft: Draft = {
    skill,
    title: fr ? "Mon sujet d'entraînement" : "My practice paper",
    summary: fr ? "Deux documents d'exemple — remplacez-les par les vôtres." : "Two example items — replace them with your own.",
    minutes: 10,
    instructions: fr ? "Choisissez la bonne réponse." : "Choose the best answer.",
    docs: [
      {
        label: fr ? "Affiche" : "Notice",
        heading: fr ? "Piscine municipale" : "Community pool",
        text: fr
          ? "Ouverte tous les jours de 6 h à 21 h.\n\nFermée le 25 décembre."
          : "Open daily from 6 a.m. to 9 p.m.\n\nClosed on December 25.",
        context: fr ? "À la piscine." : "At the pool.",
        transcript: fr
          ? "Femme: Bonjour, la piscine ferme à quelle heure ?\nHomme: À vingt et une heures, madame."
          : "Woman: Hi, what time does the pool close?\nMan: At nine p.m., every day.",
        questions: [
          fr
            ? q("À quelle heure la piscine ferme-t-elle ?", ["À 6 h", "À 21 h", "À 25 h", "À midi"], 1, "« 21 h » = 9 p.m.", "A1")
            : q("When does the pool close?", ["6 a.m.", "9 p.m.", "Noon", "It never closes"], 1, "It closes at 9 p.m.", "A1"),
        ],
      },
      {
        label: fr ? "Courriel" : "Email",
        heading: "",
        text: fr
          ? "Bonjour Paul,\n\nLa réunion de lundi est reportée à mardi, 10 h, salle B.\n\nClaire"
          : "Hi Paul,\n\nMonday's meeting has moved to Tuesday at 10 a.m. in Room B.\n\nClaire",
        context: fr ? "Un message vocal." : "A voicemail.",
        transcript: fr
          ? "Femme: Salut Paul, c'est Claire. La réunion de lundi est reportée à mardi, dix heures, salle B."
          : "Woman: Hi Paul, it's Claire. Monday's meeting has moved to Tuesday at ten, in Room B.",
        questions: [
          fr
            ? q("Quand aura lieu la réunion ?", ["Lundi", "Mardi", "Mercredi", "Vendredi"], 1, "« Reportée à mardi » = moved to Tuesday.", "A2")
            : q("When is the meeting now?", ["Monday", "Tuesday", "Wednesday", "Friday"], 1, "It moved to Tuesday.", "A2"),
        ],
      },
    ],
  };
  return draftToPaper(track, draft);
}
