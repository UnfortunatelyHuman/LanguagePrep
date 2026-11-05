import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GenerateForm } from "@/components/generate/GenerateForm";
import { GeneratedList } from "@/components/generate/GeneratedList";
import { getTrack, isTrack } from "@/lib/exams";
import { GENERATE_OPTIONS } from "@/lib/generate/kinds";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

export default async function GeneratePage({ params }: PageProps<"/[lang]/generate">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { exam } = getTrack(lang);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{exam} · New AI sets</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Fresh practice sets</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ran out of prompts? The AI writes a new, original set in the real exam format (timings and word
          ranges are fixed by the app, not the AI). It&apos;s saved here and graded like any other set. Read the
          prompt critically: AI-written material can occasionally be awkward.
        </p>
      </section>

      <GenerateForm track={lang} options={GENERATE_OPTIONS[lang]} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Your generated sets</h2>
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <GeneratedList track={lang} empty="None yet. Generate one above." />
        </Suspense>
      </section>
    </div>
  );
}
