import type { WritingTask } from "@/lib/writing/types";

/** The task as the candidate sees it: situation, instructions and any extras. */
export function WritingPrompt({ task }: { task: WritingTask }) {
  const isFrench = task.kind.startsWith("tcf");
  return (
    <section lang={isFrench ? "fr" : "en"} className="flex flex-col gap-3 text-sm leading-relaxed">
      <h2 className="text-base font-semibold tracking-tight">{task.label}</h2>
      <p>{task.scenario}</p>
      <p className="font-medium">{task.instructions}</p>

      {task.bullets ? (
        <ul className="list-disc space-y-1 pl-5">
          {task.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}

      {task.options ? (
        <div className="flex flex-col gap-2">
          {task.options.map((o) => (
            <div key={o.id} className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
              <span className="font-semibold">Option {o.id}: </span>
              {o.text}
            </div>
          ))}
        </div>
      ) : null}

      {task.documents ? (
        <div className="flex flex-col gap-2">
          {task.documents.map((d) => (
            <figure key={d.title} className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
              <figcaption className="text-xs font-semibold uppercase tracking-wider text-muted">
                {d.title}
              </figcaption>
              <p className="mt-1">{d.text}</p>
            </figure>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted">
        {isFrench
          ? `Entre ${task.minWords} et ${task.maxWords} mots.`
          : `Write about ${task.minWords}–${task.maxWords} words.`}
      </p>
    </section>
  );
}
