"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { savePaperAction } from "@/lib/papers/actions";
import {
  CEFR_LEVELS,
  VOICES,
  draftProblems,
  draftToPaper,
  emptyDoc,
  emptyQuestion,
  parseTranscript,
  type Draft,
  type DraftDoc,
  type DraftQuestion,
} from "@/lib/papers/editor";
import type { Track } from "@/lib/exams";
import type { CefrLevel } from "@/lib/practice/types";

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";
const smallButton =
  "rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-accent hover:text-foreground disabled:opacity-40";

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function QuestionEditor({
  track,
  number,
  question,
  onChange,
  onRemove,
}: {
  track: Track;
  number: number;
  question: DraftQuestion;
  onChange: (q: DraftQuestion) => void;
  onRemove?: () => void;
}) {
  const set = (patch: Partial<DraftQuestion>) => onChange({ ...question, ...patch });
  const setOption = (i: number, text: string) =>
    set({ options: question.options.map((o, k) => (k === i ? text : o)) });
  const removeOption = (i: number) =>
    set({
      options: question.options.filter((_, k) => k !== i),
      answer: question.answer === i ? 0 : question.answer > i ? question.answer - 1 : question.answer,
    });
  const name = useId();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-subtle/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Question {number}</p>
        <div className="flex items-center gap-2">
          {track === "fr" ? (
            <label className="flex items-center gap-1 text-xs text-muted">
              Level
              <select
                value={question.level}
                onChange={(e) => set({ level: e.target.value as CefrLevel })}
                className="rounded-md border border-border bg-surface px-1.5 py-1 text-xs"
              >
                {CEFR_LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          ) : null}
          {onRemove ? (
            <button type="button" onClick={onRemove} className={smallButton}>
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <input
        value={question.stem}
        onChange={(e) => set({ stem: e.target.value })}
        placeholder={track === "fr" ? "La question, ex. « Pourquoi Marc écrit-il ? »" : "The question, e.g. “Why is Marc writing?”"}
        aria-label={`Question ${number}`}
        className={input}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs text-muted">Answer options — select the correct one</legend>
        {question.options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              checked={question.answer === i}
              onChange={() => set({ answer: i })}
              aria-label={`Option ${String.fromCharCode(65 + i)} is correct`}
              className="accent-[var(--accent)]"
            />
            <span className="w-4 font-mono text-xs text-muted">{String.fromCharCode(65 + i)}</span>
            <input
              value={option}
              onChange={(e) => setOption(i, e.target.value)}
              aria-label={`Option ${String.fromCharCode(65 + i)}`}
              className={`${input} ${question.answer === i ? "border-good" : ""}`}
            />
            {question.options.length > 2 ? (
              <button type="button" onClick={() => removeOption(i)} aria-label="Remove option" className={smallButton}>
                ×
              </button>
            ) : null}
          </div>
        ))}
        {question.options.length < 6 ? (
          <button
            type="button"
            onClick={() => set({ options: [...question.options, ""] })}
            className={`${smallButton} self-start`}
          >
            + Option
          </button>
        ) : null}
      </fieldset>

      <textarea
        value={question.explanation}
        onChange={(e) => set({ explanation: e.target.value })}
        rows={2}
        placeholder="Why this answer is right (optional, shown in the review and the answer key)"
        aria-label={`Explanation for question ${number}`}
        className={input}
      />
    </div>
  );
}

