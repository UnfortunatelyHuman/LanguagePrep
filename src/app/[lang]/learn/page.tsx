import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitList } from "@/components/course/UnitList";
import { UNITS } from "@/lib/course/syllabus";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

/** French course home: A1 → B2 toward NCLC 7. French track only. */
export default async function LearnPage({ params }: PageProps<"/[lang]/learn">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <p className="text-sm text-muted">French course · A1 → B2</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Reach B2 for NCLC 7</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {UNITS.length} units, two 15-minute lessons each: a short explanation, vocabulary with audio, exercises and a
          small writing or speaking task. Lessons are created by AI the first time you open them and then kept, so they
          work offline afterwards. Levels shown in the course are estimates, not official results.
        </p>
      </header>
      <Link
        href="/fr/learn/review"
        className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 hover:border-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          <span className="block font-semibold">Daily review</span>
          <span className="block text-sm text-muted">Spaced repetition of the words and grammar from your lessons.</span>
        </span>
        <span className="text-sm font-semibold text-accent">Open →</span>
      </Link>
      <Link
        href="/fr/learn/chat"
        className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 hover:border-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          <span className="block font-semibold">Conversation partner</span>
          <span className="block text-sm text-muted">Role-play in French with gentle corrections after each message.</span>
        </span>
        <span className="text-sm font-semibold text-accent">Open →</span>
      </Link>
      <Link
        href="/fr/learn/notes"
        className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 hover:border-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          <span className="block font-semibold">My notes</span>
          <span className="block text-sm text-muted">Paste class notes; get review cards and exercises from them.</span>
        </span>
        <span className="text-sm font-semibold text-accent">Open →</span>
      </Link>
      <Link
        href="/fr/learn/placement"
        className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 hover:border-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          <span className="block font-semibold">Placement test</span>
          <span className="block text-sm text-muted">About 10 minutes: find your level per skill and where to start.</span>
        </span>
        <span className="text-sm font-semibold text-accent">Open →</span>
      </Link>
      <UnitList />
    </div>
  );
}
