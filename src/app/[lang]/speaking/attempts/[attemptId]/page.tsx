import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteAttemptButton } from "@/components/data/DeleteAttemptButton";
import { SpeakingFeedback } from "@/components/speaking/SpeakingFeedback";
import { isTrack, type Track } from "@/lib/exams";
import { loadSpeakingAttempt } from "@/lib/speaking/store";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function SavedFeedback({ track, attemptId }: { track: Track; attemptId: Promise<string> }) {
  const saved = await loadSpeakingAttempt(track, await attemptId);
  if (!saved) notFound();
  const { set, result } = saved;
  const date = new Date(result.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Saved attempt · {date}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{set.title}</h1>
        </div>
        <div className="flex flex-wrap items-baseline gap-4 text-sm">
          <Link href={`/${track}/speaking/${set.id}`} className="font-medium text-accent">
            Practise this set again
          </Link>
          <Link href={`/${track}/speaking`} className="font-medium text-accent">
            All speaking sets
          </Link>
          <DeleteAttemptButton
            track={track}
            attemptId={result.attemptId}
            afterDelete={`/${track}/speaking`}
            label="Delete attempt"
          />
        </div>
      </div>
      <SpeakingFeedback set={set} result={result} />
    </div>
  );
}

/** A past speaking attempt with its feedback and recordings. */
export default async function SpeakingAttemptPage({
  params,
}: PageProps<"/[lang]/speaking/attempts/[attemptId]">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const attemptId = params.then((p) => p.attemptId);

  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading saved feedback…</p>}>
      <SavedFeedback track={lang} attemptId={attemptId} />
    </Suspense>
  );
}
