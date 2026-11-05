import { diffWords } from "@/lib/writing/diff";

/** The writer's text turned into the corrected one: removed words struck through, added words highlighted. */
export function CorrectionDiff({
  original,
  corrected,
  lang,
}: {
  original: string;
  corrected: string;
  lang: "en" | "fr";
}) {
  const parts = diffWords(original, corrected);
  return (
    <p lang={lang} className="whitespace-pre-wrap text-sm leading-7">
      {parts.map((p, i) =>
        p.type === "same" ? (
          <span key={i}>{p.text}</span>
        ) : p.type === "del" ? (
          <del key={i} className="rounded bg-warn/10 text-warn decoration-warn/70">
            {p.text}
          </del>
        ) : (
          <ins key={i} className="rounded bg-good/15 text-good no-underline">
            {p.text}
          </ins>
        ),
      )}
    </p>
  );
}

export function DiffLegend() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span>
        <del className="rounded bg-warn/10 px-1 text-warn">removed</del>
      </span>
      <span>
        <ins className="rounded bg-good/15 px-1 text-good no-underline">added</ins>
      </span>
    </p>
  );
}
