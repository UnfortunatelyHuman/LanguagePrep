import { notFound } from "next/navigation";
import { PracticeIndex } from "@/components/practice/PracticeIndex";
import { isTrack } from "@/lib/exams";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function ReadingIndex({ params }: PageProps<"/[lang]/reading">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  return <PracticeIndex track={lang} skill="reading" />;
}
