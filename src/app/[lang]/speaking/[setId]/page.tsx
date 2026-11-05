import { notFound } from "next/navigation";
import { SpeakingRunner } from "@/components/speaking/SpeakingRunner";
import { isTrack } from "@/lib/exams";
import { findSpeakingSet, speakingSets } from "@/lib/speaking/content";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

// The parent layout already generates en/fr; this adds each track's sets.
export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  return isTrack(lang) ? speakingSets(lang).map((set) => ({ setId: set.id })) : [];
}

export default async function SpeakingTest({ params }: PageProps<"/[lang]/speaking/[setId]">) {
  const { lang, setId } = await params;
  if (!isTrack(lang)) notFound();
  const set = findSpeakingSet(lang, setId);
  if (!set) notFound();
  return <SpeakingRunner set={set} track={lang} />;
}
