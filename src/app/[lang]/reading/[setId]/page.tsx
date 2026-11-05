import { notFound } from "next/navigation";
import { TestRunner } from "@/components/practice/TestRunner";
import { isTrack } from "@/lib/exams";
import { resolveTestSet } from "@/lib/generate/sets";
import { testSets, toClientSet } from "@/lib/practice/content";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

// The parent layout already generates en/fr; this adds each track's sets.
export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  return isTrack(lang) ? testSets(lang, "reading").map((set) => ({ setId: set.id })) : [];
}

export default async function ReadingTest({
  params,
}: PageProps<"/[lang]/reading/[setId]">) {
  const { lang, setId } = await params;
  if (!isTrack(lang)) notFound();
  // File sets are prerendered; AI-generated ("ai-…") sets load from the database.
  const set = await resolveTestSet(lang, "reading", setId);
  if (!set) notFound();

  return <TestRunner set={toClientSet(set)} track={lang} />;
}
