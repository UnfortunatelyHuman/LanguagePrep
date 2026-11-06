import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { readyLessonIds } from "@/lib/course/lessons";
import { UNITS, getUnit, type CourseUnit } from "@/lib/course/syllabus";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export function generateStaticParams({
  params: { lang },
}: {
  params: Awaited<LayoutProps<"/[lang]">["params"]>;
}) {
  // Cache Components needs at least one entry per track; on English it renders a 404.
  return (lang === "fr" ? UNITS : UNITS.slice(0, 1)).map((u) => ({ unitId: u.id }));
}

async function Lessons({ unit }: { unit: CourseUnit }) {
  const ready = await readyLessonIds(unit.lessons.map((l) => l.id));
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {unit.lessons.map((lesson) => (
        <li key={lesson.id}>
          <Link
            href={`/fr/learn/lessons/${lesson.id}`}
            className="flex h-full flex-col gap-1 rounded-xl border border-border bg-surface p-4 hover:border-accent"
          >
            <span className="font-semibold">{lesson.label}</span>
            <span className="text-sm text-muted">
              {lesson.part === "a" ? unit.grammar : `${unit.vocabulary} · ${unit.skillFocus.text}`}
            </span>
            <span className="mt-1 text-xs text-muted">
              {ready.has(lesson.id) ? "Ready" : "Written by AI when you open it (about a minute)"}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default async function UnitPage({ params }: PageProps<"/[lang]/learn/units/[unitId]">) {
  const { lang, unitId } = await params;
  if (lang !== "fr") notFound();
  const unit = getUnit(unitId);
  if (!unit) notFound();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        · {unit.level}
      </p>
      <header>
        <h1 lang="fr" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Unit {unit.number}: {unit.title}
        </h1>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">Grammar</dt>
          <dd>{unit.grammar}</dd>
          <dt className="text-muted">Words</dt>
          <dd>{unit.vocabulary}</dd>
          <dt className="text-muted">Skill</dt>
          <dd>{unit.skillFocus.text}</dd>
        </dl>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Lessons unit={unit} />
      </Suspense>
    </div>
  );
}
