import Link from "next/link";
import { notFound } from "next/navigation";
import { PaperEditor } from "@/components/papers/PaperEditor";
import { getTrack, isTrack } from "@/lib/exams";
import { emptyDraft } from "@/lib/papers/editor";
import { PRACTICE_SKILLS, isPracticeSkill } from "@/lib/practice/content";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export function generateStaticParams() {
  return PRACTICE_SKILLS.map((skill) => ({ skill }));
}

export default async function NewPaperPage({ params }: PageProps<"/[lang]/papers/new/[skill]">) {
  const { lang, skill } = await params;
  if (!isTrack(lang) || !isPracticeSkill(skill)) notFound();
  const { exam } = getTrack(lang);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs font-medium text-muted">
          <Link href={`/${lang}/papers`} className="hover:text-foreground">
            {exam} · My papers
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New {skill} paper</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {skill === "reading"
            ? "Add each text (an email, a notice, an article…) and the questions about it."
            : "Add each recording as a script with speaker names; your browser reads it aloud once during the test."}{" "}
          Mark the correct option for every question; an explanation is optional but makes the answer key far more
          useful.
        </p>
      </section>
      <PaperEditor track={lang} initial={emptyDraft(lang, skill)} />
    </div>
  );
}
