"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveUnitsAction, suggestUnitsAction, updateUnitAction } from "@/lib/course/actions";
import type { UnitSuggestion } from "@/lib/course/schemas";
import { COURSE_LEVELS, FOCUS_SKILLS } from "@/lib/course/syllabus";

type Draft = UnitSuggestion & { keep: boolean; key: number };

const blank = (key: number): Draft => ({
  key,
  keep: true,
  level: "B1",
  title: "",
  grammar: "",
  vocabulary: "",
  skillFocus: { skill: "writing", text: "" },
});

const complete = (d: Draft) => [d.title, d.grammar, d.vocabulary, d.skillFocus.text].every((v) => v.trim());

const input = "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function DraftCard({ draft, onChange, removable }: { draft: Draft; onChange: (d: Draft | null) => void; removable: boolean }) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  return (
    <fieldset className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 ${draft.keep ? "border-border" : "border-dashed border-border opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-3">
        {removable ? (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={draft.keep} onChange={(e) => set({ keep: e.target.checked })} />
            Keep
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Level</span>
          <select value={draft.level} onChange={(e) => set({ level: e.target.value as Draft["level"] })} className={input}>
            {COURSE_LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Title (French)</span>
        <input value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} lang="fr" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Grammar point</span>
        <input value={draft.grammar} onChange={(e) => set({ grammar: e.target.value })} maxLength={160} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Vocabulary theme</span>
        <input value={draft.vocabulary} onChange={(e) => set({ vocabulary: e.target.value })} maxLength={160} className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Skill</span>
          <select
            value={draft.skillFocus.skill}
            onChange={(e) => set({ skillFocus: { ...draft.skillFocus, skill: e.target.value as Draft["skillFocus"]["skill"] } })}
            className={`${input} capitalize`}
          >
            {FOCUS_SKILLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Skill focus</span>
          <input
            value={draft.skillFocus.text}
            onChange={(e) => set({ skillFocus: { ...draft.skillFocus, text: e.target.value } })}
            maxLength={160}
            placeholder="e.g. Write a formal email to a manager"
            className={input}
          />
        </label>
      </div>
      {removable ? (
        <button type="button" onClick={() => onChange(null)} className="self-start text-xs text-muted hover:text-warn">
          Remove
        </button>
      ) : null}
    </fieldset>
  );
}

/** Add units: ask the AI for suggestions (one request) and/or write them by hand; or edit one added unit. */
export function UnitForm({ edit }: { edit?: { id: string; unit: UnitSuggestion } }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(edit ? [{ ...edit.unit, keep: true, key: 0 }] : []);
  const [nextKey, setNextKey] = useState(1);
  const [request, setRequest] = useState("");
  const [fromAi, setFromAi] = useState(false);
  const [pending, setPending] = useState<"suggest" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kept = drafts.filter((d) => d.keep);

  const suggest = async () => {
    setPending("suggest");
    setError(null);
    const result = await suggestUnitsAction(request).catch(() => null);
    setPending(null);
    if (!result?.ok) return setError(result && !result.ok ? result.error : "Couldn't reach the server.");
    setDrafts((d) => [...d, ...result.units.map((u, i) => ({ ...u, keep: true, key: nextKey + i }))]);
    setNextKey((k) => k + result.units.length);
    setFromAi(true);
  };

  const save = async () => {
    if (kept.some((d) => !complete(d))) return setError("Fill in every field of the units you keep.");
    setPending("save");
    setError(null);
    const units = kept.map((d) => ({ level: d.level, title: d.title, grammar: d.grammar, vocabulary: d.vocabulary, skillFocus: d.skillFocus }));
    const result = edit
      ? await updateUnitAction(edit.id, units[0]).catch(() => null)
      : await saveUnitsAction(units, fromAi ? "ai" : "user").catch(() => null);
    setPending(null);
    if (!result?.ok) return setError(result && !result.ok ? result.error : "Couldn't reach the server.");
    router.push(edit ? `/fr/learn/units/${edit.id}` : "/fr/learn");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {edit ? null : (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">What would you like to study?</span>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. More B2 units about workplace French · a unit on the subjonctif passé · French for healthcare appointments"
              className={input}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={suggest}
              disabled={pending !== null || request.trim().length < 5}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {pending === "suggest" ? "Asking the AI…" : "Suggest units with AI"}
            </button>
            <span className="text-xs text-muted">One AI request; it sees your current units so it doesn&apos;t repeat them.</span>
          </div>
        </section>
      )}

      {drafts.map((d) => (
        <DraftCard
          key={d.key}
          draft={d}
          removable={!edit}
          onChange={(next) => setDrafts((all) => (next ? all.map((x) => (x.key === d.key ? next : x)) : all.filter((x) => x.key !== d.key)))}
        />
      ))}

      {edit ? null : (
        <button
          type="button"
          onClick={() => {
            setDrafts((d) => [...d, blank(nextKey)]);
            setNextKey((k) => k + 1);
          }}
          className="self-start rounded-lg border border-dashed border-border px-4 py-2 text-sm hover:border-accent"
        >
          + Write a unit by hand
        </button>
      )}

      {error ? (
        <p role="alert" className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          {error}
        </p>
      ) : null}

      {drafts.length ? (
        <button
          type="button"
          onClick={save}
          disabled={pending !== null || kept.length === 0}
          className="self-start rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {pending === "save" ? "Saving…" : edit ? "Save changes" : `Add ${kept.length} unit${kept.length === 1 ? "" : "s"} to the course`}
        </button>
      ) : null}
    </div>
  );
}
