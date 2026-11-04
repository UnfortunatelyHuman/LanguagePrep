"use client";

import { useEffect, useRef, useState } from "react";
import {
  assignVoices,
  buildChunks,
  localeFor,
  speakChunks,
  voicesFor,
} from "@/lib/practice/speech";
import { useSpeechSupported, useVoices } from "@/lib/practice/useVoices";
import type { ClientTestSet, Speaker } from "@/lib/practice/types";

const SAMPLE: Record<"en-CA" | "fr-CA", (name: string) => string> = {
  "en-CA": (name) => `Sound check. This is how ${name} will sound.`,
  "fr-CA": (name) => `Test du son. Voici la voix de ${name}.`,
};

/**
 * Before a listening test: which voices this browser has for the language, and
 * a sample of a female and a male speaker so volume can be set in advance.
 */
export function SoundCheck({ set }: { set: ClientTestSet }) {
  const locale = localeFor(set.exam);
  const voices = useVoices();
  const supported = useSpeechSupported();
  const [playing, setPlaying] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(), []);

  if (!supported) {
    return (
      <p role="alert" className="rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">
        This browser can&apos;t read text aloud, so listening practice won&apos;t
        work here. Open the app in Chrome or Edge.
      </p>
    );
  }

  const matching = voicesFor(voices, locale);
  const exact = matching.filter((v) => v.lang.replace("_", "-") === locale);

  // One speaker of each gender from this set, to hear the contrast.
  const all = Object.entries(set.speakers ?? {});
  const sample: [string, Speaker][] = [
    all.find(([, s]) => s.gender === "female"),
    all.find(([, s]) => s.gender === "male"),
  ].filter((x): x is [string, Speaker] => Boolean(x));

  function play() {
    const choices = assignVoices(voices, locale, sample);
    const lines = sample.map(([id, s]) => ({ speaker: id, text: SAMPLE[locale](s.name) }));
    setPlaying(true);
    cancelRef.current = speakChunks(buildChunks(lines, choices), locale, {
      onEnd: () => {
        cancelRef.current = null;
        setPlaying(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-subtle p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={play}
          disabled={playing}
          className="rounded-lg border border-border bg-surface px-3.5 py-1.5 font-medium disabled:opacity-60"
        >
          {playing ? "Playing…" : "▶ Sound check"}
        </button>
        <span className="text-muted">Set your volume before you start.</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        {matching.length === 0
          ? voices.length === 0
            ? "Loading voices…"
            : `No ${locale.slice(0, 2) === "en" ? "English" : "French"} voice is installed, so the default voice will be used. Install one in your system's speech settings for a better result.`
          : `${matching.length} voice${matching.length > 1 ? "s" : ""} available${
              exact.length ? ` (${exact.length} ${locale})` : `, none ${locale}; using the closest accent`
            }. Speakers in a conversation get different voices; if there aren't enough, pitch is shifted to tell them apart.`}
      </p>
    </div>
  );
}
