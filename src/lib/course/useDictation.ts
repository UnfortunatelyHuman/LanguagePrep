"use client";

import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function ctor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Speak a message instead of typing it (fr-CA, Chrome/Edge). Text arrives
 * through `onText` as it's recognized; listening stops after a pause.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const callback = useRef(onText);
  useEffect(() => {
    callback.current = onText;
  });
  useEffect(() => () => rec.current?.abort(), []);

  const start = () => {
    const Ctor = ctor();
    if (!Ctor) {
      setError("Speech input needs Chrome or Edge.");
      return;
    }
    setError(null);
    const r = new Ctor();
    r.lang = "fr-CA";
    r.continuous = false;
    r.interimResults = true;
    let text = "";
    r.onresult = (e) => {
      text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      callback.current(text.trim());
    };
    r.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") setError("Speech input stopped: check the microphone permission.");
    };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  };

  const stop = () => rec.current?.stop();
  return { listening, error, start, stop };
}
