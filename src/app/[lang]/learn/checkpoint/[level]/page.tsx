import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckpointRunner } from "@/components/course/CheckpointRunner";
import { CHECKPOINT_MIN, PASS_RATE, checkpointExercises, checkpointStatus, isCourseLevel } from "@/lib/course/checkpoints";
import { COURSE_LEVELS, type CourseLevel } from "@/lib/course/syllabus";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  // Cache Components needs at least one entry per track; on English it renders a 404.
  return (lang === "fr" ? COURSE_LEVELS : COURSE_LEVELS.slice(0, 1)).map((level) => ({ level }));
}

async function Checkpoint({ level }: { level: CourseLevel }) {
  const [{ exercises, lessonsReady, lessonsTotal }, status] = await Promise.all([checkpointExercises(level), checkpointStatus()]);
  const mine = status[level];
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        {mine ? (mine.passed ? `Passed (best ${mine.best}%). ` : `Best so far: ${mine.best}%. `) : ""}
        Questions come from the {lessonsReady} of {lessonsTotal} {level} lessons you&apos;ve opened.
      </p>
      {exercises.length >= CHECKPOINT_MIN ? (
        <CheckpointRunner level={level} exercises={exercises} passPercent={Math.round(PASS_RATE * 100)} />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-5 text-sm">
          Open a few more {level} lessons first: the checkpoint needs at least {CHECKPOINT_MIN} exercises and there are{" "}
          {exercises.length} so far.{" "}
          <Link href="/fr/learn" className="font-medium text-accent">
            Back to the units
          </Link>
        </p>
      )}
    </div>
  );
}

export default async function CheckpointPage({ params }: PageProps<"/[lang]/learn/checkpoint/[level]">) {
  const { lang, level } = await params;
  if (lang !== "fr" || !isCourseLevel(level)) notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        · {level} checkpoint
      </p>
      <header className="max-w-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{level} checkpoint</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Up to 20 questions mixed from this level&apos;s lessons. {Math.round(PASS_RATE * 100)}% marks the level as done. No AI
          request; the questions change each time.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Checkpoint level={level} />
      </Suspense>
    </div>
  );
}
