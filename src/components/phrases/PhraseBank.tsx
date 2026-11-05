"use client";

import { useMemo, useState } from "react";
import { PhraseCard } from "@/components/phrases/PhraseCard";
import { PhraseQuiz, buildDeck } from "@/components/phrases/PhraseQuiz";
import type { Track } from "@/lib/exams";
import type { Phrase, PhraseCategory } from "@/lib/phrases";

const ALL = "all";

function matches(p: Phrase, query: string): boolean {
  if (!query) return true;
  const q = query.toLocaleLowerCase();
  return [p.phrase, p.meaning, p.example].some((t) => t.toLocaleLowerCase().includes(q));
}

/** Browsable, searchable phrase bank with a recall self-test. */
export function PhraseBank({
  track,
  categories,
  initialKnown,
}: {
  track: Track;
  categories: PhraseCategory[];
  /** Phrase key → known, from the last self-tests. Missing = never tested. */
  initialKnown: Record<string, boolean>;
}) {
  const lang = track === "fr" ? "fr" : "en";
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  const [known, setKnown] = useState(initialKnown);
  const [deck, setDeck] = useState<Phrase[] | null>(null);

  const inCategory = useMemo(
    () => categories.filter((c) => category === ALL || c.id === category).flatMap((c) => c.phrases),
    [categories, category],
  );
  const visible = inCategory.filter((p) => matches(p, query.trim()));

  if (deck) {
    return (
      <PhraseQuiz
        track={track}
        deck={deck}
        lang={lang}
        onAnswer={(key, k) => setKnown((prev) => ({ ...prev, [key]: k }))}
        onExit={() => setDeck(null)}
      />
    );
  }

  const chip = (id: string, label: string, phrases: Phrase[]) => {
    const knownCount = phrases.filter((p) => known[p.key]).length;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={category === id}
        onClick={() => setCategory(id)}
        className={`rounded-lg border px-3 py-1.5 text-left text-sm ${
          category === id ? "border-accent bg-accent-soft" : "border-border bg-surface"
        }`}
      >
        {label}
        <span className="ml-2 text-xs tabular-nums text-muted">
          {knownCount}/{phrases.length} known
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
        {chip(ALL, "All", categories.flatMap((c) => c.phrases))}
        {categories.map((c) => chip(c.id, c.title, c.phrases))}
      </div>

      {category !== ALL ? (
        <p className="text-sm text-muted">{categories.find((c) => c.id === category)?.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search phrases</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search phrases, meanings or examples…"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <button
          type="button"
          disabled={!inCategory.length}
          onClick={() => setDeck(buildDeck(inCategory, known))}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Self-test {category === ALL ? "all" : "this category"} ({inCategory.length})
        </button>
      </div>

      {visible.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((p) => (
            <PhraseCard key={p.key} phrase={p} lang={lang} known={known[p.key]} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No phrases match “{query}”.</p>
      )}
    </div>
  );
}
