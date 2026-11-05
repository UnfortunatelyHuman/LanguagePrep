"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/exams";
import { voicesFor } from "@/lib/practice/speech";
import { DIALOGUE_LIMITS, type DialogueTurn, type SpeakingTask } from "@/lib/speaking/types";
import { countWords } from "@/lib/writing/words";

/** The browser must not wait longer than the server's own 25 s examiner timeout (plus slack). */
const REPLY_TIMEOUT_MS = 35_000;

/** Upper bound on how long a reply takes to read aloud, in case the voice never reports its end. */
function speakingLimitMs(text: string): number {
  return 3000 + countWords(text) * 600;
}

async function fetchReply(body: object, signal: AbortSignal): Promise<{ reply: string } | { error: string } | null> {
  try {
    const res = await fetch("/api/speaking/examiner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(REPLY_TIMEOUT_MS)]),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && typeof data?.reply === "string") return { reply: data.reply };
    return { error: data?.error?.message ?? `The examiner couldn't answer (HTTP ${res.status}).` };
  } catch {
    // Unmounted: nobody is listening any more.
    if (signal.aborted) return null;
    return { error: "The examiner didn't answer in time. Ask your question again." };
  }
}

/** Drop the first `count` words (text already used as a question while it was still interim). */
function dropWords(text: string, count: number): string {
  if (!count) return text.trim();
  return text.trim().split(/\s+/).slice(count).join(" ");
}

/**
 * TCF tâche 2 with an AI examiner: the candidate asks a question aloud, presses
 * the button, and the examiner answers in role, read aloud in French.
 *
 * The question is what was recognized since the last turn. Settled ("final")
 * text is cut by position; words that were still interim when the button was
 * pressed are sent too and then skipped by count once they settle, since the
 * recognizer may rewrite them with a different length.
 */
export function ExaminerPanel({
  track,
  setId,
  task,
  finalText,
  interimText,
  dialogue,
  onDialogue,
}: {
  track: Track;
  setId: string;
  task: SpeakingTask;
  finalText: string;
  interimText: string;
  dialogue: DialogueTurn[];
  onDialogue: (dialogue: DialogueTurn[]) => void;
}) {
  const [pending, setPending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Length of `finalText` already used, and how many settled words after it to skip. */
  const cursor = useRef({ chars: 0, skipWords: 0 });
  const latest = useRef({ finalText, interimText });
  const abort = useRef(new AbortController());
  // Chrome can drop an utterance nothing references, and then never fires onend.
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = { finalText, interimText };
  }, [finalText, interimText]);

  // When the task ends: cancel a pending reply and stop the examiner's voice.
  useEffect(() => {
    const controller = abort.current;
    return () => {
      controller.abort();
      if (speakTimer.current) clearTimeout(speakTimer.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  /** Mark everything recognized so far as used (e.g. the examiner's own voice picked up by the mic). */
  function skipToNow() {
    cursor.current = {
      chars: latest.current.finalText.length,
      skipWords: countWords(latest.current.interimText),
    };
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-CA";
    const voice = voicesFor(synth.getVoices(), "fr-CA")[0];
    if (voice) u.voice = voice;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (speakTimer.current) clearTimeout(speakTimer.current);
      utterance.current = null;
      setSpeaking(false);
      skipToNow();
    };
    u.onend = done;
    u.onerror = done;
    utterance.current = u;
    setSpeaking(true);
    speakTimer.current = setTimeout(done, speakingLimitMs(text));
    synth.speak(u);
  }

  async function send(turns: DialogueTurn[]) {
    setPending(true);
    setError(null);
    const outcome = await fetchReply({ track, setId, taskId: task.id, dialogue: turns }, abort.current.signal);
    if (!outcome) return; // the task ended while waiting
    setPending(false);
    if ("error" in outcome) {
      setError(outcome.error);
      return;
    }
    onDialogue([...turns, { role: "examiner", text: outcome.reply }]);
    speak(outcome.reply);
  }

  function ask() {
    const { chars, skipWords } = cursor.current;
    const fresh = [dropWords(finalText.slice(chars), skipWords), interimText].filter(Boolean).join(" ").trim();
    // After a failed reply, the unanswered question is resent unless a new one was asked since.
    const unanswered = dialogue.at(-1)?.role === "candidate" ? dialogue.at(-1)!.text : "";
    const question = fresh || unanswered;
    if (!question) {
      setError("Ask your question aloud first, then press the button.");
      return;
    }
    cursor.current = { chars: finalText.length, skipWords: countWords(interimText) };
    const base = unanswered ? dialogue.slice(0, -1) : dialogue;
    const turns = [...base, { role: "candidate" as const, text: question.slice(0, DIALOGUE_LIMITS.chars) }];
    onDialogue(turns);
    void send(turns);
  }

  const unanswered = dialogue.at(-1)?.role === "candidate";
  // Room for one more question and its answer.
  const full = dialogue.length - (unanswered ? 1 : 0) >= DIALOGUE_LIMITS.turns - 1;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-subtle p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">AI examiner</p>
      {dialogue.length ? (
        <ol lang="fr" className="flex max-h-56 flex-col gap-1.5 overflow-y-auto" aria-live="polite">
          {dialogue.map((t, i) => (
            <li key={i} className={t.role === "examiner" ? "text-accent" : "text-muted"}>
              <span className="font-medium">{t.role === "examiner" ? "Examinateur : " : "Vous : "}</span>
              {t.text}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted">Ask your first question aloud, then press the button for the examiner&apos;s answer.</p>
      )}
      <button
        type="button"
        disabled={pending || speaking || full}
        onClick={ask}
        className="self-start rounded-lg bg-accent px-3 py-1.5 font-medium text-white disabled:opacity-50"
      >
        {pending ? "The examiner is answering…" : speaking ? "The examiner is speaking…" : "Ask the examiner"}
      </button>
      {error ? (
        <p role="alert" className="text-warn">
          {error} {unanswered ? "Press the button to send it again, or ask a different question first." : ""}
        </p>
      ) : null}
    </div>
  );
}