function DocEditor({
  track,
  skill,
  index,
  count,
  doc,
  onChange,
  onMove,
  onRemove,
}: {
  track: Track;
  skill: Draft["skill"];
  index: number;
  count: number;
  doc: DraftDoc;
  onChange: (doc: DraftDoc) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<DraftDoc>) => onChange({ ...doc, ...patch });
  const noun = skill === "reading" ? "Document" : "Recording";
  const voices = Object.values(VOICES[track]).map((v) => v.name);
  const unknown = skill === "listening" ? parseTranscript(track, doc.transcript).unknown : [];
  const lastLevel = doc.questions.at(-1)?.level;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold tracking-tight">
          {noun} {index + 1}
        </h3>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} className={smallButton}>
            ↑ Up
          </button>
          <button type="button" onClick={() => onMove(index + 1)} disabled={index === count - 1} className={smallButton}>
            ↓ Down
          </button>
          <button type="button" onClick={onRemove} disabled={count === 1} className={smallButton}>
            Delete
          </button>
        </div>
      </div>

      {skill === "reading" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={doc.label}
              onChange={(e) => set({ label: e.target.value })}
              placeholder={track === "fr" ? "Type : Affiche, Courriel, Article…" : "Type: Email, Notice, Article…"}
              aria-label="Type of document"
              className={input}
            />
            <input
              value={doc.heading}
              onChange={(e) => set({ heading: e.target.value })}
              placeholder="Heading (optional)"
              aria-label="Heading"
              className={input}
            />
          </div>
          <textarea
            value={doc.text}
            onChange={(e) => set({ text: e.target.value })}
            rows={6}
            placeholder="The text. Leave an empty line between paragraphs."
            aria-label="Document text"
            className={input}
          />
        </>
      ) : (
        <>
          <input
            value={doc.context}
            onChange={(e) => set({ context: e.target.value })}
            placeholder={track === "fr" ? "Situation, ex. « Deux collègues parlent. »" : "Situation, e.g. “Two coworkers are talking.”"}
            aria-label="Situation shown before playing"
            className={input}
          />
          <textarea
            value={doc.transcript}
            onChange={(e) => set({ transcript: e.target.value })}
            rows={6}
            placeholder={`${voices[0]}: …\n${voices[1]}: …`}
            aria-label="Script read aloud"
            className={`${input} font-mono`}
          />
          <p className="text-xs text-muted">
            One line per turn, starting with the speaker: {voices.join(", ")}. The browser reads it aloud with a
            matching voice. Lines without a speaker continue the previous one.
          </p>
          {unknown.length ? (
            <p className="rounded-lg bg-warn/10 p-2 text-xs text-warn">
              “{unknown.join("”, “")}” isn&apos;t a speaker name, so that line will be read by the previous speaker,
              including the name. Use one of: {voices.join(", ")}.
            </p>
          ) : null}
        </>
      )}

      <div className="flex flex-col gap-3">
        {doc.questions.map((q, j) => (
          <QuestionEditor
            key={j}
            track={track}
            number={j + 1}
            question={q}
            onChange={(next) => set({ questions: doc.questions.map((x, k) => (k === j ? next : x)) })}
            onRemove={doc.questions.length > 1 ? () => set({ questions: doc.questions.filter((_, k) => k !== j) }) : undefined}
          />
        ))}
        <button
          type="button"
          onClick={() => set({ questions: [...doc.questions, emptyQuestion(lastLevel)] })}
          className={`${smallButton} self-start`}
        >
          + Question about this {noun.toLowerCase()}
        </button>
      </div>
    </section>
  );
}

/** Build or edit a reading/listening paper with a form; saves through the same checks as JSON import. */
export function PaperEditor({ track, initial, setId }: { track: Track; initial: Draft; setId?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, startSave] = useTransition();
  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setProblems([]); // stale once the draft changes; saving checks again
  };
  const noun = draft.skill === "reading" ? "document" : "recording";
  const questionTotal = draft.docs.reduce((n, d) => n + d.questions.length, 0);

  function save() {
    const found = draftProblems(track, draft);
    setProblems(found);
    if (found.length) return;
    startSave(async () => {
      const result = await savePaperAction({
        track,
        json: JSON.stringify(draftToPaper(track, draft)),
        setId,
      });
      if ("error" in result) setProblems(result.error.split("\n"));
      else router.push(`/${track}/papers`);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Title</span>
          <input value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Short description (optional)</span>
          <input
            value={draft.summary}
            onChange={(e) => set({ summary: e.target.value })}
            maxLength={300}
            placeholder="e.g. From my prep book, chapter 4"
            className={input}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Time limit (min)</span>
            <input
              type="number"
              min={1}
              max={120}
              value={draft.minutes}
              onChange={(e) => set({ minutes: Number(e.target.value) })}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Instructions (optional)</span>
            <input
              value={draft.instructions}
              onChange={(e) => set({ instructions: e.target.value })}
              maxLength={600}
              placeholder={track === "fr" ? "Choisissez la bonne réponse." : "Choose the best answer."}
              className={input}
            />
          </label>
        </div>
        {track === "fr" ? (
          <p className="text-xs text-muted">
            Give each question its CEFR level (A1 → C2): the TCF score is weighted by level, and the paper is scaled
            to 100–699. Order questions from easiest to hardest, as in the real test.
          </p>
        ) : null}
      </section>

      {draft.docs.map((doc, i) => (
        <DocEditor
          key={i}
          track={track}
          skill={draft.skill}
          index={i}
          count={draft.docs.length}
          doc={doc}
          onChange={(next) => set({ docs: draft.docs.map((d, k) => (k === i ? next : d)) })}
          onMove={(to) => set({ docs: move(draft.docs, i, to) })}
          onRemove={() => set({ docs: draft.docs.filter((_, k) => k !== i) })}
        />
      ))}

      <button
        type="button"
        onClick={() => {
          const level = draft.docs.at(-1)?.questions.at(-1)?.level;
          set({ docs: [...draft.docs, { ...emptyDoc(), questions: [emptyQuestion(level)] }] });
        }}
        className="rounded-xl border border-dashed border-border p-3 text-sm font-medium text-accent hover:border-accent"
      >
        + Add another {noun}
      </button>

      {problems.length ? (
        <div role="alert" className="rounded-lg bg-warn/10 p-3 text-sm text-warn">
          <p className="font-medium">Please fix these before saving:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.slice(0, 8).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : setId ? "Save changes" : "Save paper"}
        </button>
        <Link href={`/${track}/papers`} className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
        <span className="ml-auto text-xs text-muted">
          {draft.docs.length} {noun}
          {draft.docs.length === 1 ? "" : "s"} · {questionTotal} question{questionTotal === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
