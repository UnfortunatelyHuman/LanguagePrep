"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewCardAction } from "@/lib/course/actions";
import type { QueueCard } from "@/lib/course/cards";
import { checkTyped, type Verdict } from "@/lib/course/check";
import { BLANK } from "@/lib/course/schemas";
import { GRADES, intervalLabel, review, type Grade } from "@/lib/course/srs";
import { stopSpeaking } from "@/lib/course/useSpeak";
import { SpeakButton } from "./SpeakButton";

const GRADE_STYLE: Record<Grade, string> = {
  again: "border-warn/60 text-warn",
  hard: "border-border",
  good: "border-good/60 text-good",
  easy: "border-accent/60 text-accent",
};
const SOURCE_LABEL: Record<string, string> = {
  lesson: "Lesson",
  notes: "My notes",
  chat: "Conversation",
  "phrase-bank": "Phrase bank",
  "saved-phrase": "Saved phrase",
};

/** Grammar cards: type the missing word(s), then grade. */
function GrammarFront({ card, onChecked }: { card: QueueCard; onChecked: (v: Verdict) => void }) {
  const [value, setValue] = useState("");
  const [before, after] = card.front.split(BLANK);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onChecked(checkTyped(value, [card.back]));
      }}
      className="flex flex-col gap-3"
    >
      <p lang="fr" className="flex flex-wrap items-center gap-2 text-xl font-medium">
        <span>{before}</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          lang="fr"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Missing word(s)"
          className="w-36 rounded-lg border border-border bg-surface px-3 py-1.5 outline-none focus:border-accent"
        />
        <span>{after}</span>
      </p>
      <button type="submit" className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
        Check
      </button>
    </form>
  );
}

/**
 * Today's cards. Vocabulary: recall the meaning, reveal, grade yourself.
 * Grammar: type the blank. "Again" sends a card to the end of today's session.
 */
export function ReviewSession({ initial, today }: { initial: QueueCard[]; today: string }) {
  const router = useRouter();
  const [queue, setQueue] = useState(initial);
  const [revealed, setRevealed] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const card = queue[0];

  if (!card) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-lg font-semibold">{done ? "All done for today." : "Nothing to review right now."}</p>
        <p className="text-sm text-muted">
          {done
            ? `${done} review${done === 1 ? "" : "s"} saved. Come back tomorrow for the next ones.`
            : "Finish a lesson, import your notes or save phrases to fill your review queue."}
        </p>
      </div>
    );
  }

  const grade = async (g: Grade) => {
    setSaving(true);
    setError(null);
    const result = await reviewCardAction(card.id, g).catch(() => null);
    setSaving(false);
    if (!result?.ok) {
      setError(result && !result.ok ? result.error : "Couldn't reach the server.");
      return;
    }
    stopSpeaking();
    const next = review(card, g, today);
    setQueue((q) => {
      const rest = q.slice(1);
      return g === "again" ? [...rest, { ...card, ...next, isNew: false }] : rest;
    });
    setRevealed(false);
    setVerdict(null);
    setDone((d) => d + 1);
    if (queue.length === 1 && g !== "again") router.refresh();
  };

  const grammar = card.kind === "grammar";
  const showBack = grammar ? verdict !== null : revealed;
  const suggested: Grade | null = grammar && verdict ? (verdict === "wrong" ? "again" : "good") : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {card.isNew ? "New" : "Review"} · {SOURCE_LABEL[card.source] ?? card.source}
        </span>
        <span>{queue.length} left</span>
      </div>
      <div key={`${card.id}-${done}`} className="flex min-h-56 flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        {grammar ? (
          verdict === null ? (
            <GrammarFront card={card} onChecked={setVerdict} />
          ) : (
            <p lang="fr" className="text-xl font-medium">
              {card.front.replace(BLANK, card.back)}
            </p>
          )
        ) : (
          <div className="flex items-center gap-3">
            <SpeakButton id={`card-${card.id}`} text={card.front} />
            <p lang="fr" className="text-2xl font-semibold">
              {card.front}
            </p>
          </div>
        )}
        {showBack ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {grammar ? (
              <p className={`text-sm font-semibold ${verdict === "wrong" ? "text-warn" : "text-good"}`}>
                {verdict === "correct" ? "Right!" : verdict === "accents" ? "Right, check the accents." : `Answer: ${card.back}`}
              </p>
            ) : (
              <p className="text-lg">{card.back}</p>
            )}
            {card.example ? (
              <p lang={grammar ? undefined : "fr"} className="flex items-start gap-2 text-sm text-muted">
                {grammar ? null : <SpeakButton id={`card-ex-${card.id}`} text={card.example} label="Listen to the example" />}
                <span>{card.example}</span>
              </p>
            ) : null}
          </div>
        ) : !grammar ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-auto self-start rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
          >
            Show the meaning
          </button>
        ) : null}
      </div>
      {showBack ? (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="How well did you know it?">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              disabled={saving}
              onClick={() => grade(g)}
              className={`flex flex-col items-center rounded-lg border px-2 py-2 text-sm capitalize disabled:opacity-50 ${GRADE_STYLE[g]} ${
                suggested === g ? "ring-2 ring-accent/50" : ""
              }`}
            >
              <span className="font-semibold">{g}</span>
              <span className="text-xs text-muted">{intervalLabel(review(card, g, today).intervalDays)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      ) : null}
    </div>
  );
}
