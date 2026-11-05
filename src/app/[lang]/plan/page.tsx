import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlanView } from "@/components/plan/PlanView";
import { getTrack, isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function PlanPage({ params }: PageProps<"/[lang]/plan">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { exam, goal } = getTrack(lang);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs font-medium text-muted">{exam} · Study plan</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Today&apos;s study plan</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Your goal: {goal}. The plan puts your weakest and least recently practised skills first, and
          changes as your exam date gets closer.
        </p>
      </section>
      <Suspense fallback={<p className="text-sm text-muted">Building your plan…</p>}>
        <PlanView track={lang} />
      </Suspense>
    </div>
  );
}
