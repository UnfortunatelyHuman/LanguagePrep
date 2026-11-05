import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MockChecklist } from "@/components/mock/MockChecklist";
import { getTrack, isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

/** One mock exam: the ordered steps, then the result once every step is done. */
export default async function MockExamPage({ params }: PageProps<"/[lang]/mock/[mockId]">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const mockId = params.then((p) => p.mockId);
  const { exam } = getTrack(lang);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{exam} · Mock exam</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Mock exam</h1>
        </div>
        <Link href={`/${lang}/mock`} className="text-sm font-medium text-accent">
          All mock exams
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Loading your mock exam…</p>}>
        <MockChecklist track={lang} mockId={mockId} />
      </Suspense>
    </div>
  );
}
