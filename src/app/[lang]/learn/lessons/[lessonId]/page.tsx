import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GenerateLesson } from "@/components/course/GenerateLesson";
import { LessonPlayer } from "@/components/course/LessonPlayer";
import { RegenerateLessonButton } from "@/components/course/RegenerateLessonButton";
import { findLesson } from "@/lib/course/lessons";
import { UNITS, getLesson, nextLessonId } from "@/lib/course/syllabus";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

// The parent layout generates en/fr; the course exists on the French track only.
export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  // Cache Components needs at least one entry per track; on English it renders a 404.
  return (lang === "fr" ? UNITS : UNITS.slice(0, 1)).flatMap((u) => u.lessons.map((l) => ({ lessonId: l.id })));
}

async function LessonBody({ lessonId }: { lessonId: string }) {
  const stored = await findLesson(lessonId);
  if (!stored) return <GenerateLesson lessonId={lessonId} />;
  const { lesson } = stored;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 lang="fr" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {lesson.title}
        </h1>
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
          {lesson.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </div>
      <LessonPlayer
        lessonId={lessonId}
        lesson={lesson}
        nextHref={nextLessonId(lessonId) ? `/fr/learn/lessons/${nextLessonId(lessonId)}` : null}
      />
      <div className="border-t border-border pt-4">
        <RegenerateLessonButton lessonId={lessonId} />
      </div>
    </div>
  );
}

export default async function LessonPage({ params }: PageProps<"/[lang]/learn/lessons/[lessonId]">) {
  const { lang, lessonId } = await params;
  if (lang !== "fr") notFound();
  const found = getLesson(lessonId);
  if (!found) notFound();
  const { unit, lesson } = found;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        ·{" "}
        <Link href={`/fr/learn/units/${unit.id}`} className="hover:text-foreground">
          {unit.level} · Unit {unit.number}: {unit.title}
        </Link>{" "}
        · {lesson.label}
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Loading the lesson…</p>}>
        <LessonBody lessonId={lessonId} />
      </Suspense>
    </div>
  );
}
