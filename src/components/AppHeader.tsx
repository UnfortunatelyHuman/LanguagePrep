import Link from "next/link";
import { TrackSwitch } from "@/components/TrackSwitch";
import { getTrack, type Track } from "@/lib/exams";

export function AppHeader({ track }: { track: Track }) {
  const { exam, language } = getTrack(track);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link href={`/${track}`} className="mr-auto min-w-0">
          <span className="block text-sm font-semibold tracking-tight">
            PR Language Prep
          </span>
          <span className="block truncate text-xs text-muted">
            {language} · {exam}
          </span>
        </Link>
        <TrackSwitch current={track} />
      </div>
    </header>
  );
}
