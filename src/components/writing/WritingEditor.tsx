"use client";

import { useRef } from "react";
import { WordCount } from "@/components/writing/WordCount";
import type { WritingTask } from "@/lib/writing/types";
import { countWords } from "@/lib/writing/words";

/** The characters the TCF's own on-screen accent bar offers, plus French quotes. */
const FRENCH_CHARS = ["é", "è", "ê", "ë", "à", "â", "ç", "î", "ï", "ô", "û", "ù", "ü", "œ", "æ", "« ", " »", "’"];
const FRENCH_UPPER = ["É", "È", "Ê", "À", "Â", "Ç", "Î", "Ô", "Û", "Œ"];

/**
 * Plain textarea with a live word count. Spell check and autocorrect are off,
 * because neither exam offers them. French tasks get an accent bar, like the
 * one on the TCF's computer test, so a non-French keyboard isn't a handicap.
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
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(chars: string) {
    const el = ref.current;
    if (!el || readOnly) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + chars + value.slice(end));
    const caret = start + chars.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  const key = (c: string) => (
    <button
      key={c}
      type="button"
      // Keep focus (and the caret) in the textarea.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => insert(c)}
      disabled={readOnly}
      aria-label={`Insert ${c.trim()}`}
      className="min-w-8 rounded-md border border-border bg-surface px-1.5 py-1 text-base leading-none hover:border-accent hover:text-accent disabled:opacity-40"
    >
      {c.trim()}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`editor-${task.id}`} className="sr-only">
        Your answer to {task.label}
      </label>
      {isFrench ? (
        <div role="toolbar" aria-label="Accents" className="flex flex-col gap-1.5 rounded-lg bg-surface-subtle p-2">
          <div className="flex flex-wrap gap-1">{FRENCH_CHARS.map(key)}</div>
          <div className="flex flex-wrap gap-1">{FRENCH_UPPER.map(key)}</div>
        </div>
      ) : null}
      <textarea
        ref={ref}
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
      {isFrench && !readOnly ? (
        <p className="text-xs text-muted">
          Tip: on a Mac you can also hold a letter (e, a, c, o…) to pick its accent.
        </p>
      ) : null}
    </div>
  );
}
