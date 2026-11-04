"use client";

import { useSyncExternalStore } from "react";

/*
 * Browser voices load asynchronously (Chrome fills them in after a
 * `voiceschanged` event), so expose them as an external store.
 */

const NONE: SpeechSynthesisVoice[] = [];
let cache: SpeechSynthesisVoice[] = NONE;

function supported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function subscribe(onChange: () => void): () => void {
  if (!supported()) return () => {};
  const synth = window.speechSynthesis;
  const update = () => {
    const voices = synth.getVoices();
    if (voices.length) {
      cache = voices;
      onChange();
    }
  };
  synth.addEventListener("voiceschanged", update);
  return () => synth.removeEventListener("voiceschanged", update);
}

function getSnapshot(): SpeechSynthesisVoice[] {
  // Safari and Firefox have voices ready straight away and never fire the event.
  if (cache === NONE && supported()) {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) cache = voices;
  }
  return cache;
}

/** All installed voices (empty until loaded, or if speech is unsupported). */
export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => NONE);
}

/** False on the server and in browsers without speechSynthesis. */
export function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    () => () => {},
    supported,
    () => true,
  );
}
