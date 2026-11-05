import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WritingFeedback } from "@/components/writing/WritingFeedback";
import { isTrack, type Track } from "@/lib/exams";
import { loadWritingAttempt } from "@/lib/writing/store";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function SavedFeedback({ track, attemptId }: { track: Track; attemptId: Promise<string> }) {
  const saved = await loadWritingAttempt(track, await attemptId);
  if (!saved) notFound();
  const { set, result } = saved;
  const date = new Date(result.createdAt).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Saved attempt · {date}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{set.title}</h1>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href={`/${track}/writing/${set.id}`} className="font-medium text-accent">
            Write this one again
          </Link>
          <Link href={`/${track}/writing`} className="font-medium text-accent">
            All writing prompts
          </Link>
        </div>
      </div>
      <WritingFeedback set={set} result={result} />
    </div>
  );
}

/** A past writing attempt with its full AI feedback, read back from the database. */
export default async function WritingAttemptPage({
  params,
}: PageProps<"/[lang]/writing/attempts/[attemptId]">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const attemptId = params.then((p) => p.attemptId);

  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading saved feedback…</p>}>
      <SavedFeedback track={lang} attemptId={attemptId} />
    </Suspense>
  );
}
