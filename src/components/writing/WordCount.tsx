import { wordStatus, type WordStatus } from "@/lib/writing/words";

const STYLE: Record<WordStatus, string> = {
  empty: "text-muted",
  under: "text-warn",
  ok: "text-good",
  over: "text-warn",
};

const NOTE: Record<WordStatus, string> = {
  empty: "",
  under: "below the range",
  ok: "in range",
  over: "over the range",
};

/** "152 words · 150–200", coloured by whether it's in range. */
export function WordCount({ count, min, max }: { count: number; min: number; max: number }) {
  const status = wordStatus(count, min, max);
  return (
    <p aria-live="polite" className={`text-sm tabular-nums ${STYLE[status]}`}>
      <span className="font-semibold">{count}</span> {count === 1 ? "word" : "words"}
      <span className="text-muted">
        {" "}
        · target {min}–{max}
        {NOTE[status] ? ` · ${NOTE[status]}` : ""}
      </span>
    </p>
  );
}
