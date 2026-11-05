"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ListeningClip,
  Transcript,
  type ClipStatus,
} from "@/components/practice/ListeningClip";
import { PassageView } from "@/components/practice/PassageView";
import { localeFor } from "@/lib/practice/speech";
import { formatClock, optionsFor } from "@/lib/practice/numbering";
import type {
  Clip,
  ClientTestSet,
  ClientSection,
  Speaker,
  TestResult,
} from "@/lib/practice/types";

/** Replayable clip plus its transcript, both only available in the review. */
function AudioReview({
  clip,
  speakers,
  exam,
}: {
  clip: Clip;
  speakers: Record<string, Speaker>;
  exam: ClientTestSet["exam"];
}) {
  const [status, setStatus] = useState<ClipStatus>("idle");
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm text-accent">
        Listen again and read the transcript
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <ListeningClip
          clip={clip}
          speakers={speakers}
          locale={localeFor(exam)}
          status={status}
          onStatusChange={setStatus}
          replayable
        />
        <Transcript clip={clip} speakers={speakers} />
      </div>
    </details>
  );
}

function LevelSummary({
  result,
  durationSeconds,
}: {
  result: TestResult;
  durationSeconds: number;
}) {
  const scoreLabel =
    result.maxScore === result.total
      ? `${result.correct} / ${result.total} correct`
      : `${result.score} / ${result.maxScore} · ${result.correct} of ${result.total} correct`;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <p className="text-xs font-medium text-muted">
        Estimated level
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="text-4xl font-semibold tracking-tight text-accent">
          {result.level}
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            result.meetsTarget ? "bg-good/15 text-good" : "bg-warn/15 text-warn"
          }`}
        >
          {result.meetsTarget
            ? `Meets your ${result.target} target`
            : `Target: ${result.target}`}
        </span>
      </div>
      <p className="mt-3 text-sm">
        {scoreLabel} <span className="text-muted">· time {formatClock(durationSeconds)}</span>
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {result.breakdown.map((row) => (
          <li key={row.label} className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-3">
              <span>{row.label}</span>
              <span className="font-mono text-muted">
                {row.correct}/{row.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(row.correct / row.total) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs leading-relaxed text-muted">
        This is a practice estimate from an approximate score-to-level table, not
        an official CELPIP or TCF result. Saved to your history.
      </p>
    </section>
  );
}

function SectionReview({
  set,
  section,
  numbers,
  result,
  mistakesOnly,
}: {
  set: ClientTestSet;
  section: ClientSection;
  numbers: Record<string, number>;
  result: TestResult;
  mistakesOnly: boolean;
}) {
  const questions = section.questions.filter((q) => {
    const r = result.review[q.id];
    return !mistakesOnly || r.chosen !== r.answer;
  });
  if (!questions.length) return null;

  const renderBlank = (id: string) => {
    const r = result.review[id];
    const right = r.chosen === r.answer;
    return (
      <span
        className={`mx-0.5 rounded px-1 font-medium ${
          right ? "bg-good/15 text-good" : "bg-warn/15 text-warn"
        }`}
      >
        ({numbers[id]}) {optionsFor(section, id)[r.answer]}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {section.audio ? (
        <AudioReview clip={section.audio} speakers={set.speakers ?? {}} exam={set.exam} />
      ) : null}
      {section.passage ? (
        <details className="group">
          <summary className="cursor-pointer text-sm text-accent">
            Show the passage
          </summary>
          <div className="mt-3">
            <PassageView passage={section.passage} renderBlank={renderBlank} />
          </div>
        </details>
      ) : null}

      <ol className="flex flex-col gap-3">
        {questions.map((q) => {
          const r = result.review[q.id];
          const options = optionsFor(section, q.id);
          const right = r.chosen === r.answer;
          return (
            <li
              key={q.id}
              className={`rounded-xl border-l-4 bg-surface p-4 ${
                right ? "border-good" : "border-warn"
              }`}
            >
              <p className="flex gap-2 text-[15px] font-medium leading-snug">
                <span className="font-mono text-muted">{numbers[q.id]}.</span>
                <span>{q.stem ?? `Blank ${numbers[q.id]}`}</span>
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted">Your answer</dt>
                <dd className={right ? "text-good" : "text-warn"}>
                  {r.chosen === null ? "No answer" : options[r.chosen]}
                  {right ? " ✓" : " ✗"}
                </dd>
                {right ? null : (
                  <>
                    <dt className="text-muted">Correct</dt>
                    <dd className="text-good">{options[r.answer]}</dd>
                  </>
                )}
              </dl>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {r.explanation}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Level, per-part breakdown, then every question with the explanation. */
export function TestResults({
  set,
  track,
  numbers,
  result,
  durationSeconds,
  onRetake,
}: {
  set: ClientTestSet;
  track: string;
  numbers: Record<string, number>;
  result: TestResult;
  durationSeconds: number;
  onRetake: () => void;
}) {
  const [mistakesOnly, setMistakesOnly] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <LevelSummary result={result} durationSeconds={durationSeconds} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetake}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Take this set again
        </button>
        <Link
          href={`/${track}/${set.skill}`}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
        >
          All {set.skill} sets
        </Link>
      </div>

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Review</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mistakesOnly}
              onChange={(e) => setMistakesOnly(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Mistakes only
          </label>
        </div>

        {set.parts.map((part) => (
          <div key={part.id} className="flex flex-col gap-4">
            {set.parts.length > 1 ? (
              <h3 className="text-sm font-semibold">{part.title}</h3>
            ) : null}
            {part.sections.map((section) => (
              <SectionReview
                key={section.id}
                set={set}
                section={section}
                numbers={numbers}
                result={result}
                mistakesOnly={mistakesOnly}
              />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
