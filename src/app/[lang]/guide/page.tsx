import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrack, isTrack, type Track } from "@/lib/exams";
import { GUIDES, type GuideSkill } from "@/lib/guide";

// Awaits params and blocks on navigation; opt out of instant validation.
export const instant = false;

function SkillGuide({ track, skill }: { track: Track; skill: GuideSkill }) {
  return (
    <section id={skill.id} className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{skill.name}</h2>
        <span className="text-sm text-muted">{skill.time}</span>
      </div>
      <p className="text-sm leading-relaxed">{skill.overview}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-border">
              <th className="py-2 pr-3 font-medium">Part</th>
              <th className="py-2 pr-3 font-medium">Size</th>
              <th className="py-2 font-medium">What you do</th>
            </tr>
          </thead>
          <tbody>
            {skill.parts.map((part) => (
              <tr key={part.name} className="border-b border-border align-top last:border-0">
                <td className="py-2 pr-3 font-medium">{part.name}</td>
                <td className="whitespace-nowrap py-2 pr-3 text-muted">
                  {part.size}
                  {part.time ? <span className="block">{part.time}</span> : null}
                </td>
                <td className="py-2">{part.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm leading-relaxed text-muted">
        <span className="font-medium text-foreground">Scoring. </span>
        {skill.scoring}
      </p>

      <div>
        <h3 className="text-sm font-semibold">Strategies</h3>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
          {skill.strategies.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      <Link href={`/${track}/${skill.id}`} className="self-start text-sm font-medium text-accent">
        Practise {skill.name.toLowerCase()} →
      </Link>
    </section>
  );
}

/** How the exam is built, scored and best approached, part by part. */
export default async function GuidePage({ params }: PageProps<"/[lang]/guide">) {
  const { lang } = await params;
  if (!isTrack(lang)) notFound();
  const { examFull } = getTrack(lang);
  const guide = GUIDES[lang];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-xs font-medium text-muted">{examFull} · Exam guide</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">How the {examFull} works</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          The structure, timing and scoring of each part, what the questions test, and how to approach them. The
          practice papers in this app follow this format. Check the official site before test day in case anything
          has changed.
        </p>
      </section>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guide.facts.map((fact) => (
          <div key={fact.label} className="rounded-xl border border-border bg-surface p-4">
            <dt className="text-xs font-medium text-muted">{fact.label}</dt>
            <dd className="mt-1 text-sm leading-relaxed">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Skills" className="flex flex-wrap gap-2 text-sm">
        {guide.skills.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-border px-3 py-1 hover:border-accent">
            {s.name}
          </a>
        ))}
        <a href="#levels" className="rounded-full border border-border px-3 py-1 hover:border-accent">
          Scores → levels
        </a>
        <a href="#prepare" className="rounded-full border border-border px-3 py-1 hover:border-accent">
          How to prepare
        </a>
      </nav>

      {guide.skills.map((skill) => (
        <SkillGuide key={skill.id} track={lang} skill={skill} />
      ))}

      <section id="levels" className="flex scroll-mt-24 flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">{guide.levels.title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-border">
                {guide.levels.columns.map((c) => (
                  <th key={c} className="py-2 pr-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.levels.rows.map((row) => (
                <tr
                  key={row[0]}
                  className={`border-b border-border last:border-0 ${row[0].includes("target") ? "bg-accent-soft" : ""}`}
                >
                  {row.map((cell, i) => (
                    <td key={i} className={`py-2 pr-3 ${i === 0 ? "font-medium" : "font-mono"}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-muted">{guide.levels.note}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">On test day</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
          {guide.testDay.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section id="prepare" className="flex scroll-mt-24 flex-col gap-3 rounded-xl border border-dashed border-border p-4 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">How to prepare with this app</h2>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed">
          {guide.plan.map((step) => (
            <li key={step.text}>
              {step.href ? (
                <Link href={`/${lang}${step.href}`} className="text-accent underline-offset-2 hover:underline">
                  {step.text}
                </Link>
              ) : (
                step.text
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
