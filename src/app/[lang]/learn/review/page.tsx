import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NewCardsSetting } from "@/components/course/NewCardsSetting";
import { ReviewSession } from "@/components/course/ReviewSession";
import { courseSettings, dailyQueue, today } from "@/lib/course/cards";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Review() {
  const [{ cards, newTotal }, day, settings] = await Promise.all([dailyQueue(), today(), courseSettings()]);
  const fresh = cards.filter((c) => c.isNew).length;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        {cards.length - fresh} due · {fresh} new today · {newTotal} new cards waiting in all
      </p>
      <ReviewSession initial={cards} today={day} />
      <div className="border-t border-border pt-4">
        <NewCardsSetting value={settings.newCardsPerDay} />
      </div>
    </div>
  );
}

export default async function ReviewPage({ params }: PageProps<"/[lang]/learn/review">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        · Daily review
      </p>
      <header className="max-w-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Daily review</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Words and grammar from your lessons, spaced out so you see each one just before you&apos;d forget it. A few
          minutes a day is enough.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading your cards…</p>}>
        <Review />
      </Suspense>
    </div>
  );
}
