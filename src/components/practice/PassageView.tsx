import type { ReactNode } from "react";
import { DiagramTable } from "@/components/practice/DiagramTable";
import { LETTERS, splitBlanks } from "@/lib/practice/numbering";
import type { Passage } from "@/lib/practice/types";

/**
 * A reading passage: optional diagram, header lines and paragraphs.
 * `renderBlank` draws each `[[id]]` blank — a dropdown during the test, the
 * answer during review.
 */
export function PassageView({
  passage,
  renderBlank,
}: {
  passage: Passage;
  renderBlank: (questionId: string) => ReactNode;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
      {passage.label ? (
        <p className="text-xs font-medium text-muted">
          {passage.label}
        </p>
      ) : null}

      {passage.diagram ? <DiagramTable diagram={passage.diagram} /> : null}

      {passage.heading ? (
        <h3 className="text-lg font-semibold tracking-tight">{passage.heading}</h3>
      ) : null}

      {passage.meta?.length ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border pb-3 text-sm">
          {passage.meta.map((line) => (
            <div key={line.label} className="contents">
              <dt className="text-muted">{line.label}:</dt>
              <dd className="min-w-0 break-words">{line.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
        {passage.paragraphs.map((paragraph, i) => (
          <p key={i} className={passage.lettered ? "flex gap-3" : undefined}>
            {passage.lettered ? (
              <span className="shrink-0 font-mono font-semibold text-accent">
                {LETTERS[i]}
              </span>
            ) : null}
            <span>
              {splitBlanks(paragraph).map((chunk, j) =>
                "blank" in chunk ? (
                  <span key={j}>{renderBlank(chunk.blank)}</span>
                ) : (
                  <span key={j}>{chunk.text}</span>
                ),
              )}
            </span>
          </p>
        ))}
      </div>
    </article>
  );
}
