import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isTrack } from "@/lib/exams";
import { bodyTooLarge, clampSeconds, feedbackErrorResponse, feedbackFailure as fail } from "@/lib/feedback/http";
import { resolveSpeakingSet } from "@/lib/generate/sets";
import { speakingSeconds } from "@/lib/speaking/content";
import { gradeSpeaking } from "@/lib/speaking/grade";
import { isAcceptedRecording } from "@/lib/speaking/recordings";
import { saveSpeakingAttempt } from "@/lib/speaking/store";
import { DIALOGUE_LIMITS, type SpokenAnswer } from "@/lib/speaking/types";
import { countWords } from "@/lib/writing/words";

/** Fewer words than this across all answers and there is nothing to grade. */
const MIN_TOTAL_WORDS = 10;
const MAX_TRANSCRIPT_CHARS = 8000;
/** A full 8-task test is ~10 minutes of Opus, a few MB; 40 MB leaves plenty of room. */
const MAX_BODY_BYTES = 40 * 1024 * 1024;

const Meta = z.object({
  track: z.string(),
  setId: z.string(),
  durationSeconds: z.number().nullish(),
  answers: z
    .array(
      z.object({
        taskId: z.string(),
        transcript: z.string(),
        seconds: z.number().min(0),
        choice: z.enum(["A", "B"]).optional(),
        dialogue: z
          .array(z.object({ role: z.enum(["candidate", "examiner"]), text: z.string() }))
          .optional(),
      }),
    )
    .min(1),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Grade spoken answers. Multipart body: "meta" (JSON: track, setId, answers)
 * plus an optional "audio-<taskId>" file per answer, which is kept for playback.
 */
export async function POST(request: Request) {
  try {
    const tooLarge = bodyTooLarge(request, MAX_BODY_BYTES);
    if (tooLarge) return tooLarge;
    const form = await request.formData().catch(() => null);
    const rawMeta = form?.get("meta");
    const parsed = typeof rawMeta === "string" ? Meta.safeParse(parseJson(rawMeta)) : null;
    if (!form || !parsed?.success) return fail(400, "bad_request", "The request was malformed.");

    const { track, setId, durationSeconds } = parsed.data;
    if (!isTrack(track)) return fail(400, "bad_request", "Unknown exam track.");
    const set = await resolveSpeakingSet(track, setId);
    if (!set) return fail(404, "bad_request", "That speaking set doesn't exist.");

    // Keep only this set's tasks, once each, in set order, with sane values.
    const byId = new Map(parsed.data.answers.map((a) => [a.taskId, a]));
    const answers: SpokenAnswer[] = set.tasks.flatMap((task) => {
      const a = byId.get(task.id);
      if (!a) return [];
      return [
        {
          taskId: task.id,
          transcript: a.transcript.slice(0, MAX_TRANSCRIPT_CHARS),
          seconds: Math.min(a.seconds, task.speakSeconds + 5),
          choice: task.options ? a.choice : undefined,
          dialogue:
            task.kind === "tcf-roleplay" && a.dialogue?.length
              ? a.dialogue
                  .slice(0, DIALOGUE_LIMITS.turns)
                  .map((t) => ({ role: t.role, text: t.text.slice(0, DIALOGUE_LIMITS.chars) }))
              : undefined,
        },
      ];
    });
    if (!answers.length) return fail(400, "bad_request", "None of the answers match this set.");

    const totalWords = answers.reduce((n, a) => n + countWords(a.transcript), 0);
    if (totalWords < MIN_TOTAL_WORDS) {
      return fail(
        400,
        "too_short",
        `Only ${totalWords} words were recognized, which is too little to grade. Check that your microphone works and speak a bit closer to it.`,
      );
    }

    const audio = new Map<string, File>();
    for (const a of answers) {
      const file = form.get(`audio-${a.taskId}`);
      if (file instanceof File && isAcceptedRecording(file)) audio.set(a.taskId, file);
    }

    const graded = await gradeSpeaking(set, answers);
    const result = await saveSpeakingAttempt({
      track,
      set,
      answers,
      audio,
      graded,
      durationSeconds: clampSeconds(durationSeconds, speakingSeconds(set) + 900),
    });

    revalidatePath(`/${track}`, "layout");
    return Response.json(result);
  } catch (error) {
    return feedbackErrorResponse("speaking-feedback", error);
  }
}
