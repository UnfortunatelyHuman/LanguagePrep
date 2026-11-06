"use client";

import { useState } from "react";
import { addNoteCardsAction } from "@/lib/course/actions";
import type { NoteCard } from "@/lib/course/notes";

/** The proposed cards, each ticked by default; untick any, then add them to the daily review. */
export function NoteCardsPreview({ noteId, cards, added }: { noteId: string; cards: NoteCard[]; added: boolean }) {
  const [keep, setKeep] = useState<Set<number>>(() => new Set(cards.map((_, i) => i)));
  const [state, setState] = useState<{ done: boolean; message: string | null }>({ done: added, message: null });
  const [pending, setPending] = useState(false);

  const toggle = (i: number) =>
    setKeep((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {cards.map((card, i) => (
          <li key={i}>
            <label
              className={`flex h-full gap-3 rounded-xl border p-3 text-sm ${
                keep.has(i) || state.done ? "border-border bg-surface" : "border-dashed border-border opacity-60"
              }`}
            >
              {state.done ? null : (
                <input type="checkbox" checked={keep.has(i)} onChange={() => toggle(i)} className="mt-1" />
              )}
              <span className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">{card.kind === "grammar" ? "Grammar" : "Word"}</span>
                <span lang="fr" className="font-semibold">
                  {card.front}
                </span>
                <span>{card.back}</span>
                {card.example ? (
                  <span lang={card.kind === "vocab" ? "fr" : undefined} className="text-muted">
                    {card.example}
                  </span>
                ) : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {state.done ? (
        <p className="text-sm text-good">{state.message ?? "These cards are in your daily review."}</p>
      ) : (
        <button
          type="button"
          disabled={pending || keep.size === 0}
          onClick={async () => {
            setPending(true);
            const result = await addNoteCardsAction(noteId, [...keep]).catch(() => null);
            setPending(false);
            if (result?.ok) setState({ done: true, message: `${result.added} cards added to your daily review.` });
            else setState({ done: false, message: result && !result.ok ? result.error : "Couldn't reach the server." });
          }}
          className="self-start rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Add {keep.size} card{keep.size === 1 ? "" : "s"} to my daily review
        </button>
      )}
      {!state.done && state.message ? (
        <p role="alert" className="text-sm text-warn">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
