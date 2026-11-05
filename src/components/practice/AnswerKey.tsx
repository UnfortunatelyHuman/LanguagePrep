"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListeningClip, Transcript, type ClipStatus } from "@/components/practice/ListeningClip";
import { PassageView } from "@/components/practice/PassageView";
import { LETTERS, optionsFor, questionNumbers } from "@/lib/practice/numbering";
import { localeFor } from "@/lib/practice/speech";
import type { Section, TestSet } from "@/lib/practice/types";

type Mode = "answers" | "quiz";

/** Replayable audio and its script — in study mode nothing is "once only". */
function StudyClip({ set, section }: { set: TestSet; section: Section }) {
  const [status, setStatus] = useState<ClipStatus>("idle");
  if (!section.audio) return null;
  return (
    <div className="flex flex-col gap-3">
      {section.audio.context ? <p className="text-sm text-muted">{section.audio.context}</p> : null}
      <ListeningClip
        clip={section.audio}
        speakers={set.speakers ?? {}}
        locale={localeFor(set.exam)}
        status={status}
        onStatusChange={setStatus}
        replayable
      />
      <details className="group">
        <summary className="cursor-pointer text-sm text-accent">Show the script</summary>
        <div className="mt-3">
          <Transcript clip={section.audio} speakers={set.speakers ?? {}} />
        </div>
      </details>
    </div>
  );
}

function SectionStudy({
  set,
  section,
  numbers,
  mode,
  picked,
  onPick,
  revealed,
  onReveal,
}: {
  set: TestSet;
  section: Section;
  numbers: Record<string, number>;
  mode: Mode;
  picked: Record<string, number>;
  onPick: (id: string, option: number) => void;
  revealed: Set<string>;
  onReveal: (id: string) => void;
}) {
  const shown = (id: string) => mode === "answers" || revealed.has(id);

  const renderBlank = (id: string) => {
    const q = section.questions.find((x) => x.id === id)!;
    return (
      <span
        className={`mx-0.5 rounded px-1 font-medium ${shown(id) ? "bg-good/15 text-good" : "bg-surface-subtle text-muted"}`}
      >
        ({numbers[id]}) {shown(id) ? optionsFor(section, id)[q.answer] : "_____"}
      </span>
    );
  };

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
      {section.instructions ? <p className="text-sm text-muted">{section.instructions}</p> : null}
      <StudyClip set={set} section={section} />
      {section.passage ? <PassageView passage={section.passage} renderBlank={renderBlank} /> : null}

      <ol className="flex flex-col gap-4">
        {section.questions.map((q) => {
          const options = optionsFor(section, q.id);
          const isShown = shown(q.id);
          const choice = picked[q.id];
          return (
            <li key={q.id} className="flex flex-col gap-2">
              <p className="flex gap-2 text-[15px] font-medium leading-snug">
                <span className="font-mono text-muted">{numbers[q.id]}.</span>
                <span>
                  {q.stem ?? `Blank ${numbers[q.id]}`}
                  {q.level ? <span className="ml-2 text-xs font-normal text-muted">{q.level}</span> : null}
                </span>
              </p>
              <ul className="flex flex-col gap-1.5">
                {options.map((option, i) => {
                  const correct = isShown && i === q.answer;
                  const wrong = isShown && choice === i && i !== q.answer;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={mode === "answers" || isShown}
                        onClick={() => onPick(q.id, i)}
                        className={`flex w-full gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          correct
                            ? "border-good bg-good/10"
                            : wrong
                              ? "border-warn bg-warn/10"
                              : "border-border enabled:hover:border-accent"
                        }`}
                      >
                        <span className="font-mono text-muted">{LETTERS[i]}</span>
                        <span className="flex-1">{option}</span>
                        {correct ? <span className="text-good">✓ correct</span> : null}
                        {wrong ? <span className="text-warn">✗ your pick</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {isShown ? (
                <p className="rounded-lg bg-surface-subtle p-3 text-sm leading-relaxed text-muted">{q.explanation}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => onReveal(q.id)}
                  className="self-start text-sm text-accent underline-offset-2 hover:underline"
                >
                  Show the answer
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </article>
  );
}

/**
 * A whole paper with its answers and explanations, to study from rather than
 * sit. "Quiz me" hides the answers: pick an option to check it, one by one.
 * Nothing here is timed or saved.
 */
export function AnswerKey({ set, track }: { set: TestSet; track: string }) {
  const numbers = useMemo(() => questionNumbers(set), [set]);
  const [mode, setMode] = useState<Mode>("answers");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const total = Object.keys(numbers).length;
  const tried = Object.keys(picked).length;
  const right = set.parts
    .flatMap((p) => p.sections.flatMap((s) => s.questions))
    .filter((q) => picked[q.id] === q.answer).length;

  const reveal = (id: string) => setRevealed((r) => new Set(r).add(id));
  const restart = (next: Mode) => {
    setMode(next);
    setPicked({});
    setRevealed(new Set());
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-muted">Answer key · study mode</p>
        <h1 className="text-2xl font-semibold tracking-tight">{set.title}</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every question with the correct answer and why. Untimed and not saved
          {set.skill === "listening" ? "; recordings can be replayed as often as you like" : ""}. To measure your
          level, take the paper as a timed test instead.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Study mode" className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            {(
              [
                ["answers", "Show answers"],
                ["quiz", "Quiz me"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => restart(value)}
                className={`rounded-md px-3 py-1.5 ${mode === value ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link
            href={`/${track}/${set.skill}/${set.id}`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-accent"
          >
            Take it as a timed test
          </Link>
          <Link href={`/${track}/${set.skill}`} className="text-sm text-muted hover:text-foreground">
            All {set.skill} papers
          </Link>
        </div>
        {mode === "quiz" ? (
          <p className="text-sm" aria-live="polite">
            {tried ? (
              <>
                <span className="font-medium">
                  {right} / {tried}
                </span>{" "}
                <span className="text-muted">correct so far · {total - tried} to go</span>
              </>
            ) : (
              <span className="text-muted">Pick an option to check it.</span>
            )}
          </p>
        ) : null}
      </section>

      {set.parts.map((part) => (
        <section key={part.id} className="flex flex-col gap-4">
          {set.parts.length > 1 || part.instructions ? (
            <div>
              {set.parts.length > 1 ? (
                <h2 className="text-lg font-semibold tracking-tight">
                  {part.title} <span className="text-sm font-normal text-muted">· {part.minutes} min in the test</span>
                </h2>
              ) : null}
              {part.instructions ? <p className="mt-1 text-sm text-muted">{part.instructions}</p> : null}
            </div>
          ) : null}
          {part.sections.map((section) => (
            <SectionStudy
              key={section.id}
              set={set}
              section={section}
              numbers={numbers}
              mode={mode}
              picked={picked}
              onPick={(id, option) => {
                setPicked((p) => ({ ...p, [id]: option }));
                reveal(id);
              }}
              revealed={revealed}
              onReveal={reveal}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
