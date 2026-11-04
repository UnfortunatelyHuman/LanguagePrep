import Link from "next/link";
import { EXAM_TRACKS, TRACKS, type Track } from "@/lib/exams";

/**
 * EN/FR switch. Each track is its own route, so switching is a plain link —
 * it works without JavaScript and the current track stays shareable in the URL.
 */
export function TrackSwitch({ current }: { current: Track }) {
  return (
    <nav
      aria-label="Test language"
      className="inline-flex rounded-full border border-border bg-surface p-0.5"
    >
      {TRACKS.map((track) => {
        const isCurrent = track === current;
        return (
          <Link
            key={track}
            href={`/${track}`}
            aria-current={isCurrent ? "page" : undefined}
            data-track={track}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isCurrent
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className="font-mono">{EXAM_TRACKS[track].shortLabel}</span>
            <span className="sr-only"> — {EXAM_TRACKS[track].exam}</span>
          </Link>
        );
      })}
    </nav>
  );
}
