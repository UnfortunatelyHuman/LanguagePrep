"use client";

import { useSyncExternalStore } from "react";
import { buildChunks, speakChunks, voicesFor } from "@/lib/practice/speech";

/**
 * Read French aloud (fr-CA voice when installed) for vocabulary, examples and
 * listening exercises. One thing plays at a time across the page: starting a
 * new one stops the last. Lines like "A: …" / "B: …" get two voices.
 */

let playing: string | null = null;
let stop: (() => void) | null = null;
const listeners = new Set<() => void>();

function set(id: string | null) {
  playing = id;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function stopSpeaking() {
  stop?.();
  stop = null;
  set(null);
}

/** Speak `text`; `id` identifies the button so it can show it's playing. */
export function speak(id: string, text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  stopSpeaking();
  const voices = voicesFor(window.speechSynthesis.getVoices(), "fr-CA");
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^([^:]{1,20})\s?:\s*(.+)$/.exec(l);
      return m ? { speaker: m[1].trim(), text: m[2] } : { speaker: "_", text: l };
    });
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  const choices = new Map(
    speakers.map((s, i) => [s, { voice: voices[i % Math.max(voices.length, 1)] ?? null, pitch: i % 2 ? 0.85 : 1 }]),
  );
  set(id);
  stop = speakChunks(buildChunks(lines, choices), "fr-CA", {
    onEnd: () => {
      if (playing === id) set(null);
      stop = null;
    },
  });
}

/** Which speak id is playing right now, or null. */
export function usePlaying(): string | null {
  return useSyncExternalStore(subscribe, () => playing, () => null);
}
