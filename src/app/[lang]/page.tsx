import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SkillCard } from "@/components/SkillCard";
import { SkillStatus, SkillStatusPending } from "@/components/SkillStatus";
import { getTrack, isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function Dashboard({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();

  const { exam, examFull, language, goal, why, totalTime, scale, skills } =
    getTrack(lang);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {language} — {examFull}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {goal}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{why}</p>
        <p className="mt-4 text-xs text-muted">Full test: {totalTime}.</p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            The four skills
          </h2>
          <p className="text-xs text-muted">
            Each scored separately on the {scale} scale
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              href={`/${lang}/${skill.id}`}
              status={
                <Suspense fallback={<SkillStatusPending />}>
                  <SkillStatus track={lang} skill={skill.id} />
                </Suspense>
              }
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/${lang}/guide`}
          className="flex flex-col gap-1 rounded-xl border border-dashed border-border p-5 text-sm transition-colors hover:border-accent sm:p-6"
        >
          <span className="font-semibold text-foreground">New to the {exam}? Start with the exam guide</span>
          <span className="leading-relaxed text-muted">
            Every part, its timing and scoring, what the questions test, strategies, and the score you need for{" "}
            {scale} {lang === "en" ? "10" : "7"}.
          </span>
        </Link>
        <Link
          href={`/${lang}/papers`}
          className="flex flex-col gap-1 rounded-xl border border-dashed border-border p-5 text-sm transition-colors hover:border-accent sm:p-6"
        >
          <span className="font-semibold text-foreground">Add your own papers</span>
          <span className="leading-relaxed text-muted">
            Type in reading or listening questions from a prep book or class. They&apos;re timed, scored and tracked
            like the built-in papers, with an answer key to study from.
          </span>
        </Link>
      </section>
      {lang === "fr" ? (
        <p className="text-xs leading-relaxed text-muted">
          The TCF band figures shown are approximate NCLC 7 minimums. Confirm the current thresholds on canada.ca
          before you book the test.
        </p>
      ) : null}
    </div>
  );
}
