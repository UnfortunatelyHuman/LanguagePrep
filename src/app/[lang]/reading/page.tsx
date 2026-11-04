import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ReadingHistory } from "@/components/reading/ReadingHistory";
import { getTrack, isTrack } from "@/lib/exams";
import { questionCount, readingSets, totalMinutes } from "@/lib/reading/content";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function ReadingIndex({ params }: PageProps<"/[lang]/reading">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();

  const { exam, skills } = getTrack(lang);
  const skill = skills.find((s) => s.id === "reading")!;
  const sets = readingSets(lang);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {exam} · {skill.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Reading practice</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {skill.structure}. Target: <span className="font-medium text-foreground">{skill.target}</span>
          {skill.targetNote ? ` (${skill.targetNote})` : ""}.
          {lang === "en"
            ? " The four parts are timed separately (11, 9, 10 and 13 minutes); the real test's 55–60 minutes also covers a practice task and instructions."
            : " Each question is worth more as the level rises, and the total is reported on the 100–699 scale."}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {sets.map((set) => (
          <Link
            key={set.id}
            href={`/${lang}/reading/${set.id}`}
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
        <h2 className="text-lg font-semibold tracking-tight">Your reading history</h2>
        <Suspense fallback={<p className="text-sm text-muted">Loading your attempts…</p>}>
          <ReadingHistory track={lang} />
        </Suspense>
      </section>
    </div>
  );
}
