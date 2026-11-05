import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProgressView } from "@/components/progress/ProgressView";
import { getTrack, isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function ProgressPage({ params }: PageProps<"/[lang]/progress">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { exam, goal } = getTrack(lang);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{exam} · Progress</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your progress</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Goal: {goal}. Each skill is judged on its own, so the weakest one decides your result. Levels are
          practice estimates, not official scores.
        </p>
      </section>
      <Suspense fallback={<p className="text-sm text-muted">Loading your progress…</p>}>
        <ProgressView track={lang} />
      </Suspense>
    </div>
  );
}
