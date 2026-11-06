import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NotesImportForm } from "@/components/course/NotesImportForm";
import { MAX_NOTES_CHARS, listNotes } from "@/lib/course/notes";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Imports() {
  const notes = await listNotes();
  if (!notes.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Imported</h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {notes.map((n) => (
          <li key={n.id}>
            <Link href={`/fr/learn/notes/${n.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-subtle">
              <span className="font-medium">{n.title}</span>
              <span className="text-xs text-muted">
                {n.cards.length} cards · {n.exercises.length} exercises ·{" "}
                {n.createdAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                {n.cardsAdded ? "" : " · not added yet"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function NotesPage({ params }: PageProps<"/[lang]/learn/notes">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        · My notes
      </p>
      <header className="max-w-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My notes</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Paste vocabulary or grammar notes from your classes. The AI turns them into review cards and a few exercises,
          using only what you pasted (with new example sentences). You choose which cards to keep.
        </p>
      </header>
      <NotesImportForm maxChars={MAX_NOTES_CHARS} />
      <Suspense fallback={null}>
        <Imports />
      </Suspense>
    </div>
  );
}
