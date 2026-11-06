import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GenerateLesson } from "@/components/course/GenerateLesson";
import { LessonPlayer } from "@/components/course/LessonPlayer";
import { RegenerateLessonButton } from "@/components/course/RegenerateLessonButton";
import { findLesson } from "@/lib/course/lessons";
import { UNITS } from "@/lib/course/syllabus";
import { findCourseLesson, nextLessonAfter } from "@/lib/course/units";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

// The parent layout generates en/fr; the course exists on the French track only.
// Lessons of units you add ("my-u01-a") render on demand.
export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  // Cache Components needs at least one entry per track; on English it renders a 404.
  return (lang === "fr" ? UNITS : UNITS.slice(0, 1)).flatMap((u) => u.lessons.map((l) => ({ lessonId: l.id })));
}

async function LessonBody({ lessonId }: { lessonId: string }) {
  const found = await findCourseLesson(lessonId);
  if (!found) notFound();
  const { unit, lesson: meta } = found;
  const [stored, next] = await Promise.all([findLesson(lessonId), nextLessonAfter(lessonId)]);

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
        · {meta.label}
      </p>
      {stored ? (
        <>
          <div>
            <h1 lang="fr" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {stored.lesson.title}
            </h1>
            <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
              {stored.lesson.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <LessonPlayer lessonId={lessonId} lesson={stored.lesson} nextHref={next ? `/fr/learn/lessons/${next}` : null} />
          <div className="border-t border-border pt-4">
            <RegenerateLessonButton lessonId={lessonId} />
          </div>
        </>
      ) : (
        <GenerateLesson lessonId={lessonId} />
      )}
    </div>
  );
}

export default async function LessonPage({ params }: PageProps<"/[lang]/learn/lessons/[lessonId]">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading the lesson…</p>}>
      <LessonBody lessonId={await params.then((p) => p.lessonId)} />
    </Suspense>
  );
}
