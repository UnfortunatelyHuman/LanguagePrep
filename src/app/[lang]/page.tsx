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
              status={
                <Suspense fallback={<SkillStatusPending />}>
                  <SkillStatus track={lang} skill={skill.id} />
                </Suspense>
              }
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-border p-5 text-sm text-muted sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">What is next</h2>
        <p className="mt-2 leading-relaxed">
          Reading and listening practice, timed writing and speaking with AI
          feedback, and progress tracking are still being built. For now this
          dashboard holds the {exam} targets and will show your last attempt per
          skill as soon as you record one.
        </p>
        {lang === "fr" ? (
          <p className="mt-3 leading-relaxed">
            The TCF band figures shown are approximate NCLC 7 minimums — confirm
            the current thresholds on canada.ca before you book the test.
          </p>
        ) : null}
      </section>
    </div>
  );
}
