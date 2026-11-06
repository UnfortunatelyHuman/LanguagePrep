import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { startConversationAction } from "@/lib/course/actions";
import { learnerLevel, listConversations } from "@/lib/course/conversation";
import { COURSE_LEVELS, SCENARIOS } from "@/lib/course/syllabus";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

function StartButton({ scenarioId, children }: { scenarioId?: string; children: React.ReactNode }) {
  return (
    <form action={startConversationAction} className="h-full">
      <input type="hidden" name="scenarioId" value={scenarioId ?? ""} />
      <button
        type="submit"
        className="flex h-full w-full flex-col gap-1 rounded-xl border border-border bg-surface p-4 text-left hover:border-accent"
      >
        {children}
      </button>
    </form>
  );
}

async function Past() {
  const [conversations, level] = await Promise.all([listConversations(), learnerLevel()]);
  return (
    <>
      <p className="text-sm text-muted">
        Your partner speaks at about <span className="font-semibold text-foreground">{level}</span>
        {level === "A2" ? " (from your placement test, or A2 until you take it)" : " (from your placement test)"}.
      </p>
      {conversations.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Your conversations</h2>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link href={`/fr/learn/chat/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-subtle">
                  <span lang="fr" className="font-medium">
                    {c.title}
                  </span>
                  <span className="text-xs text-muted">
                    {c.messages.length} messages · {c.ended ? "ended" : "ongoing"} ·{" "}
                    {c.updatedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export default async function ChatPage({ params }: PageProps<"/[lang]/learn/chat">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        · Conversation
      </p>
      <header className="max-w-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Conversation partner</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Chat in French by typing or speaking. After each message you get a gentle correction, and new words you can
          add to your daily review. Each message uses one AI request.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Past />
      </Suspense>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Start a conversation</h2>
        <StartButton>
          <span className="font-semibold">Free conversation</span>
          <span className="text-sm text-muted">Talk about anything: your day, work, plans, life in Canada.</span>
        </StartButton>
        {COURSE_LEVELS.map((level) => (
          <div key={level} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">{level}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {SCENARIOS.filter((s) => s.level === level).map((s) => (
                <li key={s.id}>
                  <StartButton scenarioId={s.id}>
                    <span lang="fr" className="font-semibold">
                      {s.title}
                    </span>
                    <span className="text-sm">{s.situation}</span>
                    <span className="text-xs text-muted">Goal: {s.goal}</span>
                  </StartButton>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
