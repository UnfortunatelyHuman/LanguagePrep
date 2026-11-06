import type { Lesson } from "@/lib/course/schemas";
import { SpeakButton } from "./SpeakButton";

/** The teaching part: intro, points with French examples, pitfalls. */
export function LessonExplanation({ lesson }: { lesson: Lesson }) {
  const { explanation } = lesson;
  return (
    <div className="flex flex-col gap-5">
      <p className="leading-relaxed">{explanation.intro}</p>
      {explanation.points.map((point, i) => (
        <section key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <h3 className="font-semibold">{point.heading}</h3>
          <p className="text-sm leading-relaxed">{point.text}</p>
          <ul className="flex flex-col gap-2">
            {point.examples.map((ex, j) => (
              <li key={j} className="flex items-start gap-2 text-sm">
                <SpeakButton id={`ex-${i}-${j}`} text={ex.fr} />
                <span>
                  <span lang="fr" className="block font-medium">
                    {ex.fr}
                  </span>
                  <span className="block text-muted">{ex.en}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="rounded-xl border border-dashed border-warn/50 p-4">
        <h3 className="text-sm font-semibold">Watch out</h3>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed">
          {explanation.pitfalls.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
