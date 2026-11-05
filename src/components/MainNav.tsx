"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Track } from "@/lib/exams";

/** Main sections, relative to the track root. */
const NAV = [
  { href: "", label: "Dashboard" },
  { href: "/guide", label: "Exam guide" },
  { href: "/progress", label: "Progress" },
  { href: "/plan", label: "Study plan" },
  { href: "/mock", label: "Mock exam" },
  { href: "/phrases", label: "Phrases" },
  { href: "/papers", label: "My papers" },
  { href: "/generate", label: "New AI sets" },
];

/** The nav links; `pathname` (when known) highlights the current section. */
export function NavList({ track, pathname }: { track: Track; pathname: string | null }) {
  return (
    <nav aria-label="Main" className="-mx-1 flex w-full gap-1 overflow-x-auto text-sm">
      {NAV.map((item) => {
        const href = `/${track}${item.href}`;
        const current =
          pathname !== null && (item.href ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href);
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`shrink-0 rounded-md px-2 py-1 hover:bg-surface-subtle hover:text-foreground ${
              current ? "bg-accent-soft font-medium text-accent" : "text-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Reads the pathname, which suspends on routes with request-time params, so
 * the header renders it inside <Suspense> with a plain NavList as fallback.
 */
export function ActiveNav({ track }: { track: Track }) {
  return <NavList track={track} pathname={usePathname()} />;
}
