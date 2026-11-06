import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoteCardsPreview } from "@/components/course/NoteCardsPreview";
import { NoteExercises } from "@/components/course/NoteExercises";
import { deleteNotesAction } from "@/lib/course/actions";
import { getNotes } from "@/lib/course/notes";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Notes({ id }: { id: Promise<string> }) {
  const notes = await getNotes(decodeURIComponent(await id));
  if (!notes) notFound();
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">{notes.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {notes.cards.length} cards · {notes.exercises.length} exercises ·{" "}
          {notes.createdAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}
        </p>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cards</h2>
        <NoteCardsPreview noteId={notes.id} cards={notes.cards} added={notes.cardsAdded} />
      </section>
      {notes.exercises.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Practice</h2>
          <NoteExercises noteId={notes.id} exercises={notes.exercises} />
        </section>
      ) : null}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Your original notes</summary>
        <pre lang="fr" className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-subtle p-3 font-mono text-xs leading-relaxed">
          {notes.rawText}
        </pre>
      </details>
      <form action={deleteNotesAction} className="border-t border-border pt-4">
        <input type="hidden" name="noteId" value={notes.id} />
        <button type="submit" className="text-xs text-muted hover:text-warn">
          Delete this import (cards you&apos;ve already reviewed stay)
        </button>
      </form>
    </div>
  );
}

export default async function NotesDetailPage({ params }: PageProps<"/[lang]/learn/notes/[noteId]">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        ·{" "}
        <Link href="/fr/learn/notes" className="hover:text-foreground">
          My notes
        </Link>
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Notes id={params.then((p) => p.noteId)} />
      </Suspense>
    </div>
  );
}
