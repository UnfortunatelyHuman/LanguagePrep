"use client";

import { useActionState, useRef } from "react";
import { saveStudySettings, type SettingsFormState } from "@/lib/plan-actions";
import type { Track } from "@/lib/exams";

const INITIAL: SettingsFormState = { ok: false, message: null };

/** Exam date and minutes per day; saving recomputes the plan on the server. */
export function PlanSettingsForm({
  track,
  examDate,
  dailyMinutes,
  timeZone,
  timeZones,
  minDate,
}: {
  track: Track;
  /** YYYY-MM-DD or "" */
  examDate: string;
  dailyMinutes: number;
  /** Saved IANA zone, or "" for the server's. */
  timeZone: string;
  timeZones: string[];
  /** Today as YYYY-MM-DD, from the server, so the picker can't go back in time. */
  minDate: string;
}) {
  const [state, action, pending] = useActionState(saveStudySettings, INITIAL);
  // React resets a form after its action; re-seed it with what was submitted
  // (the key remounts the inputs) so a validation error doesn't wipe the input.
  const shown = state.values ?? { examDate, dailyMinutes: String(dailyMinutes), timeZone };
  const zoneSelect = useRef<HTMLSelectElement>(null);

  /** Read in a click handler, so server and browser render the same markup. */
  function fillBrowserZone() {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zoneSelect.current && timeZones.includes(zone)) zoneSelect.current.value = zone;
  }
  const formKey = JSON.stringify(shown);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-sm">
      <h2 className="font-semibold tracking-tight">Plan settings</h2>
      <input type="hidden" name="track" value={track} />
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-muted">Exam date (optional)</span>
          <input
            type="date"
            name="examDate"
            key={`date-${formKey}`}
            defaultValue={shown.examDate}
            min={minDate}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">Minutes per day</span>
          <input
            type="number"
            name="dailyMinutes"
            key={`min-${formKey}`}
            defaultValue={shown.dailyMinutes}
            min={15}
            max={240}
            step={5}
            required
            className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 outline-none focus:border-accent"
          />
        </label>
        <div className="flex flex-col gap-1">
          <label htmlFor={`tz-${track}`} className="text-muted">
            Time zone (sets when &quot;today&quot; starts)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id={`tz-${track}`}
              ref={zoneSelect}
              name="timeZone"
              key={`tz-${formKey}`}
              defaultValue={shown.timeZone}
              className="max-w-64 rounded-lg border border-border bg-surface px-3 py-1.5 outline-none focus:border-accent"
            >
              <option value="">This computer&apos;s clock (server)</option>
              {timeZones.map((z) => (
                <option key={z} value={z}>
                  {z.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <button type="button" onClick={fillBrowserZone} className="text-accent">
              Use my browser&apos;s
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-good" : "text-warn"}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
