import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CrsCalculator, type PracticeLevels } from "@/components/crs/CrsCalculator";
import { SKILLS, type CrsSkill } from "@/lib/crs";
import { isTrack } from "@/lib/exams";
import { progressSummary } from "@/lib/progress";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Calculator() {
  const [en, fr] = await Promise.all([progressSummary("en"), progressSummary("fr")]);
  const levels = (summary: typeof en) =>
    Object.fromEntries(
      SKILLS.map((s) => {
        const avg = summary.skills.find((x) => x.skill === s)?.recentAverage ?? null;
        return [s, avg === null ? null : Math.floor(avg)];
      }),
    ) as Record<CrsSkill, number | null>;
  const practice: PracticeLevels = { english: levels(en), french: levels(fr) };
  const hasPractice = [...en.skills, ...fr.skills].some((s) => s.points.length);
  return <CrsCalculator practice={practice} hasPractice={hasPractice} />;
}

export default async function CrsPage({ params }: PageProps<"/[lang]/crs">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <p className="text-sm text-muted">Express Entry</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">What your scores are worth</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The Comprehensive Ranking System points that depend on your English and French results. Use it to see which
          skill is worth practising next.
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-border bg-surface" />}>
        <Calculator />
      </Suspense>
      <p className="max-w-3xl text-xs leading-relaxed text-muted">
        Points from IRCC&apos;s{" "}
        <a
          className="underline"
          href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score/crs-criteria.html"
          target="_blank"
          rel="noreferrer"
        >
          CRS criteria
        </a>{" "}
        (page updated 3 November 2026, checked 5 November 2026). This covers language-related points only. Age,
        education, Canadian work experience, job offers, provincial nomination and siblings in Canada add the rest of
        your score, and Canadian-experience combinations with language add more skill-transferability points (up to
        100 combined). Practice levels are estimates. Use your official results and IRCC&apos;s own tool before you
        make decisions.
      </p>
    </div>
  );
}
