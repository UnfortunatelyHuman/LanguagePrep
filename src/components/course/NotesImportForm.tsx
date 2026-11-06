"use client";

import { useActionState } from "react";
import { importNotesAction, type NotesState } from "@/lib/course/actions";

const EXAMPLE = `le rendez-vous – appointment
la facture – bill, invoice
il faut que + subjonctif : il faut que tu viennes
Depuis + présent : j'habite ici depuis 3 ans`;

/** Paste class notes; the AI proposes review cards and exercises from them. */
export function NotesImportForm({ maxChars }: { maxChars: number }) {
  const [state, action, pending] = useActionState<NotesState, FormData>(importNotesAction, { error: null });
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Title (optional)</span>
        <input
          name="title"
          maxLength={120}
          disabled={pending}
          placeholder="e.g. Class 12: le subjonctif"
          className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Your notes</span>
        <textarea
          name="notes"
          required
          rows={10}
          maxLength={maxChars}
          disabled={pending}
          lang="fr"
          placeholder={EXAMPLE}
          className="rounded-lg border border-border bg-background p-3 font-mono text-sm leading-relaxed outline-none focus:border-accent"
        />
        <span className="text-xs text-muted">
          Words with meanings, grammar rules, example sentences: any format. Up to {maxChars.toLocaleString("en-CA")}{" "}
          characters; each 5,000 uses one AI request.
        </span>
      </label>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Turning your notes into cards…" : "Make cards and exercises"}
      </button>
    </form>
  );
}
