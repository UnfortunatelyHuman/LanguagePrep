"use client";

import { useState } from "react";
import {
  SKILLS,
  crsLanguagePoints,
  milestones,
  nextLevelGains,
  type CrsInput,
  type CrsSkill,
  type Education,
  type ForeignExperience,
  type Levels,
} from "@/lib/crs";

export type PracticeLevels = Record<"english" | "french", Record<CrsSkill, number | null>>;

const SKILL_LABEL: Record<CrsSkill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

const TARGETS: Record<"english" | "french", Levels> = {
  english: { listening: 10, reading: 10, writing: 10, speaking: 10 },
  french: { listening: 7, reading: 7, writing: 7, speaking: 7 },
};

const fill = (practice: Record<CrsSkill, number | null>, fallback: number): Levels =>
  Object.fromEntries(SKILLS.map((s) => [s, practice[s] ?? fallback])) as Levels;

const levelOptions = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function LevelGrid({
  title,
  scale,
  levels,
  onChange,
}: {
  title: string;
  scale: "CLB" | "NCLC";
  levels: Levels;
  onChange: (skill: CrsSkill, value: number) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">{title}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SKILLS.map((s) => (
          <label key={s} className="flex flex-col gap-1 text-xs text-muted">
            {SKILL_LABEL[s]}
            <select
              value={levels[s]}
              onChange={(e) => onChange(s, Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold text-foreground"
            >
              {levelOptions.map((l) => (
                <option key={l} value={l}>
                  {l === 0 ? "None / <4" : `${scale} ${l}`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Row({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm">
        {label}
        {note ? <span className="block text-xs text-muted">{note}</span> : null}
      </dt>
      <dd className={`text-base font-bold tabular-nums ${value ? "" : "text-muted"}`}>{value}</dd>
    </div>
  );
}

export function CrsCalculator({ practice, hasPractice }: { practice: PracticeLevels; hasPractice: boolean }) {
  const fromPractice = (): Pick<CrsInput, "english" | "french"> => ({
    english: fill(practice.english, 0),
    french: fill(practice.french, 0),
  });
  const [levels, setLevels] = useState(hasPractice ? fromPractice : () => TARGETS);
  const [preset, setPreset] = useState<"practice" | "targets" | "custom">(hasPractice ? "practice" : "targets");
  const [withSpouse, setWithSpouse] = useState(false);
  const [education, setEducation] = useState<Education>("two-plus");
  const [foreignExperience, setForeignExperience] = useState<ForeignExperience>("none");

  const input: CrsInput = { ...levels, withSpouse, education, foreignExperience };
  const result = crsLanguagePoints(input);
  const atTarget = crsLanguagePoints({ ...input, ...TARGETS });
  const gains = nextLevelGains(input).slice(0, 4);
  const jumps = milestones(input);

  const setLevel = (language: "english" | "french") => (skill: CrsSkill, value: number) => {
    setPreset("custom");
    setLevels((l) => ({ ...l, [language]: { ...l[language], [skill]: value } }));
  };

  const presetButton = (id: "practice" | "targets", label: string, apply: () => void, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={preset === id}
      onClick={() => {
        apply();
        setPreset(id);
      }}
      className={`rounded-full px-3.5 py-1.5 text-sm disabled:opacity-40 ${
        preset === id ? "bg-foreground font-semibold text-background" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  const selectClass = "rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-foreground";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <section className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Your levels</h2>
          <div className="flex gap-1 rounded-full border border-border p-0.5" role="group" aria-label="Fill levels from">
            {presetButton("practice", "My practice", () => setLevels(fromPractice()), !hasPractice)}
            {presetButton("targets", "My targets", () => setLevels(TARGETS))}
          </div>
        </div>
        {preset === "practice" ? (
          <p className="-mt-3 text-xs text-muted">
            From the average of your last three practice attempts per skill. Skills you haven&apos;t practised count as no
            test. Change any level to try a scenario.
          </p>
        ) : null}
        <LevelGrid title="English (CELPIP → CLB)" scale="CLB" levels={levels.english} onChange={setLevel("english")} />
        <LevelGrid title="French (TCF Canada → NCLC)" scale="NCLC" levels={levels.french} onChange={setLevel("french")} />

        <fieldset className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <legend className="sr-only">About you</legend>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Spouse or partner coming with you?
            <select value={withSpouse ? "yes" : "no"} onChange={(e) => setWithSpouse(e.target.value === "yes")} className={selectClass}>
              <option value="no">No</option>
              <option value="yes">Yes (and not a Canadian or PR)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Highest education
            <select value={education} onChange={(e) => setEducation(e.target.value as Education)} className={selectClass}>
              <option value="secondary">High school or less</option>
              <option value="one-year">Post-secondary, 1+ year</option>
              <option value="two-plus">Master&apos;s, PhD or 2+ credentials</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Skilled work experience outside Canada
            <select
              value={foreignExperience}
              onChange={(e) => setForeignExperience(e.target.value as ForeignExperience)}
              className={selectClass}
            >
              <option value="none">None or under 1 year</option>
              <option value="1-2">1 or 2 years</option>
              <option value="3-plus">3 years or more</option>
            </select>
          </label>
        </fieldset>
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <section className="rounded-2xl bg-foreground p-5 text-background sm:p-6">
          <p className="text-sm opacity-75">Language-related CRS points</p>
          <p className="mt-1 text-5xl font-extrabold tabular-nums">{result.total}</p>
          <p className="mt-2 text-sm opacity-75">
            At your targets: <span className="font-bold opacity-100">{atTarget.total}</span>
            {atTarget.total > result.total ? ` (${atTarget.total - result.total} to gain)` : ""}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface px-5 py-3 sm:px-6">
          <dl className="divide-y divide-border">
            <Row
              label={`First official language (${result.firstLanguage === "english" ? "English" : "French"})`}
              value={result.first}
              note={withSpouse ? "Max 128" : "Max 136"}
            />
            <Row
              label={`Second official language (${result.firstLanguage === "english" ? "French" : "English"})`}
              value={result.second}
              note={withSpouse ? "Max 22" : "Max 24"}
            />
            <Row label="French-ability bonus" value={result.frenchBonus} note="NCLC 7+ in all four French skills; 50 with CLB 5+ English" />
            <Row label="Education + language" value={result.educationTransfer} note="Needs CLB 7+ in all four; doubles at CLB 9+" />
            <Row label="Foreign experience + language" value={result.experienceTransfer} note="Needs CLB 7+ in all four; doubles at CLB 9+" />
          </dl>
        </section>

        {gains.length || jumps.length ? (
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-bold">Where the next points are</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm">
              {jumps.map((j) => (
                <li key={j.label} className="flex items-baseline justify-between gap-3">
                  <span>{j.label}</span>
                  <span className="shrink-0 font-bold tabular-nums text-good">+{j.gain}</span>
                </li>
              ))}
              {gains.map((g) => (
                <li key={`${g.language}-${g.skill}`} className="flex items-baseline justify-between gap-3">
                  <span>
                    {g.language === "english" ? "English" : "French"} {SKILL_LABEL[g.skill].toLowerCase()}{" "}
                    {g.from ? `${g.from} → ${g.to}` : `to ${g.to}`}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-good">+{g.gain}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
