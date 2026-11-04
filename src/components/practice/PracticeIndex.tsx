import Link from "next/link";
import { Suspense } from "react";
import { AttemptHistory } from "@/components/practice/AttemptHistory";
import { getTrack, type Track } from "@/lib/exams";
import { questionCount, testSets, totalMinutes } from "@/lib/practice/content";
import type { PracticeSkill } from "@/lib/practice/types";

const TITLES: Record<PracticeSkill, string> = {
  reading: "Reading practice",
  listening: "Listening practice",
};

/** How each exam's format is mirrored, per skill, shown under the heading. */
const FORMAT_NOTES: Record<Track, Record<PracticeSkill, string>> = {
  en: {
    reading:
      "The four parts are timed separately (11, 9, 10 and 13 minutes); the real test's 55–60 minutes also covers a practice task and instructions.",
    listening:
      "Six scored parts with the real question counts (8, 5, 6, 5, 8, 6). Each clip plays once and the questions appear after it, as in the real test. The real test also opens with an unscored practice task, left out here.",
  },
  fr: {
    reading:
      "Each question is worth more as the level rises, and the total is reported on the 100–699 scale.",
    listening:
      "Each recording plays once. Questions get harder (and are worth more) from A1 to C2, and the total is reported on the 100–699 scale.",
  },
};

/** List of sets for one skill, plus the history of attempts at it. */
export function PracticeIndex({ track, skill }: { track: Track; skill: PracticeSkill }) {
  const { exam, skills } = getTrack(track);
  const info = skills.find((s) => s.id === skill)!;
  const sets = testSets(track, skill);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {exam} · {info.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{TITLES[skill]}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {info.structure}. Target:{" "}
          <span className="font-medium text-foreground">{info.target}</span>
          {info.targetNote ? ` (${info.targetNote})` : ""}. {FORMAT_NOTES[track][skill]}
        </p>
        {skill === "listening" ? (
          <p className="mt-2 max-w-2xl text-xs text-muted">
            Audio is read aloud by your browser&apos;s voices, so use Chrome or Edge with
            the sound on.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {sets.map((set) => (
          <Link
            key={set.id}
            href={`/${track}/${skill}/${set.id}`}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <h2 className="font-semibold tracking-tight">{set.title}</h2>
            <p className="text-sm text-muted">{set.summary}</p>
            <p className="mt-auto pt-2 text-xs text-muted">
              {questionCount(set)} questions · {totalMinutes(set)} min
              {set.parts.length > 1 ? ` · ${set.parts.length} parts` : ""}
            </p>
            <span className="text-sm font-medium text-accent">Start →</span>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Your {skill} history</h2>
        <Suspense fallback={<p className="text-sm text-muted">Loading your attempts…</p>}>
          <AttemptHistory track={track} skill={skill} />
        </Suspense>
      </section>
    </div>
  );
}
