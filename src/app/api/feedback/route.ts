import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isTrack } from "@/lib/exams";
import { resolveWritingSet } from "@/lib/generate/sets";
import { gradeWriting } from "@/lib/writing/grade";
import { saveWritingAttempt } from "@/lib/writing/store";
import { clampSeconds, feedbackErrorResponse, feedbackFailure as fail } from "@/lib/feedback/http";
import type { TaskTexts } from "@/lib/writing/types";
import { countWords } from "@/lib/writing/words";

/** Fewer words than this in total and there is nothing meaningful to grade. */
const MIN_TOTAL_WORDS = 15;
/** Generous per-task ceiling so a paste accident can't send a novel to the API. */
const MAX_CHARS = 6000;

const Body = z.object({
  track: z.string(),
  setId: z.string(),
  texts: z.record(z.string(), z.string()),
  durationSeconds: z.number().nullish(),
});

/**
 * Grade a writing attempt with the configured AI provider, save it, and return
 * the feedback. Every failure becomes a JSON error with a message the UI shows.
 */
export async function POST(request: Request) {
  try {
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, "bad_request", "The request was malformed.");
    const { track, setId, durationSeconds } = parsed.data;

    if (!isTrack(track)) return fail(400, "bad_request", "Unknown exam track.");
    const set = await resolveWritingSet(track, setId);
    if (!set) return fail(404, "bad_request", "That writing set doesn't exist.");

    // Keep only this set's tasks, trimmed to a sane length.
    const texts: TaskTexts = Object.fromEntries(
      set.tasks.map((t) => [t.id, (parsed.data.texts[t.id] ?? "").slice(0, MAX_CHARS)]),
    );
    const totalWords = Object.values(texts).reduce((n, t) => n + countWords(t), 0);
    if (totalWords < MIN_TOTAL_WORDS) {
      return fail(
        400,
        "too_short",
        `There's too little text to grade (${totalWords} words). Write at least a few sentences.`,
      );
    }

    const graded = await gradeWriting(set, texts);

    const duration = clampSeconds(durationSeconds, set.minutes * 60 + 300);

    const result = await saveWritingAttempt({ track, set, texts, graded, durationSeconds: duration });

    // Dashboard and writing index show the latest attempt.
    revalidatePath(`/${track}`, "layout");
    return Response.json(result);
  } catch (error) {
    return feedbackErrorResponse("feedback", error);
  }
}
