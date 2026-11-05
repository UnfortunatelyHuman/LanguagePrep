import { notFound } from "next/navigation";
import { AnswerKey } from "@/components/practice/AnswerKey";
import { isTrack } from "@/lib/exams";
import { resolveTestSet } from "@/lib/generate/sets";
import { testSets } from "@/lib/practice/content";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

// The parent layout already generates en/fr; this adds each track's sets.
export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  return isTrack(lang) ? testSets(lang, "listening").map((set) => ({ setId: set.id })) : [];
}

/** The paper with every answer and explanation, to study from. */
export default async function ListeningAnswers({
  params,
}: PageProps<"/[lang]/listening/[setId]/answers">) {
  const { lang, setId } = await params;
  if (!isTrack(lang)) notFound();
  // Built-in papers are prerendered; AI ("ai-…") and your own ("my-…") load from the database.
  const set = await resolveTestSet(lang, "listening", decodeURIComponent(setId));
  if (!set) notFound();

  return <AnswerKey set={set} track={lang} />;
}
