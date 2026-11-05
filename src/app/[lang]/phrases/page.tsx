import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PhraseBank } from "@/components/phrases/PhraseBank";
import { getTrack, isTrack, type Track } from "@/lib/exams";
import { phraseReviewState } from "@/lib/phrase-reviews";
import { phraseCategories } from "@/lib/phrases";
import { savedPhraseCategory } from "@/lib/saved-phrases";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

const INTRO: Record<Track, string> = {
  en: "Ready-made phrases for CELPIP emails, survey answers and speaking tasks. Learn when each one fits, then test your recall.",
  fr: "Connecteurs et formules pour structurer vos textes et vos réponses orales au TCF Canada. Meanings are in English; test yourself to make them automatic.",
};

/** Reads the self-test marks; the bank itself is static content. */
async function BankWithReviews({ track }: { track: Track }) {
  const [reviews, saved] = await Promise.all([phraseReviewState(track), savedPhraseCategory(track)]);
  const known = {
    ...Object.fromEntries(Object.entries(reviews).map(([k, v]) => [k, v.known])),
    ...saved?.known,
  };
  // The learner's own phrases come first: they target their actual mistakes.
  const categories = saved ? [saved.category, ...phraseCategories(track)] : phraseCategories(track);
  return (
    <>
      {saved ? null : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          Tip: on writing and speaking feedback, use “Save to phrase bank” on a fix. Saved fixes appear here as
          their own self-test deck.
        </p>
      )}
      <PhraseBank track={track} categories={categories} initialKnown={known} />
    </>
  );
}

export default async function PhrasesPage({ params }: PageProps<"/[lang]/phrases">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { exam } = getTrack(lang);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{exam} · Phrase bank</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {lang === "fr" ? "French connectors and phrases" : "CELPIP phrase bank"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{INTRO[lang]}</p>
      </section>
      <Suspense fallback={<p className="text-sm text-muted">Loading phrases…</p>}>
        <BankWithReviews track={lang} />
      </Suspense>
    </div>
  );
}
