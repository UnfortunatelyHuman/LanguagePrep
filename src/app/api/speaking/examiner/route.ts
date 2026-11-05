import { z } from "zod";
import { isTrack } from "@/lib/exams";
import { bodyTooLarge, feedbackErrorResponse, feedbackFailure as fail } from "@/lib/feedback/http";
import { resolveSpeakingSet } from "@/lib/generate/sets";
import { examinerReply } from "@/lib/speaking/examiner";
import { DIALOGUE_LIMITS } from "@/lib/speaking/types";

const MAX_BODY_BYTES = 64 * 1024;

const Body = z.object({
  track: z.string(),
  setId: z.string(),
  taskId: z.string(),
  dialogue: z
    .array(z.object({ role: z.enum(["candidate", "examiner"]), text: z.string().trim().min(1).max(DIALOGUE_LIMITS.chars) }))
    .min(1)
    .max(DIALOGUE_LIMITS.turns),
});

/**
 * The AI examiner for TCF speaking task 2: given the exchange so far (ending
 * with the candidate's question), returns the examiner's spoken reply.
 */
export async function POST(request: Request) {
  try {
    const tooLarge = bodyTooLarge(request, MAX_BODY_BYTES);
    if (tooLarge) return tooLarge;
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, "bad_request", "The request was malformed.");
    const { track, setId, taskId, dialogue } = parsed.data;
    if (!isTrack(track)) return fail(400, "bad_request", "Unknown exam track.");

    const set = await resolveSpeakingSet(track, setId);
    const task = set?.tasks.find((t) => t.id === taskId);
    if (!task || task.kind !== "tcf-roleplay") return fail(404, "bad_request", "That role-play task doesn't exist.");
    if (dialogue.at(-1)?.role !== "candidate") return fail(400, "bad_request", "Ask a question first.");

    return Response.json({ reply: await examinerReply(task, dialogue) });
  } catch (error) {
    return feedbackErrorResponse("speaking-examiner", error);
  }
}
