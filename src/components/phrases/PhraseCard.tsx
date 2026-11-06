import type { Phrase, Register } from "@/lib/phrases";

const REGISTER_STYLE: Record<Register, string> = {
  formal: "bg-accent-soft text-accent",
  neutral: "bg-surface-subtle text-muted",
  informal: "bg-good/15 text-good",
};

export function RegisterBadge({ register }: { register: Register }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REGISTER_STYLE[register]}`}>
      {register}
    </span>
  );
}

/** One phrase: the expression, when to use it, and an example sentence. */
export function PhraseCard({
  phrase,
  lang,
  known,
  onRemove,
  review,
}: {
  phrase: Phrase;
  lang: "en" | "fr";
  /** undefined = never self-tested. */
  known: boolean | undefined;
  /** Saved phrases only: remove from the bank. */
  onRemove?: () => void;
  /** French track: the phrase's place in the course's daily review. */
  review?: { inReview: boolean; onAdd?: () => void };
}) {
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p lang={lang} className="font-semibold">
          {phrase.phrase}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {known !== undefined ? (
            <span className={`text-xs font-medium ${known ? "text-good" : "text-warn"}`}>
              {known ? "✓ known" : "• learning"}
            </span>
          ) : null}
          {phrase.saved ? (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">saved</span>
          ) : (
            <RegisterBadge register={phrase.register} />
          )}
        </div>
      </div>
      {phrase.saved ? (
        <>
          {/* "Instead of …" quotes the learner's own words, in the exam language. */}
          <p lang={lang} className="text-sm text-muted">
            {phrase.meaning}
          </p>
          <p className="text-sm">{phrase.example}</p>
          {onRemove ? (
            <button type="button" onClick={onRemove} className="self-start text-xs text-muted hover:text-warn">
              Remove
            </button>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">{phrase.meaning}</p>
          <p lang={lang} className="text-sm italic">
            {phrase.example}
          </p>
        </>
      )}
      {review ? (
        review.inReview ? (
          <span className="self-start text-xs text-good">✓ In your daily review</span>
        ) : review.onAdd ? (
          <button type="button" onClick={review.onAdd} className="self-start text-xs font-medium text-accent hover:underline">
            + Add to daily review
          </button>
        ) : null
      ) : null}
    </li>
  );
}
