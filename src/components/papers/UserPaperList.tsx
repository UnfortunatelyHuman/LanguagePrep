import Link from "next/link";
import { DeletePaperButton } from "@/components/papers/DeletePaperButton";
import type { Track } from "@/lib/exams";
import { listUserPapers } from "@/lib/papers/store";
import type { PracticeSkill } from "@/lib/practice/types";

/** The learner's own papers, with links to practise, study the answers, edit or delete. */
export async function UserPaperList({
  track,
  skill,
  empty,
}: {
  track: Track;
  skill?: PracticeSkill;
  empty: string;
}) {
  const papers = await listUserPapers(track, skill);
  if (!papers.length) return <p className="text-sm text-muted">{empty}</p>;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {papers.map((p) => (
        <li key={p.setId} className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4">
          <span className="text-xs text-muted">
            Yours · {p.skill} · {p.questions} question{p.questions === 1 ? "" : "s"} · {p.minutes} min
          </span>
          <span className="font-medium">{p.title}</span>
          {p.summary ? <span className="text-sm text-muted">{p.summary}</span> : null}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <Link href={`/${track}/${p.skill}/${p.setId}`} className="font-medium text-accent">
              Practise →
            </Link>
            <Link href={`/${track}/${p.skill}/${p.setId}/answers`} className="font-medium text-accent">
              Answers
            </Link>
            <Link href={`/${track}/papers/${p.setId}/edit`} className="text-muted hover:text-foreground">
              Edit
            </Link>
            <DeletePaperButton track={track} setId={p.setId} title={p.title} />
          </div>
        </li>
      ))}
    </ul>
  );
}
