import type { Diagram } from "@/lib/practice/types";

/** The CELPIP Part 2 diagram. Scrolls sideways inside its box on narrow screens. */
export function DiagramTable({ diagram }: { diagram: Diagram }) {
  return (
    <figure className="flex flex-col gap-2">
      {diagram.caption ? (
        <figcaption className="text-sm font-semibold">{diagram.caption}</figcaption>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-surface-subtle">
            <tr>
              {diagram.columns.map((col) => (
                <th key={col} scope="col" className="px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {diagram.rows.map((row) => (
              <tr key={row[0]} className="border-t border-border align-top">
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-2 font-medium">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="px-3 py-2">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {diagram.notes?.length ? (
        <ul className="list-disc pl-5 text-xs leading-relaxed text-muted">
          {diagram.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
