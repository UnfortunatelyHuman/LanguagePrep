import type { Lesson } from "@/lib/course/schemas";
import { SpeakButton } from "./SpeakButton";

/** The lesson's words, each with audio for the word and its example. */
export function VocabList({ vocabulary }: { vocabulary: Lesson["vocabulary"] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {vocabulary.map((item, i) => (
        <li key={item.fr} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <SpeakButton id={`word-${i}`} text={item.fr} />
            <span lang="fr" className="font-semibold">
              {item.fr}
            </span>
            <span className="text-sm text-muted">· {item.en}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <SpeakButton id={`word-ex-${i}`} text={item.exampleFr} label="Listen to the example" />
            <span>
              <span lang="fr" className="block">
                {item.exampleFr}
              </span>
              <span className="block text-muted">{item.exampleEn}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
