"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePaperAction } from "@/lib/papers/actions";
import type { Track } from "@/lib/exams";

/**
 * Paste or upload a paper as JSON (the same format as the built-in papers in
 * /content). Used to import papers and to edit ones the form can't show.
 */
export function PaperJsonEditor({
  track,
  initialJson = "",
  setId,
}: {
  track: Track;
  initialJson?: string;
  setId?: string;
}) {
  const router = useRouter();
  const [json, setJson] = useState(initialJson);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) {
      setError("That file is too large (over 400 KB).");
      return;
    }
    setJson(await file.text());
    setError(null);
  }

  function save() {
    setError(null);
    startSave(async () => {
      const result = await savePaperAction({ track, json, setId });
      if ("error" in result) setError(result.error);
      else router.push(`/${track}/papers`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:border-accent">
        <span className="font-medium">Choose a .json file…</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => loadFile(e.target.files?.[0])}
          className="sr-only"
        />
      </label>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={18}
        spellCheck={false}
        placeholder='{ "skill": "reading", "title": "…", "parts": [ … ] }'
        aria-label="Paper JSON"
        className="w-full rounded-lg border border-border bg-surface p-3 font-mono text-xs leading-relaxed outline-none focus:border-accent"
      />
      {error ? (
        <pre role="alert" className="whitespace-pre-wrap rounded-lg bg-warn/10 p-3 text-sm text-warn">
          {error}
        </pre>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !json.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Checking and saving…" : setId ? "Save changes" : "Import paper"}
        </button>
        <Link href={`/${track}/papers`} className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
      </div>
    </div>
  );
}
