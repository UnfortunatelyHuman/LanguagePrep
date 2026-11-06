import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LevelBars } from "@/components/course/LevelBars";
import { UnitList } from "@/components/course/UnitList";
import { courseProgress } from "@/lib/course/progress";
import { UNITS } from "@/lib/course/syllabus";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

const TOOLS = [
  { href: "/fr/learn/review", title: "Daily review", text: "Spaced repetition of your words, grammar and phrases." },
  { href: "/fr/learn/chat", title: "Conversation", text: "Role-play in French with gentle corrections." },
  { href: "/fr/learn/notes", title: "My notes", text: "Turn class notes into cards and exercises." },
  { href: "/fr/learn/placement", title: "Placement test", text: "Find your level per skill (about 10 minutes)." },
];

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

async function Dashboard() {
  const progress = await courseProgress();
  const { next } = progress;
  return (
    <>
      <section className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        {next ? (
          <>
            <div>
              <p className="text-xs font-medium text-muted">
                {progress.completed.size ? "Continue" : progress.startUnitId ? "Start here (from your placement)" : "Start here"}
              </p>
              <p className="mt-1 font-semibold">
                <span lang="fr">
                  {next.unit.level} · Unit {next.unit.number}: {next.unit.title}
                </span>
                <span className="font-normal text-muted"> · {next.label}</span>
              </p>
              {!progress.startUnitId ? (
                <p className="mt-1 text-sm text-muted">
                  Not a beginner?{" "}
                  <Link href="/fr/learn/placement" className="font-medium text-accent">
                    Take the placement test
                  </Link>{" "}
                  to start at your level.
                </p>
              ) : null}
            </div>
            <Link
              href={`/fr/learn/lessons/${next.lessonId}`}
              className="shrink-0 self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white sm:self-center"
            >
              {progress.completed.size ? "Continue →" : "Start →"}
            </Link>
          </>
        ) : (
          <p className="font-semibold">Every lesson is done. Keep your daily review going and take the checkpoints.</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Streak"
          value={`${progress.streak} day${progress.streak === 1 ? "" : "s"}`}
          note={progress.activeToday ? "Done today ✓" : progress.streak ? "Study today to keep it" : "Lessons, reviews or chats count"}
        />
        <Link href="/fr/learn/review" className="rounded-xl hover:ring-2 hover:ring-accent/40">
          <Stat label="Due for review" value={String(progress.due)} note={`${progress.cards} cards in all`} />
        </Link>
        <Stat label="Lessons done" value={`${progress.completed.size} / ${progress.lessonsTotal}`} note={`${UNITS.length} units, A1 → B2`} />
        <Stat
          label="Checkpoints passed"
          value={`${Object.values(progress.checkpoints).filter((c) => c?.passed).length} / 4`}
          note="One per level, 70% to pass"
        />
      </div>

      <LevelBars skills={progress.skills} />

      <nav aria-label="Course tools" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-xl border border-border p-4 text-sm hover:border-accent/60 hover:bg-surface">
            <span className="block font-bold">{t.title}</span>
            <span className="mt-1 block leading-snug text-muted">{t.text}</span>
          </Link>
        ))}
      </nav>

      <UnitList completed={progress.completed} checkpoints={progress.checkpoints} startUnitId={progress.startUnitId} />
    </>
  );
}

/** French course home: A1 → B2 toward NCLC 7. French track only. */
export default async function LearnPage({ params }: PageProps<"/[lang]/learn">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header className="max-w-2xl">
        <p className="text-sm text-muted">French course · A1 → B2</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Reach B2 for NCLC 7</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {UNITS.length} units, two 15-minute lessons each: explanation, vocabulary with audio, exercises and a small
          writing or speaking task. Lessons are written by AI the first time you open them and then kept, so they work
          offline afterwards. Levels shown here are estimates, not official results.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading your progress…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
