import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PaperJsonEditor } from "@/components/papers/PaperJsonEditor";
import { isTrack, type Track } from "@/lib/exams";
import { getUserPaper } from "@/lib/papers/store";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Editor({ track, setId }: { track: Track; setId: Promise<string> }) {
  const id = decodeURIComponent(await setId);
  const set = await getUserPaper(track, id);
  if (!set) notFound();
  const rest: Record<string, unknown> = { ...set };
  delete rest.id;
  delete rest.exam;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          <Link href={`/${track}/papers`} className="hover:text-foreground">
            My papers
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit “{set.title}” as JSON</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Copy this text to keep a backup of the paper.{" "}
          <Link href={`/${track}/papers/${id}/edit`} className="text-accent">
            Back to the form
          </Link>
        </p>
      </section>
      <PaperJsonEditor track={track} setId={id} initialJson={JSON.stringify(rest, null, 2)} />
    </div>
  );
}

export default async function PaperJsonPage({ params }: PageProps<"/[lang]/papers/[setId]/json">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading the paper…</p>}>
      <Editor track={lang} setId={params.then((p) => p.setId)} />
    </Suspense>
  );
}
