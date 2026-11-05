import { notFound } from "next/navigation";
import { WritingRunner } from "@/components/writing/WritingRunner";
import { isTrack } from "@/lib/exams";
import { resolveWritingSet } from "@/lib/generate/sets";
import { writingSets } from "@/lib/writing/content";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

// The parent layout already generates en/fr; this adds each track's prompts.
export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  return isTrack(lang) ? writingSets(lang).map((set) => ({ setId: set.id })) : [];
}

export default async function WritingTest({ params }: PageProps<"/[lang]/writing/[setId]">) {
  const { lang, setId } = await params;
  if (!isTrack(lang)) notFound();
  // File sets are prerendered; AI-generated ("ai-…") sets load from the database.
  const set = await resolveWritingSet(lang, setId);
  if (!set) notFound();

  // Prompts hold no secrets (grading happens on the server), so the full set ships.
  return <WritingRunner set={set} track={lang} />;
}
