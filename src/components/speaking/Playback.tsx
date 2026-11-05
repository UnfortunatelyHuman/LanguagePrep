"use client";

import { useEffect, useRef } from "react";

/**
 * Chrome's MediaRecorder writes WebM files without a duration, so the player
 * shows "∞" and can't seek. Seeking far past the end makes the browser scan
 * the file and learn the real length; then we jump back to the start.
 */
function learnDuration(audio: HTMLAudioElement) {
  if (Number.isFinite(audio.duration) || audio.dataset.scanning) return;
  audio.dataset.scanning = "1";
  const reset = () => {
    audio.removeEventListener("durationchange", reset);
    delete audio.dataset.scanning;
    audio.currentTime = 0;
  };
  audio.addEventListener("durationchange", reset);
  audio.currentTime = Number.MAX_SAFE_INTEGER;
}

/**
 * An audio player for a speaking recording, with a working seek bar. Saved
 * recordings use preload="none" so a page of eight answers doesn't download
 * them all; the duration is then learned when playback starts.
 */
export function Playback({ src, preload = "none" }: { src: string; preload?: "none" | "metadata" }) {
  const ref = useRef<HTMLAudioElement>(null);

  // Metadata can load before hydration attaches the handler; catch that case too.
  useEffect(() => {
    const audio = ref.current;
    if (audio && audio.readyState >= 1) learnDuration(audio);
  }, [src]);

  return (
    <audio
      ref={ref}
      controls
      preload={preload}
      src={src}
      onLoadedMetadata={(e) => learnDuration(e.currentTarget)}
      className="w-full"
    />
  );
}
