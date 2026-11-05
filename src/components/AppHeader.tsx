import Link from "next/link";
import { Suspense } from "react";
import { ActiveNav, NavList } from "@/components/MainNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TrackSwitch } from "@/components/TrackSwitch";
import { getTrack, type Track } from "@/lib/exams";

export function AppHeader({ track }: { track: Track }) {
  const { exam } = getTrack(track);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 sm:gap-5 sm:px-6">
        <Link href={`/${track}`} className="mr-auto flex min-w-0 items-center gap-2.5 sm:mr-0">
          {/* Mark: a rising ladder of four bars, one per skill. */}
          <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" className="shrink-0 text-accent">
            <rect width="28" height="28" rx="7" fill="currentColor" />
            <path d="M7.5 20v-3M11.8 20v-6M16.2 20v-8.5M20.5 20V8" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="min-w-0 leading-tight">
            <span className="block text-[15px] font-bold tracking-tight">Lang Prep</span>
            <span className="block truncate text-xs text-muted">{exam}</span>
          </span>
        </Link>
        <div className="hidden flex-1 sm:block">
          <Suspense fallback={<NavList track={track} pathname={null} variant="header" />}>
            <ActiveNav track={track} variant="header" />
          </Suspense>
        </div>
        <TrackSwitch current={track} />
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Bottom tab bar on phones, rendered after the page so it sits above it. */
export function AppTabBar({ track }: { track: Track }) {
  return (
    <Suspense fallback={<NavList track={track} pathname={null} variant="tabbar" />}>
      <ActiveNav track={track} variant="tabbar" />
    </Suspense>
  );
}
