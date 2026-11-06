import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UnitForm } from "@/components/course/UnitForm";
import { deleteUnitAction } from "@/lib/course/actions";
import { findUnit, isUserUnitId } from "@/lib/course/units";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Edit({ unitId }: { unitId: Promise<string> }) {
  const id = decodeURIComponent(await unitId);
  const unit = isUserUnitId(id) ? await findUnit(id) : undefined;
  if (!unit) notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        ·{" "}
        <Link href={`/fr/learn/units/${unit.id}`} className="hover:text-foreground">
          Unit {unit.number}: {unit.title}
        </Link>
      </p>
      <h1 className="text-2xl font-extrabold tracking-tight">Edit unit</h1>
      <p className="max-w-2xl text-sm text-muted">
        Lessons already written for this unit keep their content; use “Regenerate” on a lesson to rewrite it for the
        new topics.
      </p>
      <UnitForm
        edit={{
          id: unit.id,
          unit: { level: unit.level, title: unit.title, grammar: unit.grammar, vocabulary: unit.vocabulary, skillFocus: unit.skillFocus },
        }}
      />
      <form action={deleteUnitAction} className="border-t border-border pt-4">
        <input type="hidden" name="unitId" value={unit.id} />
        <button type="submit" className="text-sm text-muted hover:text-warn">
          Delete this unit, its lessons and their review cards
        </button>
      </form>
    </div>
  );
}

export default async function EditUnitPage({ params }: PageProps<"/[lang]/learn/units/[unitId]/edit">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <Edit unitId={params.then((p) => p.unitId)} />
    </Suspense>
  );
}
