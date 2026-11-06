"use client";

import { speak, stopSpeaking, usePlaying } from "@/lib/course/useSpeak";

/** A small play/stop button that reads French text aloud. */
export function SpeakButton({ id, text, label = "Listen" }: { id: string; text: string; label?: string }) {
  const playing = usePlaying() === id;
  return (
    <button
      type="button"
      onClick={() => (playing ? stopSpeaking() : speak(id, text))}
      aria-label={playing ? "Stop" : `${label}: ${text}`}
      title={playing ? "Stop" : label}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-xs ${
        playing ? "border-accent bg-accent text-white" : "border-border text-accent hover:border-accent"
      }`}
    >
      {playing ? (
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
          <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}
