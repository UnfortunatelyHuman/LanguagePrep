import { notFound } from "next/navigation";
import { ReadingRunner } from "@/components/reading/ReadingRunner";
import { isTrack } from "@/lib/exams";
import { findReadingSet, readingSets, toClientSet } from "@/lib/reading/content";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

// The parent layout already generates en/fr; this adds each track's sets.
export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  return isTrack(lang) ? readingSets(lang).map((set) => ({ setId: set.id })) : [];
}

export default async function ReadingTest({
  params,
}: PageProps<"/[lang]/reading/[setId]">) {
  const { lang, setId } = await params;
  if (!isTrack(lang)) notFound();
  const set = findReadingSet(lang, setId);
  if (!set) notFound();

  return <ReadingRunner set={toClientSet(set)} track={lang} />;
}
