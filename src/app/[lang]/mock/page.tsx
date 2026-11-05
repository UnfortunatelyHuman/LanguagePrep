import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MockList } from "@/components/mock/MockList";
import { StartMockButton } from "@/components/mock/StartMockButton";
import { getTrack, isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function MockPage({ params }: PageProps<"/[lang]/mock">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { exam, totalTime, skills } = getTrack(lang);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{exam} · Mock exam</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Full mock exam</h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          All four skills in the real order ({skills.map((s) => s.name).join(", ")}), one set each,
          picked from the ones you&apos;ve practised least recently. The real test takes {totalTime}.
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          On test day the skills run back to back with no feedback in between. For a realistic rehearsal,
          do the steps in one sitting and don&apos;t read each step&apos;s feedback until you&apos;ve finished
          them all.
        </p>
        <div>
          <StartMockButton track={lang} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Your mock exams</h2>
        <Suspense fallback={<p className="text-sm text-muted">Loading your mock exams…</p>}>
          <MockList track={lang} />
        </Suspense>
      </section>
    </div>
  );
}
