"use client";

import { WordCount } from "@/components/writing/WordCount";
import type { WritingTask } from "@/lib/writing/types";
import { countWords } from "@/lib/writing/words";

/**
 * Plain textarea with a live word count. Spell check and autocorrect are off,
 * because neither exam offers them.
 */
export function WritingEditor({
  task,
  value,
  onChange,
  readOnly,
}: {
  task: WritingTask;
  value: string;
  onChange: (value: string) => void;
  /** Shown but not editable (submitted or time is up); still selectable for copying. */
  readOnly?: boolean;
}) {
  const isFrench = task.kind.startsWith("tcf");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`editor-${task.id}`} className="sr-only">
        Your answer to {task.label}
      </label>
      <textarea
        id={`editor-${task.id}`}
        lang={isFrench ? "fr" : "en"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        autoCorrect="off"
        autoComplete="off"
        rows={16}
        placeholder={isFrench ? "Écrivez votre texte ici…" : "Type your response here…"}
        className="min-h-72 w-full resize-y rounded-lg border border-border bg-surface p-3 text-base leading-relaxed outline-none focus:border-accent read-only:bg-surface-subtle"
      />
      <WordCount count={countWords(value)} min={task.minWords} max={task.maxWords} />
    </div>
  );
}
