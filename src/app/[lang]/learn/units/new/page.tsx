import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitForm } from "@/components/course/UnitForm";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function NewUnitsPage({ params }: PageProps<"/[lang]/learn/units/new">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        · Add units
      </p>
      <header className="max-w-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Add units to the syllabus</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Describe what you want to study and let the AI suggest units, or write them yourself. A unit is just its
          topics; its two lessons are written by AI the first time you open them, like the built-in ones. Added units
          appear at the end of their level.
        </p>
      </header>
      <UnitForm />
    </div>
  );
}
