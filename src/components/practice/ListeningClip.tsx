"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  assignVoices,
  buildChunks,
  speakChunks,
  type ClipLocale,
} from "@/lib/practice/speech";
import { useSpeechSupported, useVoices } from "@/lib/practice/useVoices";
import type { Clip, Speaker } from "@/lib/practice/types";

export type ClipStatus = "idle" | "playing" | "done";

/**
 * Play button for one listening clip. Browsers block speech that starts by
 * itself, so playback always begins from a click.
 *
 * In the test (`replayable` false) the clip plays once: when it ends — or the
 * screen is left mid-clip — it is done for good. In the review it can be
 * replayed and stopped.
 */
export function ListeningClip({
  clip,
  speakers,
  locale,
  status,
  onStatusChange,
  replayable = false,
}: {
  clip: Clip;
  speakers: Record<string, Speaker>;
  locale: ClipLocale;
  status: ClipStatus;
  onStatusChange: (status: ClipStatus) => void;
  replayable?: boolean;
}) {
  const voices = useVoices();
  const supported = useSpeechSupported();
  const [line, setLine] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const report = useEffectEvent(onStatusChange);

  // Leaving the screen stops the voice; in the test that uses up the play.
  useEffect(
    () => () => {
      if (cancelRef.current) {
        cancelRef.current();
        cancelRef.current = null;
        report("done");
      }
    },
    [],
  );

  function play() {
    const ids = [...new Set(clip.lines.map((l) => l.speaker))];
    const choices = assignVoices(
      voices,
      locale,
      ids.map((id) => [id, speakers[id]]),
    );
    setLine(0);
    onStatusChange("playing");
    cancelRef.current = speakChunks(buildChunks(clip.lines, choices), locale, {
      onLine: setLine,
      onEnd: () => {
        cancelRef.current = null;
        onStatusChange("done");
      },
    });
  }

  function stop() {
    cancelRef.current?.();
    cancelRef.current = null;
    onStatusChange("done");
  }

  if (!supported) {
    return (
      <p role="alert" className="rounded-lg bg-warn/15 px-3 py-2 text-sm text-warn">
        This browser can&apos;t read text aloud. Open the app in Chrome or Edge to
        practise listening.
      </p>
    );
  }

  const progress = status === "done" ? 1 : (line + 1) / clip.lines.length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      {clip.context ? <p className="text-sm">{clip.context}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        {status === "playing" ? (
          replayable ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
            >
              ■ Stop
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-accent">
              <span className="size-2 animate-pulse rounded-full bg-accent" />
              Playing…
            </span>
          )
        ) : status === "idle" || replayable ? (
          <button
            type="button"
            onClick={play}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            ▶ {status === "idle" ? "Play" : "Listen again"}
          </button>
        ) : (
          <span className="text-sm text-muted">✓ Clip finished — it can&apos;t be replayed.</span>
        )}

        {status === "idle" && !replayable ? (
          <span className="text-xs text-muted">
            Plays once, like the real test. No pause or replay.
          </span>
        ) : null}
      </div>

      {status === "playing" || (status === "done" && !replayable) ? (
        <div
          role="progressbar"
          aria-label="Clip progress"
          aria-valuenow={Math.round(progress * 100)}
          className="h-1 overflow-hidden rounded-full bg-surface-subtle"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** The script, shown only in the review. */
export function Transcript({
  clip,
  speakers,
}: {
  clip: Clip;
  speakers: Record<string, Speaker>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-[15px] leading-relaxed sm:p-5">
      {clip.lines.map((line, i) => (
        <p key={i}>
          <span className="font-semibold">{speakers[line.speaker]?.name}: </span>
          {line.text}
        </p>
      ))}
    </div>
  );
}
