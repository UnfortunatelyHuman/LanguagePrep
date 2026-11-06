"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Track } from "@/lib/exams";

type Item = { href: string; label: string; short?: string; icon: ReactNode };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}>
    {children}
  </svg>
);

const ICONS = {
  home: (
    <Icon>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10v9h11v-9" />
    </Icon>
  ),
  plan: (
    <Icon>
      <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M8.5 13l2.2 2.2L15.5 10.5" />
    </Icon>
  ),
  progress: (
    <Icon>
      <path d="M5 19V13M10 19V9M15 19v-6M20 19V5" />
    </Icon>
  ),
  review: (
    <Icon>
      <path d="M5 12a7 7 0 1 0 2.1-5" />
      <path d="M5 4.5V8h3.5" />
      <path d="M12 9v3.5l2.5 1.5" />
    </Icon>
  ),
  more: (
    <Icon>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </Icon>
  ),
  mock: (
    <Icon>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9.5V13l2 1.5M10 3.5h4" />
    </Icon>
  ),
  guide: (
    <Icon>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z" />
      <path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19" />
    </Icon>
  ),
  phrases: (
    <Icon>
      <path d="M4.5 6.5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H10l-4 3v-3H6.5a2 2 0 0 1-2-2z" />
      <path d="M19.5 13V6a2 2 0 0 0-2-2H8" />
    </Icon>
  ),
  crs: (
    <Icon>
      <path d="M12 3.5l1.6 3.8 3.9-1.2-1.4 3.9 3.4 2.2-3.9 1.1.3 4.1L12 15l-3.9 2.4.3-4.1-3.9-1.1 3.4-2.2-1.4-3.9 3.9 1.2z" />
      <path d="M12 15v5.5" />
    </Icon>
  ),
  papers: (
    <Icon>
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5v4h4M10 12h5M10 15.5h5" />
    </Icon>
  ),
  course: (
    <Icon>
      <path d="M3 8l9-4 9 4-9 4z" />
      <path d="M7 10v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5" />
      <path d="M21 8v5" />
    </Icon>
  ),
  ai: (
    <Icon>
      <path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z" />
      <path d="M18.5 15.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" />
    </Icon>
  ),
};

/** Shown on every screen size. */
const PRIMARY: Item[] = [
  { href: "", label: "Home", icon: ICONS.home },
  { href: "/plan", label: "Study plan", short: "Plan", icon: ICONS.plan },
  { href: "/progress", label: "Progress", icon: ICONS.progress },
  { href: "/review", label: "Mistakes", icon: ICONS.review },
];

/** Behind "More": the mock exam on phones, plus the reference and tool pages. */
const MORE: Item[] = [
  { href: "/mock", label: "Mock exam", icon: ICONS.mock },
  { href: "/guide", label: "Exam guide", icon: ICONS.guide },
  { href: "/phrases", label: "Phrase bank", icon: ICONS.phrases },
  { href: "/crs", label: "CRS points", icon: ICONS.crs },
  { href: "/papers", label: "My papers", icon: ICONS.papers },
  { href: "/generate", label: "New AI sets", icon: ICONS.ai },
];

/** The French course: on the French track only, first after the primary links. */
const COURSE: Item = { href: "/learn", label: "French course", icon: ICONS.course };

const moreFor = (track: Track): Item[] => (track === "fr" ? [COURSE, ...MORE] : MORE);

function isCurrent(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href.split("/").length <= 2 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function MoreMenu({
  track,
  pathname,
  items,
  placement,
}: {
  track: Track;
  pathname: string | null;
  items: Item[];
  placement: "down" | "up";
}) {
  const active = items.some((i) => isCurrent(pathname, `/${track}${i.href}`));
  return (
    // Re-keyed on navigation so the menu closes after a link is followed.
    <details key={pathname ?? "x"} className="group relative">
      <summary
        className={`flex cursor-pointer list-none items-center rounded-lg [&::-webkit-details-marker]:hidden ${
          placement === "up" ? "flex-col gap-0.5 px-1 py-1 text-[11px]" : "gap-1.5 px-2.5 py-1.5 text-sm"
        } ${active ? "font-semibold text-accent" : "text-muted hover:text-foreground"}`}
      >
        {placement === "up" ? ICONS.more : null}
        More
        {placement === "down" ? (
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className="transition-transform group-open:rotate-180">
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        ) : null}
      </summary>
      <div
        className={`absolute z-30 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg shadow-black/5 ${
          placement === "up" ? "bottom-full right-0 mb-3" : "right-0 top-full mt-2"
        }`}
      >
        {items.map((item) => {
          const href = `/${track}${item.href}`;
          const current = isCurrent(pathname, href);
          return (
            <Link
              key={item.href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                current ? "bg-accent-soft font-semibold text-accent" : "text-foreground hover:bg-surface-subtle"
              }`}
            >
              <span className={current ? "text-accent" : "text-muted"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}

/** Desktop and tablet: a row of links in the header. */
function DesktopNav({ track, pathname }: { track: Track; pathname: string | null }) {
  return (
    <nav aria-label="Main" className="hidden items-center gap-0.5 sm:flex">
      {[...PRIMARY, moreFor(track)[0]].map((item) => {
        const href = `/${track}${item.href}`;
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={item.href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-sm ${
              current ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <MoreMenu track={track} pathname={pathname} items={moreFor(track).slice(1)} placement="down" />
    </nav>
  );
}

/** A test or task runner: leaving it by a stray tap would lose the answers. */
const RUNNER = /^\/(en|fr)\/(reading|listening|writing|speaking)\/(?!attempts\/)[^/]+$/;

/** Phones: a tab bar along the bottom, within thumb reach. Hidden while a test is open. */
function TabBar({ track, pathname }: { track: Track; pathname: string | null }) {
  if (pathname && RUNNER.test(pathname)) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 pt-1.5 pb-1">
        {PRIMARY.map((item) => {
          const href = `/${track}${item.href}`;
          const current = isCurrent(pathname, href);
          return (
            <Link
              key={item.href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] ${
                current ? "font-semibold text-accent" : "text-muted"
              }`}
            >
              {item.icon}
              {item.short ?? item.label}
            </Link>
          );
        })}
        <div className="flex justify-center">
          <MoreMenu track={track} pathname={pathname} items={moreFor(track)} placement="up" />
        </div>
      </div>
    </nav>
  );
}

export type NavVariant = "header" | "tabbar";

export function NavList({
  track,
  pathname,
  variant,
}: {
  track: Track;
  pathname: string | null;
  variant: NavVariant;
}) {
  return variant === "header" ? (
    <DesktopNav track={track} pathname={pathname} />
  ) : (
    <TabBar track={track} pathname={pathname} />
  );
}

/**
 * Reads the pathname, which suspends on routes with request-time params, so
 * the layout renders it inside <Suspense> with a plain NavList as fallback.
 */
export function ActiveNav({ track, variant }: { track: Track; variant: NavVariant }) {
  return <NavList track={track} pathname={usePathname()} variant={variant} />;
}
