import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { TRACKS, isTrack } from "@/lib/exams";

export function generateStaticParams() {
  return TRACKS.map((lang) => ({ lang }));
}

export default async function TrackLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();

  return (
    <div data-track={lang} className="flex min-h-full flex-col">
      <AppHeader track={lang} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-border px-4 py-5 text-center text-xs text-muted sm:px-6">
        Scores and levels shown here are practice estimates for your own study —
        they are not official CELPIP or TCF results.
      </footer>
    </div>
  );
}
