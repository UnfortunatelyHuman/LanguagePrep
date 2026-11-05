import { notFound } from "next/navigation";
import { WritingIndex } from "@/components/writing/WritingIndex";
import { isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function WritingPage({ params }: PageProps<"/[lang]/writing">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  return <WritingIndex track={lang} />;
}
