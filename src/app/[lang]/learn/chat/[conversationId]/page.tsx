import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatWindow } from "@/components/course/ChatWindow";
import { deleteConversationAction } from "@/lib/course/actions";
import { courseSettings } from "@/lib/course/cards";
import { MAX_MESSAGES, getConversation } from "@/lib/course/conversation";
import { getScenario } from "@/lib/course/syllabus";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

async function Conversation({ id }: { id: Promise<string> }) {
  const conversationId = decodeURIComponent(await id);
  const [convo, settings] = await Promise.all([getConversation(conversationId), courseSettings()]);
  if (!convo) notFound();
  const scenario = convo.scenarioId ? getScenario(convo.scenarioId) : null;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 lang="fr" className="text-2xl font-extrabold tracking-tight">
          {convo.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Level {convo.level}
          {scenario ? ` · You're talking to ${scenario.partnerRole}.` : ""}
        </p>
        {scenario ? (
          <p className="mt-2 rounded-lg bg-surface-subtle p-3 text-sm">
            {scenario.situation} <span className="font-medium">Goal: {scenario.goal}</span>
          </p>
        ) : null}
      </header>
      <ChatWindow initial={convo} ttsReplies={settings.ttsReplies} maxMessages={MAX_MESSAGES} />
      <form action={deleteConversationAction} className="border-t border-border pt-4">
        <input type="hidden" name="conversationId" value={convo.id} />
        <button type="submit" className="text-xs text-muted hover:text-warn">
          Delete this conversation
        </button>
      </form>
    </div>
  );
}

export default async function ConversationPage({ params }: PageProps<"/[lang]/learn/chat/[conversationId]">) {
  const { lang } = await params;
  if (lang !== "fr") notFound();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-muted">
        <Link href="/fr/learn" className="hover:text-foreground">
          French course
        </Link>{" "}
        ·{" "}
        <Link href="/fr/learn/chat" className="hover:text-foreground">
          Conversation
        </Link>
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Loading the conversation…</p>}>
        <Conversation id={params.then((p) => p.conversationId)} />
      </Suspense>
    </div>
  );
}
