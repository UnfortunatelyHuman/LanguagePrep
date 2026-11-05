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
}: {
  phrase: Phrase;
  lang: "en" | "fr";
  /** undefined = never self-tested. */
  known: boolean | undefined;
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
          <RegisterBadge register={phrase.register} />
        </div>
      </div>
      <p className="text-sm text-muted">{phrase.meaning}</p>
      <p lang={lang} className="text-sm italic">
        {phrase.example}
      </p>
    </li>
  );
}
