"use client";

import { PassageView } from "@/components/reading/PassageView";
import { LETTERS, blankIds, optionsFor } from "@/lib/reading/numbering";
import type { Answers, ClientSection } from "@/lib/reading/types";

/** One test screen: the passage (with dropdown blanks) and the listed questions. */
export function SectionView({
  section,
  numbers,
  answers,
  onAnswer,
}: {
  section: ClientSection;
  numbers: Record<string, number>;
  answers: Answers;
  onAnswer: (questionId: string, option: number) => void;
}) {
  const blanks = blankIds(section);
  const listed = section.questions.filter((q) => !blanks.has(q.id));

  const renderBlank = (id: string) => {
    const options = optionsFor(section, id);
    const value = answers[id];
    return (
      <span className="mx-0.5 inline-flex max-w-full items-baseline gap-1 align-baseline">
        <span className="font-mono text-xs text-muted">({numbers[id]})</span>
        <select
          aria-label={`Blank ${numbers[id]}`}
          value={value ?? ""}
          onChange={(e) => onAnswer(id, Number(e.target.value))}
          className={`max-w-full rounded-md border px-1.5 py-0.5 text-sm ${
            value === undefined
              ? "border-accent bg-accent-soft"
              : "border-border bg-surface"
          }`}
        >
          <option value="" disabled>
            Select…
          </option>
          {options.map((opt, i) => (
            <option key={i} value={i}>
              {opt}
            </option>
          ))}
        </select>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {section.instructions ? (
        <p className="text-sm text-muted">{section.instructions}</p>
      ) : null}

      <div
        className={
          listed.length && section.passage
            ? "grid items-start gap-4 lg:grid-cols-2"
            : "flex flex-col gap-4"
        }
      >
        {section.passage ? (
          <div className="lg:sticky lg:top-32">
            <PassageView passage={section.passage} renderBlank={renderBlank} />
          </div>
        ) : null}

        {listed.length ? (
          <ol className="flex flex-col gap-4">
            {listed.map((q) => {
              const shared = !q.options;
              return (
                <li
                  key={q.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <fieldset>
                    <legend className="mb-3 flex gap-2 text-[15px] font-medium leading-snug">
                      <span className="font-mono text-muted">{numbers[q.id]}.</span>
                      <span>{q.stem}</span>
                    </legend>
                    <div className="flex flex-col gap-1.5">
                      {optionsFor(section, q.id).map((opt, i) => {
                        const checked = answers[q.id] === i;
                        return (
                          <label
                            key={i}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                              checked
                                ? "border-accent bg-accent-soft"
                                : "border-border hover:bg-surface-subtle"
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={checked}
                              onChange={() => onAnswer(q.id, i)}
                              className="mt-0.5 accent-[var(--accent)]"
                            />
                            {shared ? null : (
                              <span className="font-mono text-muted">{LETTERS[i]}</span>
                            )}
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
