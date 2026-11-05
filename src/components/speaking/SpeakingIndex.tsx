import Link from "next/link";
import { Suspense } from "react";
import { GeneratedList } from "@/components/generate/GeneratedList";
import { AttemptHistory } from "@/components/practice/AttemptHistory";
import { getTrack, type Track } from "@/lib/exams";
import { speakingSeconds, speakingSets } from "@/lib/speaking/content";

const FORMAT_NOTES: Record<Track, string> = {
  en: "Each test has the 8 CELPIP tasks in order, each with its real preparation and speaking times. You can also practise one task at a time.",
  fr: "Each set has the 3 TCF tasks with their real timings: an interview (2 min), a role-play where you ask the questions (2 min prep, 3 min 30), and an opinion (4 min 30).",
};

export function SpeakingIndex({ track }: { track: Track }) {
  const { exam, skills } = getTrack(track);
  const info = skills.find((s) => s.id === "speaking")!;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {exam} · {info.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Speaking practice</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {FORMAT_NOTES[track]} Target: <span className="font-medium text-foreground">{info.target}</span>
          {info.targetNote ? ` (${info.targetNote})` : ""}.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-muted">
          Needs Chrome or Edge, a microphone and an internet connection (for transcription). An AI model
          grades the transcript strictly on fluency, vocabulary, grammar and task completion; the scores
          are practice estimates, not official results.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {speakingSets(track).map((set) => (
          <Link
            key={set.id}
            href={`/${track}/speaking/${set.id}`}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <h2 className="font-semibold tracking-tight">{set.title}</h2>
            <p className="text-sm text-muted">{set.summary}</p>
            <p className="mt-auto pt-2 text-xs text-muted">
              {set.tasks.length} tasks · about {Math.ceil(speakingSeconds(set) / 60)} min
            </p>
            <span className="text-sm font-medium text-accent">Start →</span>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">AI-generated sets</h2>
          <Link href={`/${track}/generate`} className="text-sm font-medium text-accent">
            Generate a new one →
          </Link>
        </div>
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <GeneratedList track={track} skill="speaking" empty="None yet." />
        </Suspense>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Your speaking history</h2>
        <Suspense fallback={<p className="text-sm text-muted">Loading your attempts…</p>}>
          <AttemptHistory track={track} skill="speaking" />
        </Suspense>
      </section>
    </div>
  );
}
