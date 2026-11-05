import Link from "next/link";
import { notFound } from "next/navigation";
import { PaperJsonEditor } from "@/components/papers/PaperJsonEditor";
import { getTrack, isTrack } from "@/lib/exams";
import { VOICES } from "@/lib/papers/editor";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function ImportPaperPage({ params }: PageProps<"/[lang]/papers/import">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { exam } = getTrack(lang);
  const voices = Object.keys(VOICES[lang]).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          <Link href={`/${lang}/papers`} className="hover:text-foreground">
            {exam} · My papers
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import a paper (JSON)</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Paste a paper or choose a file. It&apos;s checked before saving, and any problem is listed so you can fix
          it.
        </p>
      </section>

      <details className="rounded-xl border border-border bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-medium">The format, in short</summary>
        <div className="mt-3 flex flex-col gap-2 leading-relaxed text-muted">
          <p>
            It&apos;s the format of the built-in papers in <code>content/</code>. Start from the template on the My
            papers page, or copy a built-in file.
          </p>
          <ul className="list-disc pl-5">
            <li>
              <code>skill</code>: <code>&quot;reading&quot;</code> or <code>&quot;listening&quot;</code>;{" "}
              <code>title</code>; optional <code>summary</code>.
            </li>
            <li>
              <code>parts</code>: one or more timed parts, each with <code>id</code>, <code>title</code>,{" "}
              <code>minutes</code> and <code>sections</code>.
            </li>
            <li>
              A section has a <code>passage</code> (reading: <code>paragraphs</code>, optional <code>label</code>,{" "}
              <code>heading</code>, <code>diagram</code>) or an <code>audio</code> clip (listening: <code>lines</code>{" "}
              of <code>{"{ speaker, text }"}</code>), and its <code>questions</code>.
            </li>
            <li>
              A question has an <code>id</code>, <code>stem</code>, <code>options</code>, <code>answer</code> (index of
              the correct option, starting at 0) and <code>explanation</code>
              {lang === "fr" ? (
                <>
                  , plus a <code>level</code> from A1 to C2 (required for TCF)
                </>
              ) : null}
              .
            </li>
            <li>
              Listening papers also need <code>speakers</code>, e.g. the keys {voices} with a <code>name</code> and{" "}
              <code>gender</code>.
            </li>
            <li>
              Writing <code>[[questionId]]</code> inside a paragraph turns that question into a fill-in blank.
            </li>
          </ul>
        </div>
      </details>

      <PaperJsonEditor track={lang} />
    </div>
  );
}
