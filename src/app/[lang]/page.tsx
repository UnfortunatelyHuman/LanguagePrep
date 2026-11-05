import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  ActivitySection,
  StandingSection,
  StandingSectionPending,
  TodaySection,
  TodaySectionPending,
} from "@/components/dashboard/DashboardSections";
import { getTrack, isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function Dashboard({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();

  const { examFull, goal, why, scale } = getTrack(lang);

  const shortcuts = [
    { href: `/${lang}/review`, title: "Mistakes", text: "Every question you got wrong, with a quick retry quiz." },
    { href: `/${lang}/crs`, title: "CRS points", text: `What each ${scale} level is worth in your Express Entry score.` },
    { href: `/${lang}/guide`, title: "Exam guide", text: "Every part, its timing, scoring and strategies." },
    { href: `/${lang}/papers`, title: "My papers", text: "Add tests from a prep book or class." },
  ];

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <header className="max-w-2xl">
        <p className="text-sm text-muted">{examFull}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{goal}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{why}</p>
      </header>

      <Suspense fallback={<TodaySectionPending />}>
        <TodaySection track={lang} />
      </Suspense>

      <Suspense fallback={<StandingSectionPending />}>
        <StandingSection track={lang} />
      </Suspense>

      <Suspense fallback={null}>
        <ActivitySection track={lang} />
      </Suspense>

      <nav aria-label="Tools" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-border p-4 text-sm hover:border-accent/60 hover:bg-surface"
          >
            <span className="block font-bold">{s.title}</span>
            <span className="mt-1 block leading-snug text-muted">{s.text}</span>
          </Link>
        ))}
      </nav>

      {lang === "fr" ? (
        <p className="text-xs leading-relaxed text-muted">
          The TCF band figures shown are approximate NCLC 7 minimums. Confirm the current thresholds on canada.ca
          before you book the test.
        </p>
      ) : null}
    </div>
  );
}
