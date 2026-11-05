import Link from "next/link";
import { TrackSwitch } from "@/components/TrackSwitch";
import { getTrack, type Track } from "@/lib/exams";

/** Main sections, relative to the track root. */
const NAV = [
  { href: "", label: "Dashboard" },
  { href: "/progress", label: "Progress" },
];

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
        <nav aria-label="Main" className="-mx-1 flex w-full gap-1 overflow-x-auto text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={`/${track}${item.href}`}
              className="shrink-0 rounded-md px-2 py-1 text-muted hover:bg-surface-subtle hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
