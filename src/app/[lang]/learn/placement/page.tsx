import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlacementResult } from "@/components/course/PlacementResult";
import { PlacementRunner } from "@/components/course/PlacementRunner";
import { loadPool, placementHistory } from "@/lib/course/placement-store";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Placement() {
  const [pool, history] = await Promise.all([loadPool(), placementHistory()]);
  const latest = history[0];
  const seen = [...new Set(history.flatMap((h) => h.asked.map((a) => a.questionId)))];
  return (
    <>
      {latest ? <PlacementResult result={latest} /> : null}
      <PlacementRunner pool={pool} seen={seen} retake={!!latest} />
    </>
  );
}

export default async function PlacementPage({ params }: PageProps<"/[lang]/learn/placement">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        · Placement
      </p>
      <header className="max-w-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Placement test</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Find your current level (A1–C1) in grammar, vocabulary, reading and listening, and where to start the course.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Placement />
      </Suspense>
    </div>
  );
}
