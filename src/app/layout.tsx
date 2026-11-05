import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Atkinson Hyperlegible was designed for maximum letter distinction (l/I/1,
// O/0, rn/m). It suits an app where most of the time goes into reading exam
// passages and options quickly and without misreading. The font files are
// bundled (SIL Open Font License, see src/fonts/OFL.txt) so the app builds and
// runs without reaching Google Fonts. The "latin" files cover all French accents.
const body = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "../fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2", weight: "200 800", style: "normal" },
    { path: "../fonts/atkinson-hyperlegible-next-latin-wght-italic.woff2", weight: "200 800", style: "italic" },
  ],
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const bodyMono = localFont({
  variable: "--font-body-mono",
  display: "swap",
  src: [{ path: "../fonts/atkinson-hyperlegible-mono-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
  fallback: ["ui-monospace", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "PR Language Prep",
  description:
    "Practice for CELPIP-General and TCF Canada, aiming at CLB 10 in English and NCLC 7 in French.",
  applicationName: "PR Language Prep",
  appleWebApp: { capable: true, title: "Lang Prep", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e141b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${bodyMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved light/dark choice before first paint, so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
