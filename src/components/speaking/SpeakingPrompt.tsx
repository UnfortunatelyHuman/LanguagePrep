import type { Scene, SpeakingTask } from "@/lib/speaking/types";

/** Picture tasks: the scene drawn as labelled emoji, since we ship no photos. */
export function SceneCard({ scene }: { scene: Scene }) {
  return (
    <figure className="rounded-xl border border-border bg-surface-subtle p-4">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {scene.items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-2 text-sm">
            <span aria-hidden className="text-2xl leading-none">
              {item.emoji}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-sm text-muted">{scene.caption}</figcaption>
    </figure>
  );
}

/**
 * The task as the candidate sees it. For choice tasks, pass `onChoose` to make
 * the options selectable; `choice` highlights the selected one.
 */
export function SpeakingPrompt({
  task,
  choice,
  onChoose,
}: {
  task: SpeakingTask;
  choice?: "A" | "B";
  onChoose?: (choice: "A" | "B") => void;
}) {
  const lang = task.kind.startsWith("tcf") ? "fr" : "en";
  return (
    <section lang={lang} className="flex flex-col gap-3 text-sm leading-relaxed">
      <h2 className="text-base font-semibold tracking-tight">{task.label}</h2>
      {task.scene ? <SceneCard scene={task.scene} /> : null}
      <p className="font-medium">{task.prompt}</p>

      {task.points ? (
        <ul className="list-disc space-y-1 pl-5">
          {task.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}

      {task.options ? (
        <div className="grid gap-3 sm:grid-cols-2" role={onChoose ? "radiogroup" : undefined}>
          {task.options.map((o) => {
            const selected = choice === o.id;
            const body = (
              <>
                <p className="font-semibold">
                  Option {o.id}: {o.title}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                  {o.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            );
            const style = `rounded-lg border p-3 text-left ${
              selected ? "border-accent bg-accent-soft" : "border-border bg-surface"
            }`;
            return onChoose ? (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChoose(o.id)}
                className={`${style} transition-colors hover:border-accent`}
              >
                {body}
              </button>
            ) : (
              <div key={o.id} className={style}>
                {body}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
