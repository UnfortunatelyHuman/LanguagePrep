"use client";

import { useEffect, useRef, useState } from "react";
import { endConversationAction, saveChatCardAction, sendMessageAction, setTtsRepliesAction } from "@/lib/course/actions";
import type { ChatMessage, StoredConversation } from "@/lib/course/conversation";
import { useDictation } from "@/lib/course/useDictation";
import { speak } from "@/lib/course/useSpeak";
import { SpeakButton } from "./SpeakButton";

/** "+ review" for a word or a correction; turns into "✓ saved". */
function SaveCard({ conversationId, kind, front, back }: { conversationId: string; kind: "vocab" | "phrase"; front: string; back: string }) {
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  return state === "saved" ? (
    <span className="text-xs text-good">✓ in review</span>
  ) : (
    <button
      type="button"
      onClick={async () => {
        const r = await saveChatCardAction({ conversationId, kind, front, back }).catch(() => null);
        setState(r?.ok ? "saved" : "error");
      }}
      className="text-xs font-medium text-accent hover:underline"
      title="Add to daily review"
    >
      {state === "error" ? "retry" : "+ review"}
    </button>
  );
}

function LearnerBubble({ message, conversationId }: { message: Extract<ChatMessage, { role: "learner" }>; conversationId: string }) {
  const c = message.correction;
  return (
    <li className="flex flex-col items-end gap-1">
      <p lang="fr" className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-white">
        {message.text}
      </p>
      {c ? (
        c.ok ? (
          <p className="text-xs text-good">Parfait ! No corrections.</p>
        ) : (
          <div className="max-w-[85%] rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm">
            <p lang="fr">
              <span className="text-xs font-semibold text-warn">Better: </span>
              {c.corrected}
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {c.notes.map((n, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span lang="fr">
                    <del className="text-warn">{n.wrong}</del> → <span className="font-medium text-good">{n.right}</span>
                  </span>
                  <span className="text-muted">{n.why}</span>
                  <SaveCard conversationId={conversationId} kind="phrase" front={n.right} back={`Instead of “${n.wrong}”: ${n.why}`} />
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}
    </li>
  );
}

function PartnerBubble({
  message,
  index,
  conversationId,
}: {
  message: Extract<ChatMessage, { role: "partner" }>;
  index: number;
  conversationId: string;
}) {
  const [english, setEnglish] = useState(false);
  return (
    <li className="flex flex-col items-start gap-1">
      <div className="flex max-w-[85%] items-start gap-2">
        <SpeakButton id={`reply-${index}`} text={message.text} />
        <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-2">
          <p lang="fr">{message.text}</p>
          {english ? <p className="mt-1 text-sm text-muted">{message.replyEn}</p> : null}
        </div>
      </div>
      <div className="ml-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <button type="button" onClick={() => setEnglish((e) => !e)} className="text-muted underline">
          {english ? "Hide English" : "English"}
        </button>
        {message.newWords.map((w) => (
          <span key={w.fr} className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-2 py-0.5">
            <span lang="fr" className="font-medium">
              {w.fr}
            </span>
            <span className="text-muted">{w.en}</span>
            <SaveCard conversationId={conversationId} kind="vocab" front={w.fr} back={w.en} />
          </span>
        ))}
      </div>
    </li>
  );
}

/** The chat: learner messages with gentle corrections, partner replies with audio and new words. */
export function ChatWindow({
  initial,
  ttsReplies,
  maxMessages,
}: {
  initial: StoredConversation;
  ttsReplies: boolean;
  maxMessages: number;
}) {
  const [convo, setConvo] = useState(initial);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tts, setTts] = useState(ttsReplies);
  const dictation = useDictation(setText);
  const end = useRef<HTMLDivElement>(null);

  // Block body: scrollIntoView returns a Promise in newer browsers, which must not become the cleanup.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [convo.messages.length, pending]);

  const send = async () => {
    const message = text.trim();
    if (!message || pending) return;
    dictation.stop();
    setPending(true);
    setError(null);
    const result = await sendMessageAction(convo.id, message).catch(() => null);
    setPending(false);
    if (!result) return setError("Couldn't reach the server. Is it still running?");
    if (!result.ok) return setError(result.error);
    setConvo(result.conversation);
    setText("");
    const reply = result.conversation.messages.at(-1);
    if (tts && reply?.role === "partner") speak(`reply-${result.conversation.messages.length - 1}`, reply.text);
  };

  const closed = convo.ended || convo.messages.length >= maxMessages;

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4" aria-live="polite">
        {convo.messages.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
            You start: say hello and begin the conversation in French.
          </li>
        ) : null}
        {convo.messages.map((m, i) =>
          m.role === "learner" ? (
            <LearnerBubble key={i} message={m} conversationId={convo.id} />
          ) : (
            <PartnerBubble key={i} message={m} index={i} conversationId={convo.id} />
          ),
        )}
        {pending ? (
          <li className="text-sm text-muted" role="status">
            Your partner is typing…
          </li>
        ) : null}
      </ol>
      <div ref={end} />

      {closed ? (
        <p className="rounded-lg bg-surface-subtle p-4 text-sm">
          This conversation has ended. Start another from the scenario list to keep practising.
        </p>
      ) : (
        <div className="sticky bottom-16 flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:bottom-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            lang="fr"
            maxLength={600}
            disabled={pending}
            placeholder="Écrivez votre message…"
            aria-label="Your message"
            className="resize-none rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={dictation.listening ? dictation.stop : dictation.start}
              disabled={pending}
              className={`rounded-lg border px-3 py-1.5 text-sm ${dictation.listening ? "border-warn text-warn" : "border-border"}`}
            >
              {dictation.listening ? "● Listening… stop" : "🎤 Speak"}
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={tts}
                onChange={(e) => {
                  setTts(e.target.checked);
                  void setTtsRepliesAction(e.target.checked);
                }}
              />
              Read replies aloud
            </label>
            <span className="ml-auto text-xs text-muted">
              {convo.messages.length} / {maxMessages}
            </span>
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending || !text.trim()}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
          {error || dictation.error ? (
            <p role="alert" className="text-sm text-warn">
              {error ?? dictation.error}
            </p>
          ) : null}
        </div>
      )}
      {!closed && convo.messages.length ? (
        <button
          type="button"
          onClick={async () => {
            await endConversationAction(convo.id);
            setConvo((c) => ({ ...c, ended: true }));
          }}
          className="self-start text-xs text-muted underline"
        >
          End the conversation
        </button>
      ) : null}
    </div>
  );
}
