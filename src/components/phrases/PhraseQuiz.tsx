"use client";

import { useEffect, useRef, useState } from "react";
import { RegisterBadge } from "@/components/phrases/PhraseCard";
import { recordPhraseReview } from "@/lib/phrase-actions";
import type { Phrase } from "@/lib/phrases";
import type { Track } from "@/lib/exams";

/** Fisher–Yates; only ever called from an event handler, never during render. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Unknown and never-reviewed phrases first, each group shuffled. */
export function buildDeck(phrases: Phrase[], known: Record<string, boolean>): Phrase[] {
  const fresh = phrases.filter((p) => known[p.key] !== true);
  const solid = phrases.filter((p) => known[p.key] === true);
  return [...shuffle(fresh), ...shuffle(solid)];
}

/**
 * Recall drill: shows when a phrase is used, the learner recalls it, reveals,
 * and grades themselves. Each answer is saved as it happens.
 */
export function PhraseQuiz({
  track,
  deck,
  lang,
  onAnswer,
  onExit,
}: {
  track: Track;
  deck: Phrase[];
  lang: "en" | "fr";
  /** Lets the bank update its "known" marks without waiting for a refresh. */
  onAnswer: (key: string, known: boolean) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ knew: 0, learning: 0 });
  const [saveFailed, setSaveFailed] = useState(false);
  const focusTarget = useRef<HTMLButtonElement>(null);

  // Move focus to the next action so the whole drill works from the keyboard.
  useEffect(() => {
    focusTarget.current?.focus();
  }, [index, revealed]);

  const done = index >= deck.length;
  const card = deck[index];

  async function answer(known: boolean) {
    onAnswer(card.key, known);
    setScore((s) => (known ? { ...s, knew: s.knew + 1 } : { ...s, learning: s.learning + 1 }));
    setRevealed(false);
    setIndex((i) => i + 1);
    const result = await recordPhraseReview({ track, key: card.key, known }).catch(() => ({ ok: false }));
    if (!result.ok) setSaveFailed(true);
  }

  if (done) {
    const total = score.knew + score.learning;
    return (
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold tracking-tight">Session complete</h2>
        <p className="text-sm">
          You knew <span className="font-semibold">{score.knew}</span> of {total} phrases
          {total ? ` (${Math.round((score.knew / total) * 100)}%)` : ""}.
          {score.learning ? " The ones you're still learning come first next time." : ""}
        </p>
        {saveFailed ? (
          <p role="alert" className="text-sm text-warn">
            Some answers couldn&apos;t be saved. Check that the app server is running.
          </p>
        ) : null}
        <button
          ref={focusTarget}
          type="button"
          onClick={onExit}
          className="self-start rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          Back to the phrase bank
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span aria-live="polite">
          Card {index + 1} of {deck.length}
        </span>
        <button type="button" onClick={onExit} className="text-accent">
          End session
        </button>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {card.saved ? "Say it better" : "Which phrase fits?"}
        </p>
        <p lang={card.saved ? lang : undefined} className="mt-1 text-base">
          {card.meaning}
        </p>
        {card.saved ? null : (
          <div className="mt-2">
            <RegisterBadge register={card.register} />
          </div>
        )}
      </div>

      {/* Announce only the revealed answer, not the whole card. */}
      <div aria-live="polite">
      {revealed ? (
        <div className="rounded-lg bg-surface-subtle p-3">
          <p lang={lang} className="font-semibold">
            {card.phrase}
          </p>
          <p lang={card.saved ? undefined : lang} className="mt-1 text-sm italic">
            {card.example}
          </p>
        </div>
      ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {revealed ? (
          <>
            <button
              ref={focusTarget}
              type="button"
              onClick={() => void answer(true)}
              className="rounded-lg border border-good/40 bg-good/15 px-3 py-1.5 text-sm font-medium text-good"
            >
              I knew it
            </button>
            <button
              type="button"
              onClick={() => void answer(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
            >
              Still learning
            </button>
          </>
        ) : (
          <button
            ref={focusTarget}
            type="button"
            onClick={() => setRevealed(true)}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Reveal
          </button>
        )}
      </div>
    </section>
  );
}
