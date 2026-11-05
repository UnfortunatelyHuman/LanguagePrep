"use client";

import { useFormStatus } from "react-dom";
import { startMockExam } from "@/lib/mock-actions";
import type { Track } from "@/lib/exams";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Choosing your sets…" : "Start a new mock exam"}
    </button>
  );
}

/** Creates a mock exam (server action) and redirects to it. */
export function StartMockButton({ track }: { track: Track }) {
  return (
    <form action={startMockExam.bind(null, track)}>
      <SubmitButton />
    </form>
  );
}
