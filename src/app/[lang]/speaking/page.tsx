import { notFound } from "next/navigation";
import { SpeakingIndex } from "@/components/speaking/SpeakingIndex";
import { isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function SpeakingPage({ params }: PageProps<"/[lang]/speaking">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  return <SpeakingIndex track={lang} />;
}
