"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ListeningClip, Transcript, type ClipStatus } from "@/components/practice/ListeningClip";
import { PassageView } from "@/components/practice/PassageView";
import { LETTERS } from "@/lib/practice/numbering";
import { localeFor } from "@/lib/practice/speech";
import type { Mistake } from "@/lib/review";
import { recordMistakeRetry } from "@/lib/review-actions";

type SkillFilter = "all" | "reading" | "listening";
type StatusFilter = "open" | "learned";

const SESSION_SIZE = 10;

/** The passage (with this question's blank highlighted) or the replayable clip and its script. */
function Context({ m, open }: { m: Mistake; open: boolean }) {
  const [status, setStatus] = useState<ClipStatus>("idle");
  const { section } = m;
  const blank = (id: string) =>
    id === m.question.id ? (
      <span className="mx-0.5 rounded bg-accent-soft px-1.5 font-semibold text-accent">({m.number}) ______</span>
    ) : (
      <span className="mx-0.5 text-muted">[…]</span>
    );

  const body = (
    <div className="flex flex-col gap-3">
      {section.instructions ? <p className="text-sm text-muted">{section.instructions}</p> : null}
      {section.audio ? (
        <>
          {section.audio.context ? <p className="text-sm text-muted">{section.audio.context}</p> : null}
          <ListeningClip
            clip={section.audio}
            speakers={m.speakers}
            locale={localeFor(m.exam)}
            status={status}
            onStatusChange={setStatus}
            replayable
          />
          <details>
            <summary className="cursor-pointer text-sm text-accent">Show the script</summary>
            <div className="mt-3">
              <Transcript clip={section.audio} speakers={m.speakers} />
            </div>
          </details>
        </>
      ) : null}
      {section.passage ? <PassageView passage={section.passage} renderBlank={blank} /> : null}
    </div>
  );

  if (open) return body;
  return (
    <details className="rounded-xl bg-surface-subtle/70 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-accent">
        {m.skill === "listening" ? "Hear the clip again" : "Show the passage"}
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}

function Options({
  m,
  picked,
  onPick,
  reveal,
}: {
  m: Mistake;
  /** In a retry, the option just picked; in the list, the old wrong pick. */
  picked: number | null;
  onPick?: (i: number) => void;
  reveal: boolean;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {m.options.map((option, i) => {
        const correct = reveal && i === m.question.answer;
        const wrong = reveal && picked === i && i !== m.question.answer;
        return (
          <li key={i}>
            <button
              type="button"
              disabled={!onPick || reveal}
              onClick={() => onPick?.(i)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-[15px] ${
                correct
                  ? "border-good bg-good-soft"
                  : wrong
                    ? "border-warn bg-warn-soft"
                    : "border-border enabled:hover:border-accent"
              }`}
            >
              <span className="w-4 shrink-0 font-bold text-muted">{LETTERS[i]}</span>
              <span className="flex-1">{option}</span>
              {correct ? <span className="shrink-0 text-sm font-semibold text-good">Right answer</span> : null}
              {wrong ? <span className="shrink-0 text-sm font-semibold text-warn">{onPick ? "Your pick" : "You picked"}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Heading({ m }: { m: Mistake }) {
  return (
    <p className="text-xs text-muted">
      {m.setTitle} · {m.partTitle} · Q{m.number}
      {m.question.level ? ` · ${m.question.level}` : ""}
      {m.timesMissed > 1 ? <span className="font-semibold text-warn"> · missed {m.timesMissed}×</span> : null}
    </p>
  );
}

function Stem({ m }: { m: Mistake }) {
  return (
    <p className="text-[17px] font-semibold leading-snug">
      {m.question.stem ?? `Which option fills blank ${m.number} in the passage?`}
    </p>
  );
}

/** One question at a time; each answer is recorded so learned mistakes drop out. */
function RetrySession({ track, items, onDone }: { track: string; items: Mistake[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [, startSave] = useTransition();
  const m = items[index];

  if (!m) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-6">
        <p className="text-2xl font-bold">
          {score} / {items.length} right
        </p>
        <p className="text-sm text-muted">
          Questions you get right twice in a row move to Learned. The rest come back next time.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
        >
          Back to the notebook
        </button>
      </section>
    );
  }

  function pick(i: number) {
    setPicked(i);
    const correct = i === m.question.answer;
    if (correct) setScore((s) => s + 1);
    startSave(async () => {
      await recordMistakeRetry({ track, setId: m.setId, questionId: m.question.id, correct });
    });
  }

  function next() {
    setPicked(null);
    setIndex((n) => n + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Question {index + 1} of {items.length}
        </p>
        <button type="button" onClick={onDone} className="text-sm text-muted hover:text-foreground">
          End retry
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ladder-empty">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${(index / items.length) * 100}%` }} />
      </div>
      <article key={m.key} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <Heading m={m} />
        <Context m={m} open={m.skill === "reading"} />
        <Stem m={m} />
        <Options m={m} picked={picked} onPick={pick} reveal={picked !== null} />
        {picked !== null ? (
          <>
            <p className="rounded-xl bg-surface-subtle p-4 text-sm leading-relaxed">
              <span className={`font-bold ${picked === m.question.answer ? "text-good" : "text-warn"}`}>
                {picked === m.question.answer ? "Right. " : "Not this time. "}
              </span>
              {m.question.explanation}
            </p>
            <button
              type="button"
              onClick={next}
              autoFocus
              className="self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
            >
              {index + 1 === items.length ? "See my score" : "Next question"}
            </button>
          </>
        ) : null}
      </article>
    </section>
  );
}

export function MistakesNotebook({ track, mistakes }: { track: string; mistakes: Mistake[] }) {
  const [skill, setSkill] = useState<SkillFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [session, setSession] = useState<Mistake[] | null>(null);

  const bySkill = useMemo(
    () => mistakes.filter((m) => skill === "all" || m.skill === skill),
    [mistakes, skill],
  );
  const open = bySkill.filter((m) => !m.learned);
  const learned = bySkill.filter((m) => m.learned);
  const shown = status === "open" ? open : learned;

  if (session) return <RetrySession track={track} items={session} onDone={() => setSession(null)} />;

  if (!mistakes.length) {
    return (
      <section className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-lg font-bold">No mistakes yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Every reading or listening question you answer wrong in a saved test lands here, with its passage or clip,
          so you can retry it until it sticks.
        </p>
        <div className="mt-4 flex justify-center gap-3 text-sm font-semibold">
          <Link href={`/${track}/reading`} className="rounded-full bg-accent px-4 py-2 text-accent-ink">
            Take a reading test
          </Link>
          <Link href={`/${track}/listening`} className="rounded-full border border-border px-4 py-2">
            Take a listening test
          </Link>
        </div>
      </section>
    );
  }

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm ${active ? "bg-foreground text-background font-semibold" : "text-muted hover:text-foreground"}`;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div>
          <p className="text-3xl font-extrabold tabular-nums">{open.length}</p>
          <p className="text-sm text-muted">
            {open.length === 1 ? "mistake" : "mistakes"} to fix · {learned.length} learned
          </p>
        </div>
        <button
          type="button"
          disabled={!open.length}
          onClick={() => setSession(open.slice(0, SESSION_SIZE))}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          Retry {Math.min(SESSION_SIZE, open.length) || ""} {open.length === 1 ? "mistake" : "mistakes"}
        </button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border p-0.5" role="group" aria-label="Skill">
          {(["all", "reading", "listening"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={skill === s} onClick={() => setSkill(s)} className={chip(skill === s)}>
              {s === "all" ? "All" : s === "reading" ? "Reading" : "Listening"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full border border-border p-0.5" role="group" aria-label="Status">
          <button type="button" aria-pressed={status === "open"} onClick={() => setStatus("open")} className={chip(status === "open")}>
            To fix ({open.length})
          </button>
          <button type="button" aria-pressed={status === "learned"} onClick={() => setStatus("learned")} className={chip(status === "learned")}>
            Learned ({learned.length})
          </button>
        </div>
      </div>

      {shown.length ? (
        <ol className="flex flex-col gap-4">
          {shown.map((m) => (
            <li key={m.key} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Heading m={m} />
                {m.learned ? (
                  <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-xs font-semibold text-good">
                    {m.learnedBy === "retest" ? "Right in a later test" : "Learned in retries"}
                  </span>
                ) : m.retryStreak ? (
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                    1 more right retry to learn
                  </span>
                ) : null}
              </div>
              <Stem m={m} />
              <Options m={m} picked={m.chosen} reveal />
              <p className="rounded-xl bg-surface-subtle p-4 text-sm leading-relaxed">{m.question.explanation}</p>
              <Context m={m} open={false} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {status === "open" ? "Nothing left to fix here. Well done." : "Nothing learned yet. Retry your mistakes to move them here."}
        </p>
      )}
    </div>
  );
}
