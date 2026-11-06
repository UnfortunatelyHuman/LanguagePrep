import type { Verdict } from "@/lib/course/check";

/** Every exercise reports once: what was answered and how it was judged. */
export type Answered = (answer: string, verdict: Verdict) => void;
