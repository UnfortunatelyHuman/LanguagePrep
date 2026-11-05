import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UserPaperList } from "@/components/papers/UserPaperList";
import { getTrack, isTrack, type Track } from "@/lib/exams";
import { templatePaper } from "@/lib/papers/editor";
import type { PracticeSkill } from "@/lib/practice/types";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

const SKILLS: { skill: PracticeSkill; label: string }[] = [
  { skill: "reading", label: "Reading" },
  { skill: "listening", label: "Listening" },
];

/** A downloadable example paper, built from the same code the form uses. */
function templateHref(track: Track, skill: PracticeSkill): string {
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(templatePaper(track, skill), null, 2))}`;
}

export default async function PapersPage({ params }: PageProps<"/[lang]/papers">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { exam } = getTrack(lang);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{exam} · My papers</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Add your own papers</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Type in reading or listening questions from a prep book, a class or your own notes. They run in the same
          timed test as the built-in papers, are scored the same way and appear in your progress. Each one also gets
          an answer key to study from. Papers you add stay in this app&apos;s database on your computer.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {SKILLS.map(({ skill, label }) => (
          <Link
            key={skill}
            href={`/${lang}/papers/new/${skill}`}
            className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <span className="font-semibold tracking-tight">New {label.toLowerCase()} paper</span>
            <span className="text-sm text-muted">
              {skill === "reading"
                ? "Paste each text, then add its questions and mark the right answer."
                : "Type each script (the browser reads it aloud), then add its questions."}
            </span>
            <span className="mt-auto pt-2 text-sm font-medium text-accent">Open the form →</span>
          </Link>
        ))}
        <Link
          href={`/${lang}/papers/import`}
          className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
        >
          <span className="font-semibold tracking-tight">Import a JSON file</span>
          <span className="text-sm text-muted">
            For whole papers at once, including multi-part CELPIP papers, diagrams and fill-in blanks.
          </span>
          <span className="mt-auto pt-2 text-sm font-medium text-accent">Import →</span>
        </Link>
      </section>

      <p className="-mt-4 text-xs text-muted">
        Example files:{" "}
        {SKILLS.map(({ skill, label }, i) => (
          <span key={skill}>
            {i ? " · " : ""}
            <a
              href={templateHref(lang, skill)}
              download={`${lang === "fr" ? "tcf" : "celpip"}-${skill}-template.json`}
              className="text-accent underline-offset-2 hover:underline"
            >
              {label.toLowerCase()} template
            </a>
          </span>
        ))}
        . Only use material you&apos;re allowed to copy for your own study.
      </p>

      {SKILLS.map(({ skill, label }) => (
        <section key={skill} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Your {label.toLowerCase()} papers</h2>
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
            <UserPaperList track={lang} skill={skill} empty="None yet." />
          </Suspense>
        </section>
      ))}
    </div>
  );
}
