import Link from "next/link";
import { Suspense } from "react";
import { GeneratedList } from "@/components/generate/GeneratedList";
import { AttemptHistory } from "@/components/practice/AttemptHistory";
import { getTrack, type Track } from "@/lib/exams";
import { writingSets } from "@/lib/writing/content";
import type { WritingSet } from "@/lib/writing/types";

const FORMAT_NOTES: Record<Track, string> = {
  en: "Each prompt is one task on its own timer, as in the real test: Task 1 emails get 27 minutes and Task 2 survey responses get 26. Aim for 150–200 words.",
  fr: "Each set has the three tasks on one shared 60-minute timer, as in the real test: a message (60–120 words), an article or letter (120–150), and a comparison of two viewpoints (120–180).",
};

function SetCard({ set, track }: { set: WritingSet; track: Track }) {
  return (
    <Link
      href={`/${track}/writing/${set.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
    >
      <h3 className="font-semibold tracking-tight">{set.title}</h3>
      <p className="text-sm text-muted">{set.summary}</p>
      <p className="mt-auto pt-2 text-xs text-muted">
        {set.tasks.length > 1 ? `${set.tasks.length} tasks · ` : ""}
        {set.minutes} min
      </p>
      <span className="text-sm font-medium text-accent">Start →</span>
    </Link>
  );
}

/** Groups CELPIP prompts by task type; TCF sets are already complete papers. */
function groups(track: Track): { title: string; sets: WritingSet[] }[] {
  const sets = writingSets(track);
  if (track === "fr") return [{ title: "Full Expression écrite papers", sets }];
  return [
    { title: "Task 1: Writing an email", sets: sets.filter((s) => s.tasks[0].kind === "celpip-email") },
    { title: "Task 2: Responding to survey questions", sets: sets.filter((s) => s.tasks[0].kind === "celpip-survey") },
  ];
}

export function WritingIndex({ track }: { track: Track }) {
  const { exam, skills } = getTrack(track);
  const info = skills.find((s) => s.id === "writing")!;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-xs font-medium text-muted">
          {exam} · {info.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Writing practice</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {FORMAT_NOTES[track]} Target:{" "}
          <span className="font-medium text-foreground">{info.target}</span>
          {info.targetNote ? ` (${info.targetNote})` : ""}.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-muted">
          An AI model grades each attempt strictly on the official rubric dimensions and returns a
          corrected version{track === "fr" ? " in French, with feedback in English" : ""}. Scores are
          practice estimates, not official results.
        </p>
      </section>

      {groups(track).map((g) => (
        <section key={g.title} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{g.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.sets.map((set) => (
              <SetCard key={set.id} set={set} track={track} />
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">AI-generated sets</h2>
          <Link href={`/${track}/generate`} className="text-sm font-medium text-accent">
            Generate a new one →
          </Link>
        </div>
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <GeneratedList track={track} skill="writing" empty="None yet." />
        </Suspense>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Your writing history</h2>
        <Suspense fallback={<p className="text-sm text-muted">Loading your attempts…</p>}>
          <AttemptHistory track={track} skill="writing" />
        </Suspense>
      </section>
    </div>
  );
}
