import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PaperEditor } from "@/components/papers/PaperEditor";
import { PaperJsonEditor } from "@/components/papers/PaperJsonEditor";
import { isTrack, type Track } from "@/lib/exams";
import { paperToDraft } from "@/lib/papers/editor";
import { getUserPaper } from "@/lib/papers/store";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

/** The stored paper without the fields the app fills in itself. */
function editableJson(set: object): string {
  const rest: Record<string, unknown> = { ...set };
  delete rest.id;
  delete rest.exam;
  return JSON.stringify(rest, null, 2);
}

async function Editor({ track, setId }: { track: Track; setId: Promise<string> }) {
  const id = decodeURIComponent(await setId);
  const set = await getUserPaper(track, id);
  if (!set) notFound();
  const draft = paperToDraft(track, set);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs font-medium text-muted">
          <Link href={`/${track}/papers`} className="hover:text-foreground">
            My papers
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit “{set.title}”</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {draft ? (
            <>
              Changes apply to future attempts; past scores are kept.{" "}
              <Link href={`/${track}/papers/${id}/json`} className="text-accent">
                Edit as JSON instead
              </Link>
            </>
          ) : (
            "This paper uses features the form can't show (several parts, diagrams or fill-in blanks), so it's edited as JSON."
          )}
        </p>
      </section>
      {draft ? (
        <PaperEditor track={track} initial={draft} setId={id} />
      ) : (
        <PaperJsonEditor track={track} setId={id} initialJson={editableJson(set)} />
      )}
    </div>
  );
}

export default async function EditPaperPage({ params }: PageProps<"/[lang]/papers/[setId]/edit">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading the paper…</p>}>
      <Editor track={lang} setId={params.then((p) => p.setId)} />
    </Suspense>
  );
}
