import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MistakesNotebook } from "@/components/review/MistakesNotebook";
import { getTrack, isTrack, type Track } from "@/lib/exams";
import { listMistakes } from "@/lib/review";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Notebook({ track }: { track: Track }) {
  const mistakes = await listMistakes(track);
  return <MistakesNotebook track={track} mistakes={mistakes} />;
}

export default async function ReviewPage({ params }: PageProps<"/[lang]/review">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { exam } = getTrack(lang);

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <p className="text-sm text-muted">{exam} reading and listening</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Mistakes notebook</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Every question you&apos;ve answered wrong in a saved test, most-missed first. Retry them until each one
          sticks: two right in a row, or right in a later full test, and it moves to Learned.
        </p>
      </header>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />}>
        <Notebook track={lang} />
      </Suspense>
    </div>
  );
}
